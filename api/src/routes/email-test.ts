import {
  renderCustomerSubmissionEmail,
  renderInternalSubmissionEmail,
  type OrderEmailAddresses,
  type RenderedEmail,
  type SubmissionEmailData,
} from "../email/order-templates.js";
import {
  emailSendingEnabled,
  sendEmailWithSmtpConnection,
} from "../email/smtp.js";
import { json, methodNotAllowed } from "../http/json.js";
import type { ApiEnv } from "../types/env.js";

type EmailSender = (env: ApiEnv, email: RenderedEmail) => Promise<void>;

const encoder = new TextEncoder();

function validEmail(value: string): boolean {
  return /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value) && !/[\r\n]/.test(value);
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function tokensMatch(received: string, expected: string): Promise<boolean> {
  const [receivedDigest, expectedDigest] = await Promise.all([
    digest(received),
    digest(expected),
  ]);
  let difference = 0;
  for (let index = 0; index < expectedDigest.length; index += 1) {
    difference |= receivedDigest[index] ^ expectedDigest[index];
  }
  return difference === 0;
}

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`${name} is not configured`);
  return value.trim();
}

function testAddresses(env: ApiEnv): OrderEmailAddresses {
  const from = required(env.EMAIL_TEST_SMTP_FROM, "EMAIL_TEST_SMTP_FROM").toLowerCase();
  if (!validEmail(from)) throw new Error("EMAIL_TEST_SMTP_FROM is invalid");
  return { hello: from, orders: from };
}

function testRecipient(env: ApiEnv): string {
  const recipient = required(
    env.EMAIL_TEST_SMTP_RECIPIENT,
    "EMAIL_TEST_SMTP_RECIPIENT",
  ).toLowerCase();
  if (!validEmail(recipient)) throw new Error("EMAIL_TEST_SMTP_RECIPIENT is invalid");
  return recipient;
}

async function sendTestEmailWithSmtp(env: ApiEnv, email: RenderedEmail): Promise<void> {
  await sendEmailWithSmtpConnection(email, {
    hostname: required(env.EMAIL_TEST_SMTP_HOST, "EMAIL_TEST_SMTP_HOST"),
    port: Number(env.EMAIL_TEST_SMTP_PORT ?? "465"),
    security: env.EMAIL_TEST_SMTP_SECURITY === "starttls" ? "starttls" : "tls",
    username: required(env.EMAIL_TEST_SMTP_USERNAME, "EMAIL_TEST_SMTP_USERNAME"),
    password: required(env.EMAIL_TEST_SMTP_PASSWORD, "EMAIL_TEST_SMTP_PASSWORD"),
    ehloHostname: "libremobileos.com",
  });
}

function testData(recipient: string, reference: string): SubmissionEmailData {
  const requestedDate = new Intl.DateTimeFormat("en-AU", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Australia/Perth",
  }).format(new Date());

  return {
    reference,
    submissionType: "Email delivery test",
    customerName: "Cake Cloud Tester",
    customerEmail: recipient,
    customerPhone: "Test only — no phone number",
    requestedDate,
    details: [
      { label: "Purpose", value: "SMTP delivery and template verification" },
      { label: "Environment", value: "Cake Cloud test endpoint" },
    ],
    storagePath: "Test only — no R2 record was created",
  };
}

export async function handleEmailTest(
  request: Request,
  env: ApiEnv,
  send: EmailSender = sendTestEmailWithSmtp,
): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed();

  const configuredToken = env.EMAIL_TEST_TOKEN?.trim();
  if (!configuredToken || configuredToken.length < 24) {
    return json({ error: "Email test endpoint is not configured" }, 503);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const receivedToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!receivedToken || !(await tokensMatch(receivedToken, configuredToken))) {
    return json({ error: "Invalid test token" }, 401);
  }

  if (!emailSendingEnabled(env)) {
    return json({ error: "Email sending is disabled" }, 409);
  }

  let recipient: string;
  let addresses: OrderEmailAddresses;
  try {
    recipient = testRecipient(env);
    addresses = testAddresses(env);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Test SMTP is not configured",
    }, 503);
  }

  const reference = `EMAIL-TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const data = testData(recipient, reference);
  const deliveries = [
    { name: "internal", message: renderInternalSubmissionEmail(data, addresses) },
    { name: "customer", message: renderCustomerSubmissionEmail(data, addresses) },
  ] as const;
  const sent: string[] = [];

  console.info("[email-test] Starting delivery test", { reference, recipient });
  try {
    for (const delivery of deliveries) {
      await send(env, delivery.message);
      sent.push(delivery.name);
      console.info("[email-test] Message accepted by SMTP", {
        reference,
        message: delivery.name,
        from: delivery.message.from,
        to: delivery.message.to,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed";
    console.error("[email-test] Delivery failed", {
      reference,
      recipient,
      sent,
      error: message,
    });
    return json({ ok: false, reference, sent, error: message }, 502);
  }

  return json({ ok: true, reference, sent });
}
