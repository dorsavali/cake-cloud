import assert from "node:assert/strict";
import { test } from "node:test";

import {
  normalizeSquareAddress,
  upsertSquareCustomer,
} from "../dist/services/square-customer.js";

const env = {
  SQUARE_ENVIRONMENT: "sandbox",
  SQUARE_ACCESS_TOKEN: "test-token",
};

test("optional Square customer address is normalized and validated", () => {
  assert.equal(normalizeSquareAddress(undefined), "");
  assert.equal(normalizeSquareAddress("  10   Cloud Street  "), "10 Cloud Street");
  assert.throws(
    () => normalizeSquareAddress("a".repeat(501)),
    /500 characters or fewer/,
  );
});

test("new Square customers receive an optional Australian address", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    if (String(url).endsWith("/v2/customers/search")) {
      return Response.json({ customers: [] });
    }
    return Response.json({ customer: { id: "customer-1" } });
  });

  const customerId = await upsertSquareCustomer(
    env,
    "Test Buyer",
    "buyer@example.com",
    "+61400000000",
    "10 Cloud Street, Perth WA 6000",
    "11111111-1111-4111-8111-111111111111",
  );

  assert.equal(customerId, "customer-1");
  assert.deepEqual(requests[1].body.address, {
    address_line_1: "10 Cloud Street, Perth WA 6000",
    country: "AU",
  });
});

test("an entered address updates an existing customer even in preserve-contact mode", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, method: options.method, body: JSON.parse(options.body) });
    if (String(url).endsWith("/v2/customers/search")) {
      return Response.json({
        customers: [{
          id: "customer-1",
          version: 3,
          address: { address_line_1: "Old address", country: "AU" },
        }],
      });
    }
    return Response.json({ customer: { id: "customer-1" } });
  });

  await upsertSquareCustomer(
    env,
    "Test Buyer",
    "buyer@example.com",
    "+61400000000",
    "New address",
    "22222222-2222-4222-8222-222222222222",
    false,
  );

  assert.equal(requests[1].method, "PUT");
  assert.deepEqual(requests[1].body, {
    address: { address_line_1: "New address", country: "AU" },
    version: 3,
  });
});
