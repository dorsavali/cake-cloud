import type { Metadata } from "next";

import { CakeBaseSelector } from "@/components/custom-cakes/CakeBaseSelector";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Custom Cakes | Cake Cloud",
  description: "Choose a base for your personalised Cake Cloud celebration cake.",
};

export default function CustomCakesPage() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <CakeBaseSelector />
    </>
  );
}
