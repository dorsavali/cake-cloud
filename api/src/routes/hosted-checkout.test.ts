import { test } from "node:test";
import assert from "node:assert/strict";
import { handleHostedCheckout } from "./hosted-checkout.js";
import type { ApiEnv } from "../types/env.js";

const env: ApiEnv = { SQUARE_ENVIRONMENT: "sandbox", SQUARE_ACCESS_TOKEN: "test", SQUARE_LOCATION_ID: "location",
  SQUARE_APPLICATION_ID: "test", SQUARE_WEBHOOK_SIGNATURE_KEY: "test", SQUARE_WEBHOOK_NOTIFICATION_URL: "https://example.com/webhook" };
function request(email: unknown) {
  return new Request("https://example.com/api/cake/checkout", { method: "POST", body: JSON.stringify({
    name: " Customer ", email, idempotencyKey: "b536efba-c6e2-4c76-91bb-7a543bca3420",
    pickup: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16), expectedTotal: 14500,
    cake: { base: "classic-round", size: 0, height: 0, filling: 0, sponge: "Vanilla", frosting: "Smooth Buttercream", colour: "Ivory", extras: [], message: "" },
  }) });
}

test("backend sends submitted email as Square pickup contact without conflicting buyer_email", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    if (init.method !== "POST") {
      const options = init.method === "PUT" ? JSON.parse(init.body as string).payment_link.checkout_options : {};
      return Response.json({ payment_link: { id: "link-test", version: 1, order_id: "order-test", checkout_options: options } });
    }
    calls++;
    assert.equal(url, "https://connect.squareupsandbox.com/v2/online-checkout/payment-links");
    const payload = JSON.parse(init.body as string);
    assert.deepEqual(payload.order.fulfillments[0].pickup_details.recipient, {
      display_name: "Customer", email_address: "Customer+cake@example.com",
    });
    assert.equal(payload.pre_populated_data, undefined);
    return Response.json({ payment_link: { id: "link-test", url: "https://sandbox.square.link/u/test", order_id: "order-test" } });
  });
  const response = await handleHostedCheckout(request("  Customer+cake@example.com  "), env);
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
});

test("backend rejects invalid emails before contacting Square", async t => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected Square call"); });
  for (const email of ["", "not-an-email", "a@example.com\r\nBcc: other@example.com", null, ["a@example.com"]]) {
    assert.equal((await handleHostedCheckout(request(email), env)).status, 400);
  }
});
