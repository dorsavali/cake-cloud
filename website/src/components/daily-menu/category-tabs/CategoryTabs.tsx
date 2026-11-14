import styles from "./CategoryTabs.module.css";

export type DailyMenuCategory = string;

export type DailyMenuCategoryOption = {
  id: DailyMenuCategory;
  label: string;
  squareName: string;
  filter: "allergens" | "drink-types" | "none";
};

export const dailyMenuCategories: readonly DailyMenuCategoryOption[] = [
  { id: "single-portions", label: "Single Portions", squareName: "single portions website", filter: "allergens" },
  { id: "pastries", label: "Pastries", squareName: "pastries website", filter: "allergens" },
  { id: "whole-cakes", label: "Whole Cakes", squareName: "whole cakes website", filter: "allergens" },
  { id: "cookies", label: "Cookies", squareName: "cookies website", filter: "allergens" },
  { id: "drinks", label: "Drinks", squareName: "drinks website", filter: "drink-types" },
  { id: "pet-treats", label: "Pet Treats", squareName: "pet treats website", filter: "none" },
  { id: "todays-offer", label: "Today's Offer", squareName: "today's offer website", filter: "none" },
] as const;

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

const categoryId = (value: string) =>
  normalize(value.replace(/\s+website$/i, ""))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function buildDailyMenuCategories(
  squareCategories: string[],
): DailyMenuCategoryOption[] {
  const availableByName = new Map(
    squareCategories
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => [normalize(name), name]),
  );
  const knownNames = new Set(
    dailyMenuCategories.map((category) => normalize(category.squareName)),
  );
  const known = dailyMenuCategories.filter((category) =>
    availableByName.has(normalize(category.squareName)),
  );
  const usedIds = new Set(known.map((category) => category.id));
  const discovered = [...availableByName.entries()]
    .filter(([name]) => !knownNames.has(name) && name !== "daily menu")
    .flatMap(([, squareName]) => {
      const id = categoryId(squareName);
      if (!id || usedIds.has(id)) return [];
      usedIds.add(id);
      return [{
        id,
        label: squareName.replace(/\s+website$/i, "").trim(),
        squareName,
        filter: "none" as const,
      }];
    })
    .sort((left, right) => left.label.localeCompare(right.label));

  return [...known, ...discovered];
}

type CategoryTabsProps = {
  categories: readonly DailyMenuCategoryOption[];
  activeCategory: DailyMenuCategory;
  onCategoryChange: (category: DailyMenuCategory) => void;
};

export function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {

  return (
    <nav
      dir="ltr"
      aria-label="Fresh Bakes categories"
      className="mx-auto w-full max-w-[1476px] overflow-hidden px-4 pt-1 md:px-8"
    >
      <ul className={`${styles.scroller} flex flex-nowrap items-center gap-2 overflow-x-auto md:flex-wrap md:gap-3 md:overflow-visible`}>
        {categories.map((category) => {
          const isActive = category.id === activeCategory;

          return (
            <li key={category.id}>
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => onCategoryChange(category.id)}
                className={`${styles.tab} ${isActive ? styles.active : ""} inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3.5 font-signika text-xs font-medium leading-none md:h-12 md:px-6 md:text-base`}
              >
                {category.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
