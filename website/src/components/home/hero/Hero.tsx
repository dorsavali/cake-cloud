import Image from "next/image";

import { HeroCta } from "./HeroCta";

export function Hero() {
  return (
    <section
      dir="ltr"
      aria-labelledby="hero-heading"
      className="-mt-16 flex w-full flex-col items-center overflow-hidden px-4 pb-[40px] pt-[100px] lg:pt-[200px] text-center md:px-0"
    >
      <div className="flex items-center justify-center gap-5 md:gap-8">
        <div className="hidden h-[323px] w-[230px] overflow-hidden rounded-full border-[3px] border-white/90 shadow-[0_1px_5px_rgba(70,66,72,0.22)] md:block">
          <Image
            src="/images/hero/2 (2).jpg"
            alt="A cake being finished by hand"
            width={204}
            height={286}
            priority
            unoptimized
            className="h-full w-full object-cover"
          />
        </div>

        <Image
          src="/images/hero/image logo.svg"
          alt="Cake Cloud"
          width={208}
          height={292}
          priority
          unoptimized
          className="h-auto w-[200px] shrink-0 md:w-[230px]"
        />

        <div className="hidden h-[323px] w-[230px] overflow-hidden rounded-full border-[3px] border-white/90 shadow-[0_1px_5px_rgba(70,66,72,0.22)] md:block">
          <Image
            src="/images/hero/1 (2).jpg"
            alt="A handcrafted cake being decorated"
            width={204}
            height={286}
            priority
            unoptimized
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center md:mt-6">
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

      <HeroCta className="mt-6" />
    </section>
  );
}
