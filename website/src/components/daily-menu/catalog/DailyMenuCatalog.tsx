"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiUrl } from "@/lib/api";

import type { AllergenOption } from "../allergens";
import { CategoryTabs, type DailyMenuCategory } from "../category-tabs";
import { Pagination } from "../pagination";
import { ProductGrid } from "../product-grid";
import { ResultsToolbar, type SortOption } from "../results-toolbar";
import type { DailyMenuProductCard } from "../types";

const categoryNames: Record<DailyMenuCategory, string> = {
  "cakes-and-pastries": "Cakes & Pastries",
  drinks: "Drinks",
  "whole-cakes": "Whole Cakes",
  packages: "Packages",
  "pet-treats": "Pet Treats",
};

const sortValues: Record<SortOption, string> = {
  "Most Popular": "popular",
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

export function DailyMenuCatalog() {
  const [activeCategory, setActiveCategory] =
    useState<DailyMenuCategory>("cakes-and-pastries");
  const [products, setProducts] = useState<DailyMenuProductCard[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [allergenOptions, setAllergenOptions] = useState<AllergenOption[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("Most Popular");
  const [loadState, setLoadState] =
    useState<"loading" | "success" | "error">("loading");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const productsStartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updatePageSize = () => setPageSize(mediaQuery.matches ? 6 : 12);

    updatePageSize();
    mediaQuery.addEventListener("change", updatePageSize);
    return () => mediaQuery.removeEventListener("change", updatePageSize);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    const loadProducts = async () => {
      setLoadState("loading");
      const params = new URLSearchParams({
        view: "cards",
        category: categoryNames[activeCategory],
        sort: sortValues[sortBy],
        page: String(currentPage),
        limit: String(pageSize),
      });
      allergens.forEach((value) => params.append("allergen", value));

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
        setAllergenOptions(data.allergenOptions ?? []);
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
  }, [activeCategory, allergens, currentPage, pageSize, sortBy]);

  const handleCategoryChange = (category: DailyMenuCategory) => {
    setCurrentPage(1);
    setActiveCategory(category);
    setAllergens([]);
    setSortBy("Most Popular");
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
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />
      <div className="mx-auto w-full max-w-[1476px] px-4  pt-4 lg:pt-8 md:px-8">
        <ResultsToolbar
          resultCount={totalResults}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          allergenOptions={allergenOptions}
          selectedAllergens={allergens}
          onAllergensChange={handleAllergensChange}
        />
        <div ref={productsStartRef} className="mt-5 scroll-mt-24">
          {loadState === "loading" ? (
            <p className="py-20 text-center font-signika text-base text-accent-dark/65">
              Loading products...
            </p>
          ) : loadState === "error" ? (
            <p className="py-20 text-center font-signika text-base text-accent-dark">
              Products are temporarily unavailable.
            </p>
          ) : (
            <>
              <ProductGrid products={products} />
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
