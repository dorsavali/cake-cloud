import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export default function Home() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="min-h-[calc(100dvh-4rem)] bg-background" />
    </>
  );
}
