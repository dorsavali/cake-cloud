import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DAILY_INVENTORY_HOLD_MS,
  deleteDailyInventoryReservation,
  discardDailyInventoryReservation,
  dueDailyInventoryReservations,
  markDailyInventoryReservationReady,
  reserveDailyInventory,
} from "../dist/durable-objects/daily-inventory-reservation-ledger.js";

class MemoryReservationStorage {
  #data = new Map();
  #tail = Promise.resolve();

  transaction(callback) {
    const run = this.#tail.then(() =>
      callback({
        get: async (key) => structuredClone(this.#data.get(key)),
        put: async (key, value) => {
          this.#data.set(key, structuredClone(value));
        },
      }),
    );
    this.#tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

test("only one of two simultaneous customers can reserve the final item", async () => {
  const storage = new MemoryReservationStorage();
  const line = {
    variationId: "last-cake",
    quantity: 1,
    availableQuantity: 1,
  };

  const results = await Promise.all([
    reserveDailyInventory(storage, { attemptId: "customer-1", lines: [line] }),
    reserveDailyInventory(storage, { attemptId: "customer-2", lines: [line] }),
  ]);

  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(
    results.filter(
      (result) => !result.ok && result.reason === "insufficient-inventory",
    ).length,
    1,
  );
  const rejected = results.find((result) => !result.ok);
  assert.equal(rejected?.availableQuantity, 0);
});

test("a conflict reports how many units are still reservable", async () => {
  const storage = new MemoryReservationStorage();
  await reserveDailyInventory(storage, {
    attemptId: "customer-1",
    lines: [{ variationId: "cake", quantity: 2, availableQuantity: 3 }],
  });

  const result = await reserveDailyInventory(storage, {
    attemptId: "customer-2",
    lines: [{ variationId: "cake", quantity: 2, availableQuantity: 3 }],
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "insufficient-inventory",
    variationId: "cake",
    availableQuantity: 1,
  });
});

test("retrying the same checkout attempt reuses its reservation", async () => {
  const storage = new MemoryReservationStorage();
  const request = {
    attemptId: "same-attempt",
    lines: [
      { variationId: "cake-1", quantity: 1, availableQuantity: 1 },
    ],
  };
  const now = 1_700_000_000_000;

  const first = await reserveDailyInventory(storage, request, now);
  const retry = await reserveDailyInventory(storage, request, now + 1_000);

  assert.equal(first.ok, true);
  assert.equal(retry.ok, true);
  assert.equal(retry.ok && retry.reused, true);
  assert.equal(
    retry.ok && retry.reservation.expiresAt,
    now + DAILY_INVENTORY_HOLD_MS,
  );
});

test("the three-minute hold starts when the Square link becomes ready", async () => {
  const storage = new MemoryReservationStorage();
  const createdAt = 1_700_000_000_000;
  const readyAt = createdAt + 20_000;
  const result = await reserveDailyInventory(
    storage,
    {
      attemptId: "ready-attempt",
      lines: [{ variationId: "cake", quantity: 1, availableQuantity: 1 }],
    },
    createdAt,
  );

  assert.equal(result.ok, true);
  const ready = markDailyInventoryReservationReady(
    result.reservation,
    readyAt,
  );
  assert.equal(ready.status, "ready");
  assert.equal(ready.expiresAt, readyAt + DAILY_INVENTORY_HOLD_MS);
});

test("retrying a ready Square link does not extend its hold", async () => {
  const originalExpiry = 1_700_000_180_000;
  const ready = {
    attemptId: "ready-retry",
    lines: [{ variationId: "cake", quantity: 1, availableQuantity: 1 }],
    status: "ready",
    createdAt: 1_700_000_000_000,
    expiresAt: originalExpiry,
  };

  const retried = markDailyInventoryReservationReady(
    ready,
    1_700_000_120_000,
  );
  assert.equal(retried.expiresAt, originalExpiry);
});

test("alarm recovery does not create a fresh hold for an unseen link", async () => {
  const originalExpiry = 1_700_000_180_000;
  const pending = {
    attemptId: "alarm-recovery",
    lines: [{ variationId: "cake", quantity: 1, availableQuantity: 1 }],
    status: "pending-payment-link",
    createdAt: 1_700_000_000_000,
    expiresAt: originalExpiry,
  };

  const recovered = markDailyInventoryReservationReady(
    pending,
    1_700_000_240_000,
    false,
  );
  assert.equal(recovered.status, "ready");
  assert.equal(recovered.expiresAt, originalExpiry);
});

test("an attempt id cannot be reused with a different cart", async () => {
  const storage = new MemoryReservationStorage();

  await reserveDailyInventory(storage, {
    attemptId: "same-attempt",
    lines: [{ variationId: "cake-1", quantity: 1, availableQuantity: 2 }],
  });
  const changedCart = await reserveDailyInventory(storage, {
    attemptId: "same-attempt",
    lines: [{ variationId: "cake-1", quantity: 2, availableQuantity: 2 }],
  });

  assert.equal(changedCart.ok, false);
  assert.equal(changedCart.reason, "attempt-conflict");
  assert.equal(typeof changedCart.expiresAt, "number");
});

test("an expired checkout attempt cannot recreate its deleted Square link", async () => {
  const storage = new MemoryReservationStorage();
  const now = 1_700_000_000_000;
  const request = {
    attemptId: "expired-attempt",
    lines: [{ variationId: "cake", quantity: 1, availableQuantity: 1 }],
  };

  await reserveDailyInventory(storage, request, now);
  await deleteDailyInventoryReservation(
    storage,
    request.attemptId,
    now + DAILY_INVENTORY_HOLD_MS,
  );

  assert.deepEqual(
    await reserveDailyInventory(
      storage,
      request,
      now + DAILY_INVENTORY_HOLD_MS + 1,
    ),
    { ok: false, reason: "attempt-expired" },
  );
  assert.equal(
    (
      await reserveDailyInventory(
        storage,
        { ...request, attemptId: "fresh-attempt" },
        now + DAILY_INVENTORY_HOLD_MS + 1,
      )
    ).ok,
    true,
  );
});

test("a checkout cancelled after a POS sale retains the cancellation reason", async () => {
  const storage = new MemoryReservationStorage();
  const request = {
    attemptId: "pos-conflict",
    lines: [{ variationId: "cake", quantity: 1, availableQuantity: 1 }],
  };
  await reserveDailyInventory(storage, request, 1_700_000_000_000);
  await deleteDailyInventoryReservation(
    storage,
    request.attemptId,
    1_700_000_001_000,
    "inventory-changed",
  );

  assert.deepEqual(
    await reserveDailyInventory(storage, request, 1_700_000_002_000),
    { ok: false, reason: "attempt-cancelled-inventory" },
  );
});

test("a definitely rejected Square checkout releases inventory immediately", async () => {
  const storage = new MemoryReservationStorage();
  const line = { variationId: "cake", quantity: 1, availableQuantity: 1 };

  await reserveDailyInventory(storage, {
    attemptId: "rejected-checkout",
    lines: [line],
  });
  await discardDailyInventoryReservation(storage, "rejected-checkout");

  const nextCustomer = await reserveDailyInventory(storage, {
    attemptId: "next-customer",
    lines: [line],
  });
  assert.equal(nextCustomer.ok, true);
});

test("a new checkout finds only relevant expired reservations to clean up", () => {
  const reservations = {
    expiredCake: {
      attemptId: "expired-cake",
      lines: [{ variationId: "cake", quantity: 1, availableQuantity: 2 }],
      status: "ready",
      createdAt: 1,
      expiresAt: 100,
    },
    activeCake: {
      attemptId: "active-cake",
      lines: [{ variationId: "cake", quantity: 1, availableQuantity: 2 }],
      status: "ready",
      createdAt: 2,
      expiresAt: 300,
    },
    expiredDrink: {
      attemptId: "expired-drink",
      lines: [{ variationId: "drink", quantity: 1, availableQuantity: 2 }],
      status: "ready",
      createdAt: 3,
      expiresAt: 100,
    },
  };

  assert.deepEqual(
    dueDailyInventoryReservations(reservations, 200, new Set(["cake"]))
      .map((reservation) => reservation.attemptId),
    ["expired-cake"],
  );
});
