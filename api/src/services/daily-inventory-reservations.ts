import type { ApiEnv } from "../types/env.js";

export type DailyInventoryHoldLine = {
  variationId: string;
  quantity: number;
  availableQuantity: number;
};

export type DailyInventoryHoldResult =
  | { ok: true; reused: boolean }
  | {
      ok: false;
      reason:
        | "attempt-conflict"
        | "attempt-expired"
        | "attempt-cancelled-inventory"
        | "insufficient-inventory";
      variationId?: string;
      availableQuantity?: number;
      expiresAt?: number;
    };

export async function holdDailyInventory(
  env: ApiEnv,
  attemptId: string,
  lines: DailyInventoryHoldLine[],
): Promise<DailyInventoryHoldResult> {
  if (lines.length === 0) return { ok: true, reused: false };

  const namespace = env.DAILY_INVENTORY_RESERVATIONS;
  if (!namespace || !env.SQUARE_LOCATION_ID) {
    throw new Error("Daily Menu reservations are not configured.");
  }

  const objectId = namespace.idFromName(env.SQUARE_LOCATION_ID);
  const response = await namespace.get(objectId).fetch(
    new Request("https://daily-inventory-reservations/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attemptId, lines }),
    }),
  );

  const result = (await response.json()) as DailyInventoryHoldResult;
  if (response.status === 409 && result.ok === false) return result;
  if (!response.ok || result.ok !== true) {
    throw new Error("Daily Menu reservations are temporarily unavailable.");
  }

  return result;
}

export async function createDailyMenuCheckout(
  env: ApiEnv,
  attemptId: string,
  lines: DailyInventoryHoldLine[],
  checkoutPayload: Record<string, unknown>,
): Promise<DailyInventoryHoldResult & { url?: string; expiresAt?: number }> {
  const namespace = env.DAILY_INVENTORY_RESERVATIONS;
  if (!namespace || !env.SQUARE_LOCATION_ID) {
    throw new Error("Daily Menu reservations are not configured.");
  }

  const objectId = namespace.idFromName(env.SQUARE_LOCATION_ID);
  const response = await namespace.get(objectId).fetch(
    new Request("https://daily-inventory-reservations/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attemptId, lines, checkoutPayload }),
    }),
  );
  const result = (await response.json()) as DailyInventoryHoldResult & {
    url?: string;
    expiresAt?: number;
  };
  if (response.status === 409 && result.ok === false) return result;
  if (
    !response.ok ||
    result.ok !== true ||
    typeof result.url !== "string" ||
    typeof result.expiresAt !== "number"
  ) {
    throw new Error("Daily Menu checkout is temporarily unavailable.");
  }
  return result;
}

export async function notifyDailyInventoryChanged(
  env: ApiEnv,
  variationIds: string[],
): Promise<void> {
  if (variationIds.length === 0 || !env.DAILY_INVENTORY_RESERVATIONS || !env.SQUARE_LOCATION_ID) {
    return;
  }
  const namespace = env.DAILY_INVENTORY_RESERVATIONS;
  const objectId = namespace.idFromName(env.SQUARE_LOCATION_ID);
  const response = await namespace.get(objectId).fetch(
    new Request("https://daily-inventory-reservations/inventory-changed", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ variationIds: [...new Set(variationIds)] }),
    }),
  );
  if (!response.ok) {
    throw new Error("Daily Menu inventory reconciliation was not accepted");
  }
}
