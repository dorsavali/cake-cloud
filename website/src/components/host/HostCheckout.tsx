"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { apiUrl } from "@/lib/api";
import { readHostRequest, type HostRequestItem } from "./request-storage";

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 });

export function HostCheckout() {
  const [items, setItems] = useState<HostRequestItem[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(readHostRequest());
    setReady(true);
  }, []);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * (item.priceUnit === "package" ? 1 : item.guests), 0), [items]);
  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !items.length) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const sessionResponse = await fetch(apiUrl("/api/cake/checkout-session"), { method: "POST" });
      if (!sessionResponse.ok) throw new Error("Could not start checkout.");
      const session = await sessionResponse.json() as { idempotencyKey?: unknown };
      if (typeof session.idempotencyKey !== "string") throw new Error("Could not start checkout.");
      data.set("idempotencyKey", session.idempotencyKey);
      data.set("items", JSON.stringify(items.map(({ id, guests }) => ({ id, guests }))));
      data.set("termsAccepted", data.has("termsAccepted") ? "true" : "false");
      const response = await fetch(apiUrl("/api/host/checkout"), { method: "POST", body: data });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Could not start checkout.");
      const destination = new URL(result.url);
      if (destination.protocol !== "https:" || !["square.link", "sandbox.square.link", "checkout.square.site", "sandbox.checkout.square.site"].includes(destination.hostname)) throw new Error("Invalid checkout address.");
      window.location.assign(destination.href);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[700px] px-4 pb-20 pt-8 sm:px-6 md:pt-10 lg:px-0">
      <Link href="/events/request" className="inline-flex min-h-10 items-center gap-3 font-signika text-sm text-accent-dark/60 transition-colors hover:text-primary">
        <span aria-hidden="true">←</span> Back to Package
      </Link>
      <h1 className="mt-5 font-kalnia text-4xl font-medium leading-none tracking-[-0.025em] text-accent-dark md:mt-6 md:text-[32px]">Checkout</h1>

      {!ready ? <p className="py-16 text-center font-signika text-sm text-accent-dark/60">Loading request...</p> : !items.length ? (
        <div className="mt-8 rounded-2xl border border-[#d8cdb8] bg-[#f8f3e9] p-8 text-center">
          <p className="font-signika text-accent-dark/70">Your request is empty.</p>
          <Link href="/events" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-7 font-kalnia text-sm text-white">Browse Packages</Link>
        </div>
      ) : (
        <form className="mt-8 min-w-0 font-signika text-accent-dark" onSubmit={submit}>
          <div className="rounded-2xl border border-[#d8cdb8] bg-[#eee7da] px-4 py-5 md:hidden">
            <p className="mb-4 text-xs tracking-[0.18em] text-accent-dark/55">REQUEST SUMMARY</p>
            <ul className="space-y-4">
              {items.map((item) => <li key={item.id} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3">
                <span className="size-9 overflow-hidden rounded-full border border-[#d8cdb8] bg-[#ddd4c5]">{item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}</span>
                <span className="min-w-0 text-sm font-medium">{item.name}</span>
                <span className="text-sm text-accent-dark/60">× {item.guests}</span>
              </li>)}
            </ul>
          </div>
          <ul className="hidden space-y-5 md:block">
            {items.map((item) => <li key={item.id} className="flex min-h-[76px] items-center justify-between rounded-xl border border-[#d8cdb8] bg-[#eee7da] px-5">
              <div><p className="text-sm font-medium">{item.name}</p><p className="mt-1 text-xs text-accent-dark/60">{item.guests} guests · {money.format(item.unitPrice / 100)}/{item.priceUnit}</p></div>
              <p className="font-kalnia text-xl text-primary">{money.format(item.unitPrice * (item.priceUnit === "package" ? 1 : item.guests) / 100)}</p>
            </li>)}
          </ul>

          <div className="mt-7 space-y-5">
            <label className="block text-sm font-medium">Full Name <span className="text-[#a83831]">*</span><span className="hidden font-normal text-accent-dark/55 md:inline"> (Just a person’s Name Or “Corporate Name/Contact Name”)</span>
              <input name="fullName" required maxLength={100} placeholder="(Just a person’s Name Or “Corporate Name/Contact Name”)" className="mt-2 min-h-12 w-full rounded-lg border border-[#d8c49e] bg-[#f8f4ec] px-4 text-base outline-none placeholder:text-sm placeholder:text-accent-dark/35 focus:border-primary md:placeholder:text-transparent" />
            </label>
            <label className="block text-sm font-medium">Email <span className="text-[#a83831]">*</span>
              <input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-2 min-h-12 w-full rounded-lg border border-[#d8c49e] bg-[#f8f4ec] px-4 text-base outline-none focus:border-primary" />
            </label>
            <label className="block text-sm font-medium">Phone <span className="text-[#a83831]">*</span>
              <input name="phone" type="tel" required minLength={7} maxLength={30} autoComplete="tel" className="mt-2 min-h-12 w-full rounded-lg border border-[#d8c49e] bg-[#f8f4ec] px-4 text-base outline-none focus:border-primary" />
            </label>
            <label className="block text-sm font-medium">Event Date <span className="text-[#a83831]">*</span>
              <input name="eventDate" type="date" required min={tomorrow} className="mt-2 min-h-12 w-full min-w-0 rounded-lg border border-[#d8c49e] bg-[#f8f4ec] px-4 text-base outline-none focus:border-primary" />
            </label>
            <label className="block text-sm font-medium">Additional Notes
              <textarea name="notes" maxLength={1500} rows={3} placeholder="Dietary requirements, delivery address, headcount..." className="mt-2 w-full resize-y rounded-lg border border-[#d8c49e] bg-[#f8f4ec] px-4 py-3 text-base outline-none placeholder:text-sm placeholder:text-accent-dark/35 focus:border-primary" />
            </label>

            <div>
              <p className="text-sm font-medium">Logo/Design <span className="font-normal text-accent-dark/55">(optional)</span></p>
              <p className="mt-1 text-xs leading-relaxed text-accent-dark/60">If you&apos;d like us to use your logo or your own Design on the selected package/packaging, upload it here.</p>
              <input ref={fileInput} className="sr-only" name="logo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
              <button type="button" onClick={() => fileInput.current?.click()} className="mt-3 flex min-h-14 w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-dashed border-[#d8c49e] bg-[#f8f4ec] px-4 text-left text-sm text-accent-dark/60">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ebe5d9] text-primary" aria-hidden="true">↥</span>
                <span className="truncate">{fileName || "Click to upload logo/Design"}</span>
              </button>
              <p className="mt-1 text-xs text-accent-dark/45">JPG, PNG or WebP · maximum 5 MB</p>
            </div>

            <label className="flex items-start gap-2 border-b border-[#ded5c7] pb-4 text-xs text-accent-dark/55">
              <input name="termsAccepted" type="checkbox" required className="mt-0.5 size-4 shrink-0 accent-primary" />
              <span>I have read and agree to the terms and conditions.</span>
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between"><span className="font-medium">Total</span><strong className="font-kalnia text-2xl font-normal text-primary">{money.format(total / 100)}</strong></div>
          {error ? <p role="alert" className="mt-3 text-sm text-[#a83831]">{error}</p> : null}
          <button disabled={busy} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-kalnia text-lg text-white transition-opacity disabled:cursor-wait disabled:opacity-45">{busy ? "Opening Square…" : "Checkout"}</button>
        </form>
      )}
    </section>
  );
}
