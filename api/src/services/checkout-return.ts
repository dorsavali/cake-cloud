import type { ApiEnv } from "../types/env.js";
import { signValue, squareApi } from "./payment-verification.js";

type PaymentLink = {
  id: string;
  order_id: string;
  version: number;
  checkout_options?: Record<string, unknown>;
};

// Square persists the return URL alongside the order. No browser storage or
// process-local lookup is needed when a buyer returns in a different browser.
export async function configureCheckoutReturn(env: ApiEnv, linkId: string, orderId: string) {
  const returnUrl = new URL("/custom-cakes/payment-result/", env.WEBSITE_ORIGIN || "http://localhost:3000");
  // A fragment avoids sending the read-only receipt token in HTTP referrers.
  returnUrl.hash = new URLSearchParams({ orderId, token: await signValue(env, "receipt:" + orderId) }).toString();
  const path = "/v2/online-checkout/payment-links/" + encodeURIComponent(linkId);
  for (let attempt = 0; attempt < 3; attempt++) {
    const { payment_link: link } = await squareApi<{ payment_link: PaymentLink }>(env, path);
    if (!link || link.id !== linkId || link.order_id !== orderId) throw new Error("Checkout order mismatch");
    if (link.checkout_options?.redirect_url === returnUrl.href) return;
    try {
      const updated = await squareApi<{ payment_link: PaymentLink }>(env, path, {
        payment_link: { version: link.version, checkout_options: { ...link.checkout_options, redirect_url: returnUrl.href } },
      });
      if (updated.payment_link?.order_id !== orderId || updated.payment_link.checkout_options?.redirect_url !== returnUrl.href) {
        throw new Error("Checkout return URL was not saved");
      }
      return;
    } catch (error) {
      // Re-read after version conflicts or an uncertain response. Never create
      // another order, and do not expose checkout until the return URL is saved.
      if (attempt === 2) throw error;
    }
  }
}
