"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";

import styles from "./Partners.module.css";

const partners = [
  {
    name: "Grinders Coffee",
    category: "Coffee Partner",
    image: "/images/patners/grinders.svg",
    width: 239,
    height: 52,
    darkLogo: true,
  },
  {
    name: "Callebaut Chocolate",
    category: "Chocolate Partner",
    image: "/images/patners/callebaut.svg",
    width: 110,
    height: 56,
    darkLogo: false,
  },
  {
    name: "Masters Dairy",
    category: "Dairy Partner",
    image: "/images/patners/milk.png",
    width: 103,
    height: 158,
    darkLogo: false,
  },
  {
    name: "Coca-Cola",
    category: "Soft Drinks & Water",
    image: "/images/patners/coke.svg",
    width: 112,
    height: 64,
    darkLogo: false,
  },
  {
    name: "Alternative Dairy Co",
    category: "Dairy-Free Partner",
    image: "/images/patners/alternative.webp",
    width: 311,
    height: 160,
    darkLogo: false,
  },
] as const;

type TrackStyle = CSSProperties & {
  "--active-index": number;
};

export function Partners() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    let intervalId: number | undefined;

    // Desktop renders a static grid, so the rotation only runs on mobile.
    const sync = () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
      intervalId = undefined;
      if (desktopQuery.matches) return;

      intervalId = window.setInterval(
        () =>
          setActiveIndex((current) =>
            current < partners.length ? current + 1 : current,
          ),
        5000,
      );
    };

    sync();
    desktopQuery.addEventListener("change", sync);

    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
      desktopQuery.removeEventListener("change", sync);
    };
  }, []);

  const slides = [...partners, partners[0]];

  const handleTransitionEnd = (
    event: React.TransitionEvent<HTMLUListElement>,
  ) => {
    if (event.propertyName !== "transform") return;
    if (activeIndex !== partners.length) return;

    setTransitionEnabled(false);
    setActiveIndex(0);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => setTransitionEnabled(true)),
    );
  };

  return (
    <section
      dir="ltr"
      aria-labelledby="partners-heading"
      className="overflow-x-hidden py-10 lg:flex lg:min-h-[430px] lg:items-center lg:py-[35px]"
    >
      <div className="mx-auto w-full max-w-[2056px] px-4 text-center text-accent-dark lg:px-8">
        <p className="font-signika text-sm font-light uppercase tracking-[0.2em] lg:text-xs">
          Our Partners
        </p>
        <h2
          id="partners-heading"
          className="mt-8 font-kalnia text-[24px] font-medium leading-tight lg:mt-4 lg:text-[28px]"
        >
          Made with the best, together.
        </h2>
        <p className="mx-auto mt-8 max-w-[620px] font-signika text-sm font-light leading-[1.6] lg:mt-5 lg:text-base lg:leading-[1.5]">
          Every Cake Cloud creation is made possible by the people behind our
          finest ingredients — our trusted local partners.
        </p>

        <div className="mt-10 lg:mx-auto lg:mt-9 lg:max-w-[1100px]">
          <ul
            className={`${styles.track} ${
              transitionEnabled ? "" : styles.withoutTransition
            }`}
            style={{ "--active-index": activeIndex } as TrackStyle}
            onTransitionEnd={handleTransitionEnd}
          >
            {slides.map((partner, index) => {
              const isLoopClone = index === partners.length;

              return (
                <li
                  key={`${partner.name}-${index}`}
                  aria-hidden={isLoopClone ? true : undefined}
                  className={`${styles.slide} ${
                    isLoopClone ? "lg:hidden" : ""
                  }`}
                >
                  <div className="mx-auto flex min-h-[160px] w-full max-w-[400px] flex-col items-center justify-center rounded-2xl bg-accent px-3 py-5 lg:min-h-[145px] lg:max-w-none lg:rounded-xl lg:px-4">
                    <div className="flex h-11 w-full items-center justify-center">
                      <Image
                        src={partner.image}
                        alt={`${partner.name} logo`}
                        width={partner.width}
                        height={partner.height}
                        unoptimized
                        className={`max-h-11 w-auto max-w-[130px] object-contain ${
                          partner.darkLogo ? "brightness-0 opacity-70" : ""
                        }`}
                      />
                    </div>
                    <p className="mt-3 font-signika text-[11px] font-light uppercase tracking-[0.14em] text-luxury-accent">
                      {partner.category}
                    </p>
                    <h3 className="mt-1.5 font-kalnia text-lg font-medium leading-tight lg:text-base">
                      {partner.name}
                    </h3>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
