"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  readHostRequest,
  saveHostRequest,
  type HostRequestItem,
} from "./request-storage";

const money = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function HostRequestReview() {
  const [items, setItems] = useState<HostRequestItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readHostRequest());
    setReady(true);
  }, []);

  const updateItems = (nextItems: HostRequestItem[]) => {
    setItems(nextItems);
    try {
      saveHostRequest(nextItems);
    } catch {
      // Keep the current page usable if storage is unavailable.
    }
  };

  const changeGuests = (id: string, change: number) => {
    updateItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const minimum = item.minimumGuests ?? 10;
        const maximum = item.maximumGuests ?? Number.POSITIVE_INFINITY;
        return {
          ...item,
          guests: Math.max(minimum, Math.min(maximum, item.guests + change)),
        };
      }),
    );
  };

  const removeItem = (id: string) =>
    updateItems(items.filter((item) => item.id !== id));

  return (
    <section className="mx-auto w-full max-w-[996px] px-4 pb-24 pt-8 md:px-6 md:pt-10 lg:px-0">
      <Link
        href="/events"
        className="inline-flex items-center gap-3 font-signika text-sm text-accent-dark/60 transition-colors hover:text-primary"
      >
        <span aria-hidden="true">←</span> Back to Packages
      </Link>
      <h1 className="mt-8 font-kalnia text-4xl font-medium leading-none tracking-[-0.025em] text-accent-dark sm:text-[42px] md:mt-7 md:text-[38px]">
        Review Request
      </h1>

      {!ready ? (
        <p className="py-20 text-center font-signika text-sm text-accent-dark/60">
          Loading request...
        </p>
      ) : items.length === 0 ? (
        <div className="mt-9 rounded-2xl border border-[#d8cdb8] bg-[#fbf8f1] px-6 py-10 text-center">
          <p className="font-signika text-sm text-accent-dark/65">
            Your request is empty.
          </p>
          <Link href="/events" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-7 font-kalnia text-sm text-white">
            Browse Packages
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-9 space-y-5">
            {items.map((item) => {
              const minimum = item.minimumGuests ?? 10;
              const maximum = item.maximumGuests ?? Number.POSITIVE_INFINITY;
              return (
                <li key={item.id} className="grid min-h-[104px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-[#d8cdb8] bg-[#fbf8f1] px-3 py-5 shadow-[0_5px_18px_rgb(70_66_72_/_4%)] sm:gap-3 sm:px-5 md:grid-cols-[64px_minmax(0,1fr)_auto] md:px-5 md:py-4">
                  <div className="hidden size-16 overflow-hidden rounded-full border border-[#d8cdb8] bg-[#e8e0d3] md:block">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 self-start md:self-center">
                    <h2 className="font-kalnia text-[18px] font-medium leading-tight text-accent-dark lg:text-[22px]">
                      {item.name}
                    </h2>
                    <p className="mt-2 font-signika text-sm text-accent-dark/60 md:mt-1 md:text-xs">
                      {money.format(item.unitPrice / 100)}/{item.priceUnit} · min {minimum} people
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                    <span className="mr-1 hidden font-signika text-base text-accent-dark/70 md:inline">Guests</span>
                    <button type="button" aria-label={`Decrease guests for ${item.name}`} disabled={item.guests <= minimum} onClick={() => changeGuests(item.id, -1)} className="inline-flex size-10 items-center justify-center rounded-full border border-[#d8cdb8] font-signika text-xl text-primary disabled:opacity-35 sm:size-11">−</button>
                    <div className="flex min-w-7 flex-col items-center sm:min-w-8">
                      <span className="font-signika text-lg font-medium text-accent-dark">{item.guests}</span>
                      <span className="lg:mt-4 font-signika text-sm text-accent-dark/70 md:hidden">Guests</span>
                    </div>
                    <button type="button" aria-label={`Increase guests for ${item.name}`} disabled={item.guests >= maximum} onClick={() => changeGuests(item.id, 1)} className="inline-flex size-10 items-center justify-center rounded-full border border-[#d8cdb8] font-signika text-xl text-primary disabled:opacity-35 sm:size-11">+</button>
                    <button type="button" aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.id)} className="ml-1 font-signika text-xl text-accent-dark/55 transition-colors hover:text-accent-dark md:ml-3">×</button>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link href="/events/checkout" className="mt-7 inline-flex min-h-[50px] w-full items-center justify-center rounded-full bg-primary px-6 font-kalnia text-lg font-medium text-white transition-colors hover:bg-accent-dark">
            Continue to Request
          </Link>
        </>
      )}
    </section>
  );
}
