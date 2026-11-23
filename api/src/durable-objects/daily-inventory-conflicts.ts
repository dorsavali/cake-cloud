import type { DailyInventoryReservation } from "./daily-inventory-reservation-ledger.js";

export function selectInventoryConflictCancellations(
  reservations: DailyInventoryReservation[],
  quantities: Map<string, number>,
  protectedAttemptIds: Set<string>,
): DailyInventoryReservation[] {
  const reserved = new Map<string, number>();
  for (const reservation of reservations) {
    for (const line of reservation.lines) {
      reserved.set(
        line.variationId,
        (reserved.get(line.variationId) ?? 0) + line.quantity,
      );
    }
  }

  const hasConflict = () =>
    [...reserved].some(
      ([variationId, quantity]) => quantity > (quantities.get(variationId) ?? 0),
    );
  const selected: DailyInventoryReservation[] = [];

  for (const reservation of [...reservations].sort(
    (left, right) => right.createdAt - left.createdAt,
  )) {
    if (!hasConflict()) break;
    if (protectedAttemptIds.has(reservation.attemptId)) continue;
    const contributesToConflict = reservation.lines.some(
      (line) =>
        (reserved.get(line.variationId) ?? 0) >
        (quantities.get(line.variationId) ?? 0),
    );
    if (!contributesToConflict) continue;

    selected.push(reservation);
    for (const line of reservation.lines) {
      reserved.set(
        line.variationId,
        Math.max(0, (reserved.get(line.variationId) ?? 0) - line.quantity),
      );
    }
  }

  return selected;
}
