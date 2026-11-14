import { json } from "../http/json.js";
import { getCatalogItems } from "../services/square.js";
import { expectedValue, signValue } from "../services/payment-verification.js";
import { configureCheckoutReturn } from "../services/checkout-return.js";
import {
  normalizeSquareAddress,
  normalizeSquarePhone,
  upsertSquareCustomer,
} from "../services/square-customer.js";
import type { ApiEnv } from "../types/env.js";

const drinkChoices: Record<string, readonly string[]> = {
  temperature: ["Hot", "Cold"],
};

type CartLine = {
  variationId?: unknown;
  quantity?: unknown;
  options?: unknown;
  modifierIds?: unknown;
};

export async function handleCartCheckout(request: Request, env: ApiEnv): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (env.SQUARE_ENVIRONMENT !== "sandbox" || !env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    return json({ error: "Square Sandbox checkout is not configured." }, 503);
  }
  try {
    const raw = await request.text();
    if (raw.length > 20_000) return json({ error: "Request too large" }, 413);
    const body = JSON.parse(raw) as { items?: unknown; idempotencyKey?: unknown; orderNumber?: unknown; name?: unknown; email?: unknown; phone?: unknown; address?: unknown; termsAccepted?: unknown; allergenAccepted?: unknown };
    if (body.termsAccepted !== true) throw new Error("Accept the terms and conditions.");
    if (body.allergenAccepted !== true) throw new Error("Accept the allergen and food safety information.");
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) throw new Error("Your cart is empty or too large.");
    if (typeof body.idempotencyKey !== "string" || !/^[a-f0-9-]{36}$/i.test(body.idempotencyKey)) throw new Error("Invalid checkout request");
    if (typeof body.orderNumber !== "string" || !/^CC-[A-Z0-9]{6,20}-[A-Z0-9]{4}$/.test(body.orderNumber)) throw new Error("Invalid order number");
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = normalizeSquarePhone(typeof body.phone === "string" ? body.phone.trim() : "");
    const address = normalizeSquareAddress(body.address);
    if (!name || name.length > 100) throw new Error("Enter your full name.");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Enter a valid phone number, including its country code.");

    // Always load authoritative products, prices, and current inventory from Square.
    const products = await getCatalogItems(env);
    const lineItems: Array<Record<string, unknown>> = [];
    let total = 0;
    for (const rawLine of body.items as CartLine[]) {
      if (!rawLine || typeof rawLine !== "object") throw new Error("Invalid cart item");
      const quantity = rawLine.quantity;
      if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 99) throw new Error("Invalid quantity");
      if (typeof rawLine.variationId !== "string") throw new Error("This item is unavailable.");
      const product = products.find((item) =>
        item.variations.some((variation) => variation.id === rawLine.variationId),
      );
      const variation = product?.variations.find(
        (candidate) => candidate.id === rawLine.variationId,
      );
      if (!product || !variation || !variation.available || variation.price.currency !== "AUD" || variation.price.amount < 1) throw new Error("This item is unavailable.");
      if (variation.stock !== null && quantity as number > variation.stock) throw new Error(`${product.name} no longer has enough stock.`);

      const isDrink = product.categories.some((category) => {
        const normalized = category.trim().toLowerCase();
        return normalized === "drinks" || normalized === "drinks website";
      });
      const isWholeCake = product.categories.some((category) => {
        const normalized = category.trim().toLowerCase();
        return normalized === "whole cakes" || normalized === "whole cakes website";
      });
      let note: string | undefined;
      let selectedModifiers: Array<{ id: string; name: string; price: number }> = [];
      if (isDrink) {
        if (!rawLine.options || typeof rawLine.options !== "object" || Array.isArray(rawLine.options)) throw new Error("Choose valid drink options.");
        const options = rawLine.options as Record<string, unknown>;
        if (
          !Array.isArray(rawLine.modifierIds) ||
          rawLine.modifierIds.length > product.modifierLists.length
        ) throw new Error("Choose valid drink options.");
        const modifierIds = rawLine.modifierIds.map((id) => {
          if (typeof id !== "string") throw new Error("Choose valid drink options.");
          return id;
        });
        if (new Set(modifierIds).size !== modifierIds.length) throw new Error("Choose valid drink options.");
        const drinkModifierLists = product.modifierLists;
        selectedModifiers = drinkModifierLists.flatMap((list) =>
          list.modifiers.filter((modifier) => modifierIds.includes(modifier.id)),
        );
        if (selectedModifiers.length !== modifierIds.length) throw new Error("Choose valid drink options.");
        for (const list of drinkModifierLists) {
          const selectedCount = list.modifiers.filter((modifier) =>
            modifierIds.includes(modifier.id),
          ).length;
          if (
            selectedCount < list.minSelected ||
            (list.maxSelected > 0 && selectedCount > list.maxSelected)
          ) throw new Error("Choose valid drink options.");
        }
        const expectedOptions: Record<string, unknown> = {
          size: variation.name,
          temperature: options.temperature,
          ...Object.fromEntries(
            drinkModifierLists.map((list) => {
              const selectedName = list.modifiers.find((modifier) =>
                modifierIds.includes(modifier.id),
              )?.name;
              return [list.name, selectedName ?? "None"];
            }),
          ),
        };
        if (
          Object.entries(drinkChoices).some(
            ([key, choices]) =>
              typeof options[key] !== "string" ||
              !choices.includes(options[key] as string),
          ) ||
          Object.keys(options).length !== Object.keys(expectedOptions).length ||
          Object.entries(expectedOptions).some(
            ([key, value]) => options[key] !== value,
          )
        ) throw new Error("Choose valid drink options.");
        note = Object.entries(options).map(([key, value]) => `${key}: ${value}`).join("\n");
      } else if (isWholeCake) {
        if (
          !rawLine.options ||
          typeof rawLine.options !== "object" ||
          Array.isArray(rawLine.options)
        ) throw new Error("Choose a valid cake size.");
        const options = rawLine.options as Record<string, unknown>;
        if (
          Object.keys(options).length !== 1 ||
          options.size !== variation.name
        ) throw new Error("Choose a valid cake size.");
        if (rawLine.modifierIds !== undefined) {
          throw new Error("Invalid item modifiers.");
        }
        note = `Size: ${variation.name}`;
      } else if (rawLine.options !== undefined) {
        throw new Error("Invalid item options.");
      } else if (rawLine.modifierIds !== undefined) {
        throw new Error("Invalid item modifiers.");
      }
      total +=
        (variation.price.amount +
          selectedModifiers.reduce((sum, modifier) => sum + modifier.price, 0)) *
        (quantity as number);
      lineItems.push({
        catalog_object_id: variation.id,
        quantity: String(quantity),
        ...(selectedModifiers.length > 0
          ? {
              modifiers: selectedModifiers.map((modifier) => ({
                catalog_object_id: modifier.id,
              })),
            }
          : {}),
        ...(note ? { note } : {}),
      });
    }
    const tax = Math.round(total * 0.1);
    const shipping = 150;
    total += tax + shipping;
    lineItems.push(
      { name: "Tax", quantity: "1", base_price_money: { amount: tax, currency: "AUD" } },
      { name: "Estimated Shipping", quantity: "1", base_price_money: { amount: shipping, currency: "AUD" } },
    );

    const customerId = await upsertSquareCustomer(
      env,
      name,
      email,
      phone,
      address,
      body.idempotencyKey,
    );

    const expected = expectedValue(body.orderNumber, total, env.SQUARE_LOCATION_ID);
    const payload = {
      idempotency_key: body.idempotencyKey,
      order: {
        location_id: env.SQUARE_LOCATION_ID,
        customer_id: customerId,
        reference_id: body.orderNumber,
        line_items: lineItems,
        metadata: { cc_expected: expected, cc_signature: await signValue(env, expected), cc_status: "pending" },
      },
      checkout_options: { redirect_url: new URL("/custom-cakes/payment-result/", env.WEBSITE_ORIGIN || "http://localhost:3000").href, allow_tipping: false, ask_for_shipping_address: false, enable_coupon: false, enable_loyalty: false },
      payment_note: `Cake Cloud daily menu order · ${name}`,
    };
    const response = await fetch("https://connect.squareupsandbox.com/v2/online-checkout/payment-links", {
      method: "POST",
      headers: { authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`, "Square-Version": "2026-08-19", "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    const data = await response.json() as { payment_link?: { id?: string; url?: string; order_id?: string } };
    if (!response.ok || !data.payment_link?.id || !data.payment_link.url || !data.payment_link.order_id) return json({ error: "Square could not create the checkout page. Please retry." }, 502);
    const url = new URL(data.payment_link.url);
    if (url.protocol !== "https:" || !["square.link", "sandbox.square.link", "checkout.square.site", "sandbox.checkout.square.site"].includes(url.hostname)) return json({ error: "Square returned an unexpected checkout address." }, 502);
    await configureCheckoutReturn(env, data.payment_link.id, data.payment_link.order_id);
    return json({ url: url.href });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not start checkout." }, 400);
  }
}
