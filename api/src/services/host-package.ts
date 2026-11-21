const normalize = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const perGuestValues = new Set([
  "head",
  "per head",
  "guest",
  "per guest",
  "person",
  "per person",
]);

export function hostPackagePriceUnit(
  attributes: Record<string, string | number | boolean | string[]>,
) {
  const pricingModel = normalize(attributes.pricing_model);
  const configuredUnit = normalize(attributes.price_unit);
  const perGuest =
    perGuestValues.has(pricingModel) || perGuestValues.has(configuredUnit);

  return perGuest ? configuredUnit || "head" : "package";
}

export function hostPackageMinimumGuests(
  attributes: Record<string, string | number | boolean | string[]>,
  description: string,
) {
  for (const key of ["minimum_guests", "minimum_quantity"]) {
    const value = Number(attributes[key]);
    if (Number.isInteger(value) && value > 0) return value;
  }

  const describedCapacity = /\bserves\s+(\d+)\s+(?:people|guests?)\b/i.exec(
    description,
  );
  const capacity = Number(describedCapacity?.[1]);
  return Number.isInteger(capacity) && capacity > 0 ? capacity : 10;
}
