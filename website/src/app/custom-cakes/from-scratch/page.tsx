import type { Metadata } from "next";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CakeBriefForm } from "@/components/custom-cakes/CakeBriefForm";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Custom Cake from Scratch",
  description: "Tell Cake Cloud about the bespoke celebration cake you have in mind and submit your custom cake brief.",
  path: "/custom-cakes/from-scratch",
});

export default function FromScratchPage() {
  return <><DesktopHeader /><MobileHeader /><CakeBriefForm /><Footer /></>;
}
