"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiUrl } from "@/lib/api";

import { ProductCard } from "./ProductCard";
import { recommendedProducts, type RecommendedProduct } from "./data";

type ProductsResponse = {
  items?: Array<{
    id: string;
    name: string;
    price: { amount: number; currency: string };
    image: string | null;
    available: boolean;
  }>;
};

type RecommendationsState = "loading" | "ready" | "empty" | "error";

export function ProductRecommendations() {
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [state, setState] = useState<RecommendationsState>("loading");

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    const loadProducts = async (attempt = 0) => {
      let status: number | null = null;
      try {
        const response = await fetch(apiUrl("/api/recommendations"));
        status = response.status;
        if (!response.ok) throw new Error("Recommendations request failed");

        const data = (await response.json()) as ProductsResponse;
        const items = data.items ?? [];
        if (!Array.isArray(items)) {
          throw new Error("Invalid recommendations response");
        }
        if (cancelled) return;

        if (items.length === 0) {
          setProducts([]);
          setState("empty");
          return;
        }

        setProducts(
          items.map((item) => ({
            ...item,
            image: item.image,
            imageAlt: item.name,
            href: `/DailyMenu/Product?id=${encodeURIComponent(item.id)}`,
          })),
        );
        setState("ready");
      } catch (error) {
        if (cancelled) return;

        if (attempt === 0) {
          retryTimer = window.setTimeout(() => void loadProducts(1), 3_000);
          return;
        }

        if (process.env.NODE_ENV === "development") {
          console.warn("[recommendations] using fallback products", { status, error });
          setProducts(recommendedProducts);
          setState(recommendedProducts.length > 0 ? "ready" : "empty");
        } else {
          console.error("[recommendations] failed", { status, error });
          setState("error");
        }
      }
    };

    void loadProducts();
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, []);

  if (state === "empty") return null;

  return (
    <section
      dir="ltr"
      aria-labelledby="recommendations-heading"
      className="overflow-hidden py-5 lg:py-0 lg:pb-[35px]"
    >
      <div className="mx-auto w-full max-w-[1100px] px-4 lg:px-8">
        <div className="flex items-center justify-between">
          <h2
            id="recommendations-heading"
            className="font-kalnia text-[18px] font-medium leading-6 text-accent-dark lg:text-[24px] lg:leading-8"
          >
            Our Recommedations
          </h2>
          <Link
            href="/DailyMenu"
            prefetch={false}
            className="font-signika text-sm font-medium text-accent-dark transition-colors [&:hover]:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:text-base"
          >
            See All
          </Link>
        </div>

        {state === "error" && (
          <p className="mt-6 font-signika text-base text-accent-dark">
            Products are temporarily unavailable.
          </p>
        )}

        {state === "loading" && (
          <p className="mt-6 font-signika text-base text-accent-dark">
            Loading products...
          </p>
        )}

        {state === "ready" && (
          <div className="mt-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mt-4">
            <ul className="flex w-max gap-2.5 lg:grid lg:w-full lg:grid-cols-4 lg:gap-4">
              {products.slice(0, 4).map((product) => (
                <li key={product.id} className="lg:min-w-0">
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
