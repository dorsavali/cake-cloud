import type { Metadata } from "next";

import { HostPackageDetail } from "@/components/host";
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
        <HostPackageDetail />
      </main>
    </>
  );
}
