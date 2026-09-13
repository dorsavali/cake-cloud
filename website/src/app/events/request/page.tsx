import type { Metadata } from "next";

import { HostRequestReview } from "@/components/host";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Review Request | Cake Cloud",
  description: "Review your Cake Cloud host package request.",
};

export default function HostRequestPage() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="-mt-16 min-h-dvh overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:100%_auto] bg-top bg-repeat-y pt-16">
        <HostRequestReview />
      </main>
    </>
  );
}
