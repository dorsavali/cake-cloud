"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {apiUrl} from "@/lib/api";
import {DesktopHeader,MobileHeader} from "@/components/layout/header";
import shared from "@/components/custom-cakes/CakeBaseSelector.module.css";
import styles from "@/components/custom-cakes/CakePickup.module.css";
import { clearCakeDraft } from "@/components/custom-cakes/draft-storage";
import { clearStoredCart } from "@/components/cart";

export default function PaymentResult(){
 const [result,setResult]=useState<{status:string;orderId?:string;total?:number;currency?:string}>({status:"checking"});
 const [error,setError]=useState("");
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;let timer:ReturnType<typeof setTimeout>;let attempts=0;
  const controller=new AbortController();
  async function check(){
   try{
    const receiptParams=new URLSearchParams(window.location.hash.slice(1));
    const orderId=receiptParams.get("orderId");
    const token=receiptParams.get("token");
    if(!orderId || !token)throw new Error("This payment link is incomplete or was created before the update. Please contact the shop to check your payment; do not pay again.");
    const receipt=JSON.stringify({orderId,token});
    const response=await fetch(apiUrl("/api/cake/payment-status"),{method:"POST",headers:{"Content-Type":"application/json"},body:receipt,signal:controller.signal});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error);
    if(!active)return;
    setError("");setResult(data);
    if(data.status==="paid"){clearCakeDraft();clearStoredCart();}
    if(data.status==="pending" && ++attempts<12)timer=setTimeout(check,5000);
   }catch(e){if(active){setResult({status:"unknown"});setError(e instanceof Error?e.message:"Could not verify payment.");}}
  }
  void check();
  return ()=>{active=false;controller.abort();clearTimeout(timer);};
 },[retry]);
 const messages:Record<string,string>={checking:"Checking Payment",pending:"Payment Pending",paid:"Payment Confirmed",failed:"Payment Not Completed",review:"Payment Needs Review",refunded:"Payment Refunded",unknown:"Verification Unavailable"};
 return <><DesktopHeader/><MobileHeader/><main className={shared.page}><div className={shared.content}>
  <h1 className={shared.title}>{messages[result.status]??"Checking Payment"}</h1>
  <div className="grid gap-4">
  <section className={styles.summaryCard} aria-live="polite">
   <p>{result.status==="paid"?"Thank you! Your payment has been verified and your cake order is confirmed.":result.status==="pending"?"Square has not confirmed payment yet. You can check again below.":result.status==="failed"?"Square reports that this payment was not completed.":result.status==="review"?"Your payment details need review. Please contact the shop with your order number.":result.status==="refunded"?"A refund has been recorded for this payment. Please contact the shop for details.":"Checking your payment securely with Square."}</p>
   {result.orderId&&<p>Order: {result.orderId}</p>}
   {result.total!==undefined&&<p>Total: {new Intl.NumberFormat("en-AU",{style:"currency",currency:result.currency??"AUD"}).format(result.total/100)}</p>}
   {error&&<p className={styles.error} role="alert">{error}</p>}
  </section>
  {result.status!=="paid"&&<button className={styles.submit} type="button" onClick={()=>setRetry(v=>v+1)}>Check Payment Again</button>}
  <Link className={styles.back} href="/">Back to Home</Link>
  </div>
 </div></main></>;
}
