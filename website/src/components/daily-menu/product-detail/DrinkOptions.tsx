import { useState } from "react";

import type { DailyMenuProduct } from "../types";

export const drinkChoices = {
  temperature: ["Hot", "Cold"],
} as const;

export type DrinkSelection = {
  temperature: string;
  modifierIdsByList: Record<string, string[]>;
};

export const defaultDrinkSelection: DrinkSelection = {
  temperature: drinkChoices.temperature[0],
  modifierIdsByList: {},
};

type DrinkVariation = DailyMenuProduct["variations"][number];
type ModifierList = DailyMenuProduct["modifierLists"][number];

function formatSurcharge(variation: DrinkVariation, baseAmount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: variation.price.currency,
    minimumFractionDigits: 2,
  }).format((variation.price.amount - baseAmount) / 100);
}

function formatModifierPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function ModifierDropdown({
  list,
  optional,
  selectedModifierIds,
  optionLabel,
  onChange,
}: {
  list: ModifierList;
  optional: boolean;
  selectedModifierIds: string[];
  optionLabel: (modifier: ModifierList["modifiers"][number]) => string;
  onChange: (modifierIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const singleSelection = list.maxSelected === 1;
  const selectedModifiers = list.modifiers.filter((modifier) =>
    selectedModifierIds.includes(modifier.id),
  );
  const selectedLabel = selectedModifiers.length > 0
    ? selectedModifiers.map(optionLabel).join(", ")
    : optional
      ? "Default"
      : `Choose ${list.name}`;

  return (
    <div className="overflow-hidden rounded-lg border border-[#ddd0b9] bg-[#f5f0e7]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 border-0 bg-transparent px-4 py-2.5 text-left text-sm text-accent-dark outline-none transition-colors hover:bg-[#faf7f0] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20 lg:text-base"
      >
        <span className="truncate">{selectedLabel}</span>
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rotate-45 border-b border-r border-accent-dark transition-transform ${open ? "rotate-[225deg]" : ""}`}
        />
      </button>
      <div
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            role="listbox"
            aria-label={list.name}
            aria-multiselectable={!singleSelection}
            className="max-h-[300px] overflow-y-auto border-t border-[#ddd0b9] py-1.5"
          >
            {optional ? (
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                role="option"
                aria-selected={selectedModifierIds.length === 0}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:outline-none lg:text-base ${selectedModifierIds.length === 0 ? "font-medium text-primary" : "text-accent-dark"}`}
                onClick={() => {
                  onChange([]);
                  if (singleSelection) setOpen(false);
                }}
              >
                <span aria-hidden="true" className="w-5 shrink-0 text-primary">
                  {selectedModifierIds.length === 0 ? "✓" : ""}
                </span>
                <span>Default</span>
              </button>
            ) : null}
            {list.modifiers.map((modifier) => {
              const selected = selectedModifierIds.includes(modifier.id);
              const disabled =
                !singleSelection &&
                !selected &&
                list.maxSelected > 0 &&
                selectedModifierIds.length >= list.maxSelected;
              return (
                <button
                  key={modifier.id}
                  type="button"
                  tabIndex={open ? 0 : -1}
                  role="option"
                  aria-selected={selected}
                  disabled={disabled}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 lg:text-base ${selected ? "font-medium text-primary" : "text-accent-dark"}`}
                  onClick={() => {
                    if (singleSelection) {
                      onChange([modifier.id]);
                      setOpen(false);
                      return;
                    }
                    onChange(
                      selected
                        ? selectedModifierIds.filter((id) => id !== modifier.id)
                        : [...selectedModifierIds, modifier.id],
                    );
                  }}
                >
                  <span aria-hidden="true" className="w-5 shrink-0 text-primary">
                    {selected ? "✓" : ""}
                  </span>
                  <span className="min-w-0 flex-1">{optionLabel(modifier)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModifierOptions({
  list,
  currency,
  selectedModifierIds,
  onChange,
  alwaysDropdown = false,
}: {
  list: ModifierList;
  currency: string;
  selectedModifierIds: string[];
  onChange: (modifierIds: string[]) => void;
  alwaysDropdown?: boolean;
}) {
  const optional = list.minSelected === 0;
  const singleSelection = list.maxSelected === 1;
  const labelClassName =
    "mb-2.5 block text-[11px] uppercase tracking-[0.16em] text-accent-dark/55";
  const optionLabel = (modifier: ModifierList["modifiers"][number]) =>
    `${modifier.name}${
      modifier.price !== 0
        ? ` ${modifier.price > 0 ? "+" : ""}${formatModifierPrice(modifier.price, currency)}`
        : ""
    }`;

  if (alwaysDropdown || list.modifiers.length >= 4) {
    return (
      <div className="block">
        <span className={labelClassName}>
          {list.name}
          {!optional ? <span className="text-[#b05249]"> · Required</span> : null}
        </span>
        <ModifierDropdown
          list={list}
          optional={optional}
          selectedModifierIds={selectedModifierIds}
          optionLabel={optionLabel}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <fieldset>
      <legend className={labelClassName}>
        {list.name}
        {!optional ? <span className="text-[#b05249]"> · Required</span> : null}
      </legend>
      <div className="flex flex-wrap gap-2.5">
        {optional && singleSelection ? (
          <label className="cursor-pointer">
            <input
              type="radio"
              name={`modifier-${list.id}`}
              value=""
              checked={selectedModifierIds.length === 0}
              onChange={() => onChange([])}
              className="peer sr-only"
            />
            <span className="block rounded-full border border-luxury-accent px-5 py-2 text-xs transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary lg:text-sm">
              Default
            </span>
          </label>
        ) : null}
        {list.modifiers.map((modifier) => (
          <label key={modifier.id} className="cursor-pointer">
            <input
              type={singleSelection ? "radio" : "checkbox"}
              name={`modifier-${list.id}`}
              value={modifier.id}
              checked={selectedModifierIds.includes(modifier.id)}
              disabled={
                !singleSelection &&
                list.maxSelected > 0 &&
                selectedModifierIds.length >= list.maxSelected &&
                !selectedModifierIds.includes(modifier.id)
              }
              onChange={() => {
                if (singleSelection) {
                  onChange([modifier.id]);
                  return;
                }
                onChange(
                  selectedModifierIds.includes(modifier.id)
                    ? selectedModifierIds.filter((id) => id !== modifier.id)
                    : [...selectedModifierIds, modifier.id],
                );
              }}
              className="peer sr-only"
            />
            <span className="block rounded-full border border-luxury-accent px-5 py-2 text-xs transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-45 lg:text-sm">
              {optionLabel(modifier)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function VariationOptions({
  variations,
  selectedVariationId,
  onVariationChange,
}: {
  variations: DrinkVariation[];
  selectedVariationId: string;
  onVariationChange: (variationId: string) => void;
}) {
  const baseAmount = variations[0]?.price.amount ?? 0;

  return (
    <fieldset>
      <legend className="mb-2.5 text-[11px] uppercase tracking-[0.16em] text-accent-dark/55">Size</legend>
      <div className="flex flex-wrap gap-2.5">
        {variations.map((variation) => {
          const surcharge = variation.price.amount - baseAmount;
          return (
            <label key={variation.id} className="cursor-pointer">
              <input
                type="radio"
                name="product-size"
                value={variation.id}
                checked={selectedVariationId === variation.id}
                disabled={!variation.available}
                onChange={() => onVariationChange(variation.id)}
                className="peer sr-only"
              />
              <span className="block rounded-full border border-luxury-accent px-5 py-2 text-xs transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-45 lg:text-sm">
                {variation.name}
                {surcharge > 0
                  ? ` +${formatSurcharge(variation, baseAmount)}`
                  : ""}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function DrinkOptions({
  variations,
  modifierLists,
  currency,
  selectedVariationId,
  onVariationChange,
  value,
  onChange,
}: {
  variations: DrinkVariation[];
  modifierLists: ModifierList[];
  currency: string;
  selectedVariationId: string;
  onVariationChange: (variationId: string) => void;
  value: DrinkSelection;
  onChange: (value: DrinkSelection) => void;
}) {
  return (
    <div className="mt-6 space-y-3 font-signika">
      {variations.length > 1 ? (
        <VariationOptions
          variations={variations}
          selectedVariationId={selectedVariationId}
          onVariationChange={onVariationChange}
        />
      ) : null}
      {modifierLists.map((list) => (
        <ModifierOptions
          key={list.id}
          list={list}
          currency={currency}
          selectedModifierIds={value.modifierIdsByList[list.id] ?? []}
          onChange={(modifierIds) =>
            onChange({
              ...value,
              modifierIdsByList: {
                ...value.modifierIdsByList,
                [list.id]: modifierIds,
              },
            })
          }
        />
      ))}
    </div>
  );
}
