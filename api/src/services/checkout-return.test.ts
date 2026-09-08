import { test } from "node:test";
import assert from "node:assert/strict";
import { configureCheckoutReturn } from "./checkout-return.js";
import { expectedValue, handlePaymentStatus, signValue } from "./payment-verification.js";
import type { ApiEnv } from "../types/env.js";

const env: ApiEnv = { WEBSITE_ORIGIN: "https://cake.example.com", SQUARE_ENVIRONMENT: "sandbox",
  SQUARE_ACCESS_TOKEN: "test-secret", SQUARE_APPLICATION_ID: "test", SQUARE_LOCATION_ID: "location",
  SQUARE_WEBHOOK_SIGNATURE_KEY: "test", SQUARE_WEBHOOK_NOTIFICATION_URL: "https://example.com/webhook" };

test("Square stores signed return link; retries recover an update whose response was lost", async t => {
  let writes = 0;
  const link = { id: "link", order_id: "order", version: 1, checkout_options: { allow_tipping: false } as Record<string, unknown> };
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    if (init.method === "PUT") {
      writes++;
      link.checkout_options = JSON.parse(init.body as string).payment_link.checkout_options;
      link.version++;
      throw new Error("Response lost after Square saved the update");
    }
    return Response.json({ payment_link: link });
  });
  await configureCheckoutReturn(env, "link", "order");
  await configureCheckoutReturn(env, "link", "order");
  assert.equal(writes, 1);
  assert.equal(link.checkout_options.allow_tipping, false);
  const url = new URL(link.checkout_options.redirect_url as string);
  assert.equal(url.origin, env.WEBSITE_ORIGIN);
  assert.equal(url.search, "");
  const params = new URLSearchParams(url.hash.slice(1));
  assert.equal(params.get("orderId"), "order");
  assert.equal(params.get("token"), await signValue(env, "receipt:order"));
});

test("return configuration refuses a mismatched Square order", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ payment_link: { id: "link", order_id: "other", version: 1 } }));
  await assert.rejects(configureCheckoutReturn(env, "link", "order"), /mismatch/);
});

test("signed return link verifies payment using only backend Square records", async t => {
  const expected = expectedValue("reference", 14500, "location");
  const order = { id: "order", version: 1, location_id: "location", reference_id: "reference",
    total_money: { amount: 14500, currency: "AUD" }, tenders: [{ payment_id: "payment" }],
    metadata: { cc_expected: expected, cc_signature: await signValue(env, expected), cc_status: "paid", cc_payment: "payment" } };
  t.mock.method(globalThis, "fetch", async (url: string) => url.endsWith("/v2/orders/order")
    ? Response.json({ order })
    : Response.json({ payment: { id: "payment", order_id: "order", location_id: "location", status: "COMPLETED", amount_money: { amount: 14500, currency: "AUD" } } }));
  const request = new Request("https://cake.example.com/api/cake/payment-status", { method: "POST",
    body: JSON.stringify({ orderId: "order", token: await signValue(env, "receipt:order") }) });
  const response = await handlePaymentStatus(request, env);
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { status: string }).status, "paid");
});

test("tampered receipt link cannot read another order", async t => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Must reject before Square access"); });
  const response = await handlePaymentStatus(new Request("https://cake.example.com/api/cake/payment-status", { method: "POST",
    body: JSON.stringify({ orderId: "other", token: await signValue(env, "receipt:order") }) }), env);
  assert.equal(response.status, 403);
});
