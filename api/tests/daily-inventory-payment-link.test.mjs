import assert from "node:assert/strict";
import { test } from "node:test";

import { squareDefinitelyRejectedPaymentLink } from "../dist/durable-objects/daily-inventory-payment-link.js";

test("only definitive Square rejections release a checkout immediately", () => {
  for (const status of [400, 401, 403, 404, 422]) {
    assert.equal(squareDefinitelyRejectedPaymentLink(status), true);
  }
  for (const status of [408, 409, 429, 500, 502, 503, 504]) {
    assert.equal(squareDefinitelyRejectedPaymentLink(status), false);
  }
});
