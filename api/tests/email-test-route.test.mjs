import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import { handleApiRequest } from "../dist/handler.js";

const token = randomBytes(32).toString("hex");
const digest = createHash("sha256").update(token).digest("hex");

function request(authorization, method = "POST") {
  return new Request("https://cake-cloud.com.au/api/test/email", {
    method,
    headers: authorization ? { authorization } : {},
  });
}

test("the email test sends both order templates through the Worker binding to the fixed Gmail inbox", async () => {
  const sent = [];
  const env = {
    EMAIL_TEST_TOKEN_SHA256: digest,
    EMAIL_ENABLED: "true",
    EMAIL_FROM: "hello-noreply@cake-cloud.com.au",
    EMAIL_ORDERS_TO: "orders@cake-cloud.com.au",
    EMAIL: { send: async (email) => {
      sent.push(email);
      return { messageId: `message-${sent.length}` };
    } },
  };
  assert.equal((await handleApiRequest(request(undefined, "GET"), env)).status, 405);
  assert.equal((await handleApiRequest(request("Bearer " + "0".repeat(64)), env)).status, 401);
  assert.equal(sent.length, 0);

  const response = await handleApiRequest(request(`Bearer ${token}`), env);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.accepted, [
    { template: "customer", messageId: "message-1" },
    { template: "internal", messageId: "message-2" },
  ]);
  for (const email of sent) {
    assert.equal(email.to, "mrs.dorsa.vali@gmail.com");
    assert.equal(email.from.email, "hello-noreply@cake-cloud.com.au");
    assert.ok(email.subject.startsWith("[TEST] "));
    assert.ok(email.subject.includes(result.reference));
  }
});
