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

export type HostModifierSelection = {
  id: string;
  quantity: number;
};

export function parseHostModifierSelections(
  rawModifiers: unknown,
  legacyModifierIds: unknown,
): HostModifierSelection[] {
  const invalid = () => {
    throw new Error("Choose valid package options.");
  };
  let selections: HostModifierSelection[];

  if (rawModifiers !== undefined) {
    if (!Array.isArray(rawModifiers) || rawModifiers.length > 50) return invalid();
    selections = rawModifiers.map((rawModifier) => {
      if (!rawModifier || typeof rawModifier !== "object") return invalid();
      const { id, quantity } = rawModifier as {
        id?: unknown;
        quantity?: unknown;
      };
      if (
        typeof id !== "string" ||
        id.length > 255 ||
        !Number.isInteger(quantity) ||
        (quantity as number) < 1 ||
        (quantity as number) > 999
      ) {
        return invalid();
      }
      return { id, quantity: quantity as number };
    });
  } else if (legacyModifierIds === undefined) {
    selections = [];
  } else {
    if (!Array.isArray(legacyModifierIds) || legacyModifierIds.length > 50) {
      return invalid();
    }
    selections = legacyModifierIds.map((id) => {
      if (typeof id !== "string" || id.length > 255) return invalid();
      return { id, quantity: 1 };
    });
  }

  if (new Set(selections.map((selection) => selection.id)).size !== selections.length) {
    return invalid();
  }
  return selections;
}
