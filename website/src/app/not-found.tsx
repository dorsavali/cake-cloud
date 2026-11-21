import Image from "next/image";
import Link from "next/link";

import { container, pageShell } from "@/components/custom-cakes/cake-ui";
import { Footer } from "@/components/layout/footer";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";

export default function NotFound() {
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className={`${pageShell} flex items-center !pb-10 md:!pb-16`}>
        <div className={container}>
          <section className="mx-auto my-8 w-full max-w-[680px] rounded-2xl bg-[#faf7f0] px-6 py-10 text-center shadow-[0_8px_28px_rgb(70_66_72/12%)] md:my-12 md:px-12 md:py-14">
            <Image
              src="/images/logo/main.svg"
              alt="Cake Cloud"
              width={150}
              height={190}
              priority
              className="mx-auto h-auto w-[112px] md:w-[132px]"
            />

            <p className="mt-5 font-signika text-xs font-medium uppercase tracking-[0.28em] text-primary">
              Error 404
            </p>
            <h1 className="mt-3 font-kalnia text-[clamp(32px,8vw,54px)] font-medium leading-tight text-accent-dark">
              Page Not Found
            </h1>

            <div className="mt-7 border-y border-dotted border-[#cbbb98] py-6">
              <p className="mx-auto max-w-[460px] font-signika text-sm leading-6 text-accent-dark/70 md:text-base md:leading-7">
                Sorry, the page you are looking for does not exist or may have moved.
              </p>
            </div>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-7 font-kalnia text-sm text-accent transition-colors hover:bg-[#5e796c] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary md:text-base"
              >
                Back to Home
              </Link>
              <Link
                href="/DailyMenu"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-primary px-7 font-kalnia text-sm text-primary transition-colors hover:bg-primary hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary md:text-base"
              >
                View Daily Menu
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
