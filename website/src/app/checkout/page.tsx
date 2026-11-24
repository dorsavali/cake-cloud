import type { Metadata } from "next";
import { CheckoutReview } from "@/components/cart/CheckoutReview";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Review Your Order",
  description: "Review your Cake Cloud order before continuing to secure payment.",
  path: "/checkout",
  noIndex: true,
});

export default function CheckoutPage() {
  return <div className="min-h-dvh bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:auto_100%] bg-center bg-repeat-y md:bg-[length:100%_auto] md:bg-top">
    <DesktopHeader />
    <MobileHeader />
    <CheckoutReview />
  </div>;
}
