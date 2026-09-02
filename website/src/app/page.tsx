import { CakeShowcase } from "@/components/home/cake-showcase";
import { Hero } from "@/components/home/hero";
import { Partners } from "@/components/home/partners";
import { ProductRecommendations } from "@/components/home/product-recommendations";
import { Reviews } from "@/components/home/reviews";
import { SpecialDemand } from "@/components/home/special-demand";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:100%_auto] bg-top bg-repeat-y">
        <Hero />
        <CakeShowcase />
        <ProductRecommendations />
        <SpecialDemand />
        <Reviews />
        <Partners />
      </main>
      <Footer />
    </>
  );
}
