import type { Metadata } from "next";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CakeBriefForm } from "@/components/custom-cakes/CakeBriefForm";

export const metadata: Metadata = {
  title: "Submit Your Cake Brief | Cake Cloud",
  description: "Tell Cake Cloud about the custom cake you have in mind.",
};

export default function FromScratchPage() {
  return <><DesktopHeader /><MobileHeader /><CakeBriefForm /><Footer /></>;
}
