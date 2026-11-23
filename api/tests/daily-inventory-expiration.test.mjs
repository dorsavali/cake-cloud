import assert from "node:assert/strict";
import { test } from "node:test";

import { expireDailyInventoryReservation } from "../dist/durable-objects/daily-inventory-expiration.js";

const reservation = {
  attemptId: "attempt-1",
  lines: [{ variationId: "cake", quantity: 1, availableQuantity: 1 }],
  status: "ready",
  createdAt: 1,
  expiresAt: 2,
  checkoutPayload: { idempotency_key: "attempt-1" },
  paymentLink: { id: "link-1", orderId: "order-1", url: "https://square.link/u/test" },
};

function dependencies(status, inventoryApplied = true, deleteOutcome = "cancelled") {
  const calls = [];
  return {
    calls,
    value: {
      async recoverPaymentLink(current) {
        calls.push("recover");
        return current;
      },
      async paymentStatus() {
        calls.push("verify");
        return status;
      },
      async paidInventoryWasApplied() {
        calls.push("inventory");
        return inventoryApplied;
      },
      async deletePaymentLink() {
        calls.push("delete-link");
        return deleteOutcome;
      },
      async release() {
        calls.push("release");
      },
    },
  };
}

test("an unpaid link is deleted before inventory is released", async () => {
  const deps = dependencies("pending");
  await expireDailyInventoryReservation(reservation, deps.value);
  assert.deepEqual(deps.calls, ["recover", "verify", "delete-link", "release"]);
});

test("a deletion interrupted after Square succeeds is safely resumed", async () => {
  const deps = dependencies("pending");
  await expireDailyInventoryReservation(
    { ...reservation, status: "deleting-link" },
    deps.value,
  );
  assert.deepEqual(deps.calls, ["delete-link", "release"]);
});

test("a payment completed during link deletion is preserved", async () => {
  const deps = dependencies("pending", true, "paid");
  await expireDailyInventoryReservation(reservation, deps.value);
  assert.deepEqual(deps.calls, [
    "recover",
    "verify",
    "delete-link",
    "inventory",
    "release",
  ]);
});

test("paid inventory is released only after Square inventory is updated", async () => {
  const waiting = dependencies("paid", false);
  await assert.rejects(
    expireDailyInventoryReservation(reservation, waiting.value),
    /not visible yet/,
  );
  assert.deepEqual(waiting.calls, ["recover", "verify", "inventory"]);

  const applied = dependencies("paid", true);
  await expireDailyInventoryReservation(reservation, applied.value);
  assert.deepEqual(applied.calls, ["recover", "verify", "inventory", "release"]);
});

test("a refunded payment follows the same inventory-safe release path", async () => {
  const deps = dependencies("refunded", true);
  await expireDailyInventoryReservation(reservation, deps.value);
  assert.deepEqual(deps.calls, ["recover", "verify", "inventory", "release"]);
});

test("review and unknown payment states fail closed", async () => {
  for (const status of ["review", null]) {
    const deps = dependencies(status);
    await assert.rejects(
      expireDailyInventoryReservation(reservation, deps.value),
      /requires review/,
    );
    assert.equal(deps.calls.includes("delete-link"), false);
    assert.equal(deps.calls.includes("release"), false);
  }
});
