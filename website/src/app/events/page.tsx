import type { Metadata } from "next";

import { HostPackages, HostRequestBar } from "@/components/host";
import { Footer } from "@/components/layout/footer";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Event Hosting & Packages",
  description:
    "Ready-to-book Cake Cloud packages for corporate events, celebrations, and gatherings.",
  path: "/host",
});

export default function EventsPage() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="-mt-16 min-h-dvh overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:100%_auto] bg-top bg-repeat-y pt-16">
        <HostPackages />
      </main>
      <HostRequestBar />
      <Footer />
    </>
  );
}
