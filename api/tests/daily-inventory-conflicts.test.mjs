import assert from "node:assert/strict";
import { test } from "node:test";

import { selectInventoryConflictCancellations } from "../dist/durable-objects/daily-inventory-conflicts.js";

const reservation = (attemptId, quantity, createdAt, extraLines = []) => ({
  attemptId,
  createdAt,
  expiresAt: createdAt + 180_000,
  status: "ready",
  lines: [
    { variationId: "cake", quantity, availableQuantity: 3 },
    ...extraLines,
  ],
});

test("the newest unpaid reservation is cancelled after a POS sale", () => {
  const older = reservation("older", 1, 1);
  const newer = reservation("newer", 2, 2);

  assert.deepEqual(
    selectInventoryConflictCancellations(
      [older, newer],
      new Map([["cake", 1]]),
      new Set(),
    ).map((item) => item.attemptId),
    ["newer"],
  );
});

test("cancelling a cart releases all of its reserved lines", () => {
  const older = reservation("older", 1, 1, [
    { variationId: "drink", quantity: 1, availableQuantity: 2 },
  ]);
  const newer = reservation("newer", 1, 2, [
    { variationId: "drink", quantity: 1, availableQuantity: 2 },
  ]);

  assert.deepEqual(
    selectInventoryConflictCancellations(
      [older, newer],
      new Map([
        ["cake", 1],
        ["drink", 1],
      ]),
      new Set(),
    ).map((item) => item.attemptId),
    ["newer"],
  );
});

test("paid or uncertain reservations are protected from cancellation", () => {
  const older = reservation("older", 1, 1);
  const protectedNewer = reservation("protected", 1, 2);

  assert.deepEqual(
    selectInventoryConflictCancellations(
      [older, protectedNewer],
      new Map([["cake", 1]]),
      new Set(["protected"]),
    ).map((item) => item.attemptId),
    ["older"],
  );
});
