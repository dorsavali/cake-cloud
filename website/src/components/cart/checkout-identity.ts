import "client-only";

const checkoutIdentityStorageKey = "cake-cloud:daily-order-identity:v1";
const checkoutIdentityChangedEvent = "cake-cloud-daily-order-identity-change";

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
  } catch {
    // A new in-memory identity will still be created for the next order.
  }
  window.dispatchEvent(new Event(checkoutIdentityChangedEvent));
}
