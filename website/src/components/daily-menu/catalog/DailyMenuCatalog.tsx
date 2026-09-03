"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiUrl } from "@/lib/api";

import { CategoryTabs, type DailyMenuCategory } from "../category-tabs";
import { FilterSidebar, type MenuFilters } from "../filter-sidebar";
import { Pagination } from "../pagination";
import { ProductGrid } from "../product-grid";
import { ResultsToolbar, type SortOption } from "../results-toolbar";
import type { DailyMenuProductCard } from "../types";
import styles from "./DailyMenuCatalog.module.css";

const categoryNames: Record<DailyMenuCategory, string> = {
  "cakes-and-pastries": "Cakes & Pastries",
  drinks: "Drinks",
  packages: "Packages",
  "pet-treats": "Pet Treats",
};

const defaultFilters: MenuFilters = {
  productType: "All Types",
  dietary: [],
  allergens: [],
  minPrice: 0,
  maxPrice: Number.POSITIVE_INFINITY,
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
  maxAvailablePrice?: number;
};

export function DailyMenuCatalog() {
  const [activeCategory, setActiveCategory] =
    useState<DailyMenuCategory>("cakes-and-pastries");
  const [products, setProducts] = useState<DailyMenuProductCard[]>([]);
  const [filters, setFilters] = useState<MenuFilters>(defaultFilters);
  const [sortBy, setSortBy] = useState<SortOption>("Most Popular");
  const [loadState, setLoadState] =
    useState<"loading" | "success" | "error">("loading");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [maxAvailablePrice, setMaxAvailablePrice] = useState(20);
  const productsStartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updatePageSize = () => setPageSize(mediaQuery.matches ? 6 : 9);

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
        productType: filters.productType,
        minPrice: String(filters.minPrice),
        maxPrice: Number.isFinite(filters.maxPrice)
          ? String(filters.maxPrice)
          : String(Number.MAX_SAFE_INTEGER),
        sort: sortValues[sortBy],
        page: String(currentPage),
        limit: String(pageSize),
      });
      filters.dietary.forEach((value) => params.append("dietary", value));
      filters.allergens.forEach((value) => params.append("allergen", value));

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
        setMaxAvailablePrice(data.maxAvailablePrice ?? 20);
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
  }, [activeCategory, currentPage, filters, pageSize, sortBy]);

  const handleCategoryChange = (category: DailyMenuCategory) => {
    setCurrentPage(1);
    setActiveCategory(category);
    setFilters(defaultFilters);
    setSortBy("Most Popular");
  };

  const handleFiltersChange = useCallback((nextFilters: MenuFilters) => {
    setCurrentPage(1);
    setFilters(nextFilters);
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
      <div className={`${styles.layout} mx-auto w-full max-w-[1476px] gap-y-3 px-4 pt-8 md:px-8 lg:gap-y-0`}>
        <div className={styles.filters}>
          <FilterSidebar
            key={`filters-${activeCategory}-${maxAvailablePrice}`}
            category={activeCategory}
            maxAvailablePrice={maxAvailablePrice}
            onFiltersChange={handleFiltersChange}
          />
        </div>
        <div className={styles.toolbar}>
          <ResultsToolbar
            resultCount={totalResults}
            sortBy={sortBy}
            onSortChange={handleSortChange}
          />
        </div>
        <div className={styles.products}>
          <div ref={productsStartRef} className="scroll-mt-24 lg:mt-5">
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
      </div>
    </>
  );
}
