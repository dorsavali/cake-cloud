import Image from "next/image";
import Link from "next/link";

import type { DailyMenuProduct } from "../types";
import styles from "./ProductGrid.module.css";

function formatPrice(product: DailyMenuProduct) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: product.price.currency,
    minimumFractionDigits: 2,
  }).format(product.price.amount / 100);
}

export function ProductGrid({ products }: { products: DailyMenuProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-luxury-accent/20 bg-accent/20 px-6 text-center font-signika text-base text-accent-dark/65">
        No products match these filters.
      </div>
    );
  }

  return (
    <ul className="grid w-full min-w-0 grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-x-5 lg:gap-y-6">
      {products.map((product) => (
        <li key={product.id} id={product.id} className="min-w-0">
          <article className="relative min-w-0 overflow-hidden rounded-2xl border border-luxury-accent/25 bg-accent shadow-[0_3px_14px_rgb(70_66_72_/_6%)]">
            <Link
              href={`/DailyMenu/Product?id=${encodeURIComponent(product.id)}`}
              prefetch={false}
              aria-label={`View ${product.name}`}
              className="absolute inset-0 z-10 rounded-2xl"
            />
            <div className="relative aspect-[4/4.2] overflow-hidden bg-[#eee8dc]">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(min-width: 1024px) 30vw, 100vw"
                  unoptimized
                  className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.025]"
                />
              ) : (
                <div className="flex h-full items-center justify-center font-signika text-sm text-accent-dark/40">
                  No image
                </div>
              )}
            </div>

            <div className="min-h-[112px] px-3 py-3 font-signika text-accent-dark lg:px-4 lg:py-4">
              <h2 className="truncate text-base font-medium leading-6 lg:text-lg">
                {product.name}
              </h2>
              {(product.description || product.variationName) && (
                <p className="mt-1 truncate text-xs font-light text-accent-dark/60 lg:text-sm">
                  {product.description || product.variationName}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm text-accent-dark/65">
                  {formatPrice(product)}
                </span>
                <Link
                  href={`/DailyMenu/Product?id=${encodeURIComponent(product.id)}`}
                  prefetch={false}
                  className={`${styles.viewLink} relative z-20 inline-flex items-center gap-1 text-sm font-medium text-primary`}
                >
                  View <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
