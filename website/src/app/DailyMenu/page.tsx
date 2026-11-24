import type { Metadata } from "next";
import { Suspense } from "react";

import { DailyMenuCatalog } from "@/components/daily-menu/catalog";
import { MenuIntro } from "@/components/daily-menu/menu-intro";
import { Footer } from "@/components/layout/footer";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Daily Menu",
  description:
    "Browse today's fresh cakes, pastries, drinks and boutique bakes available from Cake Cloud in East Perth.",
  path: "/DailyMenu",
});

export default function DailyMenuPage() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="-mt-16 min-h-dvh overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:100%_auto] bg-top bg-repeat-y pb-4 pt-16 md:pb-8">
        <MenuIntro />
        <Suspense fallback={null}>
          <DailyMenuCatalog />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
