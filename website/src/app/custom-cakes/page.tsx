import type { Metadata } from "next";
import { Suspense } from "react";

import { CakeBaseSelector } from "@/components/custom-cakes/CakeBaseSelector";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Custom Cakes",
  description: "Design a personalised Cake Cloud celebration cake for birthdays, weddings, and special occasions in Perth.",
  path: "/custom-cakes",
});

export default function CustomCakesPage() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <Suspense fallback={null}>
        <CakeBaseSelector />
      </Suspense>
    </>
  );
}
