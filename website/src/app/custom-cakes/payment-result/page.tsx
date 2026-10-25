"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiUrl } from "@/lib/api";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { cardSurface, container, errorText, pageShell, pageTitle, primaryButton } from "@/components/custom-cakes/cake-ui";
import { clearCakeDraft } from "@/components/custom-cakes/draft-storage";
import { clearStoredCart } from "@/components/cart";

export default function PaymentResult() {
  const [result, setResult] = useState<{ status: string; orderId?: string; total?: number; currency?: string }>({ status: "checking" });
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const controller = new AbortController();
    async function check() {
      try {
        const receiptParams = new URLSearchParams(window.location.hash.slice(1));
        const orderId = receiptParams.get("orderId");
        const token = receiptParams.get("token");
        if (!orderId || !token) throw new Error("This payment link is incomplete or was created before the update. Please contact the shop to check your payment; do not pay again.");
        const receipt = JSON.stringify({ orderId, token });
        const response = await fetch(apiUrl("/api/cake/payment-status"), { method: "POST", headers: { "Content-Type": "application/json" }, body: receipt, signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!active) return;
        setError("");
        setResult(data);
        if (data.status === "paid") { clearCakeDraft(); clearStoredCart(); }
        if (data.status === "pending" && ++attempts < 12) timer = setTimeout(check, 5000);
      } catch (caught) {
        if (active) { setResult({ status: "unknown" }); setError(caught instanceof Error ? caught.message : "Could not verify payment."); }
      }
    }
    void check();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [retry]);

  const messages: Record<string, string> = {
    checking: "Checking Payment",
    pending: "Payment Pending",
    paid: "Payment Confirmed",
    failed: "Payment Not Completed",
    review: "Payment Needs Review",
    refunded: "Payment Refunded",
    unknown: "Verification Unavailable",
  };

  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className={pageShell}>
        <div className={container}>
          <h1 className={pageTitle}>{messages[result.status] ?? "Checking Payment"}</h1>
          <div className="grid gap-4 md:max-w-[620px]">
            <section className={cardSurface} aria-live="polite">
              <p className="m-0 text-sm leading-[1.6] text-accent-dark">
                {result.status === "paid" ? "Thank you! Your payment has been verified and your cake order is confirmed."
                  : result.status === "pending" ? "Square has not confirmed payment yet. You can check again below."
                  : result.status === "failed" ? "Square reports that this payment was not completed."
                  : result.status === "review" ? "Your payment details need review. Please contact the shop with your order number."
                  : result.status === "refunded" ? "A refund has been recorded for this payment. Please contact the shop for details."
                  : "Checking your payment securely with Square."}
              </p>
              {result.orderId && <p className="mt-3 text-sm">Order: {result.orderId}</p>}
              {result.total !== undefined && <p className="mt-2 text-sm">Total: {new Intl.NumberFormat("en-AU", { style: "currency", currency: result.currency ?? "AUD" }).format(result.total / 100)}</p>}
              {error && <p className={`${errorText} mt-3`} role="alert">{error}</p>}
            </section>
            {result.status !== "paid" && (
              <button className={primaryButton} type="button" onClick={() => setRetry((value) => value + 1)}>
                Check Payment Again
              </button>
            )}
            <Link className="inline-flex min-h-10 items-center gap-2 font-signika text-xs text-[#88857d] transition-colors hover:text-primary md:text-[13px]" href="/">← Back to Home</Link>
          </div>
        </div>
      </main>
    </>
  );
}
