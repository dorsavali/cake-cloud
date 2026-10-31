"use client";

import { useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import type { CakeQuote } from "./useCakeQuote";
import { CakeSelect } from "./CakeSelect";
import { CakeProgress } from "./CakeProgress";
import {
  container,
  errorText,
  fieldLabel,
  inputClass,
  pageShell,
  pageTitle,
  primaryButton,
  requiredMark,
} from "./cake-ui";

function parseDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;
  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <path d="M20.1 11.6a8.1 8.1 0 0 1-12 7.1L3 20l1.3-4.9a8.1 8.1 0 1 1 15.8-3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.1 7.7c-.2-.4-.4-.4-.7-.4h-.6c-.2 0-.6.1-.9.4-.3.4-1 1-1 2.4s1 2.8 1.2 3c.2.2 2 3.2 5 4.3 2.5 1 3 .8 3.6.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4l-2-1c-.3-.1-.5-.2-.7.2-.2.3-.7 1-1 1.1-.1.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2Z" fill="currentColor" transform="translate(2.2 1.5) scale(.85)" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <path d="M7.2 3.5 10 7.8 8.2 9.6c1.2 2.5 3.2 4.5 5.7 5.7l1.8-1.8 4.3 2.8-.8 3.2c-.2.8-1 1.3-1.8 1.2C9.8 19.8 4 14 3.1 6.4 3 5.6 3.5 4.8 4.3 4.6l2.9-1.1Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CakePickup({ date, time, quote, quoteError, onDateChange, onTimeChange, onBack, onContinue }: {
  date: string;
  time: string;
  quote?: CakeQuote;
  quoteError?: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const calendar = useRef<HTMLDialogElement>(null);
  const contact = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const contactTrigger = useRef<HTMLButtonElement>(null);
  const [month, setMonth] = useState(parseDate(date) ?? new Date());
  const [touched, setTouched] = useState(false);
  const [input, setInput] = useState([date, time].filter(Boolean).join(" "));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = parseDate(date);
  const validDate = !!selected && timePattern.test(time);
  const unavailable = quote?.available === false;
  const fee = quote?.fee ?? 0;
  const availability = unavailable ? "Not available (< 24 h)" : fee ? "Next-day creation (+$80)" : "Standard (free)";
  const valid = validDate && quote?.available === true && !!quote.expires && quote.expires > Date.now();

  function updateInput(value: string) {
    setInput(value);
    const parts = value.trim().split(/\s+/);
    onDateChange(parts[0] ?? "");
    onTimeChange(parts.length === 2 ? parts[1] : "");
    const next = parseDate(parts[0] ?? "");
    if (next) setMonth(next);
  }

  const closeCalendar = () => {
    calendar.current?.close();
    trigger.current?.focus();
  };

  const closeContact = () => {
    contact.current?.close();
    contactTrigger.current?.focus();
  };

  return (
    <main className={pageShell}>
      <div className={`${container} max-w-[620px] md:max-w-[60%]`}>
        <button className="inline-flex  min-h-6 items-center gap-[7px] border-0 bg-none p-0 pt-4 font-[inherit] text-xs text-[#88857d] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary md:gap-2 md:text-[13px]" type="button" onClick={onBack}>
          ← <span>Back to Customise</span>
        </button>
        <div className="mt-[18px] min-w-0 max-md:mt-[22px] md:mt-[22px]"><CakeProgress current={2} /></div>
        <h1 className={`${pageTitle} mt-6 tracking-[-.025em] md:tracking-normal`}>Pickup Date &amp; Time</h1>
        <form
          className="grid gap-[15px] md:gap-[18px]"
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (valid) onContinue();
          }}
        >
          <div>
            <label className={fieldLabel} htmlFor="pickup-date">
              Preferred Pickup Date &amp; Time <span className={requiredMark}>*</span>
            </label>
            <div className="relative">
              <input
                id="pickup-date"
                type="text"
                placeholder="DD/MM/YYYY HH:mm"
                autoComplete="off"
                required
                value={input}
                aria-describedby={touched && !validDate ? "pickup-error" : selected && quote ? "pickup-status" : undefined}
                aria-invalid={touched && (!validDate || unavailable)}
                onBlur={() => setTouched(true)}
                onChange={(event) => updateInput(event.target.value)}
                className={`${inputClass} pr-11 md:pr-[46px]`}
              />
              <button
                ref={trigger}
                type="button"
                aria-label="Open pickup calendar"
                aria-haspopup="dialog"
                onClick={() => calendar.current?.showModal()}
                className="absolute right-0 top-0 grid size-10 w-11 place-items-center border-0 bg-none text-primary md:h-[38px] md:w-[42px]"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="[stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.5] stroke-current">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2M8 18h2" />
                </svg>
              </button>
            </div>
            {touched && !validDate && <p id="pickup-error" className={errorText}>Enter a valid date and time: DD/MM/YYYY HH:mm (24-hour time).</p>}
          </div>
          <div aria-live="polite">
            {selected && quote && (
              <div id="pickup-status" className={`flex items-start gap-3 rounded-[10px] border px-3.5 py-[15px] text-sm ${unavailable ? "border-[#ffc7ce] bg-[#fff3f4]" : "border-[#e3d7c2] bg-[#f0eadd]"}`}>
                <span aria-hidden="true">{unavailable ? "⛔" : "🕒"}</span>
                <div>
                  {availability}
                  {unavailable && <p className="mt-1 text-xs text-[#e12727]">Please choose a date at least 24 hours from now.</p>}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 text-xs text-accent-dark md:flex-row md:items-center md:justify-between md:gap-4">
            <span>Need Your Cake in Less Than 48 Hours?</span>
            <button
              ref={contactTrigger}
              type="button"
              aria-haspopup="dialog"
              onClick={() => contact.current?.showModal()}
              className="min-h-9 rounded-full border border-primary bg-accent px-4 py-2 font-signika text-xs text-accent-dark transition-colors hover:bg-primary hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Contact us directly to check availability.
            </button>
          </div>
          {quoteError && <p className={errorText} role="alert">{quoteError}</p>}
          <button className={primaryButton} disabled={!valid}>Review Order</button>
        </form>

        <dialog
          ref={calendar}
          className="m-auto max-h-[calc(100dvh-32px)] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-[14px] border border-[#e3d7c2] bg-accent p-3 text-accent-dark shadow-[0_18px_60px_#46424826] backdrop:bg-[#46424838] md:w-auto md:max-w-[min(420px,calc(100vw-32px))] md:p-5"
          aria-labelledby="calendar-title"
          onClick={(event) => { if (event.target === event.currentTarget) closeCalendar(); }}
        >
          <div className="mb-3 flex items-center justify-between gap-3 md:mb-[18px]">
            <h2 id="calendar-title" className="font-kalnia font-medium text-sm md:text-base">Choose pickup date &amp; time</h2>
            <button type="button" aria-label="Close calendar" onClick={closeCalendar} className="grid size-10 shrink-0 place-items-center rounded-full border-0 bg-primary/8 text-2xl leading-none text-primary md:size-8 md:text-[23px]">×</button>
          </div>
          <DayPicker
            className="font-signika text-sm max-md:[--rdp-day-width:clamp(30px,10vw,42px)] max-md:[--rdp-day-height:42px] max-md:[--rdp-day_button-width:clamp(28px,9vw,40px)] max-md:[--rdp-day_button-height:40px]"
            mode="single"
            selected={selected}
            month={month}
            onMonthChange={setMonth}
            disabled={{ before: today }}
            autoFocus
            onSelect={(value) => {
              if (!value) return;
              const text = `${String(value.getDate()).padStart(2, "0")}/${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`;
              onDateChange(text);
              setInput(`${text}${time ? ` ${time}` : ""}`);
            }}
          />
          <fieldset className="my-4 grid gap-1.5 text-sm">
            <legend className="mb-4">Pickup time (24-hour)</legend>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <CakeSelect
                consistent
                label="Hour"
                value={timePattern.test(time) ? time.slice(0, 2) : "Choose"}
                options={Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"))}
                onChange={(hour) => {
                  const value = `${hour}:${/^[0-5]\d$/.test(time.slice(3)) ? time.slice(3) : "00"}`;
                  onTimeChange(value);
                  setInput([date, value].filter(Boolean).join(" "));
                }}
              />
              <span aria-hidden="true">:</span>
              <CakeSelect
                consistent
                label="Minute"
                value={timePattern.test(time) ? time.slice(3) : "Choose"}
                options={Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"))}
                onChange={(minute) => {
                  const value = `${/^([01]\d|2[0-3])$/.test(time.slice(0, 2)) ? time.slice(0, 2) : "00"}:${minute}`;
                  onTimeChange(value);
                  setInput([date, value].filter(Boolean).join(" "));
                }}
              />
            </div>
          </fieldset>
          <button
            type="button"
            className={primaryButton}
            disabled={!validDate}
            onClick={() => { setTouched(true); closeCalendar(); }}
          >
            Done
          </button>
        </dialog>

        <dialog
          ref={contact}
          className="m-auto w-[min(330px,calc(100vw-32px))] rounded-[14px] border border-[#e3d7c2] bg-accent p-6 text-accent-dark shadow-[0_18px_60px_#46424826] backdrop:bg-[#46424866]"
          aria-labelledby="contact-title"
          onClose={() => contactTrigger.current?.focus()}
          onClick={(event) => { if (event.target === event.currentTarget) closeContact(); }}
        >
          <h2 id="contact-title" className="sr-only">Contact Cake Cloud</h2>
          <div className="grid gap-3">
            <a
              href="https://wa.me/61413681344"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 font-kalnia text-sm text-accent transition-colors hover:bg-[#5e796c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <WhatsAppIcon />
              WhatsApp Us
            </a>
            <a
              href="tel:+61413681344"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 font-kalnia text-sm text-accent transition-colors hover:bg-[#5e796c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <PhoneIcon />
              Call Us
            </a>
            <button
              type="button"
              onClick={closeContact}
              className="mx-auto min-h-8 px-4 font-signika text-xs text-accent-dark/60 transition-colors hover:text-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cancel
            </button>
          </div>
        </dialog>
      </div>
    </main>
  );
}
