"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { clearHostRequest } from "@/components/host/request-storage";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { apiUrl } from "@/lib/api";

export default function HostPaymentResultPage() {
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
        const receipt = new URLSearchParams(window.location.hash.slice(1));
        const orderId = receipt.get("orderId");
        const token = receipt.get("token");
        if (!orderId || !token) throw new Error("This payment link is incomplete. Please contact Cake Cloud before paying again.");
        const response = await fetch(apiUrl("/api/cake/payment-status"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, token }), signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not verify payment.");
        if (!active) return;
        setResult(data);
        setError("");
        if (data.status === "paid") clearHostRequest();
        if (data.status === "pending" && ++attempts < 12) timer = setTimeout(check, 5000);
      } catch (caught) {
        if (active) { setResult({ status: "unknown" }); setError(caught instanceof Error ? caught.message : "Could not verify payment."); }
      }
    }
    void check();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [retry]);

  const titles: Record<string, string> = { checking: "Checking Payment", pending: "Payment Pending", paid: "Request Confirmed", failed: "Payment Not Completed", review: "Payment Needs Review", refunded: "Payment Refunded", unknown: "Verification Unavailable" };
  return <><DesktopHeader /><MobileHeader /><main className="-mt-16 min-h-dvh overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:auto_100%] bg-top bg-repeat-y pt-16 md:bg-[length:100%_auto]"><section className="mx-auto w-full max-w-[700px] px-4 py-12 sm:px-6">
    <h1 className="font-kalnia text-4xl text-accent-dark">{titles[result.status] ?? "Checking Payment"}</h1>
    <div className="mt-7 rounded-2xl border border-[#d8cdb8] bg-[#f8f3e9] p-6 font-signika text-accent-dark/70" aria-live="polite">
      <p>{result.status === "paid" ? "Thank you! Your payment has been verified and your package request is confirmed." : result.status === "pending" ? "Square has not confirmed the payment yet." : result.status === "failed" ? "Square reports that this payment was not completed." : result.status === "review" ? "Your payment needs review. Please contact Cake Cloud with the order number below." : "Checking your payment securely with Square."}</p>
      {result.orderId ? <p className="mt-3">Order: {result.orderId}</p> : null}
      {result.total !== undefined ? <p className="mt-1">Total: {new Intl.NumberFormat("en-AU", { style: "currency", currency: result.currency ?? "AUD" }).format(result.total / 100)}</p> : null}
      {error ? <p className="mt-3 text-[#a83831]" role="alert">{error}</p> : null}
    </div>
    {result.status !== "paid" ? <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-5 min-h-12 w-full rounded-full bg-primary px-6 font-kalnia text-white">Check Payment Again</button> : null}
    <Link href="/events" className="mt-5 inline-flex min-h-10 items-center font-signika text-sm text-primary">Back to Packages</Link>
  </section></main></>;
}
