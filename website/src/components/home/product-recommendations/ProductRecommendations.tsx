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
  }>;
};

export function ProductRecommendations() {
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch(apiUrl("/api/products"), {
          cache: "no-store",
        });
api        if (!response.ok) throw new Error("Products request failed");

        const data = (await response.json()) as ProductsResponse;
        setProducts(
          (data.items ?? []).map((item) => ({
            ...item,
            image: item.image ?? "/images/homeCakes/1.webp",
            imageAlt: item.name,
            href: `/menu#${item.id}`,
          })),
        );
        setError(false);
      } catch {
        if (process.env.NODE_ENV === "development") {
          setProducts(recommendedProducts);
          setError(false);
        } else {
          setError(true);
        }
      }
    };

    void loadProducts();
    const intervalId = window.setInterval(loadProducts, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section
      dir="ltr"
      aria-labelledby="recommendations-heading"
      className="overflow-hidden py-8 lg:py-7"
    >
      <div className="mx-auto w-full max-w-[1100px] px-4 lg:px-8">
        <div className="flex items-center justify-between">
          <h2
            id="recommendations-heading"
            className="font-kalnia text-[18px] font-medium leading-6 text-accent-dark lg:text-[24px] lg:leading-8"
          >
            Today&apos;s Recommends
          </h2>
          <Link
            href="/menu"
            prefetch={false}
            className="font-signika text-sm font-medium text-accent-dark transition-colors [&:hover]:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:text-base"
          >
            See All
          </Link>
        </div>

        {error && (
          <p className="mt-6 font-signika text-base text-accent-dark">
            Products are temporarily unavailable.
          </p>
        )}

        {!error && products.length === 0 && (
          <p className="mt-6 font-signika text-base text-accent-dark">
            Loading products...
          </p>
        )}

        <div className="mt-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mt-4">
          <ul className="flex w-max gap-2.5 lg:gap-4">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
