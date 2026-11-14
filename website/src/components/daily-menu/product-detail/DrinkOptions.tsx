import { useEffect, useRef, useState } from "react";

import type { DailyMenuProduct } from "../types";
import styles from "./DrinkOptions.module.css";

export const drinkChoices = {
  temperature: ["Hot", "Cold"],
} as const;

export type DrinkSelection = {
  temperature: string;
  modifierIdsByList: Record<string, string>;
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

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 8" className="h-2 w-3">
      <path
        d="m1 1.25 5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ModifierDropdown({
  list,
  optional,
  selectedModifierId,
  optionLabel,
  onChange,
  onOpenChange,
}: {
  list: ModifierList;
  optional: boolean;
  selectedModifierId: string;
  optionLabel: (modifier: ModifierList["modifiers"][number]) => string;
  onChange: (modifierId: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedModifier = list.modifiers.find(
    (modifier) => modifier.id === selectedModifierId,
  );
  const selectedLabel = selectedModifier
    ? optionLabel(selectedModifier)
    : optional
      ? "None"
      : `Choose ${list.name}`;

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
        onOpenChange(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        onOpenChange(false);
      }
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onOpenChange, open]);

  const options = [
    ...(optional ? [{ id: "", label: "None" }] : []),
    ...list.modifiers.map((modifier) => ({
      id: modifier.id,
      label: optionLabel(modifier),
    })),
  ];

  const toggleDropdown = () => {
    if (open) {
      setOpen(false);
      onOpenChange(false);
      return;
    }

    setOpen(true);
    onOpenChange(true);
    window.requestAnimationFrame(() => {
      if (menuRef.current) menuRef.current.scrollTop = 0;
      window.requestAnimationFrame(() => {
        const rect = triggerRef.current?.getBoundingClientRect();
        const menuHeight = Math.min(300, menuRef.current?.scrollHeight ?? 300);
        if (!rect) return;
        const overflow = rect.bottom + 8 + menuHeight - (window.innerHeight - 84);
        if (overflow > 0) {
          window.scrollBy({ top: overflow + 12, behavior: "smooth" });
        }
      });
    });
  };

  return (
    <div ref={dropdownRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggleDropdown}
        className={`${styles.trigger} flex min-h-11 w-full min-w-0 items-center justify-between rounded-lg border border-luxury-accent/35 bg-[#f4f0e8] px-4 py-2.5 text-left text-sm text-accent-dark outline-none focus-visible:ring-2 focus-visible:ring-primary/20 lg:text-base`}
      >
        <span className="truncate">{selectedLabel}</span>
        <span
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""} ml-4 shrink-0`}
        >
          <ChevronIcon />
        </span>
      </button>
      <div
        ref={menuRef}
        role="listbox"
        aria-label={list.name}
        className={`${styles.menu} ${open ? styles.menuOpen : ""}`}
      >
        {options.map((option) => {
          const selected = option.id === selectedModifierId;
          return (
            <button
              key={option.id || "none"}
              type="button"
              role="option"
              aria-selected={selected}
              className={`${styles.option} ${selected ? styles.selected : ""}`}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
                onOpenChange(false);
              }}
            >
              <span aria-hidden="true" className="w-5 shrink-0 text-primary">
                {selected ? "✓" : ""}
              </span>
              <span className="min-w-0 flex-1 text-left">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModifierOptions({
  list,
  currency,
  selectedModifierId,
  onChange,
  onOpenChange,
}: {
  list: ModifierList;
  currency: string;
  selectedModifierId: string;
  onChange: (modifierId: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const optional = list.minSelected === 0;
  const labelClassName =
    "mb-2.5 block text-[11px] uppercase tracking-[0.16em] text-accent-dark/55";
  const optionLabel = (modifier: ModifierList["modifiers"][number]) =>
    `${modifier.name}${
      modifier.price > 0
        ? ` +${formatModifierPrice(modifier.price, currency)}`
        : ""
    }`;

  if (list.modifiers.length > 3) {
    return (
      <div className="block">
        <span className={labelClassName}>
          {list.name}
          {!optional ? <span className="text-[#b05249]"> · Required</span> : null}
        </span>
        <ModifierDropdown
          list={list}
          optional={optional}
          selectedModifierId={selectedModifierId}
          optionLabel={optionLabel}
          onChange={onChange}
          onOpenChange={onOpenChange}
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
        {optional ? (
          <label className="cursor-pointer">
            <input
              type="radio"
              name={`modifier-${list.id}`}
              value=""
              checked={!selectedModifierId}
              onChange={() => onChange("")}
              className="peer sr-only"
            />
            <span className="block rounded-full border border-luxury-accent px-5 py-2 text-xs transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary lg:text-sm">
              None
            </span>
          </label>
        ) : null}
        {list.modifiers.map((modifier) => (
          <label key={modifier.id} className="cursor-pointer">
            <input
              type="radio"
              name={`modifier-${list.id}`}
              value={modifier.id}
              checked={selectedModifierId === modifier.id}
              onChange={() => onChange(modifier.id)}
              className="peer sr-only"
            />
            <span className="block rounded-full border border-luxury-accent px-5 py-2 text-xs transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary lg:text-sm">
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
  onMenuOpenChange,
}: {
  variations: DrinkVariation[];
  modifierLists: ModifierList[];
  currency: string;
  selectedVariationId: string;
  onVariationChange: (variationId: string) => void;
  value: DrinkSelection;
  onChange: (value: DrinkSelection) => void;
  onMenuOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="mt-6 space-y-3 font-signika">
      <VariationOptions
        variations={variations}
        selectedVariationId={selectedVariationId}
        onVariationChange={onVariationChange}
      />
      {modifierLists.map((list) => (
        <ModifierOptions
          key={list.id}
          list={list}
          currency={currency}
          selectedModifierId={value.modifierIdsByList[list.id] ?? ""}
          onOpenChange={onMenuOpenChange}
          onChange={(modifierId) =>
            onChange({
              ...value,
              modifierIdsByList: {
                ...value.modifierIdsByList,
                [list.id]: modifierId,
              },
            })
          }
        />
      ))}
    </div>
  );
}
