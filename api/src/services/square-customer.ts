import type { ApiEnv } from "../types/env.js";

type SquareCustomer = {
  id?: string;
  version?: number;
  given_name?: string;
  family_name?: string;
  email_address?: string;
  phone_number?: string;
  birthday?: string;
  reference_id?: string;
  address?: {
    address_line_1?: string;
    locality?: string;
    administrative_district_level_1?: string;
    postal_code?: string;
    country?: string;
  };
};

/** Errors returned by Square that are safe to show to the customer. */
export class SquareCustomerError extends Error {}
export class ClubAlreadyMemberError extends Error {}

export function normalizeSquarePhone(value: string): string {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^[1-9]\d{8}$/.test(compact)) return `+61${compact}`;
  if (/^0\d{9}$/.test(compact)) return `+61${compact.slice(1)}`;
  return compact;
}

export function isAustralianPhone(value: string): boolean {
  return /^\+61\d{9}$/.test(normalizeSquarePhone(value));
}

export function normalizeSquareAddress(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw new Error("Enter a valid address.");
  const address = value.trim().replace(/\s+/g, " ");
  if (address.length > 500) throw new Error("Address must be 500 characters or fewer.");
  return address;
}

export type ClubMemberInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthday: string;
  address: string;
};

export type ClubMember = {
  customerId: string;
  memberCode: string;
};

async function squareCustomerRequest<T>(
  env: ApiEnv,
  path: string,
  method: "POST" | "PUT",
  body: unknown,
): Promise<T> {
  const baseUrl =
    env.SQUARE_ENVIRONMENT === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      "Square-Version": "2026-08-19",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as {
      errors?: Array<{ code?: string }>;
    };
    const code = result.errors?.[0]?.code ?? `HTTP_${response.status}`;
    if (code === "INVALID_EMAIL_ADDRESS") {
      throw new SquareCustomerError("Square did not accept this email address.");
    }
    if (code === "INVALID_PHONE_NUMBER") {
      throw new SquareCustomerError(
        "Square did not accept this phone number. Include its country code.",
      );
    }
    if (
      code === "UNAUTHORIZED" ||
      code === "FORBIDDEN" ||
      code === "REQUEST_NOT_AUTHORIZED"
    ) {
      throw new SquareCustomerError(
        "Square customer access is missing. Enable CUSTOMERS_READ and CUSTOMERS_WRITE permissions.",
      );
    }
    throw new SquareCustomerError(`Square could not save the customer details (${code}).`);
  }

  return response.json() as Promise<T>;
}

async function searchSquareCustomer(
  env: ApiEnv,
  filter: Record<string, { exact: string }>,
): Promise<SquareCustomer | undefined> {
  const result = await squareCustomerRequest<{ customers?: SquareCustomer[] }>(
    env,
    "/v2/customers/search",
    "POST",
    { limit: 1, query: { filter } },
  );
  return result.customers?.[0];
}

async function createMemberCode(env: ApiEnv): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const number = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    const memberCode = `CCC-${String(number).padStart(6, "0")}`;
    const existing = await searchSquareCustomer(env, {
      reference_id: { exact: memberCode },
    });
    if (!existing) return memberCode;
  }
  throw new SquareCustomerError("Could not allocate a club member number.");
}

/** Creates or updates a CC Club member in Square Customer Directory. */
export async function upsertClubMember(
  env: ApiEnv,
  input: ClubMemberInput,
  idempotencyKey: string,
): Promise<ClubMember> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedPhone = normalizeSquarePhone(input.phone);
  const [existingByEmail, existingByPhone] = await Promise.all([
    searchSquareCustomer(env, {
      email_address: { exact: normalizedEmail },
    }),
    searchSquareCustomer(env, {
      phone_number: { exact: normalizedPhone },
    }),
  ]);
  if (
    /^CCC-\d{6}$/.test(existingByEmail?.reference_id ?? "") ||
    /^CCC-\d{6}$/.test(existingByPhone?.reference_id ?? "")
  ) {
    throw new ClubAlreadyMemberError("You are already a Cake Cloud Club member.");
  }
  const existing =
    existingByEmail ??
    existingByPhone;
  const memberCode = await createMemberCode(env);
  const customerFields = {
    given_name: input.firstName,
    family_name: input.lastName,
    email_address: normalizedEmail,
    phone_number: normalizedPhone,
    birthday: input.birthday,
    reference_id: memberCode,
    address: {
      address_line_1: input.address,
      country: "AU",
    },
  };

  if (existing?.id) {
    if (typeof existing.version !== "number") {
      throw new SquareCustomerError("Square could not update the customer details.");
    }
    const updated = await squareCustomerRequest<{ customer?: SquareCustomer }>(
      env,
      `/v2/customers/${encodeURIComponent(existing.id)}`,
      "PUT",
      { ...customerFields, version: existing.version },
    );
    if (!updated.customer?.id) {
      throw new SquareCustomerError("Square could not update the customer details.");
    }
    return { customerId: updated.customer.id, memberCode };
  }

  const created = await squareCustomerRequest<{ customer?: SquareCustomer }>(
    env,
    "/v2/customers",
    "POST",
    { idempotency_key: idempotencyKey, ...customerFields },
  );
  if (!created.customer?.id) {
    throw new SquareCustomerError("Square could not save the customer details.");
  }
  return { customerId: created.customer.id, memberCode };
}

export async function upsertSquareCustomer(
  env: ApiEnv,
  fullName: string,
  email: string,
  phone: string,
  address: string,
  idempotencyKey: string,
  updateExisting = true,
): Promise<string> {
  const search = await squareCustomerRequest<{ customers?: SquareCustomer[] }>(
    env,
    "/v2/customers/search",
    "POST",
    {
      limit: 1,
      query: { filter: { email_address: { exact: email } } },
    },
  );
  const existing = search.customers?.[0];

  if (existing?.id) {
    const addressChanged = Boolean(
      address && existing.address?.address_line_1 !== address,
    );
    if (!updateExisting && !addressChanged) return existing.id;
    if (
      existing.given_name === fullName &&
      existing.email_address?.toLowerCase() === email.toLowerCase() &&
      existing.phone_number === phone &&
      !addressChanged
    ) {
      return existing.id;
    }
    if (typeof existing.version !== "number") {
      throw new SquareCustomerError("Square could not update the customer details.");
    }
    const updated = await squareCustomerRequest<{ customer?: SquareCustomer }>(
      env,
      `/v2/customers/${encodeURIComponent(existing.id)}`,
      "PUT",
      {
        ...(updateExisting
          ? {
              given_name: fullName,
              email_address: email,
              phone_number: phone,
            }
          : {}),
        ...(address
          ? { address: { address_line_1: address, country: "AU" } }
          : {}),
        version: existing.version,
      },
    );
    if (!updated.customer?.id) {
      throw new SquareCustomerError("Square could not update the customer details.");
    }
    return updated.customer.id;
  }

  const created = await squareCustomerRequest<{ customer?: SquareCustomer }>(
    env,
    "/v2/customers",
    "POST",
    {
      idempotency_key: idempotencyKey,
      given_name: fullName,
      email_address: email,
      phone_number: phone,
      ...(address
        ? { address: { address_line_1: address, country: "AU" } }
        : {}),
    },
  );
  if (!created.customer?.id) {
    throw new SquareCustomerError("Square could not save the customer details.");
  }
  return created.customer.id;
}
