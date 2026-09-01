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
      className="group/product block w-[334px] shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <div className="relative aspect-[334/280] overflow-hidden rounded-xl border border-luxury-accent bg-accent">
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          sizes="334px"
          unoptimized
          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/product:scale-[1.035]"
        />
      </div>

      <div className="mt-2.5 rounded-xl border border-luxury-accent bg-accent/35 px-3.5 py-3 font-signika text-accent-dark transition-colors duration-200 group-hover/product:border-primary group-hover/product:bg-accent/70">
        <h3 className="text-[28px] font-medium leading-8">{product.name}</h3>
        <p className="mt-1 text-base font-semibold leading-5">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}
