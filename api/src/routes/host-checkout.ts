import { json, methodNotAllowed } from "../http/json.js";
import { getCatalogItemSnapshots, isSquareCheckoutEnabled } from "../services/square.js";
import { squareFetch } from "../services/square-api.js";
import { expectedValue, signValue } from "../services/payment-verification.js";
import { configureCheckoutReturn } from "../services/checkout-return.js";
import { orderNumberFromSeed } from "../services/order-number.js";
import {
  hostPackageMinimumGuests,
  hostPackagePriceUnit,
  parseHostModifierSelections,
} from "../services/host-package.js";
import {
  isAustralianPhone,
  normalizeSquareAddress,
  normalizeSquarePhone,
  upsertSquareCustomer,
} from "../services/square-customer.js";
import type { ApiEnv } from "../types/env.js";
import { getCachedCatalogItems } from "./catalog.js";

const maxRequestBytes = 100_000;
const normalize = (value: string) => value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
function text(form: FormData, key: string, max: number, required = false) {
  const value = form.get(key);
  if (typeof value !== "string") throw new Error(required ? `Enter ${key}.` : `Invalid ${key}.`);
  const clean = value.trim();
  if ((required && !clean) || clean.length > max) throw new Error(`Invalid ${key}.`);
  return clean;
}

export async function handleHostCheckout(request: Request, env: ApiEnv): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed();
  if (!isSquareCheckoutEnabled(env) || !env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) return json({ error: "Square checkout is not configured." }, 503);
  const origin = request.headers.get("origin");
  if (origin && env.WEBSITE_ORIGIN && origin !== new URL(env.WEBSITE_ORIGIN).origin) return json({ error: "Invalid request origin." }, 403);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxRequestBytes) return json({ error: "Request is too large." }, 413);

  const stored: string[] = [];
  try {
    const form = await request.formData();
    const fullName = text(form, "fullName", 100, true);
    const email = text(form, "email", 254, true).toLowerCase();
    const phone = normalizeSquarePhone(text(form, "phone", 30, true));
    const address = normalizeSquareAddress(form.get("address"));
    const eventDate = text(form, "eventDate", 10, true);
    const notes = text(form, "notes", 1500);
    const idempotencyKey = text(form, "idempotencyKey", 36, true);
    if (!/^[a-f0-9-]{36}$/i.test(idempotencyKey)) throw new Error("Invalid checkout request.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email.");
    if (!isAustralianPhone(phone)) throw new Error("Enter a valid Australian phone number.");
    if (form.get("termsAccepted") !== "true") throw new Error("Accept the terms and conditions.");
    if (form.get("allergenAccepted") !== "true") throw new Error("Accept the allergen and food safety information.");
    const parsedDate = new Date(`${eventDate}T00:00:00Z`);
    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || parsedDate.toISOString().slice(0, 10) !== eventDate || parsedDate < tomorrow) throw new Error("Choose a future event date.");

    let requested: unknown;
    try { requested = JSON.parse(text(form, "items", 10_000, true)); } catch { throw new Error("Invalid package request."); }
    if (!Array.isArray(requested) || requested.length < 1 || requested.length > 20) throw new Error("Your package request is empty or too large.");

    // Client input supplies identifiers and counts. Verify current prices and
    // availability against Square before creating a payment link.
    const products = await getCachedCatalogItems(env);
    const hostProducts = products.filter((product) => {
      const section = normalize(String(product.customAttributes.site_section ?? ""));
      return section === "host" || product.categories.some((category) => {
        const normalized = normalize(category);
        return normalized === "host" || normalized === "host packages";
      });
    });
    const requestedIds = requested.flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const id = (raw as { id?: unknown }).id;
      return typeof id === "string" ? [id] : [];
    });
    let liveProducts: Awaited<ReturnType<typeof getCatalogItemSnapshots>>;
    try {
      liveProducts = await getCatalogItemSnapshots(env, requestedIds);
    } catch {
      throw new Error("Square could not verify package availability. Please retry.");
    }

    const lineItems: Array<Record<string, unknown>> = [];
    const summary: Array<{ id: string; name: string; guests: number; unitPrice: number; priceUnit: string; modifiers: string[] }> = [];
    let total = 0;
    for (const raw of requested) {
      if (!raw || typeof raw !== "object") throw new Error("Invalid package request.");
      const { id, guests, modifiers: rawModifiers, modifierIds: rawModifierIds } = raw as {
        id?: unknown;
        guests?: unknown;
        modifiers?: unknown;
        modifierIds?: unknown;
      };
      if (typeof id !== "string" || !Number.isInteger(guests)) throw new Error("Invalid package request.");
      const requestedModifiers = parseHostModifierSelections(
        rawModifiers,
        rawModifierIds,
      );
      const product = hostProducts.find((candidate) => candidate.id === id);
      const liveProduct = liveProducts.get(id);
      const changed = Boolean(
        product &&
        liveProduct &&
        (product.variationId !== liveProduct.variationId ||
          product.price.amount !== liveProduct.price.amount ||
          product.price.currency !== liveProduct.price.currency),
      );
      if (
        !product ||
        !product.variationId ||
        !product.available ||
        product.price.currency !== "AUD" ||
        product.price.amount < 1 ||
        !liveProduct ||
        !liveProduct.available ||
        !liveProduct.variationId ||
        liveProduct.price.currency !== "AUD" ||
        liveProduct.price.amount < 1 ||
        changed
      ) {
        throw new Error("A package changed or is no longer available. Review your request and try again.");
      }
      const requestedQuantities = new Map(
        requestedModifiers.map((modifier) => [modifier.id, modifier.quantity]),
      );
      const selectedModifiers = product.modifierLists.flatMap((list) =>
        list.modifiers.flatMap((modifier) => {
          const quantity = requestedQuantities.get(modifier.id) ?? 0;
          return quantity > 0 ? [{ ...modifier, quantity }] : [];
        }),
      );
      if (selectedModifiers.length !== requestedModifiers.length) {
        throw new Error(`Choose valid options for ${product.name}.`);
      }
      for (const list of product.modifierLists) {
        const selectedCount = list.modifiers.reduce(
          (sum, modifier) => sum + (requestedQuantities.get(modifier.id) ?? 0),
          0,
        );
        if (
          selectedCount < list.minSelected ||
          (list.maxSelected > 0 && selectedCount > list.maxSelected)
        ) {
          throw new Error(`Choose the required ${list.name} option for ${product.name}.`);
        }
      }
      const minimum = hostPackageMinimumGuests(
        product.customAttributes,
        product.description,
      );
      const maximumValue = Number(product.customAttributes.maximum_guests);
      const maximum = Number.isFinite(maximumValue) && maximumValue > 0 ? maximumValue : 9999;
      if ((guests as number) < minimum || (guests as number) > maximum) throw new Error(`${product.name} requires between ${minimum} and ${maximum} guests.`);
      const priceUnit = hostPackagePriceUnit(product.customAttributes);
      const fixed = priceUnit === "package";
      const quantity = fixed ? 1 : guests as number;
      const unitPrice =
        liveProduct.price.amount +
        selectedModifiers.reduce(
          (sum, modifier) => sum + modifier.price * modifier.quantity,
          0,
        );
      total += unitPrice * quantity;
      lineItems.push({
        catalog_object_id: liveProduct.variationId,
        quantity: String(quantity),
        note: fixed ? `${guests} guests` : undefined,
        ...(selectedModifiers.length > 0
          ? {
              modifiers: selectedModifiers.map((modifier) => ({
                catalog_object_id: modifier.id,
                quantity: String(modifier.quantity),
              })),
            }
          : {}),
      });
      summary.push({
        id: product.id,
        name: product.name,
        guests: guests as number,
        unitPrice,
        priceUnit,
        modifiers: selectedModifiers.map((modifier) =>
          modifier.quantity > 1
            ? `${modifier.name} × ${modifier.quantity}`
            : modifier.name,
        ),
      });
    }

    const customerId = await upsertSquareCustomer(
      env,
      fullName,
      email,
      phone,
      address,
      idempotencyKey,
      false,
    );

    const reference = orderNumberFromSeed("HOST", idempotencyKey);
    const record = { reference, fullName, email, phone, address: address || null, eventDate, notes, items: summary, total, submittedAt: new Date().toISOString() };
    if (env.CAKE_BRIEFS) {
      const recordKey = `host-requests/${reference}/request.json`;
      await env.CAKE_BRIEFS.put(recordKey, JSON.stringify(record), { httpMetadata: { contentType: "application/json" } });
      stored.push(recordKey);
    }

    const expected = expectedValue(reference, total, env.SQUARE_LOCATION_ID);
    const orderNote = [`Order: ${reference}`, `Event date: ${eventDate}`, `Contact: ${fullName} · ${email} · ${phone}`, address ? `Address: ${address}` : "", notes ? `Notes: ${notes}` : ""].filter(Boolean).join("\n");
    lineItems[0] = { ...lineItems[0], note: [lineItems[0].note, orderNote].filter(Boolean).join("\n") };
    const returnUrl = new URL("/host/payment-result/", env.WEBSITE_ORIGIN || "http://localhost:3000");
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
        metadata: { cc_expected: expected, cc_signature: await signValue(env, expected), cc_status: "pending", cc_order_number: reference, cc_order_type: "host", cc_event_date: eventDate, cc_request: reference },
      },
      checkout_options: { redirect_url: returnUrl.href, allow_tipping: false, ask_for_shipping_address: false, enable_coupon: false, enable_loyalty: false },
      payment_note: `${reference} · Cake Cloud host request · ${fullName}\n${orderNote}`,
    };
    const response = await squareFetch(env, "/v2/online-checkout/payment-links", { method: "POST", body: payload, timeoutMs: 20_000 });
    const data = await response.json() as { payment_link?: { id?: string; url?: string; order_id?: string }; errors?: Array<{ code?: string }> };
    if (!response.ok) {
      const code = data.errors?.[0]?.code;
      if (code === "INVALID_EMAIL_ADDRESS") throw new Error("Square did not accept this email address.");
      if (code === "INVALID_PHONE_NUMBER") throw new Error("Square did not accept this phone number. Include its country code.");
    }
    if (!response.ok || !data.payment_link?.id || !data.payment_link.url || !data.payment_link.order_id) throw new Error("Square could not create the checkout page. Please retry.");
    const destination = new URL(data.payment_link.url);
    if (destination.protocol !== "https:" || !["square.link", "sandbox.square.link", "checkout.square.site", "sandbox.checkout.square.site"].includes(destination.hostname)) throw new Error("Square returned an unexpected checkout address.");
    await configureCheckoutReturn(env, data.payment_link.id, data.payment_link.order_id, "/host/payment-result/");
    return json({ url: destination.href, total, currency: "AUD" });
  } catch (error) {
    if (stored.length && env.CAKE_BRIEFS) await env.CAKE_BRIEFS.delete(stored).catch(() => undefined);
    return json({ error: error instanceof Error ? error.message : "Could not start checkout." }, 400);
  }
}
