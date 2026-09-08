"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { useDraftState } from "./useDraftState";
import { draftText } from "./draft-storage";

const inputClass = "min-h-11 w-full rounded-lg border border-[#ddd0b9] bg-[#faf7f0]/90 px-4 py-2.5 font-signika text-base text-accent-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "mb-1.5 block font-signika text-sm text-accent-dark";

export function CakeBriefForm() {
  const [description, setDescription] = useDraftState("briefDescription", "", (value): value is string => draftText(value) && value.length <= 2000);
  const [inspiration, setInspiration] = useDraftState("briefInspiration", "", (value): value is string => draftText(value) && value.length <= 1000);
  const [pickupDate, setPickupDate] = useDraftState("briefPickupDate", "", draftText);
  const [name, setName] = useDraftState("briefName", "", (value): value is string => draftText(value) && value.length <= 100);
  const [email, setEmail] = useDraftState("briefEmail", "", draftText);
  const [phone, setPhone] = useDraftState("briefPhone", "", draftText);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [minimumDate, setMinimumDate] = useState("");
  useEffect(() => setMinimumDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10)), []);
  const canSubmit = description.trim().length > 0
    && minimumDate.length > 0
    && pickupDate >= minimumDate
    && name.trim().length > 0
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    && /^[+()\d\s.-]{7,30}$/.test(phone.trim());

  if (reference) return <main className="-mt-16 min-h-screen bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:100%_auto] bg-top bg-repeat-y px-5 pb-12 pt-24 text-accent-dark md:pt-28">
    <div className="mx-auto w-full max-w-[700px]">
      <Link href="/custom-cakes" className="inline-flex min-h-10 items-center gap-2 font-signika text-sm text-[#77716f] hover:text-primary">← <span>Custom Cakes</span></Link>
      <section className="mx-auto flex min-h-[430px] max-w-xl flex-col items-center justify-start pt-14 text-center md:pt-20">
        <span className="grid size-20 place-items-center rounded-full bg-[#faf7f0]/75 text-primary" aria-hidden="true">
          <svg width="35" height="35" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
        <h1 className="mt-7 font-kalnia text-3xl font-medium md:text-4xl">Brief Under Review</h1>
        <p className="mt-3 font-signika text-base text-[#77716f]">Our team is reviewing your brief and will reach out within 24 hours.</p>
        <p className="mt-2 font-signika text-sm text-[#a8976d]">Ref #FC-{reference.slice(0, 5).toUpperCase()}</p>
        <Link href="/" className="mt-8 inline-flex min-h-12 min-w-56 items-center justify-center rounded-full border border-[#b9a36e] bg-[#faf7f0]/90 px-8 font-kalnia text-lg text-accent-dark transition hover:bg-white">Back to Home</Link>
      </section>
    </div>
  </main>;

  return <main className="-mt-16 min-h-screen bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:100%_auto] bg-top bg-repeat-y px-5 pb-8 pt-24 text-accent-dark md:pb-12 md:pt-28">
    <div className="mx-auto w-full max-w-[700px]">
      <Link href="/custom-cakes" className="inline-flex min-h-10 items-center gap-2 font-signika text-sm text-[#77716f] hover:text-primary">← <span>Custom Cakes</span></Link>
      <h1 className="mt-3 font-kalnia text-2xl lg:text-3xl font-medium leading-tight">Submit Your Brief</h1>
      <form className="mt-7 grid gap-3" onSubmit={async event => {
        event.preventDefault();
        if (busy || !canSubmit) return;
        setBusy(true); setError("");
        try {
          const form = new FormData();
          form.set("description", description); form.set("inspiration", inspiration);
          form.set("pickupDate", pickupDate); form.set("name", name);
          form.set("email", email); form.set("phone", phone); form.set("website", "");
          files.forEach(file => form.append("images", file));
          const response = await fetch(apiUrl("/api/cake/brief"), { method: "POST", body: form });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Could not submit your brief.");
          setDescription(""); setInspiration(""); setPickupDate("");
          setName(""); setEmail(""); setPhone(""); setFiles([]);
          setReference(data.reference);
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Could not submit your brief.");
        } finally { setBusy(false); }
      }}>
        <label className={labelClass}>Describe your cake <span className="text-[#b5483e]">*</span>
          <textarea className={inputClass + " min-h-28 resize-y"} required maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Tell us about your dream cake — flavours, style, occasion, number of tiers…" />
        </label>
        <label className={labelClass}>Design inspiration (optional)
          <textarea className={inputClass + " min-h-20 resize-y"} maxLength={1000} value={inspiration} onChange={event => setInspiration(event.target.value)} placeholder="Links, notes, colours…" />
        </label>
        <div>
          <span className={labelClass}>Reference images (optional)</span>
          <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => {
            const selected = Array.from(event.target.files || []).slice(0, 3);
            if (selected.some(file => file.size > 5 * 1024 * 1024)) { setError("Each image must be 5 MB or smaller."); event.target.value = ""; setFiles([]); return; }
            setError(""); setFiles(selected);
          }} />
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#ddd0b9] bg-[#faf7f0]/90 px-4 font-signika text-sm text-[#77716f] hover:border-primary hover:text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4h14v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Upload images
          </button>
          <p className="mt-2 font-signika text-xs text-[#77716f]">{files.length ? files.map(file => file.name).join(", ") : "Up to 3 JPG, PNG, or WebP images, 5 MB each."}</p>
        </div>
        <label className={labelClass}>Preferred Pickup Date <span className="text-[#b5483e]">*</span><input className={inputClass} style={{ color: pickupDate ? "#464248" : "#a09a91" }} type="date" min={minimumDate} required value={pickupDate} onChange={event => setPickupDate(event.target.value)} /></label>
        <label className={labelClass}>Your Name <span className="text-[#b5483e]">*</span><input className={inputClass} autoComplete="name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
        <label className={labelClass}>Email <span className="text-[#b5483e]">*</span><input className={inputClass} type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label className={labelClass}>Phone <span className="text-[#b5483e]">*</span><input className={inputClass} type="tel" autoComplete="tel" required maxLength={30} value={phone} onChange={event => setPhone(event.target.value)} /></label>
        <label className="sr-only" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" name="website" /></label>
        {error && <p className="font-signika text-sm text-[#a0443c]" role="alert">{error}</p>}
        <button className="min-h-12 rounded-full bg-primary px-6 font-kalnia text-lg text-accent transition hover:bg-[#5e796c] disabled:cursor-not-allowed disabled:opacity-60" disabled={busy || !canSubmit}>{busy ? "Submitting…" : "Submit Brief"}</button>
      </form>
    </div>
  </main>;
}
