import { test } from "node:test";
import assert from "node:assert/strict";

import {
  hostPackageMinimumGuests,
  hostPackagePriceUnit,
  parseHostModifierSelections,
} from "../dist/services/host-package.js";
import { sanitizeSquareDescriptionHtml } from "../dist/services/square.js";

test("host packages default to a fixed package price", () => {
  assert.equal(hostPackagePriceUnit({}), "package");
  assert.equal(hostPackagePriceUnit({ pricing_model: "fixed" }), "package");
  assert.equal(hostPackagePriceUnit({ price_unit: "head" }), "head");
  assert.equal(hostPackagePriceUnit({ pricing_model: "per_guest" }), "head");
});

test("host package capacity falls back to the Square description", () => {
  assert.equal(
    hostPackageMinimumGuests({}, "Something delicious.\nServes 10 people."),
    10,
  );
  assert.equal(
    hostPackageMinimumGuests({ minimum_guests: 14 }, "Serves 10 people."),
    14,
  );
});

test("Square description formatting keeps safe tags only", () => {
  assert.equal(
    sanitizeSquareDescriptionHtml(
      '<p>Hello <strong class="bad">world</strong></p><script>alert(1)</script><ul><li>Choice</li></ul>',
    ),
    "<p>Hello <strong>world</strong></p><ul><li>Choice</li></ul>",
  );
});

test("host modifier quantities are preserved for Square checkout", () => {
  assert.deepEqual(
    parseHostModifierSelections(
      [
        { id: "mini-croissant", quantity: 6 },
        { id: "fruit-tart", quantity: 4 },
      ],
      undefined,
    ),
    [
      { id: "mini-croissant", quantity: 6 },
      { id: "fruit-tart", quantity: 4 },
    ],
  );
});

test("legacy host modifier ids remain compatible", () => {
  assert.deepEqual(
    parseHostModifierSelections(undefined, ["mini-croissant"]),
    [{ id: "mini-croissant", quantity: 1 }],
  );
});

test("host modifier quantities reject duplicates and invalid counts", () => {
  assert.throws(
    () => parseHostModifierSelections([
      { id: "mini-croissant", quantity: 1 },
      { id: "mini-croissant", quantity: 2 },
    ], undefined),
    /valid package options/,
  );
  assert.throws(
    () => parseHostModifierSelections([{ id: "fruit-tart", quantity: 0 }], undefined),
    /valid package options/,
  );
});
