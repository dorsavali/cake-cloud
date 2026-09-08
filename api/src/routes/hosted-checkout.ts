import { expectedValue, signValue } from "../services/payment-verification.js";
import { json } from "../http/json.js";
import { priceCake, pickupInstant, rushFee, type Cake } from "./cake-checkout.js";
import type { ApiEnv } from "../types/env.js";
import { configureCheckoutReturn } from "../services/checkout-return.js";

export async function handleHostedCheckout(request: Request, env: ApiEnv): Promise<Response> {
  if (request.method !== "POST") return json({error:"Method not allowed"},405);
  // This integration is explicitly Sandbox-only until production is requested.
  if (env.SQUARE_ENVIRONMENT !== "sandbox" || !env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) return json({error:"Square Sandbox checkout is not configured."},503);
  let body: Record<string, unknown>;
  try {
    const raw=await request.text();
    if(raw.length>20000)return json({error:"Request too large"},413);
    body=JSON.parse(raw);
    if(!body || typeof body!=="object" || Array.isArray(body))throw new Error("Invalid request");
    const subtotal=priceCake(body.cake);
    const instant=pickupInstant(body.pickup,env.SQUARE_TIMEZONE || "Australia/Perth");
    const {available,fee}=rushFee(instant);
    if(!available)return json({error:"Please choose a pickup time at least 24 hours from now."},409);
    const total=subtotal+fee;
    // Expected total is only a change guard, never the source of the price.
    if(body.expectedTotal!==total)return json({error:"The total changed. Return to Summary to review the updated price."},409);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if(!name || name.length>100 || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("Enter a valid full name and email.");
    if(typeof body.idempotencyKey!=="string" || !/^[a-f0-9-]{36}$/i.test(body.idempotencyKey))throw new Error("Invalid checkout request");
    const cake=body.cake as Cake;
    const note=[
      "Design: "+cake.base,
      "Size: "+[6,8,10,12][cake.size]+" inch",
      "Height: "+["Standard","Tall"][cake.height],
      "Flavour: "+cake.sponge,
      "Filling: "+["Pastry Cream","Chantilly","Fruit Compote","Pistachio Cream","Salted Caramel"][cake.filling],
      "Frosting: "+cake.frosting,
      "Colour: "+cake.colour,
      "Decorations: "+(cake.extras.join(", ")||"None"),
      "Message: "+(cake.message||"None"),
    ].join("\n");
    const expected=expectedValue(body.idempotencyKey,total,env.SQUARE_LOCATION_ID);
    const returnUrl=new URL("/custom-cakes/payment-result/",env.WEBSITE_ORIGIN || "http://localhost:3000");
    returnUrl.searchParams.set("checkout",body.idempotencyKey);
    const payload={
      idempotency_key:body.idempotencyKey,
      order:{
        location_id:env.SQUARE_LOCATION_ID,
        reference_id:body.idempotencyKey,
        line_items:[
          {name:"Custom Cake",quantity:"1",base_price_money:{amount:subtotal,currency:"AUD"},note},
          ...(fee?[{name:"Next-day creation",quantity:"1",base_price_money:{amount:fee,currency:"AUD"}}]:[]),
        ],
        fulfillments:[{type:"PICKUP",state:"PROPOSED",pickup_details:{
          schedule_type:"SCHEDULED",pickup_at:new Date(instant).toISOString(),
          recipient:{display_name:name,email_address:email},
        }}],
        metadata:{cc_expected:expected,cc_signature:await signValue(env,expected),cc_status:"pending",pickup_local:String(body.pickup),time_zone:env.SQUARE_TIMEZONE || "Australia/Perth"},
      },
      // Square prepopulates pickup checkout contact fields from this recipient.
      // Do not also set pre_populated_data.buyer_email: it conflicts with fulfillment.
      checkout_options:{redirect_url:returnUrl.href,allow_tipping:false,ask_for_shipping_address:false,enable_coupon:false,enable_loyalty:false},
      payment_note:"Cake Cloud custom cake · "+name,
    };
    try {
      const response=await fetch("https://connect.squareupsandbox.com/v2/online-checkout/payment-links",{
        method:"POST",
        headers:{authorization:"Bearer "+env.SQUARE_ACCESS_TOKEN,"Square-Version":"2026-08-19","content-type":"application/json"},
        body:JSON.stringify(payload),signal:AbortSignal.timeout(20000),
      });
      const data=await response.json() as {payment_link?:{id?:string;url?:string;order_id?:string};errors?:{code?:string}[]};
      if(!response.ok || !data.payment_link?.id || !data.payment_link.url || !data.payment_link.order_id)return json({error:"Square could not create the checkout page. Please retry.",code:data.errors?.[0]?.code},502);
      const url=new URL(data.payment_link.url);
      if(url.protocol!=="https:" || !["square.link","sandbox.square.link","checkout.square.site","sandbox.checkout.square.site"].includes(url.hostname))return json({error:"Square returned an unexpected checkout address."},502);
      await configureCheckoutReturn(env, data.payment_link.id, data.payment_link.order_id);
      return json({url:url.href,total,currency:"AUD"});
    } catch {
      return json({error:"Could not connect to Square. Retry to recover the same checkout link."},502);
    }
  } catch(error) {
    return json({error:error instanceof Error?error.message:"Invalid checkout request"},400);
  }
}
