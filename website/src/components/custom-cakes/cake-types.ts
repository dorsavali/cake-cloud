export type CakeModifier = {
  id: string;
  name: string;
  price: number;
  defaultSelected: boolean;
};

export type CakeModifierList = {
  id: string;
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  minSelected: number;
  maxSelected: number;
  modifiers: CakeModifier[];
};

export type CakeDesign = {
  id: string;
  variationId: string | null;
  name: string;
  description: string;
  image: string | null;
  images: string[];
  price: { amount: number; currency: string };
  modifierLists: CakeModifierList[];
};

export type CakeSelection = { listId: string; modifierIds: string[] };

export type CakeConfig = {
  design: string;
  selections: CakeSelection[];
  message: string;
};

export type CakeQuote = {
  subtotal: number;
  total: number;
  fee: number;
  available?: boolean;
  expires?: number;
};

export const money = (amount: number, currency = "AUD") =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(
    amount / 100,
  );

export function selectedModifiers(list: CakeModifierList, ids: string[]) {
  return list.modifiers.filter((modifier) => ids.includes(modifier.id));
}

export function toggleModifier(
  list: CakeModifierList,
  current: string[],
  modifierId: string,
): string[] {
  if (list.selectionType === "SINGLE") return [modifierId];
  if (current.includes(modifierId)) {
    return current.filter((id) => id !== modifierId);
  }
  if (list.maxSelected > 0 && current.length >= list.maxSelected) {
    return current;
  }
  return [...current, modifierId];
}

/** Drops ids that are no longer part of the Square catalogue. */
export function sanitizeSelections(
  design: CakeDesign,
  raw: Record<string, string[]>,
): CakeSelection[] {
  return design.modifierLists
    .map((list) => ({
      listId: list.id,
      modifierIds: (raw[list.id] ?? []).filter((id) =>
        list.modifiers.some((modifier) => modifier.id === id),
      ),
    }))
    .filter((selection) => selection.modifierIds.length > 0);
}

export function defaultSelections(design: CakeDesign): Record<string, string[]> {
  const selected: Record<string, string[]> = {};
  for (const list of design.modifierLists) {
    const defaults = list.modifiers
      .filter((modifier) => modifier.defaultSelected)
      .map((modifier) => modifier.id);
    if (defaults.length > 0) selected[list.id] = defaults;
  }
  return selected;
}

export function incompleteLists(
  design: CakeDesign,
  raw: Record<string, string[]>,
): CakeModifierList[] {
  return design.modifierLists.filter((list) => {
    const count = (raw[list.id] ?? []).filter((id) =>
      list.modifiers.some((modifier) => modifier.id === id),
    ).length;
    return (
      count < list.minSelected ||
      (list.maxSelected > 0 && count > list.maxSelected) ||
      (list.selectionType === "SINGLE" && count > 1)
    );
  });
}

const colourNames: Record<string, string> = {
  ivory: "#faf7f0",
  white: "#ffffff",
  blush: "#efc2c2",
  pink: "#efc2c2",
  sage: "#91ac88",
  green: "#91ac88",
  lavender: "#c5b1d8",
  purple: "#c5b1d8",
  chocolate: "#8a593b",
  brown: "#8a593b",
  "dusty rose": "#c68779",
  red: "#b05249",
  blue: "#8aa9c2",
  yellow: "#ead58b",
};

export function isColourList(name: string) {
  return /colo(u)?r/i.test(name);
}

export function colourFor(name: string): string | null {
  return colourNames[name.trim().toLowerCase()] ?? null;
}
