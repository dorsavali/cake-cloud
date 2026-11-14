import { Suspense } from "react";

import {
  ProductDetail,
  ProductDetailLoading,
} from "@/components/daily-menu/product-detail";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export default function ProductPage() {
  return (
    <div className="relative min-h-screen bg-accent">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-accent bg-[url('/images/pattern/background.webp')] bg-cover bg-center bg-no-repeat"
      />
      <div className="relative z-10 min-h-screen">
        <DesktopHeader />
        <MobileHeader />
        <main className="-mt-16 min-h-screen overflow-x-clip pb-20 pt-16">
          <Suspense fallback={<ProductDetailLoading />}>
            <ProductDetail />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
