import assert from "node:assert/strict";
import { test } from "node:test";

import { handleClubJoin } from "../dist/routes/club.js";

const env = {
  SQUARE_ENVIRONMENT: "sandbox",
  SQUARE_ACCESS_TOKEN: "test-token",
};

test("club join returns a clear conflict for an existing member", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    customers: [{
      id: "existing-member",
      version: 1,
      reference_id: "CCC-123456",
    }],
  }));

  const request = new Request("http://localhost/api/club/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "Existing",
      lastName: "Member",
      email: "existing@example.com",
      phone: "0411 111 111",
      address: "20 Cake Road, Perth WA 6000",
      birthday: "1988-03-04",
      privacyAccepted: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
    }),
  });

  const response = await handleClubJoin(request, env);
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: "You are already a Cake Cloud Club member.",
  });
});
