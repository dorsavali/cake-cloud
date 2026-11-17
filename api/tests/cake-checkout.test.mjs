import {test} from "node:test";
import assert from "node:assert/strict";
import {priceCake,pickupInstant,rushFee,handleCakeCheckout} from "../dist/routes/cake-checkout.js";
import {cake,cakeCatalogResponse,cakeDesigns} from "./helpers/cake-fixture.mjs";
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
test("rush boundaries",()=>{
 const now=1000000000000;
 for(const [h,available,fee] of [[-1,false,0],[23.999,false,0],[24,true,8000],[47.999,true,8000],[48,true,0]])assert.deepEqual(rushFee(now+h*3600000,now),{available,fee});
});
test("quote endpoint calculates from the Square catalog",async t=>{
 let call=0;
 t.mock.method(globalThis,"fetch",async (_url,options)=>cakeCatalogResponse(call++===0?{body:JSON.stringify({object_types:["CATEGORY"]})}:options));
 const pickup=new Date(Date.now()+72*3600000).toISOString().slice(0,16);
 const response=await handleCakeCheckout(req("quote",{cake,pickup,total:1}),env);
 const quote=await response.json();
 assert.equal(quote.total,14500);
 assert.equal(quote.available,true);
 assert.equal(quote.token,undefined);
});
