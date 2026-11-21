import assert from "node:assert/strict";
import { test } from "node:test";

import { orderNumberFromSeed } from "../dist/services/order-number.js";

test("typed order numbers are short, stable, and distinct by order flow", () => {
  const seed = "12345678-1234-4234-8234-123456789abc";
  assert.equal(orderNumberFromSeed("CAKE", seed), "CC-CAKE-123456789ABC");
  assert.equal(orderNumberFromSeed("HOST", seed), "CC-HOST-123456789ABC");
  assert.equal(orderNumberFromSeed("CAKE", seed), orderNumberFromSeed("CAKE", seed));
});
