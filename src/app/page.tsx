import { DesktopHeader } from "@/components/layout/header";

export default function Home() {
  return (
    <>
      <DesktopHeader />
      <main className="min-h-[calc(100dvh-4rem)] bg-background" />
    </>
  );
}
