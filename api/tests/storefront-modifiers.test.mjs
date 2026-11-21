import { test } from "node:test";
import assert from "node:assert/strict";

import { maxModifierSelectionsForStorefront } from "../dist/services/square.js";

test("only syrup stays multi-select for drink products", () => {
  const categories = ["Cold Drinks", "drinks website", "daily menu"];

  assert.equal(maxModifierSelectionsForStorefront(categories, "Syrup", 1), 0);
  assert.equal(maxModifierSelectionsForStorefront(categories, "Milk", 0), 1);
  assert.equal(maxModifierSelectionsForStorefront(categories, "Temp", 0), 1);
  assert.equal(maxModifierSelectionsForStorefront(categories, "Shot", 4), 1);
  assert.equal(maxModifierSelectionsForStorefront(categories, "Sugar", 0), 1);
});

test("non-drink products retain the Square selection limit", () => {
  assert.equal(
    maxModifierSelectionsForStorefront(["Custom Cake"], "Toppings", 0),
    0,
  );
});
