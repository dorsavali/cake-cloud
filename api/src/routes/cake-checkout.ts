import { json } from "../http/json.js";
import type { ApiEnv } from "../types/env.js";

const extras = ["Fresh Flowers", "Macarons", "Fruit Arrangement", "Gold Leaf", "Chocolate Shards", "Sugar Pearls", "Custom Topper"];
const sizes = [0, 2000, 4000, 7000];
const heights = [0, 3000];
const fillings = [0, 0, 1000, 1500, 1500];
export type Cake = { base: string; size: number; height: number; filling: number; sponge: string; frosting: string; colour: string; extras: string[]; message: string };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid request");
  return value as Record<string, unknown>;
}
export function priceCake(value: unknown) {
  const c = object(value);
  const index = (v: unknown, prices: number[]) => {
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v >= prices.length) throw new Error("Invalid cake option");
    return prices[v];
  };
  const choice = (v: unknown, options: string[]) => { if (typeof v !== "string" || !options.includes(v)) throw new Error("Invalid cake option"); };
  choice(c.base, ["classic-round", "layered-dream", "floral-garden"]);
  choice(c.sponge, ["Vanilla", "Chocolate", "Lemon", "Red Velvet"]);
  choice(c.frosting, ["Smooth Buttercream", "Whipped Cream", "Chocolate Ganache"]);
  choice(c.colour, ["Ivory", "Blush", "Sage", "Lavender", "Chocolate", "Dusty Rose"]);
  if (!Array.isArray(c.extras) || c.extras.length > extras.length || new Set(c.extras).size !== c.extras.length || c.extras.some(v => !extras.includes(v))) throw new Error("Invalid decorations");
  if (typeof c.message !== "string" || c.message.length > 80) throw new Error("Message is too long");
  return 14500 + index(c.size, sizes) + index(c.height, heights) + index(c.filling, fillings) + c.extras.length * 1200;
}
export function pickupInstant(value: unknown, zone: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Enter a valid pickup date and time");
  const target = Date.parse(value + ":00Z");
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0,16) !== value) throw new Error("Invalid pickup date");
  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: zone, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" });
  const local = (t: number) => fmt.format(new Date(t)).replace(" ", "T");
  let instant = target;
  for (let i=0;i<4;i++) instant += target - Date.parse(local(instant) + ":00Z");
  if (local(instant) !== value) throw new Error("This pickup time does not exist. Choose another time.");
  return instant;
}
export function rushFee(instant: number, now = Date.now()) {
  const hours = (instant-now)/3600000;
  return { available: hours >= 24, fee: hours >= 24 && hours < 48 ? 8000 : 0 };
}
export async function handleCakeCheckout(request: Request, env: ApiEnv) {
  if (request.method !== "POST") return json({error:"Method not allowed"},405);
  try {
    const raw = await request.text();
    if (raw.length > 20000) return json({error:"Request too large"},413);
    const body = object(JSON.parse(raw));
    const subtotal = priceCake(body.cake);
    if (!body.pickup) return json({subtotal,total:subtotal,fee:0});
    const instant = pickupInstant(body.pickup,env.SQUARE_TIMEZONE || "Australia/Perth");
    const {available,fee} = rushFee(instant);
    return json({subtotal,fee,total:subtotal+fee,available,expires:Date.now()+15*60000});
  } catch (error) {
    return json({error:error instanceof Error ? error.message : "Price unavailable"},400);
  }
}
