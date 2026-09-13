"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useRef, useState } from "react";

import { apiUrl } from "@/lib/api";

const control = "mt-2 min-h-12 w-full min-w-0 rounded-lg border border-[#d8c49e] bg-[#f8f4ec] px-4 text-base outline-none focus:border-primary";

export function HostEnquiryForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("termsAccepted", data.has("termsAccepted") ? "true" : "false");
    setBusy(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/host/enquiry"), { method: "POST", body: data });
      const result = await response.json() as { received?: boolean; reference?: string; error?: string };
      if (!response.ok || !result.received || !result.reference) throw new Error(result.error || "Could not submit enquiry.");
      setReference(result.reference);
      form.reset();
      setFileName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit enquiry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[846px] px-4 pb-20 pt-8 sm:px-6 md:pt-10 lg:px-0">
      <Link href="/events" className="inline-flex min-h-10 items-center gap-3 font-signika text-sm text-accent-dark/60 transition-colors hover:text-primary"><span aria-hidden="true">←</span> Back</Link>
      <h1 className="mt-4 max-w-[520px] font-kalnia text-[34px] font-medium leading-[1.12] tracking-[-0.025em] text-accent-dark sm:text-[38px] md:mt-5 md:max-w-none md:text-[32px]">Complex Hosting Enquiry</h1>

      {reference ? (
        <div className="mt-8 rounded-2xl border border-[#d8cdb8] bg-[#f8f3e9] p-7 font-signika text-accent-dark/70">
          <h2 className="font-kalnia text-2xl text-accent-dark">Request received</h2>
          <p className="mt-3">Thank you. Your enquiry has been saved and Cake Cloud can follow it using reference:</p>
          <p className="mt-2 font-medium text-primary">{reference}</p>
          <Link href="/events" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-kalnia text-sm text-white">Back to Packages</Link>
        </div>
      ) : (
        <form className="mt-7 min-w-0 space-y-5 font-signika text-accent-dark" onSubmit={submit}>
          <input className="hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <label className="block text-sm font-medium">Full Name <span className="hidden font-normal text-accent-dark/55 md:inline">(Just a person’s Name Or “Corporate Name/Contact Name”)</span> <span className="text-[#a83831]">*</span>
            <input className={`${control} placeholder:text-sm placeholder:text-accent-dark/35 md:placeholder:text-transparent`} name="fullName" required maxLength={100} autoComplete="name" placeholder="(Just a person’s Name Or “Corporate Name/Contact Name”)" />
          </label>
          <label className="block text-sm font-medium">Email <span className="text-[#a83831]">*</span>
            <input className={control} name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>
          <label className="block text-sm font-medium">Phone <span className="text-[#a83831]">*</span>
            <input className={control} name="phone" type="tel" required minLength={7} maxLength={30} autoComplete="tel" />
          </label>
          <label className="block text-sm font-medium">Preferred Date <span className="text-[#a83831]">*</span>
            <input className={control} name="preferredDate" type="date" required min={tomorrow} />
          </label>
          <label className="block text-sm font-medium">Additional Notes
            <textarea className={`${control} min-h-[80px] resize-y py-3 placeholder:text-sm placeholder:text-accent-dark/35`} name="notes" maxLength={2000} rows={3} placeholder="Dietary requirements, delivery address, headcount..." />
          </label>
          <div>
            <p className="text-sm font-medium">Logo/Design <span className="font-normal text-accent-dark/55">(optional)</span></p>
            <p className="mt-1 text-xs leading-relaxed text-accent-dark/60">If you&apos;d like us to use your logo/Design on the selected package/packaging, upload it here.</p>
            <input ref={fileInput} className="sr-only" name="logo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
            <button type="button" onClick={() => fileInput.current?.click()} className="mt-3 flex min-h-14 w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-dashed border-[#d8c49e] bg-[#f8f4ec] px-4 text-left text-sm text-accent-dark/60">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ebe5d9] text-primary" aria-hidden="true">↥</span><span className="truncate">{fileName || "Click to upload logo/Design"}</span>
            </button>
            <p className="mt-1 text-xs text-accent-dark/45">JPG, PNG or WebP · maximum 5 MB</p>
          </div>
          <label className="flex items-start gap-2 text-xs text-accent-dark/55"><input className="mt-0.5 size-4 shrink-0 accent-primary" name="termsAccepted" type="checkbox" required /><span>I have read and agree to the terms and conditions.</span></label>
          {error ? <p className="text-sm text-[#a83831]" role="alert">{error}</p> : null}
          <button className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-kalnia text-lg text-white transition-opacity disabled:cursor-wait disabled:opacity-45" disabled={busy}>{busy ? "Submitting…" : "Submit Request"}</button>
        </form>
      )}
    </section>
  );
}
