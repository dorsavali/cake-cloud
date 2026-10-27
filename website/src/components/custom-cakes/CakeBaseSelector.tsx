"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useDraftState } from "./useDraftState";
import { clearCakeDraft, draftText } from "./draft-storage";
import { useCakeCatalog } from "./useCakeCatalog";
import {
  money,
  sanitizeSelections,
  selectedModifiers,
  type CakeConfig,
  type CakeDesign,
  type CakeSummaryItem,
} from "./cake-types";
import { useCakeQuote } from "./useCakeQuote";
import { CakeCustomiser } from "./CakeCustomiser";
import { CakePickup } from "./CakePickup";
import { CakePayment } from "./CakePayment";
import { CakeProgress } from "./CakeProgress";
import { CakeSummary } from "./CakeSummary";
import { useCakeStep } from "./useCakeStep";
import {
  container,
  modeIcon,
  modeLink,
  pageShell,
  pageTitle,
  progressInTopbar,
  topbar,
} from "./cake-ui";
import { Footer } from "../layout/footer";

export function CakeBaseSelector() {
  const [ready, setReady] = useState(false);
  const [resetRevision, setResetRevision] = useState(0);
  const searchParams = useSearchParams();
  const shouldStartOver = searchParams.get("start") === "1";
  const { designs, error, retry } = useCakeCatalog();

  useEffect(() => {
    if (shouldStartOver) {
      clearCakeDraft();
      setResetRevision((revision) => revision + 1);
      const url = new URL(window.location.href);
      window.history.replaceState(null, "", url.pathname);
    }
    setReady(true);
  }, [shouldStartOver]);

  if (!ready) {
    return (
      <main className={pageShell} aria-busy="true">
        <div className={container}>Loading your cake…</div>
      </main>
    );
  }
  return <CakeDraftFlow key={resetRevision} designs={designs} error={error} onRetry={retry} />;
}

function CakeDraftFlow({ designs, error, onRetry }: { designs?: CakeDesign[]; error?: string; onRetry: () => void }) {
  const [designId, setDesignId] = useDraftState<string | null>("design", null, (value): value is string | null => value === null || (typeof value === "string" && value.length <= 200));
  const design = designs?.find((item) => item.id === designId);

  if (design) {
    return (
      <CakeFlow
        key={design.id}
        design={design}
        onExit={() => {
          setDesignId(null);
          window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
        }}
      />
    );
  }

  return (
    <section>
      <main className={pageShell}>
        <div className={container}>
          <div className="flex items-center justify-between gap-3 pt-4 md:block">
            <Link
              href="/"
              className="inline-flex min-h-6 items-center border-0 bg-none p-0 font-[inherit] text-xs text-[#88857d] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary md:gap-2 md:text-[13px]"
            >
              ← <span>Back to Home</span>
            </Link>
            <Link href="/custom-cakes/from-scratch" className={`${modeLink} md:hidden`}>
              <span aria-hidden="true" className={modeIcon}>✨</span> From Scratch
            </Link>
          </div>
          <div className={`${topbar} max-md:mt-5`}>
            <div className={progressInTopbar}>
              <CakeProgress current={0} />
            </div>
            <Link href="/custom-cakes/from-scratch" className={`${modeLink} max-md:hidden`}>
              <span aria-hidden="true" className={modeIcon}>✨</span> From Scratch
            </Link>
          </div>

          <h1 className={pageTitle}>Choose Your Design</h1>

          {error ? (
            <div className="rounded-2xl border border-luxury-accent/25 bg-accent px-4 py-[18px] text-sm leading-[1.6]" role="alert">
              <p className="m-0 mb-3">{error}</p>
              <button
                type="button"
                className="rounded-full border border-primary bg-primary px-[18px] py-2 text-xs text-accent"
                onClick={onRetry}
              >
                Try again
              </button>
            </div>
          ) : !designs ? (
            <p className="m-0 rounded-2xl border border-luxury-accent/25 bg-accent px-4 py-[18px] text-sm leading-[1.6]" aria-live="polite">
              Loading cake designs…
            </p>
          ) : designs.length === 0 ? (
            <p className="m-0 rounded-2xl border border-luxury-accent/25 bg-accent px-4 py-[18px] text-sm leading-[1.6]">
              No custom cake designs are available right now.
            </p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-6" aria-label="Cake design">
              {designs.map((item) => (
                <li key={item.id} className="min-w-0">
                  <button
                    type="button"
                    className="group relative block w-full min-w-0 overflow-hidden rounded-2xl border border-luxury-accent/25 bg-accent p-0 text-left text-inherit shadow-[0_3px_14px_rgb(70_66_72_/_6%)] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgb(70_66_72_/_12%)] aria-pressed:shadow-[0_0_0_2px_#718d7f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transition-none"
                    aria-pressed={designId === item.id}
                    aria-label={`Choose ${item.name}`}
                    onClick={() => setDesignId(item.id)}
                  >
                    <span className="relative block aspect-[4/4.2] overflow-hidden bg-[#eee8dc]">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          unoptimized
                          sizes="(min-width: 1024px) 22vw, 46vw"
                          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.025] motion-reduce:transition-none"
                        />
                      ) : (
                        <span className="grid size-full place-items-center text-xs text-accent-dark/40">No image</span>
                      )}
                    </span>
                    <span className="flex min-h-[78px] items-end justify-between gap-2.5 px-3 py-2.5 lg:min-h-[112px] lg:px-4 lg:py-4">
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-medium leading-[1.4] lg:text-lg lg:leading-7">{item.name}</span>
                        {item.description ? (
                          <span className="line-clamp-1 text-[11px] font-light text-accent-dark/60 lg:text-sm">{item.description}</span>
                        ) : null}
                        <span className="mt-1 text-xs text-accent-dark/65 lg:text-sm">From {money(item.price.amount, item.price.currency)}</span>
                      </span>
                      <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-primary text-xl font-light leading-none text-accent lg:size-7" aria-hidden="true">
                        {designId === item.id ? "✓" : "+"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </section>
  );
}

function CakeFlow({ design, onExit }: { design: CakeDesign; onExit: () => void }) {
  const [rawSelections, setSelections] = useDraftState<Record<string, string[]>>("selections", {}, (value): value is Record<string, string[]> =>
    !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.entries(value).every(([key, ids]) => key.length <= 200 && Array.isArray(ids) && ids.length <= 50 && ids.every((id) => typeof id === "string" && id.length <= 200)));
  const [message, setMessage] = useDraftState("message", "", (value): value is string => draftText(value) && value.length <= 80);
  const [date, setDate] = useDraftState("date", "", draftText);
  const [time, setTime] = useDraftState("time", "", draftText);
  const { step, go, back } = useCakeStep(onExit);
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (step !== "date" && step !== "summary" && step !== "payment") return;
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, [step]);

  const cake: CakeConfig = useMemo(
    () => ({ design: design.id, selections: sanitizeSelections(design, rawSelections), message }),
    [design, rawSelections, message],
  );
  const pickupValue = useMemo(() => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
    if (!match || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return undefined;
    return `${match[3]}-${match[2]}-${match[1]}T${time}`;
  }, [date, time]);
  const { quote, error: quoteError } = useCakeQuote(cake, pickupValue, quoteRevision);

  const currency = design.price.currency;
  const fee = quote?.fee ?? 0;
  const unavailable = quote?.available === false;
  const availability = unavailable ? "Not available (< 24 h)" : fee ? "Next-day creation (+$80)" : "Standard (free)";
  const valid = !!pickupValue && quote?.available === true && !!quote.expires && quote.expires > now;

  const summary: CakeSummaryItem[] = useMemo(() => [
    { label: "Design", value: design.name },
    ...design.modifierLists.flatMap((list) => {
      const names = selectedModifiers(list, rawSelections[list.id] ?? []).map((modifier) => modifier.name);
      return names.length > 0 ? [{ label: list.name, value: names.join(", ") }] : [];
    }),
    { label: "Message", value: message || "None" },
    { label: "Total", value: quote?.subtotal === undefined ? "…" : money(quote.subtotal, currency) },
  ], [design, rawSelections, message, quote?.subtotal, currency]);

  // The payment step needs a live, unexpired quote; otherwise stay on Summary.
  const view = step === "payment" && !valid ? "summary" : step;

  if (view === "customise") {
    return (
      <CakeCustomiser
        design={design}
        selections={rawSelections}
        message={message}
        subtotal={quote?.subtotal}
        priceError={quoteError}
        onSelectionsChange={setSelections}
        onMessageChange={setMessage}
        onBack={() => go("design")}
        onNext={() => go("date")}
      />
    );
  }

  if (view === "date") {
    return (
      <CakePickup
        date={date}
        time={time}
        quote={quote}
        quoteError={quoteError}
        onDateChange={setDate}
        onTimeChange={setTime}
        onBack={() => back("customise")}
        onContinue={() => { setNow(Date.now()); go("summary"); }}
      />
    );
  }

  return view === "payment" && quote ? (
    <CakePayment
      cake={cake}
      pickup={pickupValue!}
      quote={quote}
      summary={summary}
      availability={availability}
      fee={fee}
      onBack={() => { setQuoteRevision((value) => value + 1); back("summary"); }}
    />
  ) : (
    <CakeSummary
      summary={summary}
      pickup={date && time ? `${date} ${time}` : ""}
      availability={availability}
      fee={fee}
      quote={quote}
      unavailable={unavailable}
      quoteError={quoteError}
      onBack={() => back("date")}
      onEdit={() => go("customise")}
      onContinue={() => { setNow(Date.now()); go("payment"); }}
    />
  );
}
