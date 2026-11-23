import { test } from "node:test";
import assert from "node:assert/strict";

import { handleHostEnquiry } from "../dist/routes/host-enquiry.js";

function enquiry(address = "  10   Cloud Street, Perth WA 6000  ") {
  const form = new FormData();
  const preferredDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  form.set("fullName", "Test Host");
  form.set("email", "host@example.com");
  form.set("phone", "+61 412 345 678");
  form.set("address", address);
  form.set("preferredDate", preferredDate);
  form.set("notes", "Test enquiry");
  form.set("termsAccepted", "true");
  form.set("allergenAccepted", "true");
  return new Request("http://localhost/api/host/enquiry", { method: "POST", body: form });
}

test("host enquiries store the normalized address", async () => {
  const stored = new Map();
  const env = {
    CAKE_BRIEFS: {
      put: async (key, value) => stored.set(key, value),
      delete: async () => undefined,
    },
  };

  const response = await handleHostEnquiry(enquiry(), env);
  assert.equal(response.status, 201);
  const recordEntry = [...stored].find(([key]) => key.endsWith("/enquiry.json"));
  assert.ok(recordEntry);
  const record = JSON.parse(recordEntry[1]);
  assert.equal(record.address, "10 Cloud Street, Perth WA 6000");
});

test("host enquiries reject addresses over 500 characters", async () => {
  const env = {
    CAKE_BRIEFS: {
      put: async () => assert.fail("invalid enquiry must not be stored"),
      delete: async () => undefined,
    },
  };

  const response = await handleHostEnquiry(enquiry("a".repeat(501)), env);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /500 characters/);
});
