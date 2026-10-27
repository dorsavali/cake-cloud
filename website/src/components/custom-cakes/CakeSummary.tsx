"use client";

import { money, type CakeQuote, type CakeSummaryItem } from "./cake-types";
import { CakeProgress } from "./CakeProgress";
import {
  cardSurface,
  container,
  errorText,
  pageShell,
  pageTitle,
  primaryButton,
} from "./cake-ui";

export function formatPickup(value: string) {
  const local = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/.exec(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  const parts = local
    ? { day: local[1], month: local[2], year: local[3], hour: local[4], minute: local[5] }
    : iso
      ? { day: iso[3], month: iso[2], year: iso[1], hour: iso[4], minute: iso[5] }
      : null;
  if (!parts) return value;
  const date = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour ?? 0), Number(parts.minute ?? 0));
  return date.toLocaleString("en-US", { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
}

export function CakeSummaryDetails({ summary, pickup, availability, fee, quote, unavailable = false, showTotal = true }: {
  summary: CakeSummaryItem[];
  pickup: string;
  availability: string;
  fee: number;
  quote?: CakeQuote;
  unavailable?: boolean;
  showTotal?: boolean;
}) {
  return (
    <div className={cardSurface}>
      <dl className="m-0">
        {summary.filter((item) => item.label !== "Total").map((item) => (
          <div key={item.label} className="flex justify-between gap-3 py-[7px] text-xs md:gap-6 md:text-[13px]">
            <dt className="shrink-0 text-[#88857d]">{item.label}</dt>
            <dd className="min-w-0 break-words text-right">{item.label === "Message" && item.value === "None" ? "—" : item.value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 py-[7px] text-xs md:gap-6 md:text-[13px]">
          <dt className="shrink-0 text-[#88857d]">Pickup</dt>
          <dd className="min-w-0 break-words text-right">{formatPickup(pickup)}</dd>
        </div>
        <div className="flex justify-between gap-3 py-[7px] text-xs md:gap-6 md:text-[13px]">
          <dt className="shrink-0 text-[#88857d]">Rush Fee</dt>
          <dd className="min-w-0 break-words text-right">
            {availability} <span className="ml-2 inline-block text-primary md:ml-3">{fee ? "+$80" : "$0"}</span>
          </dd>
        </div>
        {showTotal && (
          <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-[#ece4d6] pt-3 md:mt-3 md:gap-6 md:pt-3.5">
            <dt className="shrink-0 text-sm text-accent-dark md:text-[15px]">Total</dt>
            <dd className="min-w-0 break-words text-right font-signika text-xl text-primary md:text-[21px]">{quote ? money(quote.total) : "…"}</dd>
          </div>
        )}
      </dl>
      {unavailable && <p className={errorText} role="alert">Please choose a pickup time at least 24 hours from now.</p>}
    </div>
  );
}

export function CakeSummary({ summary, pickup, availability, fee, quote, unavailable, quoteError, onBack, onEdit, onContinue }: {
  summary: CakeSummaryItem[];
  pickup: string;
  availability: string;
  fee: number;
  quote?: CakeQuote;
  unavailable: boolean;
  quoteError?: string;
  onBack: () => void;
  onEdit: () => void;
  onContinue: () => void;
}) {
  return (
    <main className={pageShell}>
      <div className={`${container} max-w-[620px] md:max-w-[60%]`}>
        <button className="inline-flex min-h-6 items-center gap-[7px] border-0 bg-none p-0 pt-4 font-[inherit] text-xs text-[#88857d] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary md:gap-2 md:text-[13px]" type="button" onClick={onBack}>
          ← <span>Back to Date</span>
        </button>
        <div className="mt-[18px] min-w-0 max-md:mt-[22px] md:mt-[22px]"><CakeProgress current={3} /></div>
        <h1 className={`${pageTitle} mt-6 tracking-[-.025em] md:tracking-normal`}>Order Summary</h1>
        <section aria-label="Order summary">
          <CakeSummaryDetails summary={summary} pickup={pickup} availability={availability} fee={fee} quote={quote} unavailable={unavailable} />
          {quoteError && <p className={errorText} role="alert">{quoteError}</p>}
          <div className="mt-[18px] grid grid-cols-2 gap-2.5 md:mt-[22px] md:gap-3">
            <button
              type="button"
              className="min-h-[52px] rounded-[17px] border border-luxury-accent bg-accent px-3 py-[9px] font-kalnia text-sm leading-[1.4] text-accent-dark transition-colors hover:bg-[#f0eadd] md:min-h-0 md:rounded-full md:px-4 md:py-[9px] md:text-base"
              onClick={onEdit}
            >
              Edit
            </button>
            <button
              type="button"
              className={`${primaryButton} min-h-[52px] rounded-[17px] px-3 py-[9px] leading-[1.4] md:min-h-0 md:rounded-full md:px-4 md:py-[9px]`}
              disabled={!quote || quote.available !== true || !quote.expires || quote.expires <= Date.now()}
              onClick={onContinue}
            >
              Proceed to Payment
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
