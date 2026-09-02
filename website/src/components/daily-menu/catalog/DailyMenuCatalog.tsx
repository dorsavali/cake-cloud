"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiUrl } from "@/lib/api";

import {
  CategoryTabs,
  type DailyMenuCategory,
} from "../category-tabs";
import {
  FilterSidebar,
  type MenuFilters,
} from "../filter-sidebar";
import { ProductGrid } from "../product-grid";
import { Pagination } from "../pagination";
import {
  ResultsToolbar,
  type SortOption,
} from "../results-toolbar";
import type { DailyMenuProduct } from "../types";
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

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

export function DailyMenuCatalog() {
  const [activeCategory, setActiveCategory] =
    useState<DailyMenuCategory>("cakes-and-pastries");
  const [products, setProducts] = useState<DailyMenuProduct[]>([]);
  const [filters, setFilters] = useState<MenuFilters>(defaultFilters);
  const [sortBy, setSortBy] = useState<SortOption>("Most Popular");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
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

    const loadProducts = async () => {
      try {
        const response = await fetch(apiUrl("/api/products"), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Products request failed");
        const data = (await response.json()) as {
          items?: DailyMenuProduct[];
        };
        setProducts(data.items ?? []);
        setError(false);
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    void loadProducts();
    return () => controller.abort();
  }, []);

  const handleCategoryChange = (category: DailyMenuCategory) => {
    setActiveCategory(category);
    setFilters(defaultFilters);
    setSortBy("Most Popular");
  };

  const handleFiltersChange = useCallback((nextFilters: MenuFilters) => {
    setFilters(nextFilters);
  }, []);

  const categoryProducts = useMemo(() => {
    const mainCategory = normalize(categoryNames[activeCategory]);
    return products.filter((product) =>
      product.categories.map(normalize).includes(mainCategory),
    );
  }, [activeCategory, products]);

  const maxAvailablePrice = useMemo(
    () =>
      categoryProducts.reduce(
        (highest, product) =>
          Math.max(highest, product.price.amount / 100),
        20,
      ),
    [categoryProducts],
  );

  const visibleProducts = useMemo(() => {
    const isAllProductTypes = normalize(filters.productType).startsWith("all ");

    const filtered = categoryProducts.filter((product) => {
      const categories = product.categories.map(normalize);
      const dietary = product.dietaryPreferences.map(normalize);
      const allergens = product.allergens.map(normalize);
      const price = product.price.amount / 100;

      return (
        (isAllProductTypes ||
          categories.includes(normalize(filters.productType))) &&
        filters.dietary.every((value) => dietary.includes(normalize(value))) &&
        filters.allergens.every(
          (value) => !allergens.includes(normalize(value)),
        ) &&
        price >= filters.minPrice &&
        price <= filters.maxPrice
      );
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === "Price: Low to High") {
        return left.price.amount - right.price.amount;
      }
      if (sortBy === "Price: High to Low") {
        return right.price.amount - left.price.amount;
      }
      if (sortBy === "A–Z") {
        return left.name.localeCompare(right.name);
      }
      return right.popularityScore - left.popularityScore;
    });
  }, [categoryProducts, filters, sortBy]);

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / pageSize));
  const paginatedProducts = useMemo(
    () => visibleProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, pageSize, visibleProducts],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, filters, pageSize, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

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
            resultCount={visibleProducts.length}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>
        <div className={styles.products}>
          <div ref={productsStartRef} className="scroll-mt-24 lg:mt-5">
            {isLoading ? (
              <p className="py-20 text-center font-signika text-base text-accent-dark/65">
                Loading products...
              </p>
            ) : error ? (
              <p className="py-20 text-center font-signika text-base text-accent-dark">
                Products are temporarily unavailable.
              </p>
            ) : (
              <>
                <ProductGrid products={paginatedProducts} />
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
