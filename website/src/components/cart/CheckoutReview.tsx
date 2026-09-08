"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import styles from "./Cart.module.css";

function lineId(item: { id: string; variationId: string | null; options?: Record<string, string> }) {
  return JSON.stringify([item.id, item.variationId, Object.entries(item.options ?? {}).sort(([a], [b]) => a.localeCompare(b))]);
}

function money(amount: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount / 100);
}

export function CheckoutReview() {
  const { items, cartReady, setItemQuantity, checkout, checkoutBusy, checkoutError } = useCart();
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  useEffect(() => {
    const now = new Date();
    setCreatedAt(now);
    const suffix = crypto.getRandomValues(new Uint16Array(2)).reduce((value, part) => value + part.toString(36).toUpperCase().padStart(2, "0"), "").slice(0, 4);
    setOrderNumber(`CC-${Date.now().toString(36).toUpperCase()}-${suffix}`);
  }, []);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = Math.round(subtotal * 0.1);
  const shipping = 150;
  const total = subtotal + tax + shipping;
  const currency = items[0]?.currency ?? "AUD";

  return <main className="min-h-[calc(100dvh-4rem)] px-4 pb-16 pt-5 text-accent-dark md:px-6 md:pt-6">
    <div className="mx-auto w-full max-w-[440px]">
      <Link href="/DailyMenu" className="inline-flex min-h-10 items-center gap-2 font-signika text-sm text-accent-dark/60 transition hover:text-primary">← <span>Continue Shopping</span></Link>
      <section className="mt-3 rounded-2xl bg-[#faf7f0] px-6 py-7 shadow-[0_8px_28px_rgb(70_66_72/12%)] md:px-8 md:py-8">
        <Image src="/images/logo/main.svg" alt="Cake Cloud" width={150} height={190} unoptimized className="mx-auto h-auto w-[132px] md:w-[145px]" />
        <h1 className="mt-3 text-center font-kalnia text-3xl font-medium">Your Order</h1>
        <div className="mt-6 space-y-2 border-y border-dotted border-[#cbbb98] py-4 font-signika text-xs text-accent-dark/65">
          <p><strong className="mr-2 text-accent-dark">Date:</strong>{createdAt?.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) ?? "…"}</p>
          <p><strong className="mr-2 text-accent-dark">Time:</strong>{createdAt?.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) ?? "…"}</p>
          <p><strong className="mr-2 text-accent-dark">Order No:</strong>{orderNumber || "…"}</p>
        </div>

        {!cartReady ? <p className="py-12 text-center font-signika text-sm text-accent-dark/60">Loading your order…</p> : items.length === 0 ? <div className="py-12 text-center font-signika"><p>Your cart is empty.</p><Link href="/DailyMenu" className="mt-5 inline-flex text-primary underline underline-offset-4">Browse Daily Menu</Link></div> : <>
          <div className="mt-7 grid grid-cols-[58px_1fr_auto] border-y border-dotted border-[#cbbb98] py-3 font-signika text-[10px] uppercase tracking-wide text-accent-dark/60"><span>Qty</span><span>Item description</span><span>Total</span></div>
          <ul>
            {items.map((item) => <li key={lineId(item)} className="grid grid-cols-[58px_1fr_auto] items-center gap-2 border-b border-dotted border-[#cbbb98] py-4">
              <div className="flex items-center gap-2 font-signika text-sm">
                <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => setItemQuantity(lineId(item), item.quantity - 1)} className="grid size-6 place-items-center rounded-full border border-[#cbbb98] text-primary">−</button>
                <span>{item.quantity}</span>
                <button type="button" aria-label={`Increase ${item.name}`} disabled={item.maxQuantity !== null && item.quantity >= item.maxQuantity} onClick={() => setItemQuantity(lineId(item), item.quantity + 1)} className="grid size-6 place-items-center rounded-full border border-[#cbbb98] text-primary disabled:opacity-35">+</button>
              </div>
              <div className="min-w-0 font-signika"><h2 className="text-sm font-medium">{item.name}</h2>{item.options && <p className="mt-1 text-[11px] leading-4 text-accent-dark/55">{Object.values(item.options).join(" · ")}</p>}<p className="mt-1 text-xs text-accent-dark/50">{money(item.unitPrice, item.currency)} each</p></div>
              <strong className="font-signika text-sm">{money(item.unitPrice * item.quantity, item.currency)}</strong>
            </li>)}
          </ul>
          <dl className="mt-5 space-y-3 font-signika text-sm">
            <div className="flex justify-between border-b border-dotted border-[#cbbb98] pb-3"><dt>Subtotal</dt><dd>{money(subtotal, currency)}</dd></div>
            <div className="flex justify-between border-b border-dotted border-[#cbbb98] pb-3"><dt>Tax</dt><dd>{money(tax, currency)}</dd></div>
            <div className="flex justify-between border-b border-dotted border-[#cbbb98] pb-3"><dt>Estimated Shipping</dt><dd>{money(shipping, currency)}</dd></div>
          </dl>
          <div className="mt-6 flex items-center justify-between border-y border-dotted border-[#cbbb98] py-5 font-kalnia text-2xl md:text-3xl"><span>Grand Total</span><strong>{money(total, currency)}</strong></div>
          {checkoutError && <p className="mt-4 font-signika text-sm text-[#a0443c]" role="alert">{checkoutError}</p>}
          <button type="button" disabled={checkoutBusy || !orderNumber} onClick={() => checkout(orderNumber)} className={`${styles.reviewCheckoutButton} mt-6 flex min-h-14 w-full items-center justify-center rounded-full border border-[#b9a36e] bg-[#faf7f0] px-6 font-kalnia text-lg transition-colors duration-200 disabled:cursor-wait disabled:opacity-60`}>{checkoutBusy ? "Opening Square…" : "Proceed to Checkout"}</button>
        </>}
      </section>
    </div>
  </main>;
}
