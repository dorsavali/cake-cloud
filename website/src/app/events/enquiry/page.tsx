import type { Metadata } from "next";

import { HostEnquiryForm } from "@/components/host";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Complex Hosting Enquiry | Cake Cloud",
  description: "Send Cake Cloud an enquiry for a complex or large hosted event.",
};

export default function HostEnquiryPage() {
  return <><DesktopHeader /><MobileHeader /><main className="-mt-16 min-h-dvh overflow-x-clip bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:auto_100%] bg-top bg-repeat-y pt-16 md:bg-[length:100%_auto]"><HostEnquiryForm /></main></>;
}
