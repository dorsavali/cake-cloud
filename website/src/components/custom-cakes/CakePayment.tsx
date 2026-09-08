"use client";
import { useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import type { CakeConfig, CakeQuote } from "./useCakeQuote";
import styles from "./CakePickup.module.css";
import { useDraftState } from "./useDraftState";
import { draftText } from "./draft-storage";

export function CakePayment({quote,cake,pickup,onBack}:{quote:CakeQuote;cake:CakeConfig;pickup:string;onBack:()=>void}) {
  const [name,setName]=useDraftState("name", "", draftText);
  const [email,setEmail]=useDraftState("email", "", draftText);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [url,setUrl]=useState("");
  const lock=useRef(false);
  const [savedAttempt, saveAttempt] = useDraftState<string | null>("checkoutAttempt", null, (value): value is string | null => {
    if (value === null) return true;
    if (typeof value !== "string" || value.length > 20000) return false;
    try {
      const parsed = JSON.parse(value);
      return !!parsed && typeof parsed.idempotencyKey === "string" && /^[a-f0-9-]{36}$/i.test(parsed.idempotencyKey)
        && JSON.stringify(parsed.cake) === JSON.stringify(cake) && parsed.pickup === pickup
        && parsed.name === name.trim() && parsed.email === email.trim() && parsed.expectedTotal === quote.total;
    } catch { return false; }
  });
  const attempt=useRef<string|undefined>(savedAttempt ?? undefined);
  const total=new Intl.NumberFormat("en-AU",{style:"currency",currency:"AUD"}).format(quote.total/100);
  return <form className={styles.form} onSubmit={async event=>{
    event.preventDefault();
    if(lock.current)return;
    if(url){window.location.assign(url);return;}
    lock.current=true;setBusy(true);setError("");
    try {
      if (!attempt.current) {
        const sessionResponse = await fetch(apiUrl("/api/cake/checkout-session"), { method: "POST" });
        if (!sessionResponse.ok) throw new Error("Could not start checkout. Please try again.");
        const session = await sessionResponse.json();
        if (typeof session.idempotencyKey !== "string" || !/^[a-f0-9-]{36}$/i.test(session.idempotencyKey)) throw new Error("Could not start checkout. Please try again.");
        attempt.current = JSON.stringify({cake,pickup,name:name.trim(),email:email.trim(),expectedTotal:quote.total,idempotencyKey:session.idempotencyKey});
        saveAttempt(attempt.current);
      }
      const response=await fetch(apiUrl("/api/cake/checkout"),{method:"POST",headers:{"Content-Type":"application/json"},body:attempt.current});
      const data=await response.json();
      if(!response.ok){if(response.status===400 || response.status===409){attempt.current=undefined;saveAttempt(null);}throw new Error(data.error||"Checkout is temporarily unavailable.");}
      const destination=new URL(data.url);
      if(destination.protocol!=="https:" || !["square.link","sandbox.square.link","checkout.square.site","sandbox.checkout.square.site"].includes(destination.hostname))throw new Error("Invalid checkout address.");
      setUrl(destination.href);
      window.location.assign(destination.href);
    } catch(error) {
      setError(error instanceof Error && error.message!=="Failed to fetch"?error.message:"Could not reach checkout. Please check your connection and try again.");
    } finally {lock.current=false;setBusy(false);}
  }}>
    <div>
      <label htmlFor="payer-name">Full Name <span className={styles.required}>*</span></label>
      <input className={styles.time} id="payer-name" autoComplete="name" required maxLength={100} value={name} disabled={busy||!!attempt.current} onChange={event=>setName(event.target.value)}/>
    </div>
    <div>
      <label htmlFor="payer-email">Email <span className={styles.required}>*</span></label>
      <input className={styles.time} id="payer-email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy||!!attempt.current} onChange={event=>setEmail(event.target.value)}/>
    </div>
    <div className={styles.paymentTotal}><span>Total</span><strong>{total}</strong></div>
    <p className={styles.checkoutHint}>You’ll complete your payment securely on Square.</p>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <button className={styles.submit} disabled={busy}>{busy?"Opening Square…":"Continue to Square"}</button>
    <button type="button" className={styles.back} disabled={busy} onClick={() => { attempt.current=undefined; saveAttempt(null); setUrl(""); onBack(); }}>← Back to Summary</button>
  </form>;
}
