import type { ApiEnv } from "../types/env.js";
import {
  renderCustomerSubmissionEmail,
  renderInternalSubmissionEmail,
  type OrderEmailAddresses,
  type SubmissionEmailData,
} from "./order-templates.js";
import { emailSendingEnabled, sendEmailWithSmtp } from "./smtp.js";

function emailAddresses(env: ApiEnv): OrderEmailAddresses {
  const hello = env.SMTP_HELLO_USERNAME?.trim().toLowerCase();
  const orders = env.SMTP_ORDERS_USERNAME?.trim().toLowerCase();
  if (!hello || !orders) throw new Error("Submission email addresses are not configured");
  return { hello, orders };
}

export async function sendSubmissionNotifications(
  env: ApiEnv,
  data: SubmissionEmailData,
): Promise<void> {
  if (!emailSendingEnabled(env)) return;
  const addresses = emailAddresses(env);

  // Notify the shop first so no customer receives a confirmation for a
  // request that the team was not told about.
  await sendEmailWithSmtp(env, renderInternalSubmissionEmail(data, addresses));
  await sendEmailWithSmtp(env, renderCustomerSubmissionEmail(data, addresses));
}
