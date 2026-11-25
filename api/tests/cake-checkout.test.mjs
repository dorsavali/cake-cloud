import {test} from "node:test";
import assert from "node:assert/strict";
import {priceCake,pickupInstant,rushFee,handleCakeCheckout} from "../dist/routes/cake-checkout.js";
import {cake,cakeDesigns} from "./helpers/cake-fixture.mjs";
const env={SQUARE_ACCESS_TOKEN:"test-only-secret",SQUARE_APPLICATION_ID:"app",SQUARE_LOCATION_ID:"loc",SQUARE_ENVIRONMENT:"sandbox",SQUARE_TIMEZONE:"Australia/Perth"};
const req=(path,body)=>new Request("http://localhost/api/cake/"+path,{method:"POST",body:JSON.stringify(body)});
test("server owns prices and validates options",()=>{
 assert.equal(priceCake(cake,cakeDesigns).subtotal,14500);
 const configured={...cake,selections:[
  {listId:"size",modifierIds:["size-large"]},
  {listId:"height",modifierIds:["height-tall"]},
  {listId:"filling",modifierIds:["filling-premium"]},
  {listId:"extras",modifierIds:["flowers","gold"]},
 ]};
 assert.equal(priceCake(configured,cakeDesigns).subtotal,28400);
 for(const bad of [
  {...cake,design:"missing"},
  {...cake,selections:[{listId:"missing",modifierIds:[]}]},
  {...cake,selections:[{listId:"size",modifierIds:["missing"]}]},
  {...cake,selections:[{listId:"size",modifierIds:["size-small","size-large"]}]},
  {...cake,selections:[{listId:"extras",modifierIds:["gold","gold"]}]},
 ])assert.throws(()=>priceCake(bad,cakeDesigns));
});
test("Perth local date conversion and invalid dates",()=>{
 assert.equal(new Date(pickupInstant("2026-09-10T10:30","Australia/Perth")).toISOString(),"2026-09-10T02:30:00.000Z");
 assert.throws(()=>pickupInstant("2026-02-31T10:00","Australia/Perth"));
 assert.throws(()=>pickupInstant("2026-09-10T25:00","Australia/Perth"));
 assert.throws(()=>pickupInstant("2026-10-04T02:30","Australia/Sydney"));
});
test("pickup times follow opening hours in 15-minute intervals",()=>{
 for(const value of ["2026-09-10T06:30","2026-09-10T17:00","2026-09-12T08:00","2026-09-12T16:00"]){
  assert.doesNotThrow(()=>pickupInstant(value,"Australia/Perth"));
 }
 for(const value of ["2026-09-10T06:15","2026-09-10T10:10","2026-09-10T17:15","2026-09-12T07:45","2026-09-12T16:15"]){
  assert.throws(()=>pickupInstant(value,"Australia/Perth"),/opening hours/);
 }
});
test("pickup availability uses Perth calendar days instead of elapsed hours",()=>{
 const now=Date.parse("2026-11-24T15:30:00Z"); // 23:30 on 24 November in Perth
 const pickup=date=>pickupInstant(`${date}T06:30`,"Australia/Perth");
 assert.deepEqual(rushFee(pickup("2026-11-25"),now,"Australia/Perth"),{available:false,fee:0});
 assert.deepEqual(rushFee(pickup("2026-11-26"),now,"Australia/Perth"),{available:true,fee:0});
 assert.deepEqual(rushFee(pickup("2026-11-27"),now,"Australia/Perth"),{available:true,fee:0});
});
test("quote endpoint calculates from the R2 catalog without contacting Square",async t=>{
 const fetch = t.mock.method(globalThis,"fetch",async ()=>{ throw new Error("Unexpected Square request"); });
 const quoteEnv = {
  ...env,
  STOREFRONT_CACHE: {
   get: async () => ({etag:"test",json:async ()=>({items:cakeDesigns,refreshedAt:Date.now()})}),
  },
 };
 const future=new Date(Date.now()+96*3600000);
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Australia/Perth",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(future);
 const part=type=>parts.find(entry=>entry.type===type).value;
 const pickup=`${part("year")}-${part("month")}-${part("day")}T10:00`;
 const response=await handleCakeCheckout(req("quote",{cake,pickup,total:1}),quoteEnv);
 const quote=await response.json();
 assert.equal(quote.total,14500);
 assert.equal(quote.available,true);
 assert.equal(quote.token,undefined);
 assert.equal(fetch.mock.callCount(),0);
});
