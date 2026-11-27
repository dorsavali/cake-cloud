import type { ApiEnv } from "../types/env.js";
import type { OrderEmailAddresses, RenderedEmail } from "./order-templates.js";

export function emailSendingEnabled(env: ApiEnv): boolean {
  return env.EMAIL_ENABLED === "true";
}

export function emailAddresses(env: ApiEnv): OrderEmailAddresses {
  const sender = env.EMAIL_FROM?.trim();
  const orders = env.EMAIL_ORDERS_TO?.trim();
  if (!sender || !orders) throw new Error("Email sender and orders mailbox must be configured");
  return { sender, orders };
}

export async function sendEmail(env: ApiEnv, email: RenderedEmail): Promise<void> {
  if (!emailSendingEnabled(env)) return;
  if (!env.EMAIL) throw new Error("Cloudflare EMAIL binding is not configured");
  await env.EMAIL.send(email);
}
