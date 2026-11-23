import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createDailyMenuCheckout,
  holdDailyInventory,
  notifyDailyInventoryChanged,
} from "../dist/services/daily-inventory-reservations.js";

test("Daily Menu reservations use one Durable Object per Square location", async () => {
  let selectedName;
  let receivedRequest;
  const objectId = { location: "test-location" };
  const env = {
    SQUARE_LOCATION_ID: "test-location",
    DAILY_INVENTORY_RESERVATIONS: {
      idFromName(name) {
        selectedName = name;
        return objectId;
      },
      get(id) {
        assert.equal(id, objectId);
        return {
          async fetch(request) {
            receivedRequest = request;
            return Response.json({ ok: true, reused: false }, { status: 201 });
          },
        };
      },
    },
  };

  const result = await holdDailyInventory(env, "checkout-attempt", [
    { variationId: "cake", quantity: 1, availableQuantity: 1 },
  ]);

  assert.deepEqual(result, { ok: true, reused: false });
  assert.equal(selectedName, "test-location");
  assert.equal(new URL(receivedRequest.url).pathname, "/reserve");
  assert.deepEqual(await receivedRequest.json(), {
    attemptId: "checkout-attempt",
    lines: [{ variationId: "cake", quantity: 1, availableQuantity: 1 }],
  });
});

test("inventory webhooks notify the Durable Object for the Square location", async () => {
  let body;
  const env = {
    SQUARE_LOCATION_ID: "test-location",
    DAILY_INVENTORY_RESERVATIONS: {
      idFromName: (name) => name,
      get: () => ({
        async fetch(request) {
          body = await request.json();
          return Response.json({ accepted: true }, { status: 202 });
        },
      }),
    },
  };

  await notifyDailyInventoryChanged(env, ["cake", "cake", "drink"]);
  assert.deepEqual(body, { variationIds: ["cake", "drink"] });
});

test("checkout fails closed when the Durable Object binding is missing", async () => {
  await assert.rejects(
    holdDailyInventory(
      { SQUARE_LOCATION_ID: "test-location" },
      "checkout-attempt",
      [{ variationId: "cake", quantity: 1, availableQuantity: 1 }],
    ),
    /not configured/,
  );
});

test("Daily Menu checkout sends the validated Square payload to the coordinator", async () => {
  let body;
  const env = {
    SQUARE_LOCATION_ID: "test-location",
    DAILY_INVENTORY_RESERVATIONS: {
      idFromName: (name) => name,
      get: () => ({
        async fetch(request) {
          body = await request.json();
          return Response.json({
            ok: true,
            url: "https://sandbox.square.link/u/test",
            expiresAt: 1_700_000_180_000,
          });
        },
      }),
    },
  };
  const payload = { idempotency_key: "checkout-attempt", order: {} };

  const result = await createDailyMenuCheckout(
    env,
    "checkout-attempt",
    [{ variationId: "cake", quantity: 1, availableQuantity: 2 }],
    payload,
  );

  assert.equal(result.url, "https://sandbox.square.link/u/test");
  assert.deepEqual(body, {
    attemptId: "checkout-attempt",
    lines: [{ variationId: "cake", quantity: 1, availableQuantity: 2 }],
    checkoutPayload: payload,
  });
});
