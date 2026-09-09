"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiUrl } from "@/lib/api";
import type { HostPackage } from "./types";

const money = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
});

export function HostPackageDetail() {
  const [hostPackage, setHostPackage] = useState<HostPackage | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [addedToRequest, setAddedToRequest] = useState(false);
  const [loadState, setLoadState] =
    useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const packageId = new URLSearchParams(window.location.search).get("id");
    if (!packageId) {
      setLoadState("error");
      return;
    }

    const controller = new AbortController();
    fetch(apiUrl("/api/host/packages"), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Host package request failed");
        return (await response.json()) as { packages?: HostPackage[] };
      })
      .then((data) => {
        const selectedPackage = data.packages?.find(
          (item) => item.id === packageId,
        );
        if (!selectedPackage) throw new Error("Host package not found");
        setHostPackage(selectedPackage);
        setGuestCount(selectedPackage.minimumGuests ?? 10);
        setLoadState("success");
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setLoadState("error");
      });

    return () => controller.abort();
  }, []);

  if (loadState === "loading") {
    return <p className="py-40 text-center font-signika text-sm text-accent-dark/65">Loading package...</p>;
  }

  if (loadState === "error" || !hostPackage) {
    return (
      <div className="mx-auto max-w-xl px-6 py-40 text-center">
        <p className="font-signika text-sm text-accent-dark">This package is currently unavailable.</p>
        <Link href="/events" className="mt-5 inline-block font-signika text-sm font-medium text-primary underline underline-offset-4">Back to host packages</Link>
      </div>
    );
  }

  const minimumGuests = hostPackage.minimumGuests ?? 10;
  const total = hostPackage.priceUnit === "package"
    ? hostPackage.price.amount
    : hostPackage.price.amount * guestCount;

  const addToRequest = () => {
    const requestItem = {
      id: hostPackage.id,
      name: hostPackage.name,
      image: hostPackage.image,
      guests: guestCount,
      unitPrice: hostPackage.price.amount,
      priceUnit: hostPackage.priceUnit,
      currency: hostPackage.price.currency,
    };

    try {
      const stored = window.localStorage.getItem("cake-cloud:host-request:v1");
      const parsed = stored ? (JSON.parse(stored) as unknown) : [];
      const items = Array.isArray(parsed) ? parsed : [];
      const itemIndex = items.findIndex(
        (item) =>
          item &&
          typeof item === "object" &&
          "id" in item &&
          item.id === hostPackage.id,
      );
      if (itemIndex >= 0) items[itemIndex] = requestItem;
      else items.push(requestItem);
      window.localStorage.setItem(
        "cake-cloud:host-request:v1",
        JSON.stringify(items),
      );
    } catch {
      // Keep the in-page confirmation available when storage is blocked.
    }

    setAddedToRequest(true);
  };

  return (
    <div className="mx-auto w-full max-w-[684px] px-6 pb-16 pt-9 md:px-0">
      <Link href="/events" className="inline-flex items-center gap-3 font-signika text-sm text-accent-dark/60 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary">
        <span aria-hidden="true">←</span> Back to Packages
      </Link>

      <article className="mt-7 overflow-hidden rounded-2xl border border-[#d8cdb8] bg-[#fbf8f1] shadow-[0_8px_25px_rgb(70_66_72_/_5%)] md:grid md:min-h-[440px] md:grid-cols-[258px_1fr]">
        <div className="aspect-[1.34] overflow-hidden bg-[#e8e0d3] md:aspect-auto md:h-full">
          {hostPackage.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hostPackage.image} alt={hostPackage.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center font-kalnia text-xl text-accent-dark/45">Cake Cloud</div>
          )}
        </div>

        <div className="flex flex-col px-6 pb-6 pt-5 md:px-6 md:py-7">
          <div className="flex flex-wrap gap-2">
            {hostPackage.categories.map((category) => (
              <span key={category} className="rounded-full bg-[#eee8dc] px-3 py-1.5 font-signika text-[9px] font-medium uppercase tracking-[0.16em] text-accent-dark/60">{category}</span>
            ))}
          </div>
          <h1 className="mt-4 font-kalnia text-[27px] font-medium leading-tight tracking-[-0.025em] text-accent-dark md:text-[26px]">{hostPackage.name}</h1>
          <p className="mt-1 font-signika text-sm text-accent-dark/60">{hostPackage.description}</p>

          {hostPackage.includedItems.length > 0 ? (
            <section className="mt-7" aria-labelledby="included-heading">
              <h2 id="included-heading" className="font-signika text-[9px] font-medium uppercase tracking-[0.24em] text-accent-dark/55">What&apos;s included</h2>
              <ul className="mt-3 space-y-2.5">
                {hostPackage.includedItems.map((item) => (
                  <li key={item} className="flex gap-3 font-signika text-sm text-accent-dark"><span className="text-primary" aria-hidden="true">✓</span>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {hostPackage.priceUnit !== "package" ? (
            <section className="mt-7" aria-labelledby="guest-count-heading">
              <h2 id="guest-count-heading" className="font-signika text-[9px] font-medium uppercase tracking-[0.24em] text-accent-dark/55">Number of guests</h2>
              <p className="mt-1 font-signika text-[11px] text-accent-dark/55">Minimum {minimumGuests} guests · {money.format(hostPackage.price.amount / 100)}/{hostPackage.priceUnit}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="inline-flex h-11 items-center rounded-full bg-primary px-2 text-white">
                  <button type="button" aria-label="Remove one guest" disabled={guestCount <= minimumGuests} onClick={() => setGuestCount((count) => Math.max(minimumGuests, count - 1))} className="inline-flex size-9 items-center justify-center text-xl disabled:opacity-40">−</button>
                  <output className="min-w-10 text-center font-kalnia text-base">{guestCount}</output>
                  <button type="button" aria-label="Add one guest" disabled={hostPackage.maximumGuests !== null && guestCount >= hostPackage.maximumGuests} onClick={() => setGuestCount((count) => hostPackage.maximumGuests ? Math.min(hostPackage.maximumGuests, count + 1) : count + 1)} className="inline-flex size-9 items-center justify-center text-xl disabled:opacity-40">+</button>
                </div>
                <span className="font-signika text-xs text-accent-dark/55">{guestCount} guests</span>
              </div>
            </section>
          ) : null}

          <div className="mt-7 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-t border-[#ded4c3] pt-4 md:flex md:justify-between md:gap-3">
            <p className="whitespace-nowrap font-kalnia text-[20px] text-primary md:text-[24px]">{money.format(total / 100)}</p>
            <button type="button" onClick={addToRequest} className="inline-flex min-h-11 min-w-0 items-center justify-center whitespace-nowrap rounded-full bg-primary px-2 font-kalnia text-[12px] font-medium text-white transition-colors hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:min-h-12 md:min-w-64 md:flex-none md:px-4 md:text-base">Add to The Request</button>
          </div>
        </div>
      </article>

      {addedToRequest ? (
        <section className="mt-4 rounded-2xl border border-[#cfc2aa] bg-[#f8f3e9]/85 p-4 shadow-[0_5px_20px_rgb(70_66_72_/_4%)]" aria-live="polite">
          <p className="flex items-center gap-3 font-signika text-xs font-medium text-accent-dark">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-white" aria-hidden="true">✓</span>
            {hostPackage.name} added to your request.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href="/custom-cakes/from-scratch" className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 font-kalnia text-sm font-medium text-white transition-colors hover:bg-accent-dark">Continue to Request</Link>
            <Link href="/events" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#b9a47a] bg-[#fbf8f1] px-5 font-kalnia text-sm font-medium text-accent-dark transition-colors hover:border-primary hover:text-primary">Add Another Package</Link>
          </div>
        </section>
      ) : null}

      {addedToRequest ? (
        <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ded4c3] bg-[#fbf8f1]/95 px-4 py-3 shadow-[0_-8px_24px_rgb(70_66_72_/_8%)] backdrop-blur-sm md:px-6">
          <div className="mx-auto flex max-w-[1060px] items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-kalnia text-sm text-accent-dark">Your Request · 1 Package</p>
              <p className="mt-1 truncate font-signika text-[10px] text-accent-dark/55">{hostPackage.name} x{guestCount} Guests</p>
            </div>
            <Link href="/custom-cakes/from-scratch" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-primary px-5 font-kalnia text-xs font-medium text-white transition-colors hover:bg-accent-dark md:px-7 md:text-sm">Review Request</Link>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
