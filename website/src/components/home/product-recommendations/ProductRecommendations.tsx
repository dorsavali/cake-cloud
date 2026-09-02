"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductCard } from "./ProductCard";
import type { RecommendedProduct } from "./data";

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
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) throw new Error("Products request failed");

        const data = (await response.json()) as ProductsResponse;
        setProducts(
          (data.items ?? []).map((item) => ({
            ...item,
            image: item.image ?? "/images/homeCakes/1.png",
            imageAlt: item.name,
            href: `/menu#${item.id}`,
          })),
        );
        setError(false);
      } catch {
        setError(true);
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
      className="hidden overflow-hidden py-7 lg:block"
    >
      <div className="mx-auto w-full max-w-[1100px] px-4 lg:px-8">
        <div className="flex items-center justify-between">
          <h2
            id="recommendations-heading"
            className="font-kalnia text-[24px] font-medium leading-8 text-accent-dark"
          >
            Today&apos;s Recommends
          </h2>
          <Link
            href="/menu"
            prefetch={false}
            className="font-signika text-base font-medium text-accent-dark transition-colors [&:hover]:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
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

        <div className="mt-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex w-max gap-4">
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
