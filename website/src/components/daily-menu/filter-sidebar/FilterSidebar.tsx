"use client";

import { useEffect, useRef, useState } from "react";

import type { DailyMenuCategory } from "../category-tabs";
import styles from "./FilterSidebar.module.css";

const filterOptions: Record<
  DailyMenuCategory,
  { typeLabel: string; productTypes: string[]; dietary: string[]; allergens: string[] }
> = {
  "cakes-and-pastries": {
    typeLabel: "Product Type",
    productTypes: ["All Types", "Pastries", "Breakfast", "Cakes", "Desserts"],
    dietary: ["Vegetarian", "Gluten-Free", "Vegan", "Dairy-Free"],
    allergens: ["Wheat", "Milk", "Eggs", "Nuts", "Almonds"],
  },
  drinks: {
    typeLabel: "Drink Type",
    productTypes: ["All Drinks", "Coffee", "Tea", "Cold Drinks", "Soft Drinks"],
    dietary: ["Vegan", "Dairy-Free", "Sugar-Free"],
    allergens: ["Milk", "Nuts", "Almonds"],
  },
  packages: {
    typeLabel: "Package Type",
    productTypes: ["All Packages", "Gift Boxes", "Party Packages", "Bundles"],
    dietary: ["Vegetarian", "Gluten-Free", "Vegan", "Dairy-Free"],
    allergens: ["Wheat", "Milk", "Eggs", "Nuts", "Almonds"],
  },
  "pet-treats": {
    typeLabel: "Treat Type",
    productTypes: ["All Treats", "Cakes", "Biscuits", "Celebration Treats"],
    dietary: ["Grain-Free", "Dairy-Free", "No Added Sugar"],
    allergens: ["Wheat", "Milk", "Eggs", "Nuts"],
  },
};

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 8" className="h-2 w-3 shrink-0">
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

export type MenuFilters = {
  productType: string;
  dietary: string[];
  allergens: string[];
  minPrice: number;
  maxPrice: number;
};

type FilterSidebarProps = {
  category: DailyMenuCategory;
  maxAvailablePrice: number;
  onFiltersChange: (filters: MenuFilters) => void;
};

export function FilterSidebar({
  category,
  maxAvailablePrice,
  onFiltersChange,
}: FilterSidebarProps) {
  const options = filterOptions[category];
  const priceCeiling = Math.max(20, Math.ceil(maxAvailablePrice));
  const [isProductTypeOpen, setIsProductTypeOpen] = useState(false);
  const [isAllergensOpen, setIsAllergensOpen] = useState(false);
  const [productType, setProductType] = useState(options.productTypes[0]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(priceCeiling);
  const productTypeDropdownRef = useRef<HTMLDivElement>(null);
  const allergensDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeDropdowns = (event: PointerEvent) => {
      const target = event.target as Node;

      if (!productTypeDropdownRef.current?.contains(target)) {
        setIsProductTypeOpen(false);
      }
      if (!allergensDropdownRef.current?.contains(target)) {
        setIsAllergensOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProductTypeOpen(false);
        setIsAllergensOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeDropdowns);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeDropdowns);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    onFiltersChange({
      productType,
      dietary,
      allergens,
      minPrice,
      maxPrice,
    });
  }, [
    allergens,
    dietary,
    maxPrice,
    minPrice,
    onFiltersChange,
    productType,
  ]);

  const toggleValue = (
    value: string,
    values: string[],
    setValues: (next: string[]) => void,
  ) => {
    setValues(
      values.includes(value)
        ? values.filter((current) => current !== value)
        : [...values, value],
    );
  };

  const clearFilters = () => {
    setProductType(options.productTypes[0]);
    setDietary([]);
    setAllergens([]);
    setMinPrice(0);
    setMaxPrice(priceCeiling);
  };

  return (
    <aside dir="ltr" aria-label="Filter daily menu" className="contents font-signika text-accent-dark lg:block lg:w-[276px] lg:shrink-0">
      <div className="hidden lg:block lg:w-auto">
        <p className={`${styles.label} hidden lg:block`}>{options.typeLabel}</p>
        <div ref={productTypeDropdownRef} className={`${styles.dropdown} mt-0 lg:mt-3`}>
          <button
            type="button"
            aria-expanded={isProductTypeOpen}
            className={styles.summary}
            onClick={() => {
              setIsAllergensOpen(false);
              setIsProductTypeOpen((current) => !current);
            }}
          >
            <span>
              <span className="lg:hidden">
                {productType === options.productTypes[0] ? "Type" : productType}
              </span>
              <span className="hidden lg:inline">{productType}</span>
            </span>
            <span className={`${styles.chevron} ${isProductTypeOpen ? styles.chevronOpen : ""}`}>
              <ChevronIcon />
            </span>
          </button>
          <div className={`${styles.menuShell} ${isProductTypeOpen ? styles.menuShellOpen : ""}`}>
            <div className={styles.menu}>
              {options.productTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`${styles.option} ${productType === type ? styles.selectedOption : ""}`}
                  onClick={() => {
                    setProductType(type);
                    setIsProductTypeOpen(false);
                  }}
                >
                  <span aria-hidden="true" className={styles.checkmark}>
                    {productType === type ? "✓" : ""}
                  </span>
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <fieldset className="[grid-area:dietary] w-full min-w-0 overflow-hidden lg:mt-8 lg:block lg:overflow-visible">
        <legend className={`${styles.label} hidden lg:block`}>Dietary</legend>
        <div className={`${styles.mobileFilterScroller} flex flex-nowrap gap-2 overflow-x-auto lg:mt-3 lg:block lg:space-y-2 lg:overflow-visible`}>
          {options.dietary.map((option) => {
            const checked = dietary.includes(option);
            return (
              <label key={option} className={`${styles.filterRow} ${checked ? styles.checkedRow : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleValue(option, dietary, setDietary)}
                  className="sr-only"
                />
                <span className={`${styles.checkbox} ${checked ? styles.checkedBox : ""}`} aria-hidden="true">
                  {checked ? "✓" : ""}
                </span>
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="[grid-area:allergens] w-full min-w-0 lg:mt-8 lg:w-auto">
        <p className={`${styles.label} hidden lg:block`}>Free From</p>
        <div ref={allergensDropdownRef} className={`${styles.dropdown} ${styles.allergenDropdown} mt-0 lg:mt-3`}>
          <button
            type="button"
            aria-expanded={isAllergensOpen}
            className={styles.summary}
            onClick={() => {
              setIsProductTypeOpen(false);
              setIsAllergensOpen((current) => !current);
            }}
          >
            <span>{allergens.length ? `${allergens.length} selected` : "Select allergens"}</span>
            <span className={`${styles.chevron} ${isAllergensOpen ? styles.chevronOpen : ""}`}>
              <ChevronIcon />
            </span>
          </button>
          <div className={`${styles.menuShell} ${isAllergensOpen ? styles.menuShellOpen : ""}`}>
            <div className={`${styles.menu} px-5 py-5`}>
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.08em] text-luxury-accent">
                Show products free from:
              </p>
              <div className="space-y-3">
                {options.allergens.map((option) => {
                  const checked = allergens.includes(option);
                  return (
                    <label key={option} className="flex cursor-pointer items-center gap-3 py-1 text-base">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleValue(option, allergens, setAllergens)}
                        className="sr-only"
                      />
                      <span className={`${styles.allergenBox} ${checked ? styles.checkedBox : ""}`} aria-hidden="true">
                        {checked ? "✓" : ""}
                      </span>
                      {option}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <fieldset className="mt-8 hidden lg:block">
        <legend className={styles.label}>Price Range</legend>
        <div className={`${styles.rangeControl} mt-5`}>
          <div className={styles.rangeTrack} />
          <div
            className={styles.rangeFill}
            style={{
              left: `${(minPrice / priceCeiling) * 100}%`,
              right: `${100 - (maxPrice / priceCeiling) * 100}%`,
            }}
          />
          <input
            aria-label="Minimum price"
            type="range"
            min="0"
            max={priceCeiling}
            value={minPrice}
            onChange={(event) => setMinPrice(Math.min(Number(event.target.value), maxPrice - 1))}
            className={styles.rangeInput}
          />
          <input
            aria-label="Maximum price"
            type="range"
            min="0"
            max={priceCeiling}
            value={maxPrice}
            onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), minPrice + 1))}
            className={styles.rangeInput}
          />
        </div>
        <div className="mt-3 flex justify-between px-3 text-sm text-accent-dark/65">
          <span>${minPrice}</span>
          <span>${maxPrice}</span>
        </div>
      </fieldset>

      <button
        type="button"
        onClick={clearFilters}
        className="[grid-area:clear] justify-self-end self-center px-2 text-[13px] text-accent-dark/65 underline decoration-accent-dark/35 underline-offset-4 transition-colors hover:text-primary lg:mt-9 lg:justify-self-auto lg:px-0 lg:text-sm"
      >
        Clear all filters
      </button>
    </aside>
  );
}
