import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

import { policySource } from "./policy-source";
import { PolicyAccordion } from "./PolicyAccordion";

export const metadata: Metadata = {
  title: "About | Cake Cloud",
  description: "Discover Cake Cloud Boutique, our story, and how to order from our East Perth kitchen.",
};

const steps = [
  { icon: "🛒", title: "1. Browse", text: "Explore our fresh bakes or custom cake options." },
  { icon: "✏️", title: "2. Customise", text: "Pick your size, flavours, and decorations." },
  { icon: "💳", title: "3. Pay", text: "Secure online payment — no surprises." },
  { icon: "🎂", title: "4. Collect", text: "Pickup at our East Perth boutique or via Uber Eats." },
];

const policyLabels = [
  { id: "terms-and-conditions", sourceTitle: "Website Terms & Conditions", label: "Terms & Conditions" },
  { id: "custom-cake-ordering-policy", sourceTitle: "Custom Cake Ordering Policy", label: "Custom Cake Ordering Policy" },
  { id: "cancellation-refund-policy", sourceTitle: "Cancellation & Refund Policy", label: "Cancellation & Refund Policy" },
  { id: "allergen-food-safety", sourceTitle: "Allergen & Food Safety Information", label: "Allergen & Food Safety Information" },
  { id: "privacy-policy", sourceTitle: "Privacy Policy", label: "Privacy Policy" },
] as const;

type PolicySection = { title: string; blocks: string[] };
type Policy = { id: string; label: string; intro: string[]; sections: PolicySection[] };

function parsePolicies(source: string): Policy[] {
  const normalized = source.replaceAll("\r", "");

  return policyLabels.map(({ id, sourceTitle, label }, policyIndex) => {
    const marker = `CAKE CLOUD\n\n${sourceTitle}`;
    const start = normalized.indexOf(marker) + marker.length;
    const nextTitle = policyLabels[policyIndex + 1]?.sourceTitle;
    const end = nextTitle ? normalized.indexOf(`CAKE CLOUD\n\n${nextTitle}`, start) : normalized.length;
    const content = normalized.slice(start, end).trim();
    const headings = [...content.matchAll(/^(\d+)\. (.+)$/gm)];
    const introText = content.slice(0, headings[0]?.index ?? 0).trim();
    const sections = headings.map((heading, sectionIndex) => {
      const bodyStart = (heading.index ?? 0) + heading[0].length;
      const bodyEnd = headings[sectionIndex + 1]?.index ?? content.length;

      return {
        title: `${heading[1]}. ${heading[2]}`,
        blocks: content.slice(bodyStart, bodyEnd).trim().split(/\n\n+/),
      };
    });

    return { id, label, intro: introText ? introText.split(/\n\n+/) : [], sections };
  });
}

const policies = parsePolicies(policySource);

function LocationIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8"/></svg>;
}

function ChatIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5"><path d="M20 11.5a7.5 7.5 0 0 1-11.3 6.5L4 19l1.1-4.3A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.7"/></svg>;
}

function InstagramIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>;
}

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="currentColor"><path d="M14 21v-8h2.8l.4-3H14V8.1c0-.9.3-1.6 1.7-1.6h1.7V3.8c-.8-.1-1.6-.2-2.4-.2-2.4 0-4 1.4-4 4.1V10H8.5v3H11v8h3Z"/></svg>;
}

function PolicyBlock({ block }: { block: string }) {
  if (block.startsWith("- ")) {
    return <ul className="list-disc space-y-1 pl-5">{block.split("\n").map((item) => <li key={item}>{item.replace(/^- /, "")}</li>)}</ul>;
  }

  return <p className="whitespace-pre-line">{block}</p>;
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
            <p className="mt-3 max-w-[680px] font-signika text-sm leading-[1.55] text-accent-dark/60">Before placing your order, please take a moment to review the following policies and information.</p>
            <div className="mt-5 space-y-3">
              {policies.map((policy) => <PolicyAccordion key={policy.id} id={policy.id} title={policy.label}>
                <div className="font-signika text-[13px] leading-[1.65] text-accent-dark/65">
                  <div className="space-y-3">{policy.intro.map((block) => <PolicyBlock key={block} block={block} />)}</div>
                  <div className="mt-5 space-y-6">
                    {policy.sections.map((section) => <section key={section.title}>
                      <h3 className="font-medium text-accent-dark">{section.title}</h3>
                      <div className="mt-2 space-y-3">{section.blocks.map((block) => <PolicyBlock key={block} block={block} />)}</div>
                    </section>)}
                  </div>
                </div>
              </PolicyAccordion>)}
            </div>
          </section>

          <section className="mt-14 md:mt-16">
            <p className="font-signika text-[9px] uppercase tracking-[0.22em] text-accent-dark/50">Find Us</p>
            <h2 className="mt-4 font-kalnia text-[25px] font-medium md:text-[27px]">Visit the Boutique</h2>
            <div className="mt-5 rounded-xl border border-[#ddd2bf] bg-[#faf7f0] p-5 font-signika text-xs text-accent-dark/65 md:p-6">
              <a href="https://www.google.com/maps/search/?api=1&query=1%2F180+Royal+St+East+Perth+WA+6004" target="_blank" rel="noreferrer" className="flex items-start gap-3 text-accent-dark"><span className="text-primary"><LocationIcon /></span><span><strong className="block font-medium">1/180 Royal Street</strong><span className="mt-1 block text-accent-dark/55">East Perth WA 6004</span></span></a>
              <a href="https://wa.me/61413681344" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 whitespace-nowrap text-primary"><ChatIcon /> WhatsApp Us</a>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-primary">
                <span className="inline-flex items-center gap-2 whitespace-nowrap"><InstagramIcon /> Instagram</span>
                <span className="inline-flex items-center gap-2 whitespace-nowrap"><FacebookIcon /> Facebook</span>
              </div>
            </div>
          </section>
        </div>
      </div>

    </main>
    <Footer />
  </>;
}
