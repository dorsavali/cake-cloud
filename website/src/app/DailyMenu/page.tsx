import { MenuIntro } from "@/components/daily-menu/menu-intro";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export default function DailyMenuPage() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="-mt-16 min-h-dvh bg-accent bg-[url('/images/pattern/background.webp')] bg-[length:100%_auto] bg-top bg-repeat-y pt-16">
        <MenuIntro />
      </main>
    </>
  );
}
