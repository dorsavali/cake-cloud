import { test } from "node:test";
import assert from "node:assert/strict";
import { handleCheckoutSession } from "./checkout-session.js";

test("checkout IDs are generated on the server and never cached", async () => {
  const request = new Request("https://example.com/api/cake/checkout-session", { method: "POST" });
  const first = handleCheckoutSession(request);
  const second = handleCheckoutSession(request);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("cache-control"), "no-store");
  const a = await first.json() as { idempotencyKey: string };
  const b = await second.json() as { idempotencyKey: string };
  assert.match(a.idempotencyKey, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
  assert.notEqual(a.idempotencyKey, b.idempotencyKey);
});

test("checkout session rejects GET", () => {
  assert.equal(handleCheckoutSession(new Request("https://example.com/api/cake/checkout-session")).status, 405);
});
