"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { apiUrl } from "@/lib/api";
import { defaultAustralianPhone, formatAustralianPhoneInput } from "@/lib/australian-phone";

type JoinResult = { joined?: boolean; memberCode?: string; error?: string };

const inputClass =
  "h-12 w-full rounded-lg border border-luxury-accent/35 bg-accent/90 px-4 font-signika text-base text-accent-dark shadow-[0_2px_8px_rgb(70_66_72_/_4%)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-accent-dark/38 focus:border-primary focus:bg-accent focus:shadow-[0_0_0_3px_rgb(113_141_127_/_14%)]";

export function ClubRegistration() {
  const [memberCode, setMemberCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const response = await fetch(apiUrl("/api/club/join"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          privacyAccepted: form.get("privacyAccepted") === "on",
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as JoinResult;
      if (!response.ok || !result.memberCode) {
        throw new Error(result.error || "We could not save your membership. Please try again.");
      }
      setMemberCode(result.memberCode);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "We could not save your membership. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (memberCode) {
    return (
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col items-center px-5 pb-20 pt-20 text-center md:pt-24">
        <div className="grid size-16 place-items-center rounded-full bg-primary text-accent shadow-[0_10px_30px_rgb(70_66_72_/_14%)]" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-8 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4.5 4.5L19 7" />
          </svg>
        </div>
        <h1 className="mt-7 font-kalnia text-3xl font-medium text-accent-dark md:text-4xl">
          Welcome to the Club!
        </h1>
        <p className="mt-3 max-w-xl font-signika text-base leading-7 text-accent-dark/68">
          Your details have been saved and you&apos;re now a Cake Cloud Club member.
          Keep your member number handy.
        </p>
        <div className="mt-8 min-w-[min(100%,21rem)] rounded-2xl border border-luxury-accent/45 bg-accent/88 px-9 py-7 shadow-[0_12px_34px_rgb(70_66_72_/_7%)]">
          <p className="font-signika text-xs uppercase tracking-[0.22em] text-accent-dark/60">
            Your member number
          </p>
          <p className="mt-2 font-signika text-3xl tracking-[0.14em] text-primary md:text-4xl">
            {memberCode}
          </p>
        </div>
        <Link href="/" className="mt-8 inline-flex h-12 min-w-48 items-center justify-center rounded-full border border-luxury-accent bg-accent px-8 font-kalnia text-base font-medium text-accent-dark transition-colors hover:border-primary hover:bg-primary hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          Back to Home
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-14">
      <p className="font-signika text-xs font-medium uppercase tracking-[0.28em] text-primary">
        Membership
      </p>
      <h1 className="mt-2 font-kalnia text-4xl font-medium leading-tight text-accent-dark md:text-5xl">
        Cake Cloud Club
      </h1>
      <p className="mt-3 max-w-2xl font-signika text-base leading-7 text-accent-dark/68">
        Join the Cake Cloud Club — it&apos;s free. Fill in your details below and
        we&apos;ll give you your personal member number.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block font-signika text-sm font-medium text-accent-dark">
            First Name <span className="text-[#9b4d46]">*</span>
            <input name="firstName" autoComplete="given-name" maxLength={100} required className={`${inputClass} mt-2`} />
          </label>
          <label className="block font-signika text-sm font-medium text-accent-dark">
            Last Name <span className="text-[#9b4d46]">*</span>
            <input name="lastName" autoComplete="family-name" maxLength={100} required className={`${inputClass} mt-2`} />
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block font-signika text-sm font-medium text-accent-dark">
            Email <span className="text-[#9b4d46]">*</span>
            <input name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} required className={`${inputClass} mt-2`} />
          </label>
          <label className="block font-signika text-sm font-medium text-accent-dark">
            Phone <span className="text-[#9b4d46]">*</span>
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={15} defaultValue={defaultAustralianPhone} placeholder="+61 4xx xxx xxx" required onInput={(event) => { event.currentTarget.value = formatAustralianPhoneInput(event.currentTarget.value); }} className={`${inputClass} mt-2`} />
          </label>
        </div>

        <label className="block font-signika text-sm font-medium text-accent-dark">
          Address <span className="text-[#9b4d46]">*</span>
          <input name="address" autoComplete="street-address" maxLength={500} required className={`${inputClass} mt-2`} />
        </label>

        <label className="block font-signika text-sm font-medium text-accent-dark sm:max-w-[calc(50%-0.625rem)]">
          Date of Birth <span className="text-[#9b4d46]">*</span>
          <input name="birthday" type="date" autoComplete="bday" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} required className={`${inputClass} mt-2`} />
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-luxury-accent/30 bg-accent/55 px-4 py-3.5 font-signika text-sm leading-6 text-accent-dark/75">
          <input name="privacyAccepted" type="checkbox" required className="mt-1 size-4 shrink-0 accent-[#718d7f]" />
          <span>
            I agree to Cake Cloud storing these details for my CC Club membership in accordance with the{' '}
            <Link href="/about#privacy-policy" className="font-medium text-primary underline underline-offset-2">Privacy Policy</Link>.
          </span>
        </label>

        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        {error ? (
          <p role="alert" className="rounded-xl border border-[#b65e54]/30 bg-[#fff4f1]/90 px-4 py-3 font-signika text-sm text-[#8b4039]">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={submitting} className="flex h-13 w-full items-center justify-center rounded-full border border-primary bg-primary px-6 font-kalnia text-lg font-medium text-accent transition-[background-color,border-color,transform] hover:border-accent-dark hover:bg-accent-dark active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-55">
          {submitting ? "Joining…" : "Join the Club"}
        </button>
      </form>
    </section>
  );
}
