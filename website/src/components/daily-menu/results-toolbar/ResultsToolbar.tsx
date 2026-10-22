"use client";

import { useEffect, useRef, useState } from "react";

import { formatAllergenLabel, type AllergenOption } from "../allergens";
import styles from "./ResultsToolbar.module.css";

const sortOptions = [
  "Most Popular",
  "Price: Low to High",
  "Price: High to Low",
  "A–Z",
] as const;

export type SortOption = (typeof sortOptions)[number];

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

function CountBadge({ count }: { count: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary font-signika text-[11px] font-medium leading-none text-accent shadow-[0_1px_4px_rgb(70_66_72/18%)]"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

type ResultsToolbarProps = {
  resultCount: number;
  sortBy: SortOption;
  onSortChange: (sortBy: SortOption) => void;
  allergenOptions: AllergenOption[];
  selectedAllergens: string[];
  onAllergensChange: (allergens: string[]) => void;
};

export function ResultsToolbar({
  resultCount,
  sortBy,
  onSortChange,
  allergenOptions,
  selectedAllergens,
  onAllergensChange,
}: ResultsToolbarProps) {
  const [openMenu, setOpenMenu] = useState<"sort" | "allergens" | null>(null);
  const [menuMaxHeight, setMenuMaxHeight] = useState<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const allergensButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const closeDropdown = (event: PointerEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("pointerdown", closeDropdown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeDropdown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const allergenLabel =
    selectedAllergens.length === 0
      ? "All"
      : selectedAllergens.length === 1
        ? formatAllergenLabel(selectedAllergens[0])
        : `${selectedAllergens.length} selected`;
  const hasAllergenOptions = allergenOptions.length > 0;

  const toggleAllergens = () => {
    if (openMenu === "allergens") {
      setOpenMenu(null);
      return;
    }

    const rect = allergensButtonRef.current?.getBoundingClientRect();
    if (rect) {
      // Keep the panel inside the viewport instead of ending below the fold.
      setMenuMaxHeight(Math.max(180, window.innerHeight - rect.bottom - 24));
    }
    setOpenMenu("allergens");
  };

  return (
    <div
      dir="ltr"
      ref={toolbarRef}
      className="flex flex-col gap-3 font-signika text-accent-dark sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <p className="self-start text-sm text-accent-dark/65 sm:text-base">
        {resultCount} {resultCount === 1 ? "result" : "results"}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-3">
        <div className="relative min-w-0 sm:w-[207px] sm:shrink-0">
          <button
            ref={allergensButtonRef}
            type="button"
            disabled={!hasAllergenOptions}
            aria-expanded={openMenu === "allergens"}
            onClick={toggleAllergens}
            className={`${styles.trigger} relative flex h-11 w-full min-w-0 items-center justify-between rounded-full border border-luxury-accent/45 bg-accent/20 px-3 text-sm sm:px-5 sm:text-base disabled:cursor-not-allowed disabled:opacity-55`}
          >
            <span className="min-w-0 truncate whitespace-nowrap">
              <span className="mr-2 text-accent-dark/55">Allergens:</span>
              {allergenLabel}
            </span>
            <span
              className={`${styles.chevron} ${openMenu === "allergens" ? styles.chevronOpen : ""}`}
            >
              <ChevronIcon />
            </span>
            {selectedAllergens.length > 0 && (
              <CountBadge count={selectedAllergens.length} />
            )}
          </button>

          <div
            style={menuMaxHeight ? { maxHeight: menuMaxHeight } : undefined}
            className={`${styles.menu} ${styles.menuLeft} ${styles.menuScroll} ${
              openMenu === "allergens" ? styles.menuOpen : ""
            }`}
          >
            <p className="px-5 pb-2 pt-4 text-xs font-medium uppercase tracking-[0.08em] text-luxury-accent">
              {hasAllergenOptions
                ? "Show products free from:"
                : "No allergens recorded yet"}
            </p>
            {allergenOptions.map((option) => {
              const selected = selectedAllergens.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={selected}
                  className={`${styles.option} ${selected ? styles.selected : ""}`}
                  onClick={() =>
                    onAllergensChange(
                      selected
                        ? selectedAllergens.filter(
                            (value) => value !== option.value,
                          )
                        : [...selectedAllergens, option.value],
                    )
                  }
                >
                  <span aria-hidden="true" className="w-5 text-primary">
                    {selected ? "✓" : ""}
                  </span>
                  <span className="flex-1 text-left">
                    {formatAllergenLabel(option.value)}
                  </span>
                  <span aria-hidden="true" className="text-xs text-accent-dark/45">
                    {option.count}
                  </span>
                </button>
              );
            })}
            {selectedAllergens.length > 0 && (
              <button
                type="button"
                className={`${styles.option} text-accent-dark/65`}
                onClick={() => onAllergensChange([])}
              >
                <span aria-hidden="true" className="w-5" />
                Clear allergens
              </button>
            )}
          </div>
        </div>

        <div className="relative min-w-0 sm:w-[207px] sm:shrink-0">
          <button
            type="button"
            aria-expanded={openMenu === "sort"}
            onClick={() =>
              setOpenMenu((current) => (current === "sort" ? null : "sort"))
            }
            className={`${styles.trigger} flex h-11 w-full min-w-0 items-center justify-between rounded-full border border-luxury-accent/45 bg-accent/20 px-3 text-sm sm:px-5 sm:text-base`}
          >
            <span className="min-w-0 truncate whitespace-nowrap">
              <span className="mr-2 text-accent-dark/55">Sort:</span>
              {sortBy}
            </span>
            <span
              className={`${styles.chevron} ${openMenu === "sort" ? styles.chevronOpen : ""}`}
            >
              <ChevronIcon />
            </span>
          </button>

          <div
            className={`${styles.menu} ${openMenu === "sort" ? styles.menuOpen : ""}`}
          >
            {sortOptions.map((option) => {
              const selected = option === sortBy;
              return (
                <button
                  key={option}
                  type="button"
                  className={`${styles.option} ${selected ? styles.selected : ""}`}
                  onClick={() => {
                    onSortChange(option);
                    setOpenMenu(null);
                  }}
                >
                  <span aria-hidden="true" className="w-5 text-primary">
                    {selected ? "✓" : ""}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
