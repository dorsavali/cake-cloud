import styles from "./CategoryTabs.module.css";

const categories = [
  { id: "cakes-and-pastries", label: "Cakes & Pastries" },
  { id: "drinks", label: "Drinks" },
  { id: "pet-treats", label: "Pet Treats" },
  { id: "packages", label: "Packages" },
] as const;

export type DailyMenuCategory = (typeof categories)[number]["id"];

type CategoryTabsProps = {
  activeCategory: DailyMenuCategory;
  onCategoryChange: (category: DailyMenuCategory) => void;
};

export function CategoryTabs({
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {

  return (
    <nav
      dir="ltr"
      aria-label="Daily menu categories"
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
