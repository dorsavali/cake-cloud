import assert from "node:assert/strict";
import { test } from "node:test";

import {
  normalizeSquareAddress,
  upsertClubMember,
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

test("club registration writes the complete member profile and number to Square", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ url: String(url), method: options.method, body });
    if (String(url).endsWith("/v2/customers/search")) {
      return Response.json({ customers: [] });
    }
    return Response.json({ customer: { id: "square-customer-1" } });
  });

  const result = await upsertClubMember(
    env,
    {
      firstName: "Cloud",
      lastName: "Member",
      email: "MEMBER@example.com",
      phone: "0400 000 000",
      birthday: "1990-05-20",
      addressLine1: "10 Cloud Street",
      suburb: "Perth",
      state: "WA",
      postcode: "6000",
    },
    "33333333-3333-4333-8333-333333333333",
  );

  assert.equal(result.customerId, "square-customer-1");
  assert.match(result.memberCode, /^CCC-\d{6}$/);
  assert.equal(requests.length, 4);
  assert.deepEqual(requests[3].body, {
    idempotency_key: "33333333-3333-4333-8333-333333333333",
    given_name: "Cloud",
    family_name: "Member",
    email_address: "member@example.com",
    phone_number: "+61400000000",
    birthday: "1990-05-20",
    reference_id: result.memberCode,
    address: {
      address_line_1: "10 Cloud Street",
      locality: "Perth",
      administrative_district_level_1: "WA",
      postal_code: "6000",
      country: "AU",
    },
  });
});

test("an existing club member keeps their Square member number", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ url: String(url), method: options.method, body });
    if (String(url).endsWith("/v2/customers/search")) {
      return Response.json({
        customers: [{
          id: "square-customer-2",
          version: 4,
          reference_id: "CCC-123456",
        }],
      });
    }
    return Response.json({ customer: { id: "square-customer-2" } });
  });

  const result = await upsertClubMember(
    env,
    {
      firstName: "Existing",
      lastName: "Member",
      email: "existing@example.com",
      phone: "+61411111111",
      birthday: "1988-03-04",
      addressLine1: "20 Cake Road",
      suburb: "Perth",
      state: "WA",
      postcode: "6000",
    },
    "44444444-4444-4444-8444-444444444444",
  );

  assert.deepEqual(result, {
    customerId: "square-customer-2",
    memberCode: "CCC-123456",
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[1].method, "PUT");
  assert.equal(requests[1].body.reference_id, "CCC-123456");
  assert.equal(requests[1].body.version, 4);
});
