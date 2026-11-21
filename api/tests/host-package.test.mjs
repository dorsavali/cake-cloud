import { test } from "node:test";
import assert from "node:assert/strict";

import {
  hostPackageMinimumGuests,
  hostPackagePriceUnit,
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
