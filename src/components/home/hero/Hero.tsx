import Image from "next/image";

import styles from "./Hero.module.css";
import { HeroCta } from "./HeroCta";

export function Hero() {
  return (
    <section
      dir="ltr"
      aria-labelledby="hero-heading"
      className={`${styles.background} flex h-[404px] w-full flex-col items-center overflow-hidden px-5 pt-[22px] text-center md:h-[calc(100dvh-4rem)] md:min-h-[538px] md:max-h-[760px] md:justify-center md:px-0 md:pt-0`}
    >
      <Image
        src="/images/logo/main.svg"
        alt="Cake Cloud"
        width={400}
        height={349}
        priority
        unoptimized
        className="h-auto w-[210px] shrink-0 md:w-[350px] md:-translate-y-5"
      />

      <div className="mt-2 flex flex-col items-center md:-translate-y-5">
        <h1
          id="hero-heading"
          className="whitespace-nowrap font-kalnia text-[38px] font-medium leading-[46px] text-accent-dark md:text-[40px] md:leading-[52px]"
        >
          Bite into a cloud.
        </h1>
        <p className="mt-2 max-w-[350px] font-signika text-base leading-[19px] text-accent-dark md:mt-1 md:max-w-[650px] md:leading-6">
          Handcrafted daily in Perth with French technique and Iranian soul.
        </p>
      </div>

      <HeroCta className="mt-11 md:mt-8 md:-translate-y-5" />
    </section>
  );
}
