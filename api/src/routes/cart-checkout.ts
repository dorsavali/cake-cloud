import { json } from "../http/json.js";
import { getCatalogItems } from "../services/square.js";
import { expectedValue, signValue } from "../services/payment-verification.js";
import { configureCheckoutReturn } from "../services/checkout-return.js";
import type { ApiEnv } from "../types/env.js";

const drinkChoices: Record<string, readonly string[]> = {
  size: ["Small (240ml)", "Regular (350ml)", "Large (450ml)"],
  temperature: ["Hot", "Cold"],
  milk: ["Whole Milk", "Oat Milk", "Almond Milk"],
  syrup: ["Standard (2 Pumps)", "Less Sweet (1 Pump)", "Sugar-Free"],
  caffeine: ["Regular (Double Shot)", "Decaf"],
};

type CartLine = { variationId?: unknown; quantity?: unknown; options?: unknown };

export async function handleCartCheckout(request: Request, env: ApiEnv): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (env.SQUARE_ENVIRONMENT !== "sandbox" || !env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    return json({ error: "Square Sandbox checkout is not configured." }, 503);
  }
  try {
    const raw = await request.text();
    if (raw.length > 20_000) return json({ error: "Request too large" }, 413);
    const body = JSON.parse(raw) as { items?: unknown; idempotencyKey?: unknown };
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) throw new Error("Your cart is empty or too large.");
    if (typeof body.idempotencyKey !== "string" || !/^[a-f0-9-]{36}$/i.test(body.idempotencyKey)) throw new Error("Invalid checkout request");

    // Always load authoritative products, prices, and current inventory from Square.
    const products = await getCatalogItems(env);
    const lineItems: Array<Record<string, unknown>> = [];
    let total = 0;
    let largeUpgrades = 0;
    for (const rawLine of body.items as CartLine[]) {
      if (!rawLine || typeof rawLine !== "object") throw new Error("Invalid cart item");
      const quantity = rawLine.quantity;
      if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 99) throw new Error("Invalid quantity");
      if (typeof rawLine.variationId !== "string") throw new Error("This item is unavailable.");
      const product = products.find((item) => item.variationId === rawLine.variationId);
      if (!product || product.price.currency !== "AUD" || product.price.amount < 1) throw new Error("This item is unavailable.");
      if (product.stock !== null && quantity as number > product.stock) throw new Error(`${product.name} no longer has enough stock.`);

      const isDrink = product.categories.some((category) => category.trim().toLowerCase() === "drinks");
      let note: string | undefined;
      if (isDrink) {
        if (!rawLine.options || typeof rawLine.options !== "object" || Array.isArray(rawLine.options)) throw new Error("Choose valid drink options.");
        const options = rawLine.options as Record<string, unknown>;
        if (Object.keys(options).length !== Object.keys(drinkChoices).length || Object.entries(drinkChoices).some(([key, choices]) => typeof options[key] !== "string" || !choices.includes(options[key] as string))) throw new Error("Choose valid drink options.");
        note = Object.entries(options).map(([key, value]) => `${key}: ${value}`).join("\n");
        if (options.size === "Large (450ml)") largeUpgrades += quantity as number;
      } else if (rawLine.options !== undefined) {
        throw new Error("Invalid item options.");
      }
      total += product.price.amount * (quantity as number);
      lineItems.push({ catalog_object_id: product.variationId, quantity: String(quantity), ...(note ? { note } : {}) });
    }
    if (largeUpgrades) {
      total += largeUpgrades * 100;
      lineItems.push({ name: "Large drink upgrade", quantity: String(largeUpgrades), base_price_money: { amount: 100, currency: "AUD" } });
    }

    const expected = expectedValue(body.idempotencyKey, total, env.SQUARE_LOCATION_ID);
    const payload = {
      idempotency_key: body.idempotencyKey,
      order: {
        location_id: env.SQUARE_LOCATION_ID,
        reference_id: body.idempotencyKey,
        line_items: lineItems,
        metadata: { cc_expected: expected, cc_signature: await signValue(env, expected), cc_status: "pending" },
      },
      checkout_options: { redirect_url: new URL("/custom-cakes/payment-result/", env.WEBSITE_ORIGIN || "http://localhost:3000").href, allow_tipping: false, ask_for_shipping_address: false, enable_coupon: false, enable_loyalty: false },
      payment_note: "Cake Cloud daily menu order",
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
