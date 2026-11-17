import { json, methodNotAllowed } from "../http/json.js";
import {
  normalizeSquarePhone,
  SquareCustomerError,
  upsertClubMember,
} from "../services/square-customer.js";
import type { ApiEnv } from "../types/env.js";

type ClubRequest = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  birthday?: unknown;
  addressLine1?: unknown;
  suburb?: unknown;
  state?: unknown;
  postcode?: unknown;
  privacyAccepted?: unknown;
  idempotencyKey?: unknown;
  website?: unknown;
};

const australianStates = new Set([
  "ACT",
  "NSW",
  "NT",
  "QLD",
  "SA",
  "TAS",
  "VIC",
  "WA",
]);

function text(value: unknown, name: string, maxLength: number): string {
  if (typeof value !== "string") throw new Error(`Enter your ${name}.`);
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean || clean.length > maxLength) throw new Error(`Enter a valid ${name}.`);
  return clean;
}

function validBirthday(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= "1900-01-01" &&
    value <= new Date().toISOString().slice(0, 10)
  );
}

export async function handleClubJoin(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed();
  const origin = request.headers.get("origin");
  if (
    origin &&
    env.WEBSITE_ORIGIN &&
    origin !== new URL(env.WEBSITE_ORIGIN).origin
  ) {
    return json({ error: "Invalid request origin." }, 403);
  }
  if (Number(request.headers.get("content-length") ?? 0) > 20_000) {
    return json({ error: "Request is too large." }, 413);
  }

  try {
    const body = (await request.json()) as ClubRequest;
    if (body.website) return json({ joined: true });
    if (body.privacyAccepted !== true) {
      throw new Error("Please accept the privacy notice.");
    }
    const firstName = text(body.firstName, "first name", 100);
    const lastName = text(body.lastName, "last name", 100);
    const email = text(body.email, "email address", 254).toLowerCase();
    const phone = text(body.phone, "phone number", 30);
    const birthday = text(body.birthday, "date of birth", 10);
    const addressLine1 = text(body.addressLine1, "street address", 500);
    const suburb = text(body.suburb, "suburb", 100);
    const state = text(body.state, "state", 3).toUpperCase();
    const postcode = text(body.postcode, "postcode", 4);
    const idempotencyKey = text(body.idempotencyKey, "submission reference", 64);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    if (!/^\+61\d{9}$/.test(normalizeSquarePhone(phone))) {
      throw new Error("Enter a valid Australian phone number.");
    }
    if (!validBirthday(birthday)) throw new Error("Enter a valid date of birth.");
    if (!australianStates.has(state)) throw new Error("Select a valid state.");
    if (!/^\d{4}$/.test(postcode)) throw new Error("Enter a valid postcode.");
    if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
      throw new Error("Invalid submission reference.");
    }

    const member = await upsertClubMember(
      env,
      {
        firstName,
        lastName,
        email,
        phone,
        birthday,
        addressLine1,
        suburb,
        state,
        postcode,
      },
      idempotencyKey,
    );
    return json({ joined: true, memberCode: member.memberCode }, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not join the club.";
    return json(
      { error: message },
      error instanceof SquareCustomerError ? 502 : 400,
    );
  }
}
