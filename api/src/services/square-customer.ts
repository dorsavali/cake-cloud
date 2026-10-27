import type { ApiEnv } from "../types/env.js";

type SquareCustomer = {
  id?: string;
  version?: number;
  given_name?: string;
  email_address?: string;
  phone_number?: string;
};

export function normalizeSquarePhone(value: string): string {
  const compact = value.replace(/[\s().-]/g, "");
  if (/^04\d{8}$/.test(compact)) return `+61${compact.slice(1)}`;
  if (/^4\d{8}$/.test(compact)) return `+61${compact}`;
  return compact;
}

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
      throw new Error("Square did not accept this email address.");
    }
    if (code === "INVALID_PHONE_NUMBER") {
      throw new Error(
        "Square did not accept this phone number. Include its country code.",
      );
    }
    if (
      code === "UNAUTHORIZED" ||
      code === "FORBIDDEN" ||
      code === "REQUEST_NOT_AUTHORIZED"
    ) {
      throw new Error(
        "Square customer access is missing. Enable CUSTOMERS_READ and CUSTOMERS_WRITE permissions.",
      );
    }
    throw new Error(`Square could not save the customer details (${code}).`);
  }

  return response.json() as Promise<T>;
}

export async function upsertSquareCustomer(
  env: ApiEnv,
  fullName: string,
  email: string,
  phone: string,
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
    if (!updateExisting) return existing.id;
    if (
      existing.given_name === fullName &&
      existing.email_address?.toLowerCase() === email.toLowerCase() &&
      existing.phone_number === phone
    ) {
      return existing.id;
    }
    if (typeof existing.version !== "number") {
      throw new Error("Square could not update the customer details.");
    }
    const updated = await squareCustomerRequest<{ customer?: SquareCustomer }>(
      env,
      `/v2/customers/${encodeURIComponent(existing.id)}`,
      "PUT",
      {
        given_name: fullName,
        email_address: email,
        phone_number: phone,
        version: existing.version,
      },
    );
    if (!updated.customer?.id) {
      throw new Error("Square could not update the customer details.");
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
    },
  );
  if (!created.customer?.id) {
    throw new Error("Square could not save the customer details.");
  }
  return created.customer.id;
}
