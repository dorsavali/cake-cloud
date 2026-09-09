import type { Metadata } from "next";

import { HostPackages } from "@/components/host";
import { Footer } from "@/components/layout/footer";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Host with Cake Cloud",
  description:
    "Ready-to-book Cake Cloud packages for corporate events, celebrations, and gatherings.",
};

export default function EventsPage() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="-mt-16 min-h-dvh overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:100%_auto] bg-top bg-repeat-y pt-16">
        <HostPackages />
      </main>
      <Footer />
    </>
  );
}
