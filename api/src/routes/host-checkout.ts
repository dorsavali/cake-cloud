import { json, methodNotAllowed } from "../http/json.js";
import { getCatalogItems } from "../services/square.js";
import { expectedValue, signValue } from "../services/payment-verification.js";
import { configureCheckoutReturn } from "../services/checkout-return.js";
import type { ApiEnv } from "../types/env.js";

const maxFileBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const normalize = (value: string) => value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
const normalizePhone = (value: string) => {
  const compact = value.replace(/[\s().-]/g, "");
  if (/^04\d{8}$/.test(compact)) return `+61${compact.slice(1)}`;
  if (/^4\d{8}$/.test(compact)) return `+61${compact}`;
  return compact;
};

type SquareCustomer = { id?: string; version?: number };

async function squareCustomerRequest<T>(env: ApiEnv, path: string, method: "POST" | "PUT", body: unknown): Promise<T> {
  const baseUrl = env.SQUARE_ENVIRONMENT === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`, "Square-Version": "2026-08-19", "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { errors?: Array<{ code?: string }> };
    const code = result.errors?.[0]?.code ?? `HTTP_${response.status}`;
    if (code === "INVALID_EMAIL_ADDRESS") throw new Error("Square did not accept this email address.");
    if (code === "INVALID_PHONE_NUMBER") throw new Error("Square did not accept this phone number. Include its country code.");
    if (code === "UNAUTHORIZED" || code === "FORBIDDEN" || code === "REQUEST_NOT_AUTHORIZED") throw new Error("Square customer access is missing. Enable CUSTOMERS_READ and CUSTOMERS_WRITE permissions.");
    throw new Error(`Square could not save the customer details (${code}).`);
  }
  return response.json() as Promise<T>;
}

async function upsertSquareCustomer(env: ApiEnv, fullName: string, email: string, phone: string, idempotencyKey: string) {
  const search = await squareCustomerRequest<{ customers?: SquareCustomer[] }>(env, "/v2/customers/search", "POST", {
    limit: 1,
    query: { filter: { email_address: { exact: email } } },
  });
  const existing = search.customers?.[0];
  if (existing?.id) return existing.id;
  const created = await squareCustomerRequest<{ customer?: SquareCustomer }>(env, "/v2/customers", "POST", {
    idempotency_key: idempotencyKey,
    given_name: fullName,
    email_address: email,
    phone_number: phone,
  });
  if (!created.customer?.id) throw new Error("Square could not save the customer details.");
  return created.customer.id;
}

function text(form: FormData, key: string, max: number, required = false) {
  const value = form.get(key);
  if (typeof value !== "string") throw new Error(required ? `Enter ${key}.` : `Invalid ${key}.`);
  const clean = value.trim();
  if ((required && !clean) || clean.length > max) throw new Error(`Invalid ${key}.`);
  return clean;
}

function validImageHeader(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}

export async function handleHostCheckout(request: Request, env: ApiEnv): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed();
  if (env.SQUARE_ENVIRONMENT !== "sandbox" || !env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) return json({ error: "Square Sandbox checkout is not configured." }, 503);
  const origin = request.headers.get("origin");
  if (origin && env.WEBSITE_ORIGIN && origin !== new URL(env.WEBSITE_ORIGIN).origin) return json({ error: "Invalid request origin." }, 403);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxFileBytes + 100_000) return json({ error: "Upload is too large." }, 413);

  const stored: string[] = [];
  try {
    const form = await request.formData();
    const fullName = text(form, "fullName", 100, true);
    const email = text(form, "email", 254, true).toLowerCase();
    const phone = normalizePhone(text(form, "phone", 30, true));
    const eventDate = text(form, "eventDate", 10, true);
    const notes = text(form, "notes", 1500);
    const idempotencyKey = text(form, "idempotencyKey", 36, true);
    if (!/^[a-f0-9-]{36}$/i.test(idempotencyKey)) throw new Error("Invalid checkout request.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email.");
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Enter a valid phone number, including its country code.");
    if (form.get("termsAccepted") !== "true") throw new Error("Accept the terms and conditions.");
    const parsedDate = new Date(`${eventDate}T00:00:00Z`);
    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || parsedDate.toISOString().slice(0, 10) !== eventDate || parsedDate < tomorrow) throw new Error("Choose a future event date.");

    let requested: unknown;
    try { requested = JSON.parse(text(form, "items", 10_000, true)); } catch { throw new Error("Invalid package request."); }
    if (!Array.isArray(requested) || requested.length < 1 || requested.length > 20) throw new Error("Your package request is empty or too large.");

    // Client storage supplies only identifiers and counts. Names, prices and
    // limits are always reloaded from the authoritative Square catalog here.
    const products = await getCatalogItems(env);
    const hostProducts = products.filter((product) => {
      const section = normalize(String(product.customAttributes.site_section ?? ""));
      return section === "host" || product.categories.some((category) => normalize(category) === "host packages");
    });
    const lineItems: Array<Record<string, unknown>> = [];
    const summary: Array<{ id: string; name: string; guests: number; unitPrice: number; priceUnit: string }> = [];
    let total = 0;
    for (const raw of requested) {
      if (!raw || typeof raw !== "object") throw new Error("Invalid package request.");
      const { id, guests } = raw as { id?: unknown; guests?: unknown };
      if (typeof id !== "string" || !Number.isInteger(guests)) throw new Error("Invalid package request.");
      const product = hostProducts.find((candidate) => candidate.id === id);
      if (!product || !product.variationId || product.price.currency !== "AUD" || product.price.amount < 1) throw new Error("A selected package is no longer available.");
      const minimum = Number(product.customAttributes.minimum_guests ?? product.customAttributes.minimum_quantity ?? 10);
      const maximumValue = Number(product.customAttributes.maximum_guests);
      const maximum = Number.isFinite(maximumValue) && maximumValue > 0 ? maximumValue : 9999;
      if ((guests as number) < minimum || (guests as number) > maximum) throw new Error(`${product.name} requires between ${minimum} and ${maximum} guests.`);
      const fixed = normalize(String(product.customAttributes.pricing_model ?? "")) === "fixed";
      const quantity = fixed ? 1 : guests as number;
      total += product.price.amount * quantity;
      lineItems.push({ catalog_object_id: product.variationId, quantity: String(quantity), note: fixed ? `${guests} guests` : undefined });
      summary.push({ id: product.id, name: product.name, guests: guests as number, unitPrice: product.price.amount, priceUnit: fixed ? "package" : "head" });
    }

    const customerId = await upsertSquareCustomer(env, fullName, email, phone, idempotencyKey);

    const reference = crypto.randomUUID();
    const file = form.get("logo");
    let logoKey = "";
    if (file instanceof File && file.size > 0) {
      if (!env.CAKE_BRIEFS) return json({ error: "Logo uploads are not configured." }, 503);
      if (file.size > maxFileBytes || !allowedTypes.has(file.type)) throw new Error("Logo must be JPG, PNG, or WebP and no larger than 5 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!validImageHeader(file.type, bytes)) throw new Error("The uploaded logo is invalid.");
      const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      logoKey = `host-requests/${reference}/logo.${extension}`;
      await env.CAKE_BRIEFS.put(logoKey, bytes.buffer, { httpMetadata: { contentType: file.type }, customMetadata: { originalName: file.name.slice(0, 200) } });
      stored.push(logoKey);
    }

    const record = { reference, fullName, email, phone, eventDate, notes, logoKey: logoKey || null, items: summary, total, submittedAt: new Date().toISOString() };
    if (env.CAKE_BRIEFS) {
      const recordKey = `host-requests/${reference}/request.json`;
      await env.CAKE_BRIEFS.put(recordKey, JSON.stringify(record), { httpMetadata: { contentType: "application/json" } });
      stored.push(recordKey);
    }

    const expected = expectedValue(reference, total, env.SQUARE_LOCATION_ID);
    const orderNote = [`Event date: ${eventDate}`, `Contact: ${fullName} · ${email} · ${phone}`, notes ? `Notes: ${notes}` : "", logoKey ? `Logo/design reference: ${reference}` : ""].filter(Boolean).join("\n");
    lineItems[0] = { ...lineItems[0], note: [lineItems[0].note, orderNote].filter(Boolean).join("\n") };
    const returnUrl = new URL("/events/payment-result/", env.WEBSITE_ORIGIN || "http://localhost:3000");
    const pickupAt = new Date(`${eventDate}T12:00:00+08:00`).toISOString();
    const payload = {
      idempotency_key: idempotencyKey,
      order: {
        location_id: env.SQUARE_LOCATION_ID,
        customer_id: customerId,
        reference_id: reference,
        line_items: lineItems,
        fulfillments: [{
          type: "PICKUP",
          state: "PROPOSED",
          pickup_details: {
            schedule_type: "SCHEDULED",
            pickup_at: pickupAt,
            recipient: {
              display_name: fullName,
              email_address: email,
              phone_number: phone,
              customer_id: customerId,
            },
          },
        }],
        metadata: { cc_expected: expected, cc_signature: await signValue(env, expected), cc_status: "pending", cc_order_type: "host", cc_event_date: eventDate, cc_request: reference },
      },
      checkout_options: { redirect_url: returnUrl.href, allow_tipping: false, ask_for_shipping_address: false, enable_coupon: false, enable_loyalty: false },
      payment_note: `Cake Cloud host request · ${fullName}\n${orderNote}`,
    };
    const response = await fetch("https://connect.squareupsandbox.com/v2/online-checkout/payment-links", { method: "POST", headers: { authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`, "Square-Version": "2026-08-19", "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20_000) });
    const data = await response.json() as { payment_link?: { id?: string; url?: string; order_id?: string }; errors?: Array<{ code?: string }> };
    if (!response.ok) {
      const code = data.errors?.[0]?.code;
      if (code === "INVALID_EMAIL_ADDRESS") throw new Error("Square did not accept this email address.");
      if (code === "INVALID_PHONE_NUMBER") throw new Error("Square did not accept this phone number. Include its country code.");
    }
    if (!response.ok || !data.payment_link?.id || !data.payment_link.url || !data.payment_link.order_id) throw new Error("Square could not create the checkout page. Please retry.");
    const destination = new URL(data.payment_link.url);
    if (destination.protocol !== "https:" || !["square.link", "sandbox.square.link", "checkout.square.site", "sandbox.checkout.square.site"].includes(destination.hostname)) throw new Error("Square returned an unexpected checkout address.");
    await configureCheckoutReturn(env, data.payment_link.id, data.payment_link.order_id, "/events/payment-result/");
    return json({ url: destination.href, total, currency: "AUD" });
  } catch (error) {
    if (stored.length && env.CAKE_BRIEFS) await env.CAKE_BRIEFS.delete(stored).catch(() => undefined);
    return json({ error: error instanceof Error ? error.message : "Could not start checkout." }, 400);
  }
}
