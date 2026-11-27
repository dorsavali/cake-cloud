import assert from "node:assert/strict";
import { test } from "node:test";
import { handleSmtpDiagnostics } from "../dist/routes/smtp-diagnostics.js";

const token = "diagnostics-test-token-long-enough";
const env = { EMAIL_TEST_TOKEN: token };
const request = (key) => new Request("https://cake-cloud.com.au/api/test/smtp-diagnostics", {
  method: "POST",
  headers: { authorization: `Bearer ${key}` },
  body: JSON.stringify({ hostname: "untrusted.example" }),
});

function mockSmtpSocket() {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let output;
  const commands = [];
  const readable = new ReadableStream({
    start(controller) {
      output = controller;
      output.enqueue(encoder.encode("220 Test SMTP\r\n"));
    },
  });
  const writable = new WritableStream({
    write(chunk) {
      const command = decoder.decode(chunk).trim();
      commands.push(command);
      output.enqueue(encoder.encode("250-Test SMTP\r\n250 STARTTLS\r\n"));
    },
  });
  return {
    commands, readable, writable,
    opened: Promise.resolve({ remoteAddress: "192.0.2.1:465" }),
    closed: Promise.resolve(),
    async close() { output.close(); },
  };
}

test("SMTP diagnostics require the test token before loading sockets", async () => {
  const response = await handleSmtpDiagnostics(request("wrong"), env, async () => {
    assert.fail("Unauthorized requests must not open sockets");
  });
  assert.equal(response.status, 401);
});

test("SMTP diagnostics report failed connections and continue to the fixed control target", async () => {
  const control = mockSmtpSocket();
  const destinations = [];
  const response = await handleSmtpDiagnostics(request(token), env, async () => ({ hostname, port }) => {
    destinations.push(`${hostname}:${port}`);
    if (hostname === "mail.libremobileos.com") return control;
    throw new Error("proxy request failed");
  });
  assert.equal(response.status, 200);
  const { results } = await response.json();
  assert.deepEqual(destinations, [
    "mail.cake-cloud.com.au:587", "221.121.158.145:587",
    "mail.cake-cloud.com.au:465", "mail.libremobileos.com:465",
  ]);
  assert.equal(results[0].steps[0].status, "failed");
  assert.match(results[0].steps[0].detail, /proxy request failed/);
  assert.equal(results[3].steps[1].detail, "SMTP 220");
  assert.deepEqual(control.commands, ["EHLO cake-cloud.com.au"]);
});
