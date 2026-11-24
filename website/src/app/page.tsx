import type { Metadata } from "next";

import { CakeShowcase } from "@/components/home/cake-showcase";
import { Hero } from "@/components/home/hero";
import { Partners } from "@/components/home/partners";
import { ProductRecommendations } from "@/components/home/product-recommendations";
import { Reviews } from "@/components/home/reviews";
import { SpecialDemand } from "@/components/home/special-demand";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Cake Cloud | Boutique Cakes & Pastries in East Perth",
  description:
    "Discover handcrafted pastries, fresh daily bakes, custom celebration cakes, and event packages from Cake Cloud in East Perth.",
  path: "/",
});

export default function Home() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="overflow-x-hidden supports-[overflow:clip]:overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:100%_auto] bg-top bg-repeat-y">
        <Hero />
        <CakeShowcase />
        <SpecialDemand />
        <ProductRecommendations />
        <Reviews />
        <Partners />
      </main>
      <Footer />
    </>
  );
}
