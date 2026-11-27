import { emailAddresses, emailSendingEnabled, sendEmail } from "../email/delivery.js";
import {
  renderCustomerOrderEmail,
  renderInternalOrderEmail,
  type OrderEmailData,
} from "../email/order-templates.js";
import { json, methodNotAllowed, notFound } from "../http/json.js";
import type { ApiEnv } from "../types/env.js";

const recipient = "mrs.dorsa.vali@gmail.com";

async function hasTestAccess(request: Request, expected: string): Promise<boolean> {
  const token = request.headers.get("authorization")?.match(/^Bearer ([0-9a-f]{64})$/)?.[1];
  if (!token) return false;

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  let difference = 0;
  for (const [index, byte] of new Uint8Array(digest).entries()) {
    difference |= byte ^ Number.parseInt(expected.slice(index * 2, index * 2 + 2), 16);
  }
  return difference === 0;
}

export async function handleEmailTest(request: Request, env: ApiEnv): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed();
  const digest = env.EMAIL_TEST_TOKEN_SHA256 ?? "";
  if (!/^[0-9a-f]{64}$/.test(digest)) return notFound();
  if (!(await hasTestAccess(request, digest))) return json({ error: "Invalid test token" }, 401);
  if (!emailSendingEnabled(env)) return json({ error: "Email sending is disabled" }, 409);

  const reference = `EMAIL-TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const data: OrderEmailData = {
    orderNumber: reference,
    orderType: "Email test",
    customerName: "Cake Cloud Tester",
    customerEmail: recipient,
    customerPhone: "Test only",
    pickup: "Test only",
    currency: "AUD",
    total: 0,
    items: [{ name: "Test cake", quantity: 1, total: 0 }],
  };

  const accepted: { template: string; messageId: string }[] = [];
  try {
    const addresses = { ...emailAddresses(env), orders: recipient };
    const messages = [
      ["customer", renderCustomerOrderEmail(data, addresses)],
      ["internal", renderInternalOrderEmail(data, addresses)],
    ] as const;
    for (const [template, email] of messages) {
      const result = await sendEmail(env, { ...email, subject: `[TEST] ${email.subject}` });
      if (!result?.messageId) throw new Error("Cloudflare did not return a message ID");
      accepted.push({ template, messageId: result.messageId });
    }
    console.info("[email-test] Accepted by Cloudflare", { reference, accepted });
    return json({ ok: true, reference, accepted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed";
    const code = typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;
    console.error("[email-test] Delivery failed", { reference, accepted, code, error: message });
    return json({ ok: false, reference, accepted, code, error: message }, 502);
  }
}
