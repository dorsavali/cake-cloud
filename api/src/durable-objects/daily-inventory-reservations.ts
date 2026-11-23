import { DurableObject } from "cloudflare:workers";

import { configureCheckoutReturn } from "../services/checkout-return.js";
import { reconcileOrder, squareApi } from "../services/payment-verification.js";
import { getFreshInventoryByVariation } from "../services/square.js";
import type { ApiEnv } from "../types/env.js";
import { expireDailyInventoryReservation } from "./daily-inventory-expiration.js";
import { selectInventoryConflictCancellations } from "./daily-inventory-conflicts.js";
import { squareDefinitelyRejectedPaymentLink } from "./daily-inventory-payment-link.js";
import {
  deleteDailyInventoryReservation,
  discardDailyInventoryReservation,
  dueDailyInventoryReservations,
  getDailyInventoryReservations,
  markDailyInventoryReservationReady,
  reserveDailyInventory,
  updateDailyInventoryReservation,
  validateReservationRequest,
  type DailyInventoryReservation,
  type ReservationStorage,
} from "./daily-inventory-reservation-ledger.js";

const RETRY_DELAY_MS = 60_000;
const CHECKOUT_RETURN_PATH = "/DailyMenu/payment-result/";
const PENDING_INVENTORY_CHANGES_KEY = "pending-inventory-changes";

type CheckoutRequest = {
  attemptId: string;
  lines: Array<{
    variationId: string;
    quantity: number;
    availableQuantity: number;
  }>;
  checkoutPayload: Record<string, unknown>;
};

type SquarePaymentLink = { id?: string; url?: string; order_id?: string };

function isCheckoutRequest(value: unknown): value is CheckoutRequest {
  if (!validateReservationRequest(value, true)) return false;
  const candidate = value as Partial<CheckoutRequest>;
  return Boolean(
    candidate.checkoutPayload &&
      typeof candidate.checkoutPayload === "object" &&
      !Array.isArray(candidate.checkoutPayload) &&
      candidate.checkoutPayload.idempotency_key === candidate.attemptId,
  );
}

function safeCheckoutUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      [
        "square.link",
        "sandbox.square.link",
        "checkout.square.site",
        "sandbox.checkout.square.site",
      ].includes(url.hostname)
      ? url
      : null;
  } catch {
    return null;
  }
}

export class DailyInventoryReservations extends DurableObject<ApiEnv> {
  private inventoryReconciliation: Promise<void> | null = null;

  private get storage(): ReservationStorage {
    return this.ctx.storage as ReservationStorage;
  }

  private async scheduleAlarm(time: number): Promise<void> {
    const current = await this.ctx.storage.getAlarm();
    if (current === null || time < current) await this.ctx.storage.setAlarm(time);
  }

  private async rescheduleAlarmFromState(now = Date.now()): Promise<void> {
    const reservations = Object.values(
      await getDailyInventoryReservations(this.storage),
    );
    const pendingInventoryChanges = await this.getPendingInventoryChanges();
    const candidates = reservations.map((reservation) => reservation.expiresAt);

    if (pendingInventoryChanges.length > 0) {
      const current = await this.ctx.storage.getAlarm();
      candidates.push(now + RETRY_DELAY_MS);
      if (current !== null) candidates.push(current);
    }

    if (candidates.length > 0) {
      await this.ctx.storage.setAlarm(Math.min(...candidates));
    }
  }

  private async addPendingInventoryChanges(
    variationIds: string[],
  ): Promise<void> {
    await this.storage.transaction(async (transaction) => {
      const pending =
        (await transaction.get<string[]>(PENDING_INVENTORY_CHANGES_KEY)) ?? [];
      await transaction.put(PENDING_INVENTORY_CHANGES_KEY, [
        ...new Set([...pending, ...variationIds]),
      ]);
    });
  }

  private async getPendingInventoryChanges(): Promise<string[]> {
    return this.storage.transaction(async (transaction) =>
      (await transaction.get<string[]>(PENDING_INVENTORY_CHANGES_KEY)) ?? [],
    );
  }

  private async clearPendingInventoryChanges(
    processedVariationIds: string[],
  ): Promise<void> {
    const processed = new Set(processedVariationIds);
    await this.storage.transaction(async (transaction) => {
      const pending =
        (await transaction.get<string[]>(PENDING_INVENTORY_CHANGES_KEY)) ?? [];
      await transaction.put(
        PENDING_INVENTORY_CHANGES_KEY,
        pending.filter((variationId) => !processed.has(variationId)),
      );
    });
  }

  private async runPendingInventoryChanges(): Promise<void> {
    const pending = await this.getPendingInventoryChanges();
    if (pending.length === 0) return;
    await this.reconcileInventoryChange(pending);
    await this.clearPendingInventoryChanges(pending);
  }

  private processPendingInventoryChanges(): Promise<void> {
    if (this.inventoryReconciliation) return this.inventoryReconciliation;
    const reconciliation = this.runPendingInventoryChanges().finally(() => {
      if (this.inventoryReconciliation === reconciliation) {
        this.inventoryReconciliation = null;
      }
    });
    this.inventoryReconciliation = reconciliation;
    return reconciliation;
  }

  private async createOrRecoverPaymentLink(
    reservation: DailyInventoryReservation,
    startHoldWhenReady = true,
  ): Promise<DailyInventoryReservation> {
    let current = reservation;
    if (!current.paymentLink) {
      if (!current.checkoutPayload) throw new Error("Checkout payload is unavailable");
      const baseUrl = this.env.SQUARE_ENVIRONMENT === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";
      const response = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.env.SQUARE_ACCESS_TOKEN}`,
          "Square-Version": "2026-08-19",
          "content-type": "application/json",
        },
        body: JSON.stringify(current.checkoutPayload),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await response.json().catch(() => ({})) as {
        payment_link?: SquarePaymentLink;
      };
      const link = data.payment_link;
      const url = link?.url ? safeCheckoutUrl(link.url) : null;
      if (!response.ok || !link?.id || !link.order_id || !url) {
        if (squareDefinitelyRejectedPaymentLink(response.status)) {
          await discardDailyInventoryReservation(
            this.storage,
            current.attemptId,
          );
        }
        throw new Error("Square could not create the checkout page");
      }

      const updated = await updateDailyInventoryReservation(
        this.storage,
        current.attemptId,
        (stored) => ({
          ...stored,
          paymentLink: {
            id: link.id as string,
            orderId: link.order_id as string,
            url: url.href,
          },
        }),
      );
      if (!updated) throw new Error("Reservation disappeared");
      current = updated;
    }

    const paymentLink = current.paymentLink;
    if (!paymentLink) throw new Error("Payment link is unavailable");
    await configureCheckoutReturn(
      this.env,
      paymentLink.id,
      paymentLink.orderId,
      CHECKOUT_RETURN_PATH,
    );
    const ready = await updateDailyInventoryReservation(
      this.storage,
      current.attemptId,
      (stored) =>
        markDailyInventoryReservationReady(
          stored,
          Date.now(),
          startHoldWhenReady,
        ),
    );
    if (!ready) throw new Error("Reservation disappeared");
    if (startHoldWhenReady) await this.rescheduleAlarmFromState();
    return ready;
  }

  private async deleteUnpaidPaymentLink(
    reservation: DailyInventoryReservation,
  ): Promise<"cancelled" | "paid"> {
    if (!reservation.paymentLink) throw new Error("Payment link is unavailable");
    await updateDailyInventoryReservation(
      this.storage,
      reservation.attemptId,
      (stored) => ({ ...stored, status: "deleting-link" }),
    );

    const baseUrl = this.env.SQUARE_ENVIRONMENT === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";
    const response = await fetch(
      `${baseUrl}/v2/online-checkout/payment-links/${encodeURIComponent(reservation.paymentLink.id)}`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${this.env.SQUARE_ACCESS_TOKEN}`,
          "Square-Version": "2026-08-19",
          "content-type": "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (response.ok) {
      const deleted = (await response.json()) as {
        id?: string;
        cancelled_order_id?: string;
      };
      if (deleted.id !== reservation.paymentLink.id) {
        throw new Error("Square deleted an unexpected checkout link");
      }
      if (deleted.cancelled_order_id === reservation.paymentLink.orderId) {
        return "cancelled";
      }
      const status = (
        await reconcileOrder(this.env, reservation.paymentLink.orderId)
      )?.status;
      if (status === "paid" || status === "refunded") return "paid";
      throw new Error("Square did not confirm checkout cancellation");
    }

    if (response.status === 404 && reservation.status === "deleting-link") {
      const status = (
        await reconcileOrder(this.env, reservation.paymentLink.orderId)
      )?.status;
      if (status === "paid" || status === "refunded") return "paid";
      const { order } = await squareApi<{ order?: { id?: string; state?: string } }>(
        this.env,
        `/v2/orders/${encodeURIComponent(reservation.paymentLink.orderId)}`,
      );
      if (order?.id === reservation.paymentLink.orderId && order.state === "CANCELED") {
        return "cancelled";
      }
    }

    throw new Error("Square could not delete the checkout link");
  }

  private async expireReservation(reservation: DailyInventoryReservation): Promise<void> {
    await expireDailyInventoryReservation(reservation, {
      recoverPaymentLink: (current) =>
        this.createOrRecoverPaymentLink(current, false),
      paymentStatus: async (orderId) =>
        (await reconcileOrder(this.env, orderId))?.status ?? null,
      paidInventoryWasApplied: async (current) => {
        const quantities = await getFreshInventoryByVariation(
          this.env,
          current.lines.map((line) => line.variationId),
        );
        if (!quantities) return false;
        return current.lines.every(
          (line) =>
            (quantities.get(line.variationId) ?? Number.POSITIVE_INFINITY) <=
            line.availableQuantity - line.quantity,
        );
      },
      deletePaymentLink: (current) => this.deleteUnpaidPaymentLink(current),
      release: (attemptId) =>
        deleteDailyInventoryReservation(this.storage, attemptId),
    });
  }

  private async expireDueReservations(
    now: number,
    variationIds?: ReadonlySet<string>,
  ): Promise<boolean> {
    const due = dueDailyInventoryReservations(
      await getDailyInventoryReservations(this.storage),
      now,
      variationIds,
    );
    let needsRetry = false;
    for (const reservation of due) {
      try {
        await this.expireReservation(reservation);
      } catch (error) {
        needsRetry = true;
        console.error("[daily-inventory] Could not expire reservation", {
          attemptId: reservation.attemptId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return needsRetry;
  }

  private inventoryChangeIsVisible(
    reservation: DailyInventoryReservation,
    quantities: Map<string, number>,
  ): boolean {
    return reservation.lines.every(
      (line) =>
        (quantities.get(line.variationId) ?? Number.POSITIVE_INFINITY) <=
        line.availableQuantity - line.quantity,
    );
  }

  private async reconcileInventoryChange(
    changedVariationIds: string[],
  ): Promise<void> {
    let reservations = Object.values(
      await getDailyInventoryReservations(this.storage),
    );
    const relevant = reservations.filter((reservation) =>
      reservation.lines.some((line) =>
        changedVariationIds.includes(line.variationId),
      ),
    );
    if (relevant.length === 0) return;

    const allVariationIds = [
      ...new Set(reservations.flatMap((reservation) =>
        reservation.lines.map((line) => line.variationId))),
    ];
    const quantities = await getFreshInventoryByVariation(
      this.env,
      allVariationIds,
    );
    if (!quantities) throw new Error("Square inventory is unavailable");

    const protectedAttemptIds = new Set<string>();
    for (const reservation of reservations) {
      if (!reservation.paymentLink || reservation.status === "deleting-link") {
        protectedAttemptIds.add(reservation.attemptId);
        continue;
      }
      try {
        const status = (
          await reconcileOrder(this.env, reservation.paymentLink.orderId)
        )?.status;
        if (status === "paid" || status === "refunded") {
          if (this.inventoryChangeIsVisible(reservation, quantities)) {
            await deleteDailyInventoryReservation(
              this.storage,
              reservation.attemptId,
            );
          } else {
            protectedAttemptIds.add(reservation.attemptId);
          }
        } else if (!status || status === "review") {
          protectedAttemptIds.add(reservation.attemptId);
        }
      } catch {
        protectedAttemptIds.add(reservation.attemptId);
      }
    }

    reservations = Object.values(
      await getDailyInventoryReservations(this.storage),
    );
    for (const reservation of selectInventoryConflictCancellations(
      reservations,
      quantities,
      protectedAttemptIds,
    )) {
      const outcome = await this.deleteUnpaidPaymentLink(reservation);
      if (outcome === "paid") {
        const latestQuantities = await getFreshInventoryByVariation(
          this.env,
          reservation.lines.map((line) => line.variationId),
        );
        if (
          !latestQuantities ||
          !this.inventoryChangeIsVisible(reservation, latestQuantities)
        ) {
          throw new Error("Paid inventory update is not visible yet");
        }
        await deleteDailyInventoryReservation(
          this.storage,
          reservation.attemptId,
        );
      } else {
        await deleteDailyInventoryReservation(
          this.storage,
          reservation.attemptId,
          Date.now(),
          "inventory-changed",
        );
      }
    }
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    let needsRetry = false;
    try {
      await this.processPendingInventoryChanges();
    } catch (error) {
      needsRetry = true;
      console.error("[daily-inventory] Could not reconcile Square inventory", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    needsRetry = (await this.expireDueReservations(now)) || needsRetry;

    const remaining = Object.values(await getDailyInventoryReservations(this.storage));
    const pendingInventoryChanges = await this.getPendingInventoryChanges();
    if (remaining.length === 0 && pendingInventoryChanges.length === 0) return;
    const nextFutureExpiry = Math.min(...remaining.map((item) => item.expiresAt));
    await this.ctx.storage.setAlarm(
      needsRetry || pendingInventoryChanges.length > 0 || nextFutureExpiry <= now
        ? now + RETRY_DELAY_MS
        : nextFutureExpiry,
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "POST") return Response.json({ error: "Not found" }, { status: 404 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (url.pathname === "/checkout") {
      if (!isCheckoutRequest(body)) {
        return Response.json({ error: "Invalid checkout reservation" }, { status: 400 });
      }
      const now = Date.now();
      const cleanupNeedsRetry = await this.expireDueReservations(
        now,
        new Set(body.lines.map((line) => line.variationId)),
      );
      if (cleanupNeedsRetry) await this.scheduleAlarm(now + RETRY_DELAY_MS);
      const result = await reserveDailyInventory(this.storage, body, now);
      if (!result.ok) return Response.json(result, { status: 409 });
      await this.scheduleAlarm(result.reservation.expiresAt);
      const ready = await this.createOrRecoverPaymentLink(result.reservation);
      return Response.json({
        ok: true,
        url: ready.paymentLink!.url,
        expiresAt: ready.expiresAt,
      });
    }

    if (url.pathname === "/inventory-changed") {
      const variationIds =
        body && typeof body === "object" &&
        Array.isArray((body as { variationIds?: unknown }).variationIds)
          ? (body as { variationIds: unknown[] }).variationIds
          : null;
      if (
        !variationIds ||
        variationIds.length === 0 ||
        variationIds.length > 100 ||
        variationIds.some((id) => typeof id !== "string" || !id)
      ) {
        return Response.json({ error: "Invalid inventory change" }, { status: 400 });
      }
      const uniqueVariationIds = [...new Set(variationIds as string[])];
      await this.addPendingInventoryChanges(uniqueVariationIds);
      await this.scheduleAlarm(Date.now() + RETRY_DELAY_MS);
      this.ctx.waitUntil(this.processPendingInventoryChanges().catch((error) => {
        console.error("[daily-inventory] Deferred inventory reconciliation failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }));
      return Response.json({ accepted: true }, { status: 202 });
    }

    if (url.pathname === "/reserve") {
      if (!validateReservationRequest(body)) {
        return Response.json({ error: "Invalid reservation request" }, { status: 400 });
      }
      const now = Date.now();
      const cleanupNeedsRetry = await this.expireDueReservations(
        now,
        new Set(body.lines.map((line) => line.variationId)),
      );
      if (cleanupNeedsRetry) await this.scheduleAlarm(now + RETRY_DELAY_MS);
      const result = await reserveDailyInventory(this.storage, body, now);
      if (!result.ok) return Response.json(result, { status: 409 });
      await this.scheduleAlarm(result.reservation.expiresAt);
      return Response.json(result, { status: result.reused ? 200 : 201 });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
