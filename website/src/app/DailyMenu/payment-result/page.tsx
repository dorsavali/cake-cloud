"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { clearStoredCart } from "@/components/cart";
import { container, errorText, pageShell, primaryButton } from "@/components/custom-cakes/cake-ui";
import { Footer } from "@/components/layout/footer";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { apiUrl } from "@/lib/api";
import { publicContactEmail } from "@/lib/contact";

export default function DailyMenuPaymentResult() {
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
        if (!orderId || !token) throw new Error("This payment link is incomplete. Please contact Cake Cloud before paying again.");
        const response = await fetch(apiUrl("/api/cake/payment-status"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, token }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not verify payment.");
        if (!active) return;
        setError("");
        setResult(data);
        if (data.status === "paid") clearStoredCart();
        if (data.status === "pending" && ++attempts < 12) timer = setTimeout(check, 5000);
      } catch (caught) {
        if (active) {
          setResult({ status: "unknown" });
          setError(caught instanceof Error ? caught.message : "Could not verify payment.");
        }
      }
    }

    void check();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [retry]);

  const messages: Record<string, string> = {
    checking: "Checking Payment",
    pending: "Payment Pending",
    paid: "Order Confirmed",
    failed: "Payment Not Completed",
    review: "Payment Needs Review",
    refunded: "Payment Refunded",
    unknown: "Verification Unavailable",
  };

  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className={`${pageShell} !min-h-0 !pb-3 md:!min-h-dvh md:!pb-16`}>
        <div className={container}>
          <div className="mx-auto w-full max-w-[440px] pt-5 md:pt-7">
            <Link
              className="inline-flex min-h-10 items-center gap-2 font-signika text-sm text-accent-dark/60 transition-colors hover:text-primary"
              href="/DailyMenu"
            >
              ← <span>Back to Daily Menu</span>
            </Link>
            <section
              className="mt-3 rounded-2xl bg-[#faf7f0] px-6 py-8 text-center shadow-[0_8px_28px_rgb(70_66_72/12%)] md:px-8 md:py-10"
              aria-live="polite"
            >
              <Image
                src="/images/logo/main.svg"
                alt="Cake Cloud"
                width={150}
                height={190}
                unoptimized
                className="mx-auto h-auto w-[122px] md:w-[138px]"
              />
              <h1 className={`mt-4 font-kalnia font-medium text-accent-dark md:text-[34px] ${result.status === "checking" ? "whitespace-nowrap text-[clamp(22px,7vw,30px)]" : "text-3xl"}`}>
                {messages[result.status] ?? "Checking Payment"}
              </h1>
              <div className="mt-6 border-y border-dotted border-[#cbbb98] py-6 font-signika text-sm leading-6 text-accent-dark/70">
                <p>
                  {result.status === "paid" ? "Thank you! Your payment has been verified and your order is confirmed."
                    : result.status === "pending" ? "Square has not confirmed payment yet. You can check again below."
                    : result.status === "failed" ? "Square reports that this payment was not completed."
                    : result.status === "review" ? "Your payment details need review. Please contact Cake Cloud with your order number."
                    : result.status === "refunded" ? "A refund has been recorded for this payment. Please contact Cake Cloud for details."
                    : "Checking your payment securely with Square."}
                </p>
                {result.orderId && (
                  <p className="mt-5 break-all">
                    <strong className="mr-2 font-semibold text-accent-dark">Order No:</strong>
                    {result.orderId}
                  </p>
                )}
                {error && <p className={`${errorText} mt-4`} role="alert">{error}</p>}
              </div>
              {result.status !== "paid" && (
                <button className={`${primaryButton} mt-6`} type="button" onClick={() => setRetry((value) => value + 1)}>
                  Check Payment Again
                </button>
              )}
              <p className="mt-6 font-signika text-sm leading-6 text-accent-dark/70">
                If you have any questions or issues, please email us at{" "}
                <a
                  className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-[#5e796c]"
                  href={`mailto:${publicContactEmail}`}
                >
                  {publicContactEmail}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
