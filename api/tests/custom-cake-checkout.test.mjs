import {test} from "node:test";
import assert from "node:assert/strict";
import {handleCustomCakeCheckout} from "../dist/routes/custom-cake-checkout.js";
import {orderNumberFromSeed} from "../dist/services/order-number.js";
import {cake,cakeCatalogResponse,isCakeCatalogRequest} from "./helpers/cake-fixture.mjs";
const env={SQUARE_ENVIRONMENT:"sandbox",SQUARE_ACCESS_TOKEN:"test",SQUARE_LOCATION_ID:"test",SQUARE_TIMEZONE:"Australia/Perth"};
const perthPickup=days=>{
 const future=new Date(Date.now()+days*24*3600000);
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Australia/Perth",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(future);
 const part=type=>parts.find(entry=>entry.type===type).value;
 return `${part("year")}-${part("month")}-${part("day")}T10:00`;
};
const body=()=>({cake,pickup:perthPickup(4),name:"Test Buyer",email:"test@example.com",phone:"0412 345 678",expectedTotal:14500,idempotencyKey:crypto.randomUUID(),termsAccepted:true,allergenAccepted:true});
const req=b=>new Request("http://localhost/api/cake/checkout",{method:"POST",body:JSON.stringify(b)});
test("rejects invalid environments and invalid amounts before Square",async t=>{
 let catalogCall=0;
 t.mock.method(globalThis,"fetch",async (_url,options)=>cakeCatalogResponse(catalogCall++%2===0?{body:JSON.stringify({object_types:["CATEGORY"]})}:options));
 assert.equal((await handleCustomCakeCheckout(req(body()),{...env,SQUARE_ENVIRONMENT:"invalid"})).status,503);
 assert.equal((await handleCustomCakeCheckout(req({...body(),expectedTotal:1}),env)).status,409);
 assert.equal((await handleCustomCakeCheckout(req({...body(),pickup:perthPickup(1)}),env)).status,409);
 assert.equal((await handleCustomCakeCheckout(req({...body(),pickup:"2020-01-01T00:00"}),env)).status,400);
 assert.equal((await handleCustomCakeCheckout(req({...body(),email:"bad"}),env)).status,400);
});
test("Square receives server price, fulfillment, and a stable retry key",async t=>{
 const sent=[];
 t.mock.method(globalThis,"fetch",async (url,options)=>{
   if(isCakeCatalogRequest(url)) return cakeCatalogResponse(options);
   if(String(url).endsWith("/v2/customers/search")) return Response.json({customers:[]});
   if(String(url).endsWith("/v2/customers")) return Response.json({customer:{id:"test-customer"}});
   if(String(url).endsWith("/v2/online-checkout/payment-links")){
    assert.equal(url,"https://connect.squareupsandbox.com/v2/online-checkout/payment-links");
    sent.push(JSON.parse(options.body));
    return Response.json({payment_link:{id:"test-link",url:"https://sandbox.square.link/u/test",order_id:"test-order"}});
   }
   const checkout_options=options.method==="PUT"?JSON.parse(options.body).payment_link.checkout_options:{};
   return Response.json({payment_link:{id:"test-link",version:1,order_id:"test-order",checkout_options}});
 });
 const configured={...cake,selections:[
  {listId:"size",modifierIds:["size-large"]},
  {listId:"height",modifierIds:["height-tall"]},
  {listId:"filling",modifierIds:["filling-premium"]},
  {listId:"extras",modifierIds:["flowers","gold"]},
 ]};
 const b={...body(),cake:configured,expectedTotal:28400};
 const orderNumber=orderNumberFromSeed("CAKE",b.idempotencyKey);
 for(let i=0;i<2;i++)assert.equal((await handleCustomCakeCheckout(req(b),env)).status,200);
 assert.deepEqual(sent[0],sent[1]);
 assert.equal(sent[0].order.line_items[0].catalog_object_id,"cake-variation");
 assert.deepEqual(sent[0].order.line_items[0].modifiers,[
  {catalog_object_id:"size-large"},
  {catalog_object_id:"height-tall"},
  {catalog_object_id:"filling-premium"},
  {catalog_object_id:"flowers"},
  {catalog_object_id:"gold"},
 ]);
 assert.equal(sent[0].order.line_items[0].applied_modifiers,undefined);
 assert.equal(sent[0].order.reference_id,orderNumber);
 assert.equal(sent[0].order.metadata.cc_order_number,orderNumber);
 assert.equal(sent[0].order.metadata.cc_expected,JSON.stringify([orderNumber,b.expectedTotal,"AUD",env.SQUARE_LOCATION_ID]));
 assert.match(sent[0].payment_note,new RegExp(orderNumber));
 assert.match(sent[0].order.line_items[0].note,new RegExp(`Order: ${orderNumber}`));
 assert.match(sent[0].order.line_items[0].note,/Customer-selected pickup: \d{4}-\d{2}-\d{2} \d{2}:\d{2} \(Australia\/Perth\)/);
 assert.match(sent[0].order.fulfillments[0].pickup_details.pickup_at,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+08:00$/);
 assert.match(sent[0].order.fulfillments[0].pickup_details.note,/Australia\/Perth/);
 assert.equal(sent[0].pre_populated_data,undefined);
 assert.equal(sent[0].order.fulfillments[0].pickup_details.recipient.email_address,b.email);
});
test("production checkout uses the production Square API",async t=>{
 let paymentLinkUrl="";
 t.mock.method(globalThis,"fetch",async (url,options)=>{
   if(isCakeCatalogRequest(url))return cakeCatalogResponse(options);
   if(String(url).endsWith("/v2/customers/search"))return Response.json({customers:[]});
   if(String(url).endsWith("/v2/customers"))return Response.json({customer:{id:"production-customer"}});
   if(String(url).endsWith("/v2/online-checkout/payment-links")){
     paymentLinkUrl=String(url);
     return Response.json({payment_link:{id:"production-link",url:"https://square.link/u/test",order_id:"production-order"}});
   }
   const checkout_options=options.method==="PUT"?JSON.parse(options.body).payment_link.checkout_options:{};
   return Response.json({payment_link:{id:"production-link",version:1,order_id:"production-order",checkout_options}});
 });
 const response=await handleCustomCakeCheckout(req(body()),{...env,SQUARE_ENVIRONMENT:"production",SQUARE_PRODUCTION_CHECKOUT_ENABLED:"true"});
 assert.equal(response.status,200);
 assert.equal(paymentLinkUrl,"https://connect.squareup.com/v2/online-checkout/payment-links");
});
test("local production catalog mode cannot create a live checkout",async()=>{
 const response=await handleCustomCakeCheckout(req(body()),{...env,SQUARE_ENVIRONMENT:"production"});
 assert.equal(response.status,503);
});
test("handles upstream failure without exposing credentials",async t=>{
 t.mock.method(globalThis,"fetch",async()=>{throw Error("test secret");});
 const response=await handleCustomCakeCheckout(req(body()),env);
 assert.equal(response.status,502);
 assert.ok(!(await response.text()).includes("test secret"));
});
