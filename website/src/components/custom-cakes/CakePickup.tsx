"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import shared from "./CakeBaseSelector.module.css";
import styles from "./CakePickup.module.css";

function parseDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;
  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

export function CakePickup({ onBack, date, time, onDateChange, onTimeChange, summary, subtotal }: {
  onBack: () => void; date: string; time: string;
  onDateChange: (value: string) => void; onTimeChange: (value: string) => void;
  summary: { label: string; value: string }[]; subtotal: number;
}) {
  const calendar = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [month, setMonth] = useState(parseDate(date) ?? new Date());
  const [review, setReview] = useState(false);
  const [touched, setTouched] = useState(false);
  const [input, setInput] = useState([date, time].filter(Boolean).join(" "));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const selected = parseDate(date);
  const validDate = !!selected;
  const pickup = selected && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), Number(time.slice(0, 2)), Number(time.slice(3))) : undefined;
  const hours = pickup ? (pickup.getTime() - now) / 3600000 : undefined;
  const unavailable = hours !== undefined && hours < 24;
  const fee = hours !== undefined && hours >= 24 && hours < 48 ? 8000 : 0;
  const availability = unavailable ? "Not available (< 24 h)" : fee ? "Next-day creation (+$80)" : "Standard (free)";
  const money = (amount: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount / 100);
  function updateInput(value: string) {
    setInput(value);
    const parts = value.trim().split(/\s+/);
    onDateChange(parts[0] ?? "");
    onTimeChange(parts.length === 2 ? parts[1] : "");
    const next = parseDate(parts[0] ?? "");
    if (next) setMonth(next);
  }
  const valid = !!pickup && !unavailable;
  const closeCalendar = () => { calendar.current?.close(); trigger.current?.focus(); };

  return <main className={`${shared.page} ${styles.page}`}><div className={shared.content}>
    <button className={styles.back} type="button" onClick={review ? () => setReview(false) : onBack}>← <span>{review ? "Pickup Date & Time" : "Custom Cakes"}</span></button>
    <nav className={`${shared.progress} ${styles.progress}`} aria-label="Custom cake progress"><ol>{["Design", "Customise", "Date", "Summary", "Payment"].map((step, index) => <li key={step} aria-current={index === (review ? 3 : 2) ? "step" : undefined}><span className={`${shared.stepNumber} ${index < (review ? 3 : 2) ? styles.complete : ""}`}>{index < (review ? 3 : 2) ? "✓" : index + 1}</span><span className={shared.stepLabel}>{step}</span></li>)}</ol></nav>
    <h1 className={`${shared.title} ${styles.title}`}>{review ? "Review Your Order" : "Pickup Date & Time"}</h1>
    {review ? <section className={styles.summary} aria-label="Order summary"><dl>{[...summary.filter((item) => item.label !== "Total"), { label: "Pickup date & time", value: input }, { label: "Pickup service", value: availability }, { label: "Total", value: money(subtotal + fee) }].map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl><button type="button" className={styles.submit} onClick={() => setReview(false)}>Edit Date & Time</button></section> : <form className={styles.form} onSubmit={(event) => { event.preventDefault(); setTouched(true); const current = Date.now(); setNow(current); if (pickup && pickup.getTime() - current >= 24 * 3600000) setReview(true); }}>
      <div><label htmlFor="pickup-date">Preferred Pickup Date & Time <span className={styles.required}>*</span></label>
        <div className={styles.inputWrap}><input id="pickup-date" type="text" placeholder="DD/MM/YYYY HH:mm" autoComplete="off" required value={input} aria-describedby={touched && !pickup ? "pickup-error" : pickup ? "pickup-status" : undefined} aria-invalid={touched && (!pickup || unavailable)} onBlur={() => setTouched(true)} onChange={(event) => updateInput(event.target.value)} />          <button ref={trigger} type="button" aria-label="Open pickup calendar" aria-haspopup="dialog" onClick={() => calendar.current?.showModal()}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2M8 18h2"/></svg></button>
        </div>{touched && !pickup && <p id="pickup-error" className={styles.error}>Enter a valid date and time: DD/MM/YYYY HH:mm (24-hour time).</p>}
      </div>
      <div aria-live="polite">{pickup && <div id="pickup-status" className={`${styles.status} ${unavailable ? styles.unavailable : ""}`}><span aria-hidden="true">{unavailable ? "⛔" : "🕒"}</span><div>{availability}{unavailable && <p>Please choose a date at least 24 hours from now.</p>}</div></div>}</div>
      <button className={styles.submit} disabled={!valid}>Review Order</button>
    </form>}
    <dialog ref={calendar} className={styles.calendarDialog} aria-labelledby="calendar-title" onClick={(event) => { if (event.target === event.currentTarget) closeCalendar(); }}>
      <div className={styles.calendarHeader}><h2 id="calendar-title">Choose pickup date & time</h2><button type="button" aria-label="Close calendar" onClick={closeCalendar}>×</button></div>
      <DayPicker className={styles.calendar} mode="single" selected={selected} month={month} onMonthChange={setMonth} disabled={{ before: today }} autoFocus onSelect={(value) => { if (value) { onDateChange(`${String(value.getDate()).padStart(2, "0")}/${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`); setInput(`${String(value.getDate()).padStart(2, "0")}/${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}${time ? ` ${time}` : ""}`); } }} />
      <label className={styles.pickerTime} htmlFor="calendar-time">Pickup time<input id="calendar-time" className={styles.time} type="time" value={time} onChange={(event) => { onTimeChange(event.target.value); setInput([date, event.target.value].filter(Boolean).join(" ")); }} /></label>
      <button type="button" className={styles.submit} disabled={!validDate || !time} onClick={() => { setTouched(true); closeCalendar(); }}>Done</button>
    </dialog>
  </div></main>;
}
