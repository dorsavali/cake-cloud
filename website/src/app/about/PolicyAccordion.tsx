"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function PolicyAccordion({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash !== `#${id}`) return;
      setOpen(true);
      window.requestAnimationFrame(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [id]);

  return <section ref={rootRef} id={id} className="scroll-mt-24 overflow-hidden rounded-lg border border-[#ddd2bf] bg-[#faf7f0] shadow-[0_3px_12px_rgb(70_66_72_/_3%)]">
    <button
      type="button"
      aria-expanded={open}
      aria-controls={`${id}-content`}
      onClick={() => setOpen((value) => !value)}
      className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left font-signika text-sm text-accent-dark"
    >
      <span>{title}</span>
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={`size-4 shrink-0 transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}><path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
    <div
      id={`${id}-content`}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="border-t border-[#ddd2bf] px-4 py-5 md:px-5 md:py-6">{children}</div>
      </div>
    </div>
  </section>;
}
