import type { VerifiedStatus } from "../services/payment-verification.js";
import type { DailyInventoryReservation } from "./daily-inventory-reservation-ledger.js";

export type ExpirationDependencies = {
  recoverPaymentLink(
    reservation: DailyInventoryReservation,
  ): Promise<DailyInventoryReservation>;
  paymentStatus(orderId: string): Promise<VerifiedStatus | null>;
  paidInventoryWasApplied(
    reservation: DailyInventoryReservation,
  ): Promise<boolean>;
  deletePaymentLink(
    reservation: DailyInventoryReservation,
  ): Promise<"cancelled" | "paid">;
  release(attemptId: string): Promise<void>;
};

export async function expireDailyInventoryReservation(
  reservation: DailyInventoryReservation,
  dependencies: ExpirationDependencies,
): Promise<void> {
  if (!reservation.checkoutPayload && !reservation.paymentLink) {
    await dependencies.release(reservation.attemptId);
    return;
  }

  // A previous alarm may have deleted the Square link and crashed before the
  // local release. Re-run the idempotent deletion check instead of trying to
  // configure a link that is intentionally gone.
  if (reservation.status === "deleting-link") {
    const outcome = await dependencies.deletePaymentLink(reservation);
    if (
      outcome === "paid" &&
      !(await dependencies.paidInventoryWasApplied(reservation))
    ) {
      throw new Error("Paid inventory update is not visible yet");
    }
    await dependencies.release(reservation.attemptId);
    return;
  }

  const current = await dependencies.recoverPaymentLink(reservation);
  if (!current.paymentLink) throw new Error("Payment link is unavailable");
  const status = await dependencies.paymentStatus(current.paymentLink.orderId);

  if (status === "paid" || status === "refunded") {
    if (!(await dependencies.paidInventoryWasApplied(current))) {
      throw new Error("Paid inventory update is not visible yet");
    }
    await dependencies.release(current.attemptId);
    return;
  }

  if (!status || status === "review") {
    throw new Error("Payment requires review before releasing inventory");
  }

  const outcome = await dependencies.deletePaymentLink(current);
  if (
    outcome === "paid" &&
    !(await dependencies.paidInventoryWasApplied(current))
  ) {
    throw new Error("Paid inventory update is not visible yet");
  }
  await dependencies.release(current.attemptId);
}
