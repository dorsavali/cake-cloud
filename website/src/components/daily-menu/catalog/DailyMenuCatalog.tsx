"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiUrl } from "@/lib/api";

import { formatAllergenLabel, type AllergenOption } from "../allergens";
import {
  buildDailyMenuCategories,
  CategoryTabs,
  type DailyMenuCategory,
  type DailyMenuCategoryOption,
} from "../category-tabs";
import { Pagination } from "../pagination";
import { ProductGrid } from "../product-grid";
import { ResultsToolbar, type SortOption } from "../results-toolbar";
import type { DailyMenuProductCard } from "../types";

const drinkTypeOptions = [
  { value: "hot drinks website", label: "Hot Drinks" },
  { value: "cold drinks website", label: "Cold Drinks" },
] as const;

const sortValues: Record<SortOption, string> = {
  Recommended: "recommended",
  "Price: Low to High": "price-asc",
  "Price: High to Low": "price-desc",
  "A–Z": "az",
};

type ProductsResponse = {
  items?: DailyMenuProductCard[];
  total?: number;
  totalPages?: number;
  allergenOptions?: AllergenOption[];
};

type CategoriesResponse = {
  categories?: string[];
};

export function DailyMenuCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const [categories, setCategories] = useState<DailyMenuCategoryOption[]>([]);
  const [activeCategory, setActiveCategory] = useState<DailyMenuCategory>("");
  const [categoryLoadState, setCategoryLoadState] =
    useState<"loading" | "success" | "error">("loading");
  const [products, setProducts] = useState<DailyMenuProductCard[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [allergenOptions, setAllergenOptions] = useState<AllergenOption[]>([]);
  const [productType, setProductType] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("Recommended");
  const [loadState, setLoadState] =
    useState<"loading" | "success" | "error">("loading");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const productsStartRef = useRef<HTMLDivElement>(null);
  const category =
    categories.find((item) => item.id === activeCategory);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    const loadCategories = async () => {
      try {
        const response = await fetch(apiUrl("/api/categories"), {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Categories request failed");
        const data = (await response.json()) as CategoriesResponse;
        if (!isActive) return;

        setCategories(buildDailyMenuCategories(data.categories ?? []));
        setCategoryLoadState("success");
      } catch (error) {
        if (isActive && (error as Error).name !== "AbortError") {
          setCategoryLoadState("error");
        }
      }
    };

    void loadCategories();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (categories.length === 0) {
      setActiveCategory("");
      return;
    }

    setActiveCategory((current) =>
      categories.find((item) => item.id === requestedCategory)?.id ??
      categories.find((item) => item.id === current)?.id ??
      categories[0].id,
    );
  }, [categories, requestedCategory]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updatePageSize = () => setPageSize(mediaQuery.matches ? 6 : 12);

    updatePageSize();
    mediaQuery.addEventListener("change", updatePageSize);
    return () => mediaQuery.removeEventListener("change", updatePageSize);
  }, []);

  useEffect(() => {
    if (!category) return;

    const controller = new AbortController();
    let isActive = true;

    const loadProducts = async () => {
      setLoadState("loading");
      const params = new URLSearchParams({
        view: "cards",
        category: category.squareName,
        sort: sortValues[sortBy],
        page: String(currentPage),
        limit: String(pageSize),
      });
      if (category.filter === "drink-types" && productType) {
        params.set("productType", productType);
      }
      if (category.filter === "allergens") {
        allergens.forEach((value) => params.append("allergen", value));
      }

      try {
        const response = await fetch(apiUrl(`/api/products?${params}`), {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Products request failed");
        const data = (await response.json()) as ProductsResponse;
        if (!isActive) return;

        setProducts(data.items ?? []);
        setTotalResults(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setAllergenOptions(
          category.filter === "allergens" ? (data.allergenOptions ?? []) : [],
        );
        setLoadState("success");
      } catch (error) {
        if (isActive && (error as Error).name !== "AbortError") {
          setLoadState("error");
        }
      }
    };

    void loadProducts();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [activeCategory, allergens, category, currentPage, pageSize, productType, sortBy]);

  const handleCategoryChange = (category: DailyMenuCategory) => {
    setCurrentPage(1);
    setActiveCategory(category);
    setAllergens([]);
    setProductType("");
    setSortBy("Recommended");
    router.replace(`/DailyMenu?category=${encodeURIComponent(category)}`, {
      scroll: false,
    });
  };

  const handleAllergensChange = useCallback((nextAllergens: string[]) => {
    setCurrentPage(1);
    setAllergens(nextAllergens);
  }, []);

  const handleSortChange = (nextSort: SortOption) => {
    setCurrentPage(1);
    setSortBy(nextSort);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    productsStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />
      <div className="mx-auto w-full max-w-[1476px] px-4  pt-4 lg:pt-8 md:px-8">
        <ResultsToolbar
          resultCount={totalResults}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          filter={
            category?.filter === "allergens"
              ? {
                  label: "Allergens",
                  heading: "Show products free from:",
                  emptyMessage: "No allergens recorded yet",
                  options: allergenOptions.map((option) => ({
                    ...option,
                    label: formatAllergenLabel(option.value),
                  })),
                  selectedValues: allergens,
                  onChange: handleAllergensChange,
                  multiple: true,
                }
              : category?.filter === "drink-types"
                ? {
                    label: "Drinks",
                    heading: "Choose a drink type:",
                    emptyMessage: "No drink types available",
                    options: [...drinkTypeOptions],
                    selectedValues: productType ? [productType] : [],
                    onChange: (values) => {
                      setCurrentPage(1);
                      setProductType(values[0] ?? "");
                    },
                  }
                : undefined
          }
        />
        <div ref={productsStartRef} className="mt-5 scroll-mt-24">
          {categoryLoadState === "loading" ||
          (categoryLoadState === "success" && category && loadState === "loading") ? (
            <p className="py-20 text-center font-signika text-base text-accent-dark/65">
              Loading products...
            </p>
          ) : categoryLoadState === "error" || loadState === "error" ? (
            <p className="py-20 text-center font-signika text-base text-accent-dark">
              Products are temporarily unavailable.
            </p>
          ) : categories.length === 0 ? (
            <p className="py-20 text-center font-signika text-base text-accent-dark/65">
              No Daily Menu products are available right now.
            </p>
          ) : (
            <>
              <ProductGrid
                products={products}
                returnCategory={activeCategory}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
