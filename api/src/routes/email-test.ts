import {
  renderCustomerSubmissionEmail,
  renderInternalSubmissionEmail,
  type OrderEmailAddresses,
  type RenderedEmail,
  type SubmissionEmailData,
} from "../email/order-templates.js";
import { emailSendingEnabled, sendEmailWithSmtp } from "../email/smtp.js";
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

function emailAddresses(env: ApiEnv): OrderEmailAddresses {
  const hello = env.SMTP_HELLO_USERNAME?.trim().toLowerCase();
  const orders = env.SMTP_ORDERS_USERNAME?.trim().toLowerCase();
  if (!hello || !orders) throw new Error("Test email addresses are not configured");
  return { hello, orders };
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
  send: EmailSender = sendEmailWithSmtp,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const recipient = body && typeof body === "object" && "recipient" in body
    ? String(body.recipient).trim().toLowerCase()
    : "";
  if (!validEmail(recipient)) {
    return json({ error: "Enter a valid recipient email address" }, 400);
  }

  const reference = `EMAIL-TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const data = testData(recipient, reference);
  const addresses = emailAddresses(env);
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
