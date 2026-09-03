import { Suspense } from "react";

import {
  ProductDetail,
  ProductDetailLoading,
} from "@/components/daily-menu/product-detail";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export default function ProductPage() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="-mt-16 min-h-dvh overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:100%_auto] bg-top bg-repeat-y pt-16">
        <Suspense fallback={<ProductDetailLoading />}>
          <ProductDetail />
        </Suspense>
      </main>
    </>
  );
}
