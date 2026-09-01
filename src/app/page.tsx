import { CakeShowcase } from "@/components/home/cake-showcase";
import { Hero } from "@/components/home/hero";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export default function Home() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main>
        <Hero />
        <CakeShowcase />
      </main>
    </>
  );
}
