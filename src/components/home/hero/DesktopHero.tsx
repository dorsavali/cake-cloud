import Image from "next/image";

import styles from "./Hero.module.css";
import { HeroCta } from "./HeroCta";

export function DesktopHero() {
  return (
    <section
      dir="ltr"
      aria-labelledby="hero-heading"
      className={`${styles.background} hidden min-h-[538px] md:flex md:h-[calc(100dvh-4rem)] md:max-h-[760px] md:flex-col md:items-center md:justify-center md:text-center`}
    >
      <Image
        src="/images/logo/main.svg"
        alt="Cake Cloud"
        width={350}
        height={306}
        priority
        unoptimized
        className="-translate-y-5 shrink-0"
      />

      <div className="mt-2 -translate-y-5 flex flex-col items-center">
        <h1
          id="hero-heading"
          className="font-kalnia text-[40px] font-medium leading-[52px] text-accent-dark"
        >
          Bite into a cloud.
        </h1>
        <p className="mt-1 font-signika text-base leading-6 text-accent-dark">
          Handcrafted daily in Perth with French technique and Iranian soul.
        </p>
        <HeroCta className="mt-8" />
      </div>
    </section>
  );
}
