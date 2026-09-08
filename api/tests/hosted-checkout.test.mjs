import {test} from "node:test";
import assert from "node:assert/strict";
import {handleHostedCheckout} from "../dist/routes/hosted-checkout.js";
const env={SQUARE_ENVIRONMENT:"sandbox",SQUARE_ACCESS_TOKEN:"test",SQUARE_LOCATION_ID:"test",SQUARE_TIMEZONE:"Australia/Perth"};
const body=()=>({cake:{base:"classic-round",size:0,height:0,filling:0,sponge:"Vanilla",frosting:"Smooth Buttercream",colour:"Ivory",extras:[],message:""},pickup:new Date(Date.now()+72*3600000).toISOString().slice(0,16),name:"Test Buyer",email:"test@example.com",expectedTotal:14500,idempotencyKey:crypto.randomUUID()});
const req=b=>new Request("http://localhost/api/cake/checkout",{method:"POST",body:JSON.stringify(b)});
test("rejects production and invalid amounts before Square",async()=>{
 assert.equal((await handleHostedCheckout(req(body()),{...env,SQUARE_ENVIRONMENT:"production"})).status,503);
 assert.equal((await handleHostedCheckout(req({...body(),expectedTotal:1}),env)).status,409);
 assert.equal((await handleHostedCheckout(req({...body(),pickup:"2020-01-01T00:00"}),env)).status,409);
 assert.equal((await handleHostedCheckout(req({...body(),email:"bad"}),env)).status,400);
});
test("Square receives server price, fulfillment, and a stable retry key",async t=>{
 const sent=[];
 t.mock.method(globalThis,"fetch",async (url,options)=>{
   if(options.method==="POST"){
    assert.equal(url,"https://connect.squareupsandbox.com/v2/online-checkout/payment-links");
    sent.push(JSON.parse(options.body));
    return Response.json({payment_link:{id:"test-link",url:"https://sandbox.square.link/u/test",order_id:"test-order"}});
   }
   const checkout_options=options.method==="PUT"?JSON.parse(options.body).payment_link.checkout_options:{};
   return Response.json({payment_link:{id:"test-link",version:1,order_id:"test-order",checkout_options}});
 });
 const b=body();
 for(let i=0;i<2;i++)assert.equal((await handleHostedCheckout(req(b),env)).status,200);
 assert.deepEqual(sent[0],sent[1]);
 assert.equal(sent[0].order.line_items[0].base_price_money.amount,14500);
 assert.equal(sent[0].pre_populated_data,undefined);
 assert.equal(sent[0].order.fulfillments[0].pickup_details.recipient.email_address,b.email);
});
test("handles upstream failure without exposing credentials",async t=>{
 t.mock.method(globalThis,"fetch",async()=>{throw Error("test secret");});
 const response=await handleHostedCheckout(req(body()),env);
 assert.equal(response.status,502);
 assert.ok(!(await response.text()).includes("test secret"));
});
