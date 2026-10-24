import { json } from "../http/json.js";
import { getCachedCakeDesigns } from "./cake-catalog.js";
import type {
  CakeDesign,
  CakeModifier,
  CakeModifierList,
} from "../services/square.js";
import type { ApiEnv } from "../types/env.js";

export type CakeSelection = { listId: string; modifierIds: string[] };
export type Cake = {
  design: string;
  selections: CakeSelection[];
  message: string;
};

export type PricedCake = {
  cake: Cake;
  design: CakeDesign;
  lines: Array<{ list: CakeModifierList; modifiers: CakeModifier[] }>;
  subtotal: number;
};

/** Validation failures are safe to return to the customer verbatim. */
export class CakeError extends Error {}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CakeError("Invalid request");
  }
  return value as Record<string, unknown>;
}

function id(value: unknown, message: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    throw new CakeError(message);
  }
  return value;
}

export function parseCake(value: unknown): Cake {
  const cake = object(value);
  const design = id(cake.design, "Choose a cake design.");

  if (!Array.isArray(cake.selections) || cake.selections.length > 50) {
    throw new CakeError("Choose valid cake options.");
  }
  const seenLists = new Set<string>();
  const selections: CakeSelection[] = cake.selections.map((entry) => {
    const selection = object(entry);
    const listId = id(selection.listId, "Choose valid cake options.");
    if (seenLists.has(listId)) throw new CakeError("Choose valid cake options.");
    seenLists.add(listId);

    if (!Array.isArray(selection.modifierIds) || selection.modifierIds.length > 50) {
      throw new CakeError("Choose valid cake options.");
    }
    const seenModifiers = new Set<string>();
    const modifierIds = selection.modifierIds.map((modifierId) => {
      const parsed = id(modifierId, "Choose valid cake options.");
      if (seenModifiers.has(parsed)) throw new CakeError("Choose valid cake options.");
      seenModifiers.add(parsed);
      return parsed;
    });
    return { listId, modifierIds };
  });

  if (typeof cake.message !== "string" || cake.message.length > 80) {
    throw new CakeError("Message is too long");
  }

  return { design, selections, message: cake.message };
}

/**
 * Prices a cake strictly from the live Square catalogue: the item variation is
 * the base price and every selected modifier contributes its own Square price.
 */
export function priceCake(cake: Cake, designs: CakeDesign[]): PricedCake {
  const design = designs.find((candidate) => candidate.id === cake.design);
  if (!design) throw new CakeError("This cake design is no longer available.");

  const selections = new Map(
    cake.selections.map((selection) => [selection.listId, selection.modifierIds]),
  );

  for (const listId of selections.keys()) {
    if (!design.modifierLists.some((list) => list.id === listId)) {
      throw new CakeError("Choose valid cake options.");
    }
  }

  let subtotal = design.price.amount;
  const lines = design.modifierLists.map((list) => {
    const selectedIds = selections.get(list.id) ?? [];
    const selected = new Set(selectedIds);

    if (selected.size !== selectedIds.length) {
      throw new CakeError("Choose valid cake options.");
    }
    if (selectedIds.length < list.minSelected) {
      throw new CakeError(`Choose at least ${list.minSelected} for ${list.name}.`);
    }
    if (list.maxSelected > 0 && selectedIds.length > list.maxSelected) {
      throw new CakeError(`Choose at most ${list.maxSelected} for ${list.name}.`);
    }
    if (list.selectionType === "SINGLE" && selectedIds.length > 1) {
      throw new CakeError(`Choose only one option for ${list.name}.`);
    }

    const modifiers = list.modifiers.filter((modifier) =>
      selected.has(modifier.id),
    );
    if (modifiers.length !== selectedIds.length) {
      throw new CakeError("Choose valid cake options.");
    }

    for (const modifier of modifiers) subtotal += modifier.price;
    return { list, modifiers };
  });

  return {
    cake,
    design,
    lines: lines.filter((line) => line.modifiers.length > 0),
    subtotal,
  };
}

export async function getPricedCake(
  env: ApiEnv,
  value: unknown,
): Promise<PricedCake> {
  const cake = parseCake(value);
  const designs = await getCachedCakeDesigns(env);
  return priceCake(cake, designs);
}

export function pickupInstant(value: unknown, zone: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new CakeError("Enter a valid pickup date and time");
  const target = Date.parse(value + ":00Z");
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 16) !== value) throw new CakeError("Invalid pickup date");
  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const local = (t: number) => fmt.format(new Date(t)).replace(" ", "T");
  let instant = target;
  for (let i = 0; i < 4; i++) instant += target - Date.parse(local(instant) + ":00Z");
  if (local(instant) !== value) throw new CakeError("This pickup time does not exist. Choose another time.");
  return instant;
}

export function rushFee(instant: number, now = Date.now()) {
  const hours = (instant - now) / 3600000;
  return { available: hours >= 24, fee: hours >= 24 && hours < 48 ? 8000 : 0 };
}

export async function handleCakeCheckout(request: Request, env: ApiEnv) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const raw = await request.text();
    if (raw.length > 20000) return json({ error: "Request too large" }, 413);
    const body = object(JSON.parse(raw));
    const { subtotal } = await getPricedCake(env, body.cake);
    if (!body.pickup) return json({ subtotal, total: subtotal, fee: 0 });
    const instant = pickupInstant(body.pickup, env.SQUARE_TIMEZONE || "Australia/Perth");
    const { available, fee } = rushFee(instant);
    return json({ subtotal, fee, total: subtotal + fee, available, expires: Date.now() + 15 * 60000 });
  } catch (error) {
    if (error instanceof CakeError) {
      return json({ error: error.message }, 400);
    }
    console.error("[api] Cake quote failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Cake pricing is temporarily unavailable" }, 502);
  }
}
