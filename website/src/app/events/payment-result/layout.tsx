import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Payment Result",
  description: "Check your Cake Cloud host package payment status.",
  path: "/events/payment-result",
  noIndex: true,
});

export default function PaymentResultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
