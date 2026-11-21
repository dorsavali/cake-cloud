import type { Metadata } from "next";
import { Suspense } from "react";

import { HostPackageDetail, HostRequestBar } from "@/components/host";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Host package | Cake Cloud",
  description: "Explore a ready-to-book Cake Cloud hosting package.",
};

export default function HostPackagePage() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="-mt-16 min-h-dvh overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:100%_auto] bg-top bg-repeat-y pt-16">
        <Suspense fallback={<p className="py-40 text-center font-signika text-sm text-accent-dark/65">Loading package...</p>}>
          <HostPackageDetail />
        </Suspense>
      </main>
      <HostRequestBar />
    </>
  );
}
