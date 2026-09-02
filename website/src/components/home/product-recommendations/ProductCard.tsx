import Image from "next/image";
import Link from "next/link";

import type { RecommendedProduct } from "./data";

type ProductCardProps = {
  product: RecommendedProduct;
};

function formatPrice({ amount, currency }: RecommendedProduct["price"]) {
  return `${(amount / 100).toFixed(2)} ${currency}`;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={product.href}
      prefetch={false}
      className="group/product block w-[168px] shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:w-[260px]"
    >
      <div className="relative aspect-[334/280] overflow-hidden rounded-lg border border-luxury-accent bg-accent">
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          sizes="(min-width: 1024px) 260px, 168px"
          unoptimized
          className="object-contain p-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/product:scale-[1.035] lg:object-cover lg:p-0"
        />
      </div>

      <div className="mt-1.5 rounded-lg border border-luxury-accent bg-accent/35 px-2.5 py-2 font-signika text-accent-dark transition-colors duration-200 group-hover/product:border-primary group-hover/product:bg-accent/70">
        <h3 className="text-base font-medium leading-5">{product.name}</h3>
        <p className="mt-0.5 text-xs font-semibold leading-4">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}
