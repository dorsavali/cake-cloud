import assert from "node:assert/strict";
import { test } from "node:test";

import { handleEmailTest } from "../dist/routes/email-test.js";

const token = "test-token-that-is-longer-than-24-characters";
const env = {
  EMAIL_ENABLED: "true",
  EMAIL_TEST_TOKEN: token,
  EMAIL_TEST_SMTP_HOST: "mail.example.test",
  EMAIL_TEST_SMTP_PORT: "465",
  EMAIL_TEST_SMTP_SECURITY: "tls",
  EMAIL_TEST_SMTP_USERNAME: "tester",
  EMAIL_TEST_SMTP_PASSWORD: "secret",
  EMAIL_TEST_SMTP_FROM: "tester@example.test",
  EMAIL_TEST_SMTP_RECIPIENT: "destination@example.test",
};

function request({ authorization = `Bearer ${token}` } = {}) {
  return new Request("https://cake-cloud.com.au/api/test/email", {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
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
  assert.equal(messages[0].to, "tester@example.test");
  assert.equal(messages[1].to, "destination@example.test");
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

test("email test endpoint rejects an invalid configured recipient", async () => {
  let sendCount = 0;
  const response = await handleEmailTest(
    request(),
    { ...env, EMAIL_TEST_SMTP_RECIPIENT: "not-an-email" },
    async () => { sendCount += 1; },
  );

  assert.equal(response.status, 503);
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
