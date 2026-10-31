"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";

import { money, type CakeConfig, type CakeQuote, type CakeSummaryItem } from "./cake-types";
import { useDraftState } from "./useDraftState";
import { draftText } from "./draft-storage";
import { CakeProgress } from "./CakeProgress";
import { CakeSummaryDetails } from "./CakeSummary";
import {
  container,
  errorText,
  fieldLabel,
  inputClass,
  pageShell,
  pageTitle,
  primaryButton,
  requiredMark,
} from "./cake-ui";
import Link from "next/link";

/**
 * Payment step for the Square-hosted checkout.
 *
 * The order is priced from the live Square catalogue, so the only buyer input
 * collected here is what Square needs for the pickup fulfilment; card data is
 * always entered on Square itself.
 */
export function CakePayment({ cake, pickup, quote, summary, availability, fee, onBack }: {
  cake: CakeConfig;
  pickup: string;
  quote: CakeQuote;
  summary: CakeSummaryItem[];
  availability: string;
  fee: number;
  onBack: () => void;
}) {
  const [name, setName] = useDraftState("name", "", draftText);
  const [email, setEmail] = useDraftState("email", "", draftText);
  const [phone, setPhone] = useDraftState("phone", "", draftText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [allergenAccepted, setAllergenAccepted] = useState(false);
  const lock = useRef(false);
  const active = useRef(true);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    // React may mount, clean up and remount the component (Strict Mode in
    // development). Reset the flag on every mount so the checkout redirect is
    // never skipped.
    active.current = true;
    return () => { active.current = false; request.current?.abort(); };
  }, []);

  const [savedAttempt, saveAttempt] = useDraftState<string | null>("checkoutAttempt", null, (value): value is string | null => {
    if (value === null) return true;
    if (typeof value !== "string" || value.length > 20000) return false;
    try {
      const parsed = JSON.parse(value);
      return !!parsed && typeof parsed.idempotencyKey === "string" && /^[a-f0-9-]{36}$/i.test(parsed.idempotencyKey)
        && JSON.stringify(parsed.cake) === JSON.stringify(cake) && parsed.pickup === pickup
        && parsed.name === name.trim() && parsed.email === email.trim() && parsed.phone === phone.trim() && parsed.expectedTotal === quote.total
        && parsed.termsAccepted === true && parsed.allergenAccepted === true;
    } catch { return false; }
  });
  const attempt = useRef<string | undefined>(savedAttempt ?? undefined);

  return (
    <main className={pageShell}>
      <div className={`${container} max-w-[620px] md:max-w-[60%]`}>
        <button className="inline-flex min-h-6 items-center gap-[7px] border-0 bg-none p-0 pt-4 font-[inherit] text-xs text-[#88857d] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary md:gap-2 md:text-[13px]" type="button" onClick={onBack}>
          ← <span>Back to Summary</span>
        </button>
        <div className="mt-[18px] min-w-0 max-md:mt-[22px] md:mt-[22px]"><CakeProgress current={4} /></div>
        <h1 className={`${pageTitle} mt-6 tracking-[-.025em] md:tracking-normal`}>Payment</h1>

        <div className="grid gap-5">


          <form
            className="grid gap-[15px] md:gap-[18px]"
            onSubmit={async (event) => {
              event.preventDefault();
              if (lock.current) return;
              if (url) { window.location.assign(url); return; }
              lock.current = true;
              setBusy(true);
              setError("");
              request.current = new AbortController();
              try {
                if (!attempt.current) {
                  const sessionResponse = await fetch(apiUrl("/api/cake/checkout-session"), { method: "POST", signal: request.current.signal });
                  if (!sessionResponse.ok) throw new Error("Could not start checkout. Please try again.");
                  const session = await sessionResponse.json();
                  if (typeof session.idempotencyKey !== "string" || !/^[a-f0-9-]{36}$/i.test(session.idempotencyKey)) throw new Error("Could not start checkout. Please try again.");
                  attempt.current = JSON.stringify({ cake, pickup, name: name.trim(), email: email.trim(), phone: phone.trim(), expectedTotal: quote.total, idempotencyKey: session.idempotencyKey, termsAccepted: true, allergenAccepted: true });
                  saveAttempt(attempt.current);
                }
                const response = await fetch(apiUrl("/api/cake/checkout"), { method: "POST", headers: { "Content-Type": "application/json" }, body: attempt.current, signal: request.current.signal });
                const data = await response.json();
                if (!response.ok) {
                  if (response.status === 400 || response.status === 409) { attempt.current = undefined; saveAttempt(null); }
                  throw new Error(data.error || "Checkout is temporarily unavailable.");
                }
                const destination = new URL(data.url);
                if (destination.protocol !== "https:" || !["square.link", "sandbox.square.link", "checkout.square.site", "sandbox.checkout.square.site"].includes(destination.hostname)) throw new Error("Invalid checkout address.");
                setUrl(destination.href);
                window.location.assign(destination.href);
              } catch (caught) {
                if (!active.current || (caught instanceof DOMException && caught.name === "AbortError")) return;
                setError(caught instanceof Error && caught.message !== "Failed to fetch" ? caught.message : "Could not reach checkout. Please check your connection and try again.");
              } finally {
                request.current = null;
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            <div>
              <label htmlFor="payer-name" className={fieldLabel}>Full Name <span className={requiredMark}>*</span></label>
              <input className={inputClass} id="payer-name" autoComplete="name" required maxLength={100} value={name} disabled={busy || !!attempt.current} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <label htmlFor="payer-email" className={fieldLabel}>Email <span className={requiredMark}>*</span></label>
              <input className={inputClass} id="payer-email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy || !!attempt.current} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <label htmlFor="payer-phone" className={fieldLabel}>Phone <span className={requiredMark}>*</span></label>
              <input className={inputClass} id="payer-phone" type="tel" autoComplete="tel" required minLength={7} maxLength={30} pattern="[+()0-9\s.\-]{7,30}" value={phone} disabled={busy || !!attempt.current} onChange={(event) => setPhone(event.target.value)} />
              <p className="mt-1 text-[11px] text-accent-dark/50">Saved to your Square customer profile for order management.</p>
            </div>
            <div className="flex items-center justify-between border-t border-[#e3d7c2] pt-3">
              <span className="text-xs text-accent-dark md:text-sm">Total</span>
              <strong className="font-signika text-bold text-[21px] lg:text-[25px] font-normal text-primary">{money(quote.total)}</strong>
            </div>
            <div className="space-y-4">
  <label className="flex items-start gap-3 text-sm leading-6 text-accent-dark/75">
    <input
      type="checkbox"
      required
      checked={termsAccepted}
      disabled={busy || !!attempt.current}
      onChange={(event) => setTermsAccepted(event.target.checked)}
      className="mt-1 size-4 shrink-0 accent-primary"
    />
    <span>
      I have read and agree to Cake Cloud&apos;s{" "}
      <Link
        href="/about#terms-and-conditions"
        className="font-semibold text-accent-dark underline underline-offset-2"
      >
        terms &amp; conditions
      </Link>,{" "}
      <Link
        href="/about#cancellation-refund-policy"
        className="font-semibold text-accent-dark underline underline-offset-2"
      >
        cancellation &amp; refund policy
      </Link>
      , and{" "}
      <Link
        href="/about#privacy-policy"
        className="font-semibold text-accent-dark underline underline-offset-2"
      >
        privacy policy
      </Link>.
    </span>
  </label>

  <label className="flex items-start gap-3 text-sm leading-6 text-accent-dark/75">
    <input
      type="checkbox"
      required
      checked={allergenAccepted}
      disabled={busy || !!attempt.current}
      onChange={(event) => setAllergenAccepted(event.target.checked)}
      className="mt-1 size-4 shrink-0 accent-primary"
    />
    <span>
      I have read and agree to Cake Cloud&apos;s{" "}
      <Link
        href="/about#allergen-food-safety"
        className="font-semibold text-accent-dark underline underline-offset-2"
      >
        allergens &amp; food safety information
      </Link>.
    </span>
  </label>
</div>

<p className="text-[13px] leading-[1.5] text-[#88857d]">
  You’ll complete your payment securely on Square.
</p>

{error && (
  <p className={errorText} role="alert">
    {error}
  </p>
)}

<button
  className={primaryButton}
  disabled={busy || !termsAccepted || !allergenAccepted}
>
  {busy ? "Opening Square…" : "Continue to Square"}
</button>
          </form>
        </div>
      </div>
    </main>
  );
}
