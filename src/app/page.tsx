import { Hero } from "@/components/home/hero";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export default function Home() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main>
        <Hero />
      </main>
    </>
  );
}
