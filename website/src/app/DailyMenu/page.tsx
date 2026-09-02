import { DailyMenuCatalog } from "@/components/daily-menu/catalog";
import { MenuIntro } from "@/components/daily-menu/menu-intro";
import { Footer } from "@/components/layout/footer";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export default function DailyMenuPage() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="-mt-16 min-h-dvh overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:100%_auto] bg-top bg-repeat-y pb-12 pt-16 md:pb-16">
        <MenuIntro />
        <DailyMenuCatalog />
      </main>
      <Footer />
    </>
  );
}
