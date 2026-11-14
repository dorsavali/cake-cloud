"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./ResultsToolbar.module.css";

const sortOptions = [
  "Recommended",
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
  filter?: {
    label: string;
    heading: string;
    emptyMessage: string;
    options: Array<{ value: string; label: string; count?: number }>;
    selectedValues: string[];
    onChange: (values: string[]) => void;
    multiple?: boolean;
  };
};

export function ResultsToolbar({
  resultCount,
  sortBy,
  onSortChange,
  filter,
}: ResultsToolbarProps) {
  const [openMenu, setOpenMenu] = useState<"sort" | "filter" | null>(null);
  const [menuMaxHeight, setMenuMaxHeight] = useState<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

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

  const selectedValues = filter?.selectedValues ?? [];
  const selectedLabel =
    selectedValues.length === 0
      ? "All"
      : selectedValues.length === 1
        ? (filter?.options.find((option) => option.value === selectedValues[0])
            ?.label ?? selectedValues[0])
        : `${selectedValues.length} selected`;
  const hasFilterOptions = Boolean(filter?.options.length);

  const toggleFilter = () => {
    if (openMenu === "filter") {
      setOpenMenu(null);
      return;
    }

    const rect = filterButtonRef.current?.getBoundingClientRect();
    if (rect) {
      // Keep the panel inside the viewport instead of ending below the fold.
      setMenuMaxHeight(Math.max(180, window.innerHeight - rect.bottom - 24));
    }
    setOpenMenu("filter");
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

      <div className={`grid gap-3 sm:flex sm:items-center sm:gap-3 ${filter ? "grid-cols-2" : "grid-cols-1"}`}>
        {filter ? <div className="relative min-w-0 sm:w-[207px] sm:shrink-0">
          <button
            ref={filterButtonRef}
            type="button"
            disabled={!hasFilterOptions}
            aria-expanded={openMenu === "filter"}
            onClick={toggleFilter}
            className={`${styles.trigger} relative flex h-11 w-full min-w-0 items-center justify-between rounded-full border border-luxury-accent/45 bg-accent/20 px-3 text-sm sm:px-5 sm:text-base disabled:cursor-not-allowed disabled:opacity-55`}
          >
            <span className="min-w-0 truncate whitespace-nowrap">
              <span className="mr-2 text-accent-dark/55">{filter.label}:</span>
              {selectedLabel}
            </span>
            <span
              className={`${styles.chevron} ${openMenu === "filter" ? styles.chevronOpen : ""}`}
            >
              <ChevronIcon />
            </span>
            {selectedValues.length > 0 && (
              <CountBadge count={selectedValues.length} />
            )}
          </button>

          <div
            style={menuMaxHeight ? { maxHeight: menuMaxHeight } : undefined}
            className={`${styles.menu} ${styles.menuLeft} ${styles.menuScroll} ${
              openMenu === "filter" ? styles.menuOpen : ""
            }`}
          >
            <p className="px-5 pb-2 pt-4 text-xs font-medium uppercase tracking-[0.08em] text-luxury-accent">
              {hasFilterOptions ? filter.heading : filter.emptyMessage}
            </p>
            {filter.options.map((option) => {
              const selected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={selected}
                  className={`${styles.option} ${selected ? styles.selected : ""}`}
                  onClick={() => {
                    filter.onChange(
                      selected
                        ? selectedValues.filter((value) => value !== option.value)
                        : filter.multiple
                          ? [...selectedValues, option.value]
                          : [option.value],
                    );
                    if (!filter.multiple) setOpenMenu(null);
                  }}
                >
                  <span aria-hidden="true" className="w-5 text-primary">
                    {selected ? "✓" : ""}
                  </span>
                  <span className="flex-1 text-left">
                    {option.label}
                  </span>
                  {option.count !== undefined ? (
                    <span aria-hidden="true" className="text-xs text-accent-dark/45">
                      {option.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
            {selectedValues.length > 0 && (
              <button
                type="button"
                className={`${styles.option} text-accent-dark/65`}
                onClick={() => filter.onChange([])}
              >
                <span aria-hidden="true" className="w-5" />
                Clear {filter.label.toLowerCase()}
              </button>
            )}
          </div>
        </div> : null}

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
