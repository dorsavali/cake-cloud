import type { Metadata } from "next";

import { ClubRegistration } from "@/components/club/ClubRegistration";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Club Membership",
  description: "Join the Cake Cloud Club and receive your personal member number.",
  path: "/club",
});

export default function ClubPage() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="-mt-16 min-h-dvh overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:auto_100%] bg-top bg-repeat-y pt-16 text-accent-dark md:bg-[length:100%_auto]">
        <ClubRegistration />
      </main>
    </>
  );
}
