import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "About | Cake Cloud",
  description: "Discover Cake Cloud Boutique, our story, and how to order from our East Perth kitchen.",
};

const steps = [
  { icon: "🛒", title: "1. Browse", text: "Explore our daily menu or custom cake options." },
  { icon: "✏️", title: "2. Customise", text: "Pick your size, flavours, and decorations." },
  { icon: "💳", title: "3. Pay", text: "Secure online payment — no surprises." },
  { icon: "🎂", title: "4. Collect", text: "Pickup at our East Perth boutique or via Uber Eats." },
];

function LocationIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8"/></svg>;
}

function ChatIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5"><path d="M20 11.5a7.5 7.5 0 0 1-11.3 6.5L4 19l1.1-4.3A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.7"/></svg>;
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

function InstagramIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>;
}

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="currentColor"><path d="M14 21v-8h2.8l.4-3H14V8.1c0-.9.3-1.6 1.7-1.6h1.7V3.8c-.8-.1-1.6-.2-2.4-.2-2.4 0-4 1.4-4 4.1V10H8.5v3H11v8h3Z"/></svg>;
}

export default function AboutPage() {
  return <>
    <DesktopHeader />
    <MobileHeader />
    <main className="-mt-16 min-h-dvh overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:auto_100%] bg-top bg-repeat-y pt-16 text-accent-dark md:bg-[length:100%_auto]">
      <div>
        <div className="mx-auto w-full max-w-[820px] px-4 pb-14 pt-9 sm:px-6 md:pb-20 md:pt-10 lg:px-0">
          <section>
            <p className="font-signika text-[9px] uppercase tracking-[0.22em] text-accent-dark/50">Our Story</p>
            <h1 className="mt-3 max-w-[650px] font-kalnia text-[34px] font-medium leading-[1.08] tracking-[-0.02em] md:text-[36px]">A Cloud of Flavour in East Perth</h1>
            <div className="mt-4 max-w-[670px] space-y-4 font-signika text-sm leading-[1.55] text-accent-dark/60">
              <p>Cake Cloud Boutique was born from a love of French pastry tradition and the warmth of Iranian hospitality. Every item is handcrafted daily in our East Perth kitchen — from flaky croissants to bespoke celebration cakes — using the finest local and imported ingredients.</p>
              <p>We believe a great cake is an act of care. Whether you&apos;re picking up a morning pastry or commissioning a wedding centrepiece, we put the same passion into every layer.</p>
            </div>
          </section>

          <section className="mt-14 md:mt-16">
            <p className="font-signika text-[9px] uppercase tracking-[0.22em] text-accent-dark/50">How It Works</p>
            <h2 className="mt-4 font-kalnia text-[25px] font-medium md:text-[27px]">Ordering is Simple</h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-4">
              {steps.map((step) => <li key={step.title} className="min-h-[126px] rounded-xl border border-[#ddd2bf] bg-[#f8f3e9]/80 p-5 shadow-[0_4px_16px_rgb(70_66_72_/_3%)] md:min-h-[132px] md:p-4">
                <span className="text-lg" aria-hidden="true">{step.icon}</span>
                <h3 className="mt-3 font-kalnia text-[16px] font-medium">{step.title}</h3>
                <p className="mt-3 font-signika text-xs leading-relaxed text-accent-dark/55">{step.text}</p>
              </li>)}
            </ol>
          </section>

          <section className="mt-14 md:mt-16">
            <p className="font-signika text-[9px] uppercase tracking-[0.22em] text-accent-dark/50">Good to Know</p>
            <h2 className="mt-4 font-kalnia text-[25px] font-medium md:text-[27px]">Before You Order</h2>
            <div className="mt-4 max-w-[680px] space-y-4 font-signika text-sm leading-[1.55] text-accent-dark/60">
              <p>To make sure your order is ready when you need it, we recommend placing orders in advance — particularly for custom cakes, large quantities, or special occasions. Custom and bespoke cakes require additional lead time, so the earlier you get in touch, the better. Short-notice and same-day requests are subject to availability and may carry a rush fee.</p>
              <p>Pickup is available directly from our East Perth boutique. For delivery, Cake Cloud is on <strong className="font-medium text-accent-dark">Uber Eats</strong> — search for us in the app and place your delivery order there. Daily menu items are also available for walk-in purchase during opening hours, subject to availability on the day.</p>
              <p>For corporate and events packages, use the enquiry forms on those pages — our team will follow up to confirm details and availability. If you have any questions about lead times, ingredients, or a specific occasion, the quickest way to reach us is via WhatsApp or our social channels.</p>
            </div>
          </section>

          <section className="mt-14 md:mt-16">
            <p className="font-signika text-[9px] uppercase tracking-[0.22em] text-accent-dark/50">Find Us</p>
            <h2 className="mt-4 font-kalnia text-[25px] font-medium md:text-[27px]">Visit the Boutique</h2>
            <div className="mt-5 rounded-xl border border-[#ddd2bf] bg-[#faf7f0] p-5 font-signika text-xs text-accent-dark/65 md:p-6">
              <div className="grid gap-5 md:grid-cols-2 md:gap-3">
                <a href="https://www.google.com/maps/search/?api=1&query=1%2F180+Royal+St+East+Perth+WA+6004" target="_blank" rel="noreferrer" className="flex items-start gap-3 text-accent-dark"><span className="text-primary"><LocationIcon /></span><span><strong className="block font-medium">1/180 Royal Street</strong><span className="mt-1 block text-accent-dark/55">East Perth WA 6004</span></span></a>
                <div className="flex items-start gap-3 text-accent-dark">
                  <span className="text-primary"><ClockIcon /></span>
                  <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3 text-center leading-relaxed">
                    <span><span className="block">Mon - Fri</span><span className="block whitespace-nowrap">6:30 Am - 5 PM</span></span>
                    <span aria-hidden="true" className="text-accent-dark/35">|</span>
                    <span><span className="block">Sat - Sun</span><span className="block whitespace-nowrap">8 Am - 4 PM</span></span>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-primary">
                <span className="inline-flex items-center gap-2 whitespace-nowrap"><InstagramIcon /> Instagram</span>
                <span className="inline-flex items-center gap-2 whitespace-nowrap"><FacebookIcon /> Facebook</span>
                <a href="https://wa.me/61413681344" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 whitespace-nowrap"><ChatIcon /> WhatsApp Us</a>
              </div>
            </div>
          </section>
        </div>
      </div>

    </main>
    <Footer />
  </>;
}
