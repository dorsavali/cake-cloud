export type OrderNumberKind = "CAKE" | "HOST";

/**
 * Builds a short, stable customer-facing reference from the checkout retry key.
 * The same checkout attempt always produces the same number, so retries cannot
 * create a second customer reference for the same Square order.
 */
export function orderNumberFromSeed(
  kind: OrderNumberKind,
  seed: string,
): string {
  const compact = seed.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (compact.length < 12) throw new Error("Invalid order number seed");
  return `CC-${kind}-${compact.slice(0, 8)}${compact.slice(-4)}`;
}
