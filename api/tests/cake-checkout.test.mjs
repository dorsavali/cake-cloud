import {test} from "node:test";
import assert from "node:assert/strict";
import {priceCake,pickupInstant,rushFee,handleCakeCheckout} from "../dist/routes/cake-checkout.js";
const cake={base:"classic-round",size:0,height:0,filling:0,sponge:"Vanilla",frosting:"Smooth Buttercream",colour:"Ivory",extras:[],message:""};
const env={SQUARE_ACCESS_TOKEN:"test-only-secret",SQUARE_APPLICATION_ID:"app",SQUARE_LOCATION_ID:"loc",SQUARE_ENVIRONMENT:"sandbox",SQUARE_TIMEZONE:"Australia/Perth"};
const req=(path,body)=>new Request("http://localhost/api/cake/"+path,{method:"POST",body:JSON.stringify(body)});
test("server owns prices and validates options",()=>{
 assert.equal(priceCake({...cake,total:1}),14500);
 assert.equal(priceCake({...cake,size:3,height:1,filling:4,extras:["Fresh Flowers","Gold Leaf"]}),28400);
 for(const bad of [{size:-1},{size:0.5},{filling:99},{extras:["Gold Leaf","Gold Leaf"]},{extras:["fake"]},{sponge:"fake"},{message:"x".repeat(81)}])assert.throws(()=>priceCake({...cake,...bad}));
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
test("quote endpoint calculates without payment credentials",async()=>{
 const pickup=new Date(Date.now()+72*3600000).toISOString().slice(0,16);
 const response=await handleCakeCheckout(req("quote",{cake,pickup,total:1}),{SQUARE_TIMEZONE:"Australia/Perth"});
 const quote=await response.json();
 assert.equal(quote.total,14500);
 assert.equal(quote.available,true);
 assert.equal(quote.token,undefined);
});
