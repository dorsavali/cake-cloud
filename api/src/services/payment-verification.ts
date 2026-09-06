import type { ApiEnv } from "../types/env.js";
import { json } from "../http/json.js";
type Money={amount?:number;currency?:string};
type Order={id:string;version:number;location_id?:string;reference_id?:string;total_money?:Money;metadata?:Record<string,string>;tenders?:{payment_id?:string;id?:string}[]};
type Payment={id:string;order_id?:string;location_id?:string;status?:string;amount_money?:Money;refunded_money?:Money};
export async function squareApi<T>(env:ApiEnv,path:string,body?:unknown):Promise<T>{
 const r=await fetch((env.SQUARE_ENVIRONMENT==="production"?"https://connect.squareup.com":"https://connect.squareupsandbox.com")+path,{
 method:body?"PUT":"GET",headers:{authorization:"Bearer "+env.SQUARE_ACCESS_TOKEN,"Square-Version":"2026-08-19","content-type":"application/json"},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error("Square verification unavailable");
 return r.json() as Promise<T>;
}
async function hmac(env:ApiEnv){
 return crypto.subtle.importKey("raw",new TextEncoder().encode("cake-verification-v1:"+env.SQUARE_ACCESS_TOKEN),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
export async function signValue(env:ApiEnv,value:string){
 return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC",await hmac(env),new TextEncoder().encode(value)))));
}
async function validSignature(env:ApiEnv,value:string,signature:string){
 try{return await crypto.subtle.verify("HMAC",await hmac(env),Uint8Array.from(atob(signature),c=>c.charCodeAt(0)),new TextEncoder().encode(value));}catch{return false;}
}
export function expectedValue(reference:string,total:number,location:string){return JSON.stringify([reference,total,"AUD",location]);}
export type VerifiedStatus="pending"|"paid"|"failed"|"review"|"refunded";
export async function reconcileOrder(env:ApiEnv,orderId:string,paymentHint?:string):Promise<{status:VerifiedStatus;orderId:string;total?:number;currency?:string}|null>{
 // Each invocation reads canonical Square state, so delayed events cannot assert stale payment status.
 for(let retry=0;retry<3;retry++){
  const {order}=await squareApi<{order:Order}>(env,"/v2/orders/"+encodeURIComponent(orderId));
  const metadata=order.metadata??{};
  if(!metadata.cc_expected || !metadata.cc_signature)return null; // An unrelated order.
  if(!await validSignature(env,metadata.cc_expected,metadata.cc_signature))return {status:"review",orderId};
  const [reference,total,currency,location]=JSON.parse(metadata.cc_expected) as [string,number,string,string];
  let status:VerifiedStatus="pending";
  let verifiedId="";
  if(order.reference_id!==reference || order.location_id!==location || location!==env.SQUARE_LOCATION_ID || order.total_money?.amount!==total || order.total_money.currency!==currency)status="review";
  else{
   const ids=[...new Set([...(order.tenders??[]).map(t=>t.payment_id??t.id),paymentHint].filter((id):id is string=>!!id))];
   let completed=0,invalid=false,failed=false,refunded=false;
   for(const id of ids){
    const {payment}=await squareApi<{payment:Payment}>(env,"/v2/payments/"+encodeURIComponent(id));
    if(payment.order_id!==orderId || payment.location_id!==location){invalid=true;continue;}
    if(payment.status==="COMPLETED"){
     if(payment.amount_money?.amount!==total || payment.amount_money.currency!==currency){invalid=true;continue;}
     completed++;verifiedId=payment.id;
     refunded ||= (payment.refunded_money?.amount??0)>0;
    } else if(payment.status==="FAILED" || payment.status==="CANCELED")failed=true;
   }
   status=invalid||completed>1?"review":completed===1?(refunded?"refunded":"paid"):failed?"failed":"pending";
  }
  // Persist on the Square order itself, not in process memory.
  if(metadata.cc_status!==status || (verifiedId && metadata.cc_payment!==verifiedId)){
   try{
    await squareApi(env,"/v2/orders/"+encodeURIComponent(orderId),{idempotency_key:crypto.randomUUID(),order:{version:order.version,location_id:order.location_id,metadata:{...metadata,cc_status:status,...(verifiedId?{cc_payment:verifiedId}:{}),cc_checked:new Date().toISOString()}}});
   }catch(error){if(retry<2)continue;throw error;}
  }
  return {status,orderId,total,currency};
 }
 throw new Error("Verification unavailable");
}
export async function reconcilePayment(env:ApiEnv,paymentId:string){
 const {payment}=await squareApi<{payment:Payment}>(env,"/v2/payments/"+encodeURIComponent(paymentId));
 if(!payment.order_id)return null;
 return reconcileOrder(env,payment.order_id,payment.id);
}
export async function handlePaymentStatus(request:Request,env:ApiEnv){
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const raw=await request.text();if(raw.length>2000)return json({error:"Invalid request"},400);
  const {orderId,token}=JSON.parse(raw);
  if(typeof orderId!=="string" || orderId.length>100 || typeof token!=="string" || !await validSignature(env,"receipt:"+orderId,token))return json({error:"Invalid verification token"},403);
  const result=await reconcileOrder(env,orderId);
  return result?json(result):json({error:"Order not found"},404);
 }catch{return json({error:"Payment status is temporarily unavailable. Please retry."},503);}
}
