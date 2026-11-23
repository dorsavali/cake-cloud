export const DAILY_INVENTORY_HOLD_MS = 3 * 60 * 1000;

export type DailyInventoryReservationLine = {
  variationId: string;
  quantity: number;
  availableQuantity: number;
};

export type DailyInventoryReservation = {
  attemptId: string;
  lines: DailyInventoryReservationLine[];
  status: "pending-payment-link" | "ready" | "deleting-link";
  createdAt: number;
  expiresAt: number;
  checkoutPayload?: Record<string, unknown>;
  paymentLink?: {
    id: string;
    orderId: string;
    url: string;
  };
};

export type ReserveDailyInventoryResult =
  | {
      ok: true;
      reused: boolean;
      reservation: DailyInventoryReservation;
    }
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

export type ReservationState = Record<string, DailyInventoryReservation>;

export interface ReservationTransaction {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

export interface ReservationStorage {
  transaction<T>(
    callback: (transaction: ReservationTransaction) => Promise<T>,
  ): Promise<T>;
}

export const RESERVATIONS_KEY = "daily-inventory-reservations";
const USED_ATTEMPTS_KEY = "daily-inventory-used-attempts";
const USED_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;

type UsedAttemptReason = "expired" | "inventory-changed";
type UsedAttempt = { expiresAt: number; reason: UsedAttemptReason };
type StoredUsedAttempt = number | UsedAttempt;
type UsedAttemptState = Record<string, StoredUsedAttempt>;

function activeUsedAttempts(
  attempts: UsedAttemptState,
  now: number,
): Record<string, UsedAttempt> {
  return Object.fromEntries(
    Object.entries(attempts).flatMap(([attemptId, value]) => {
      const attempt: UsedAttempt = typeof value === "number"
        ? { expiresAt: value, reason: "expired" }
        : value;
      return attempt.expiresAt > now ? [[attemptId, attempt]] : [];
    }),
  );
}

function sameLines(
  existing: DailyInventoryReservation["lines"],
  requested: DailyInventoryReservationLine[],
): boolean {
  if (existing.length !== requested.length) return false;

  const requestedByVariation = new Map(
    requested.map((line) => [line.variationId, line.quantity]),
  );

  return existing.every(
    (line) => requestedByVariation.get(line.variationId) === line.quantity,
  );
}

export function validateReservationRequest(
  value: unknown,
  allowEmptyLines = false,
): value is { attemptId: string; lines: DailyInventoryReservationLine[] } {
  if (!value || typeof value !== "object") return false;

  const candidate = value as {
    attemptId?: unknown;
    lines?: unknown;
  };

  if (
    typeof candidate.attemptId !== "string" ||
    candidate.attemptId.length < 8 ||
    !Array.isArray(candidate.lines) ||
    (!allowEmptyLines && candidate.lines.length === 0)
  ) {
    return false;
  }

  const variationIds = new Set<string>();
  for (const valueLine of candidate.lines) {
    if (!valueLine || typeof valueLine !== "object") return false;
    const line = valueLine as Partial<DailyInventoryReservationLine>;
    if (
      typeof line.variationId !== "string" ||
      !line.variationId ||
      !Number.isSafeInteger(line.quantity) ||
      Number(line.quantity) <= 0 ||
      !Number.isSafeInteger(line.availableQuantity) ||
      Number(line.availableQuantity) < 0 ||
      variationIds.has(line.variationId)
    ) {
      return false;
    }
    variationIds.add(line.variationId);
  }

  return true;
}

export async function reserveDailyInventory(
  storage: ReservationStorage,
  request: {
    attemptId: string;
    lines: DailyInventoryReservationLine[];
    checkoutPayload?: Record<string, unknown>;
  },
  now = Date.now(),
): Promise<ReserveDailyInventoryResult> {
  return storage.transaction(async (transaction) => {
    const reservations =
      (await transaction.get<ReservationState>(RESERVATIONS_KEY)) ?? {};
    const usedAttempts = activeUsedAttempts(
      (await transaction.get<UsedAttemptState>(USED_ATTEMPTS_KEY)) ?? {},
      now,
    );
    const usedAttempt = usedAttempts[request.attemptId];
    if (usedAttempt) {
      return {
        ok: false,
        reason: usedAttempt.reason === "inventory-changed"
          ? "attempt-cancelled-inventory"
          : "attempt-expired",
      };
    }
    const existing = reservations[request.attemptId];

    if (existing) {
      if (!sameLines(existing.lines, request.lines)) {
        return {
          ok: false,
          reason: "attempt-conflict",
          expiresAt: existing.expiresAt,
        };
      }

      if (!existing.checkoutPayload && request.checkoutPayload) {
        const updated = { ...existing, checkoutPayload: request.checkoutPayload };
        await transaction.put(RESERVATIONS_KEY, {
          ...reservations,
          [request.attemptId]: updated,
        });
        return { ok: true, reused: true, reservation: updated };
      }

      return { ok: true, reused: true, reservation: existing };
    }

    const reservedByVariation = new Map<string, number>();
    for (const reservation of Object.values(reservations)) {
      for (const line of reservation.lines) {
        reservedByVariation.set(
          line.variationId,
          (reservedByVariation.get(line.variationId) ?? 0) + line.quantity,
        );
      }
    }

    for (const line of request.lines) {
      const alreadyReserved = reservedByVariation.get(line.variationId) ?? 0;
      if (alreadyReserved + line.quantity > line.availableQuantity) {
        return {
          ok: false,
          reason: "insufficient-inventory",
          variationId: line.variationId,
          availableQuantity: Math.max(
            0,
            line.availableQuantity - alreadyReserved,
          ),
        };
      }
    }

    const reservation: DailyInventoryReservation = {
      attemptId: request.attemptId,
      lines: request.lines.map(({ variationId, quantity, availableQuantity }) => ({
        variationId,
        quantity,
        availableQuantity,
      })),
      status: "pending-payment-link",
      createdAt: now,
      expiresAt: now + DAILY_INVENTORY_HOLD_MS,
      ...(request.checkoutPayload
        ? { checkoutPayload: request.checkoutPayload }
        : {}),
    };

    await transaction.put(RESERVATIONS_KEY, {
      ...reservations,
      [request.attemptId]: reservation,
    });

    return { ok: true, reused: false, reservation };
  });
}

export async function updateDailyInventoryReservation(
  storage: ReservationStorage,
  attemptId: string,
  update: (reservation: DailyInventoryReservation) => DailyInventoryReservation,
): Promise<DailyInventoryReservation | null> {
  return storage.transaction(async (transaction) => {
    const reservations =
      (await transaction.get<ReservationState>(RESERVATIONS_KEY)) ?? {};
    const reservation = reservations[attemptId];
    if (!reservation) return null;
    const updated = update(reservation);
    await transaction.put(RESERVATIONS_KEY, {
      ...reservations,
      [attemptId]: updated,
    });
    return updated;
  });
}

export function markDailyInventoryReservationReady(
  reservation: DailyInventoryReservation,
  readyAt = Date.now(),
  startHold = true,
): DailyInventoryReservation {
  if (reservation.status !== "pending-payment-link" || !startHold) {
    return { ...reservation, status: "ready" };
  }

  return {
    ...reservation,
    status: "ready",
    expiresAt: readyAt + DAILY_INVENTORY_HOLD_MS,
  };
}

export async function getDailyInventoryReservations(
  storage: ReservationStorage,
): Promise<ReservationState> {
  return storage.transaction(async (transaction) =>
    (await transaction.get<ReservationState>(RESERVATIONS_KEY)) ?? {},
  );
}

export function dueDailyInventoryReservations(
  reservations: ReservationState,
  now: number,
  variationIds?: ReadonlySet<string>,
): DailyInventoryReservation[] {
  return Object.values(reservations).filter(
    (reservation) =>
      reservation.expiresAt <= now &&
      (!variationIds ||
        reservation.lines.some((line) => variationIds.has(line.variationId))),
  );
}

export async function discardDailyInventoryReservation(
  storage: ReservationStorage,
  attemptId: string,
): Promise<void> {
  await storage.transaction(async (transaction) => {
    const reservations =
      (await transaction.get<ReservationState>(RESERVATIONS_KEY)) ?? {};
    if (!reservations[attemptId]) return;
    const { [attemptId]: _removed, ...remaining } = reservations;
    await transaction.put(RESERVATIONS_KEY, remaining);
  });
}

export async function deleteDailyInventoryReservation(
  storage: ReservationStorage,
  attemptId: string,
  now = Date.now(),
  reason: UsedAttemptReason = "expired",
): Promise<void> {
  await storage.transaction(async (transaction) => {
    const reservations =
      (await transaction.get<ReservationState>(RESERVATIONS_KEY)) ?? {};
    if (!reservations[attemptId]) return;
    const usedAttempts = activeUsedAttempts(
      (await transaction.get<UsedAttemptState>(USED_ATTEMPTS_KEY)) ?? {},
      now,
    );
    const { [attemptId]: _removed, ...remaining } = reservations;
    await transaction.put(RESERVATIONS_KEY, remaining);
    await transaction.put(USED_ATTEMPTS_KEY, {
      ...usedAttempts,
      [attemptId]: { expiresAt: now + USED_ATTEMPT_TTL_MS, reason },
    });
  });
}
