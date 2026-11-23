import "client-only";

const checkoutIdentityStorageKey = "cake-cloud:daily-order-identity:v1";
const checkoutAttemptStorageKey = "cake-cloud:daily-checkout-attempt:v1";
const checkoutAttemptLockName = "cake-cloud:daily-checkout-attempt";
const checkoutIdentityChangedEvent = "cake-cloud-daily-order-identity-change";
const checkoutAttemptFallbackDurationMs = 4 * 60 * 1000;

export type CheckoutIdentity = {
  createdAt: string;
  orderNumber: string;
};

let checkoutIdentitySnapshot = "";

function parseCheckoutIdentity(serialized: string): CheckoutIdentity | null {
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object") return null;
    const identity = parsed as Partial<CheckoutIdentity>;
    if (
      typeof identity.createdAt !== "string" ||
      Number.isNaN(Date.parse(identity.createdAt)) ||
      typeof identity.orderNumber !== "string" ||
      !/^CC-[A-Z0-9]{6,20}-[A-Z0-9]{4}$/.test(identity.orderNumber)
    ) return null;
    return { createdAt: identity.createdAt, orderNumber: identity.orderNumber };
  } catch {
    return null;
  }
}

function createCheckoutIdentity(): CheckoutIdentity {
  const now = Date.now();
  const suffix = crypto
    .getRandomValues(new Uint16Array(2))
    .reduce(
      (value, part) =>
        value + part.toString(36).toUpperCase().padStart(2, "0"),
      "",
    )
    .slice(0, 4);

  return {
    createdAt: new Date(now).toISOString(),
    orderNumber: `CC-${now.toString(36).toUpperCase()}-${suffix}`,
  };
}

export function getCheckoutIdentitySnapshot() {
  if (parseCheckoutIdentity(checkoutIdentitySnapshot)) {
    return checkoutIdentitySnapshot;
  }

  try {
    const stored = sessionStorage.getItem(checkoutIdentityStorageKey) ?? "";
    const identity = parseCheckoutIdentity(stored) ?? createCheckoutIdentity();
    checkoutIdentitySnapshot = JSON.stringify(identity);
    sessionStorage.setItem(checkoutIdentityStorageKey, checkoutIdentitySnapshot);
  } catch {
    checkoutIdentitySnapshot = JSON.stringify(createCheckoutIdentity());
  }

  return checkoutIdentitySnapshot;
}

export function getCheckoutIdentityServerSnapshot() {
  return "";
}

export function subscribeToCheckoutIdentity(onStoreChange: () => void) {
  window.addEventListener(checkoutIdentityChangedEvent, onStoreChange);
  return () => window.removeEventListener(checkoutIdentityChangedEvent, onStoreChange);
}

export function clearCheckoutIdentity() {
  checkoutIdentitySnapshot = "";
  try {
    sessionStorage.removeItem(checkoutIdentityStorageKey);
    localStorage.removeItem(checkoutAttemptStorageKey);
  } catch {
    // A new in-memory identity will still be created for the next order.
  }
  window.dispatchEvent(new Event(checkoutIdentityChangedEvent));
}

export function getSavedCheckoutAttempt(): string | null {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(checkoutAttemptStorageKey) ?? "null",
    );
    if (!parsed || typeof parsed !== "object") return null;
    const attempt = parsed as {
      orderNumber?: unknown;
      idempotencyKey?: unknown;
      createdAt?: unknown;
      expiresAt?: unknown;
    };
    const expiresAt = typeof attempt.expiresAt === "number"
      ? attempt.expiresAt
      : typeof attempt.createdAt === "number"
        ? attempt.createdAt + checkoutAttemptFallbackDurationMs
        : 0;
    if (
      typeof attempt.orderNumber !== "string" ||
      typeof attempt.idempotencyKey !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(attempt.idempotencyKey) ||
      expiresAt <= Date.now()
    ) {
      localStorage.removeItem(checkoutAttemptStorageKey);
      return null;
    }
    return attempt.idempotencyKey;
  } catch {
    return null;
  }
}

export function saveCheckoutAttempt(
  orderNumber: string,
  idempotencyKey: string,
  expiresAt?: number,
): void {
  try {
    let createdAt = Date.now();
    try {
      const existing = JSON.parse(
        localStorage.getItem(checkoutAttemptStorageKey) ?? "null",
      ) as { idempotencyKey?: unknown; createdAt?: unknown } | null;
      if (
        existing?.idempotencyKey === idempotencyKey &&
        typeof existing.createdAt === "number"
      ) {
        createdAt = existing.createdAt;
      }
    } catch {
      // Replace malformed stored checkout data below.
    }
    localStorage.setItem(
      checkoutAttemptStorageKey,
      JSON.stringify({
        orderNumber,
        idempotencyKey,
        createdAt,
        ...(typeof expiresAt === "number" ? { expiresAt } : {}),
      }),
    );
  } catch {
    // Network retries in the current request still remain safe server-side.
  }
}

export function clearCheckoutAttempt(): void {
  try {
    localStorage.removeItem(checkoutAttemptStorageKey);
  } catch {
    // The next server response can still reject a reused expired attempt.
  }
}

export async function withCheckoutAttemptLock<T>(
  action: () => Promise<T>,
): Promise<T> {
  if (!navigator.locks) return action();
  return navigator.locks.request(checkoutAttemptLockName, action);
}
