"use client";

import { useEffect, useRef, useState } from "react";

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

type ResultsToolbarProps = {
  resultCount: number;
  sortBy: SortOption;
  onSortChange: (sortBy: SortOption) => void;
};

export function ResultsToolbar({
  resultCount,
  sortBy,
  onSortChange,
}: ResultsToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeDropdown = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeDropdown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeDropdown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div dir="ltr" className="contents font-signika text-accent-dark lg:relative lg:flex lg:min-h-12 lg:w-full lg:min-w-0 lg:items-center lg:justify-between lg:gap-3">
      <p className="[grid-area:count] self-center pl-5 text-sm text-accent-dark/65 sm:text-base lg:pl-0">
        {resultCount} {resultCount === 1 ? "result" : "results"}
      </p>

      <div ref={dropdownRef} className="relative [grid-area:sort] w-full min-w-0 lg:w-[207px] lg:shrink-0">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          className={`${styles.trigger} flex h-11 w-full min-w-0 items-center justify-between rounded-full border border-luxury-accent/45 bg-accent/20 px-3 text-sm sm:px-5 sm:text-base`}
        >
          <span className="min-w-0 truncate whitespace-nowrap">
            <span className="mr-2 text-accent-dark/55">Sort:</span>
            {sortBy}
          </span>
          <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}>
            <ChevronIcon />
          </span>
        </button>

        <div className={`${styles.menu} ${isOpen ? styles.menuOpen : ""}`}>
          {sortOptions.map((option) => {
            const selected = option === sortBy;
            return (
              <button
                key={option}
                type="button"
                className={`${styles.option} ${selected ? styles.selected : ""}`}
                onClick={() => {
                  onSortChange(option);
                  setIsOpen(false);
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
  );
}
