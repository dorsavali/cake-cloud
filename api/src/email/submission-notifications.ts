import type { ApiEnv } from "../types/env.js";
import {
  renderCustomerSubmissionEmail,
  renderInternalSubmissionEmail,
  type SubmissionEmailData,
} from "./order-templates.js";
import { emailAddresses, emailSendingEnabled, sendEmail } from "./delivery.js";

export async function sendSubmissionNotifications(
  env: ApiEnv,
  data: SubmissionEmailData,
): Promise<void> {
  if (!emailSendingEnabled(env)) return;
  const addresses = emailAddresses(env);

  // Notify the shop first so no customer receives a confirmation for a
  // request that the team was not told about.
  await sendEmail(env, renderInternalSubmissionEmail(data, addresses));
  await sendEmail(env, renderCustomerSubmissionEmail(data, addresses));
}
