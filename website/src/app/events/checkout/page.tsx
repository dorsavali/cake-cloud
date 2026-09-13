import type { Metadata } from "next";

import { HostCheckout } from "@/components/host";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Host Checkout | Cake Cloud",
  description: "Complete your Cake Cloud host package request.",
};

export default function HostCheckoutPage() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="-mt-16 min-h-dvh overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:auto_100%] bg-top bg-repeat-y pt-16 md:bg-[length:100%_auto]">
        <HostCheckout />
      </main>
    </>
  );
}
