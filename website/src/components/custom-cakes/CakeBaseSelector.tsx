"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ProductImagePlaceholder } from "@/components/shared/ProductImagePlaceholder";

import { useDraftState } from "./useDraftState";
import { clearCakeDraft, draftText } from "./draft-storage";
import { useCakeCatalog } from "./useCakeCatalog";
import {
  incompleteLists,
  money,
  modifierListLabel,
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

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-[#ded6c8]/75 ${className}`} />;
}

function CakeDesignGridLoading() {
  return (
    <div role="status" aria-label="Loading cake designs">
      <ul
        aria-hidden="true"
        className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-6"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <li
            key={index}
            className="min-w-0 overflow-hidden rounded-2xl border border-luxury-accent/25 bg-accent"
          >
            <SkeletonBlock className="aspect-[4/4.2] w-full bg-[#e5ddcf]/80" />
            <div className="flex min-h-[78px] items-end px-3 py-2.5 lg:min-h-[112px] lg:px-4 lg:py-4">
              <div className="w-full space-y-2">
                <SkeletonBlock className="h-4 w-2/3 rounded-full lg:h-5" />
                <SkeletonBlock className="h-3 w-5/6 rounded-full" />
                <SkeletonBlock className="h-3 w-1/3 rounded-full" />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading cake designs…</span>
    </div>
  );
}

function CakeDesignPageLoading() {
  return (
    <main className={pageShell} aria-busy="true">
      <div className={container}>
        <SkeletonBlock className="mt-4 h-4 w-28 rounded-full" />
        <div className={`${topbar} max-md:mt-5`}>
          <SkeletonBlock className={`${progressInTopbar} h-9 rounded-full md:h-11`} />
          <SkeletonBlock className="h-8 w-32 rounded-full max-md:hidden md:h-12 md:w-44" />
        </div>
        <SkeletonBlock className="my-5 h-9 w-56 max-w-full rounded-full" />
        <CakeDesignGridLoading />
      </div>
    </main>
  );
}

function CakeCustomiserLoading() {
  return (
    <main
      className={`${pageShell} pb-[30px]`}
      role="status"
      aria-label="Loading cake customisation"
      aria-busy="true"
    >
      <div className={container} aria-hidden="true">
        <SkeletonBlock className="mt-4 h-4 w-28 rounded-full" />
        <div className={`${topbar} max-md:mt-5`}>
          <SkeletonBlock className={`${progressInTopbar} h-9 rounded-full md:h-11`} />
          <SkeletonBlock className="h-8 w-32 rounded-full max-md:hidden md:h-12 md:w-44" />
        </div>

        <SkeletonBlock className="my-5 h-9 w-64 max-w-full rounded-full" />
        <div className="grid grid-cols-1 items-start gap-7 md:grid-cols-[minmax(0,.94fr)_minmax(0,2fr)] md:gap-[30px]">
          <div className="min-w-0">
            <SkeletonBlock className="aspect-square w-full rounded-[10px] border border-luxury-accent/25 bg-[#e5ddcf]/80 md:rounded-xl" />
            <div className="mt-3 flex gap-2.5">
              {Array.from({ length: 3 }, (_, index) => (
                <SkeletonBlock key={index} className="size-[50px] shrink-0 rounded-lg md:size-[54px]" />
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-6 md:gap-[18px]">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex min-w-0 flex-col gap-[5px]">
                <SkeletonBlock className="h-2.5 w-20 rounded-full" />
                <SkeletonBlock className="h-10 w-full rounded-lg" />
              </div>
            ))}
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="flex min-w-0 flex-col gap-[5px]">
                <SkeletonBlock className="h-2.5 w-28 rounded-full" />
                <div className="flex gap-2 overflow-hidden">
                  <SkeletonBlock className="h-9 w-24 shrink-0 rounded-full" />
                  <SkeletonBlock className="h-9 w-28 shrink-0 rounded-full" />
                  <SkeletonBlock className="h-9 w-20 shrink-0 rounded-full" />
                </div>
              </div>
            ))}
            <div className="flex min-w-0 flex-col gap-[5px]">
              <SkeletonBlock className="h-2.5 w-36 rounded-full" />
              <SkeletonBlock className="h-10 w-full rounded-lg" />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[#e3d7c250] pt-4">
              <SkeletonBlock className="h-9 w-24 rounded-full" />
              <SkeletonBlock className="h-10 w-40 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">Loading cake customisation…</span>
    </main>
  );
}

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
    return <CakeDesignPageLoading />;
  }
  return <CakeDraftFlow key={resetRevision} designs={designs} error={error} onRetry={retry} />;
}

function CakeDraftFlow({ designs, error, onRetry }: { designs?: CakeDesign[]; error?: string; onRetry: () => void }) {
  const [designId, setDesignId, designHydrated] = useDraftState<string | null>("design", null, (value): value is string | null => value === null || (typeof value === "string" && value.length <= 200));
  const design = designs?.find((item) => item.id === designId);

  if (!designHydrated) {
    return <CakeDesignPageLoading />;
  }

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

  if (designId && !designs && !error) {
    return <CakeCustomiserLoading />;
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
            <CakeDesignGridLoading />
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
                        <ProductImagePlaceholder />
                      )}
                    </span>
                    <span className="flex min-h-[58px] items-center justify-between gap-2.5 px-3 py-2.5 lg:min-h-[72px] lg:px-4 lg:py-4">
                      <span className="min-w-0 truncate text-[13px] font-medium leading-[1.4] lg:text-lg lg:leading-7">{item.name}</span>
                      <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-primary text-xl font-light leading-none text-accent lg:size-7" aria-hidden="true">
                        +
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
  const [sizeId, setSizeId] = useDraftState<string | null>("size", null, (value): value is string | null => value === null || (typeof value === "string" && value.length <= 200));
  const [rawSelections, setSelections] = useDraftState<Record<string, string[]>>("selections", {}, (value): value is Record<string, string[]> =>
    !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.entries(value).every(([key, ids]) => key.length <= 200 && Array.isArray(ids) && ids.length <= 50 && ids.every((id) => typeof id === "string" && id.length <= 200)));
  const [message, setMessage] = useDraftState("message", "", (value): value is string => draftText(value) && value.length <= 80);
  const [date, setDate] = useDraftState("date", "", draftText);
  const [time, setTime] = useDraftState("time", "", draftText);
  const { step, go, back } = useCakeStep(onExit);
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const size = design.sizes.find((candidate) => candidate.id === sizeId);

  useEffect(() => {
    if (step !== "date" && step !== "summary" && step !== "payment") return;
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, [step]);

  const cake: CakeConfig = useMemo(
    () => ({ design: design.id, size: size?.id ?? "", selections: size ? sanitizeSelections(size, rawSelections) : [], message }),
    [design.id, size, rawSelections, message],
  );
  const configurationComplete = size
    ? incompleteLists(size, rawSelections).length === 0
    : false;
  const liveSubtotal = useMemo(() => {
    if (!size) return undefined;
    return (
      size.price.amount +
      (size.designModifier?.price ?? 0) +
      size.modifierLists.reduce(
        (total, list) =>
          total +
          selectedModifiers(list, rawSelections[list.id] ?? []).reduce(
            (listTotal, modifier) => listTotal + modifier.price,
            0,
          ),
        0,
      )
    );
  }, [size, rawSelections]);
  const pickupValue = useMemo(() => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
    if (!match || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return undefined;
    return `${match[3]}-${match[2]}-${match[1]}T${time}`;
  }, [date, time]);
  const { quote, error: quoteError } = useCakeQuote(
    cake,
    pickupValue,
    quoteRevision,
    configurationComplete,
  );

  const currency = size?.price.currency ?? "AUD";
  const fee = quote?.fee ?? 0;
  const unavailable = quote?.available === false;
  const availability = unavailable ? "Not available (< 24 h)" : fee ? "Next-day creation (+$80)" : "Standard (free)";
  const valid = !!size && !!pickupValue && quote?.available === true && !!quote.expires && quote.expires > now;

  const summary: CakeSummaryItem[] = useMemo(() => [
    { label: "Design", value: design.name },
    ...(size ? [
      { label: "Shape", value: size.shape[0].toUpperCase() + size.shape.slice(1) },
      { label: "Size", value: `${size.label}${size.serves ? `, Serves ${size.serves}` : ""}` },
    ] : []),
    ...(size?.modifierLists ?? []).flatMap((list) => {
      const names = selectedModifiers(list, rawSelections[list.id] ?? []).map((modifier) => modifier.name);
      return names.length > 0 ? [{ label: modifierListLabel(list.name), value: names.join(", ") }] : [];
    }),
    { label: "Message", value: message || "None" },
    { label: "Total", value: money(quote?.subtotal ?? liveSubtotal ?? 0, currency) },
  ], [design.name, size, rawSelections, message, quote?.subtotal, liveSubtotal, currency]);

  // The payment step needs a live, unexpired quote; otherwise stay on Summary.
  const view = step === "payment" && !valid ? "summary" : step;

  if (view === "customise") {
    return (
      <CakeCustomiser
        design={design}
        selectedSizeId={size?.id ?? null}
        selections={rawSelections}
        message={message}
        subtotal={quote?.subtotal ?? liveSubtotal}
        priceError={quoteError}
        onSizeChange={setSizeId}
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
