import Link from "next/link";

import { ProductCard } from "./ProductCard";
import { recommendedProducts } from "./data";

export function ProductRecommendations() {
  return (
    <section
      dir="ltr"
      aria-labelledby="recommendations-heading"
      className="hidden overflow-hidden bg-accent bg-[url('/images/pattern/background.webp')] bg-cover bg-center py-7 lg:block"
    >
      <div className="mx-auto w-full max-w-[1148px] px-4">
        <div className="flex items-center justify-between">
          <h2
            id="recommendations-heading"
            className="font-kalnia text-[32px] font-semibold leading-10 text-accent-dark"
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

        <div className="mt-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex w-max gap-6">
            {recommendedProducts.map((product) => (
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
