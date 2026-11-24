import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Payment Result",
  description: "Check your Cake Cloud order payment status.",
  path: "/DailyMenu/payment-result",
  noIndex: true,
});

export default function PaymentResultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
