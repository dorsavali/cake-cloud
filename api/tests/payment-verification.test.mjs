import {test} from "node:test";
import assert from "node:assert/strict";
import {signValue,expectedValue,reconcileOrder,handlePaymentStatus} from "../dist/services/payment-verification.js";
import {handleSquareWebhook} from "../dist/routes/square-webhook.js";
const env={SQUARE_ACCESS_TOKEN:"testing-secret",SQUARE_LOCATION_ID:"loc",SQUARE_ENVIRONMENT:"sandbox",SQUARE_WEBHOOK_SIGNATURE_KEY:"webhook-secret",SQUARE_WEBHOOK_NOTIFICATION_URL:"https://shop.example/api/webhooks/square"};
async function fixture(t,{status="COMPLETED",amount=14500,currency="AUD",refund=0,fail=false}={}){
 const expected=expectedValue("ref",14500,"loc");
 const order={id:"order",version:1,location_id:"loc",reference_id:"ref",total_money:{amount:14500,currency:"AUD"},metadata:{cc_expected:expected,cc_signature:await signValue(env,expected),cc_status:"pending"},tenders:[{payment_id:"payment"}]};
 const payment={id:"payment",order_id:"order",location_id:"loc",status,amount_money:{amount,currency},refunded_money:{amount:refund}};
 let writes=0;
 t.mock.method(globalThis,"fetch",async(url,options)=>{
  if(fail)throw Error("offline");
  if(options?.method==="PUT"){writes++;Object.assign(order.metadata,JSON.parse(options.body).order.metadata);return Response.json({order});}
  return Response.json(String(url).includes("/payments/")?{payment}:{order});
 });
 return {order,payment,writes:()=>writes};
}
test("completed, matching payment is persisted; duplicate checks do not rewrite",async t=>{
 const f=await fixture(t);assert.equal((await reconcileOrder(env,"order")).status,"paid");
 assert.equal((await reconcileOrder(env,"order")).status,"paid");assert.equal(f.writes(),1);
});
for(const [label,options,expected] of [
 ["authorized",{status:"APPROVED"},"pending"],["failed",{status:"FAILED"},"failed"],
 ["wrong amount",{amount:1},"review"],["wrong currency",{currency:"USD"},"review"],["refund",{refund:100},"refunded"]]){
 test(label+" is not marked paid",async t=>{await fixture(t,options);assert.equal((await reconcileOrder(env,"order")).status,expected);});
}
test("return query cannot assert success without server token",async()=>{
 const r=await handlePaymentStatus(new Request("http://localhost",{method:"POST",body:JSON.stringify({orderId:"order",token:"fake",status:"COMPLETED"})}),env);
 assert.equal(r.status,403);
});
test("invalid webhook signature is rejected",async()=>{
 assert.equal((await handleSquareWebhook(new Request(env.SQUARE_WEBHOOK_NOTIFICATION_URL,{method:"POST",body:"{}"}),env)).status,403);
});
async function webhook(event){
 const raw=JSON.stringify(event);
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.SQUARE_WEBHOOK_SIGNATURE_KEY),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const sig=Buffer.from(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(env.SQUARE_WEBHOOK_NOTIFICATION_URL+raw))).toString("base64");
 return new Request(env.SQUARE_WEBHOOK_NOTIFICATION_URL,{method:"POST",body:raw,headers:{"x-square-hmacsha256-signature":sig}});
}
test("failed webhook can retry same event and confirms canonical payment",async t=>{
 const f=await fixture(t);
 const event={event_id:crypto.randomUUID(),type:"payment.updated",data:{object:{payment:{id:"payment",status:"FAILED"}}}};
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error("offline");};
 assert.equal((await handleSquareWebhook(await webhook(event),env)).status,503);
 globalThis.fetch=originalFetch;
 assert.equal((await handleSquareWebhook(await webhook(event),env)).status,200);
 assert.equal(f.order.metadata.cc_status,"paid");
});
test("return path shares payment verification",async t=>{
 await fixture(t);
 const token=await signValue(env,"receipt:order");
 const r=await handlePaymentStatus(new Request("http://localhost",{method:"POST",body:JSON.stringify({orderId:"order",token})}),env);
 assert.equal((await r.json()).status,"paid");
});
