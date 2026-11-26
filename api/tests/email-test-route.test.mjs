import assert from "node:assert/strict";
import { test } from "node:test";

import { handleEmailTest } from "../dist/routes/email-test.js";

const token = "test-token-that-is-longer-than-24-characters";
const env = {
  EMAIL_ENABLED: "true",
  EMAIL_TEST_TOKEN: token,
  SMTP_HELLO_USERNAME: "hello@example.test",
  SMTP_ORDERS_USERNAME: "orders@example.test",
};

function request({ authorization = `Bearer ${token}`, recipient = "customer@example.test" } = {}) {
  return new Request("https://cake-cloud.com.au/api/test/email", {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
    },
    body: JSON.stringify({ recipient }),
  });
}

test("email test endpoint sends one internal and one customer message", async () => {
  const messages = [];
  const response = await handleEmailTest(request(), env, async (_env, message) => {
    messages.push(message);
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.deepEqual(result.sent, ["internal", "customer"]);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].to, "orders@example.test");
  assert.equal(messages[1].to, "customer@example.test");
  assert.match(messages[0].subject, /EMAIL-TEST-/);
  assert.match(messages[1].subject, /EMAIL-TEST-/);
});

test("email test endpoint rejects an invalid token without sending", async () => {
  let sendCount = 0;
  const response = await handleEmailTest(
    request({ authorization: "Bearer wrong-token" }),
    env,
    async () => { sendCount += 1; },
  );

  assert.equal(response.status, 401);
  assert.equal(sendCount, 0);
});

test("email test endpoint rejects invalid recipients", async () => {
  let sendCount = 0;
  const response = await handleEmailTest(
    request({ recipient: "not-an-email" }),
    env,
    async () => { sendCount += 1; },
  );

  assert.equal(response.status, 400);
  assert.equal(sendCount, 0);
});

test("email test endpoint respects the email enabled switch", async () => {
  const response = await handleEmailTest(
    request(),
    { ...env, EMAIL_ENABLED: "false" },
    async () => { throw new Error("must not send"); },
  );

  assert.equal(response.status, 409);
});
