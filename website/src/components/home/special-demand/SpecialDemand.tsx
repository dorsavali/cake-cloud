"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import styles from "./SpecialDemand.module.css";

const layers = [
  { file: "1exploded.webp", desktopWidth: 310, desktopClosedY: 444, desktopOpenY: 434, mobileWidth: 145, mobileClosedY: 215, mobileOpenY: 215 },
  { file: "2exploded.webp", desktopWidth: 218, desktopClosedY: 360, desktopOpenY: 284, mobileWidth: 102, mobileClosedY: 185, mobileOpenY: 144 },
  { file: "3exploded.webp", desktopWidth: 145, desktopClosedY: 330, desktopOpenY: 227, mobileWidth: 68, mobileClosedY: 165, mobileOpenY: 116 },
  { file: "4exploded.webp", desktopWidth: 145, desktopClosedY: 300, desktopOpenY: 169, mobileWidth: 68, mobileClosedY: 145, mobileOpenY: 88 },
  { file: "5exploded.webp", desktopWidth: 145, desktopClosedY: 270, desktopOpenY: 124, mobileWidth: 68, mobileClosedY: 125, mobileOpenY: 66 },
  { file: "6exploded.webp", desktopWidth: 145, desktopClosedY: 220, desktopOpenY: 27, mobileWidth: 68, mobileClosedY: 95, mobileOpenY: 20 },
] as const;

type LayerStyle = CSSProperties & {
  "--desktop-width": string;
  "--desktop-closed-y": string;
  "--desktop-open-y": string;
  "--mobile-width": string;
  "--mobile-closed-y": string;
  "--mobile-open-y": string;
  "--delay": string;
  "--close-delay": string;
};

export function SpecialDemand() {
  const sectionRef = useRef<HTMLElement>(null);
  const hasTriggeredRef = useRef(false);
  const [isExploded, setIsExploded] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let closeTimer: number | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      const isMobile = window.matchMedia("(max-width: 1023px)").matches;

      if (isMobile && entry.isIntersecting && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        setIsExploded(true);
        closeTimer = window.setTimeout(() => setIsExploded(false), 1400);
      }

      if (!entry.isIntersecting) {
        if (closeTimer) window.clearTimeout(closeTimer);
        closeTimer = undefined;
        hasTriggeredRef.current = false;
        setIsExploded(false);
      }
    }, { threshold: 0.55 });

    observer.observe(section);
    return () => {
      observer.disconnect();
      if (closeTimer) window.clearTimeout(closeTimer);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      dir="ltr"
      aria-labelledby="special-demand-heading"
      className="relative z-10 overflow-visible lg:py-10"
    >
      <div className="relative mx-auto min-h-[410px] w-full max-w-[1100px] px-4 lg:grid lg:min-h-[500px] lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:gap-20 lg:px-8">
        <div className="pt-10 lg:pt-0">
          <h2
            id="special-demand-heading"
            className="font-kalnia text-[18px] font-medium leading-[1.15] text-accent-dark lg:text-[32px]"
          >
            Need an Special Demand?
          </h2>
          <p className="mt-2 font-signika text-xs text-accent-dark lg:text-base">
            Custom Cakes the way you want them.
          </p>

          <div className="mt-16 flex flex-col gap-4 lg:flex-row lg:gap-8">
            <Link
              href="/custom-cakes"
              className="flex h-10 w-[200px] items-center justify-center gap-4 rounded-full border border-luxury-accent bg-accent font-signika text-sm text-accent-dark transition-colors hover:bg-accent/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:h-[68px] lg:w-[264px] lg:text-base"
            >
              <span aria-hidden="true" className="text-2xl font-light">+</span>
              Customizables
            </Link>
            <Link
              href="/custom-cakes"
              className="flex h-10 w-[200px] items-center justify-center gap-4 rounded-full border border-luxury-accent bg-accent font-signika text-sm text-accent-dark transition-colors hover:bg-accent/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:h-[68px] lg:w-[264px] lg:text-base"
            >
              <span aria-hidden="true" className="text-2xl font-light">+</span>
              From Scratch
            </Link>
          </div>
        </div>

        <div
          className={`${styles.cakeStage} ${isExploded ? styles.isExploded : ""}`}
          tabIndex={0}
          aria-label="Hover to reveal the cake layers"
        >
          <Image
            src="/images/heroExplode/7.webp"
            alt="Two-tier custom celebration cake"
            width={998}
            height={732}
            unoptimized
            className={styles.closedCake}
          />

          {layers.map((layer, index) => (
            <Image
              key={layer.file}
              src={`/images/heroExplode/${layer.file}`}
              alt=""
              aria-hidden="true"
              width={index === 0 ? 995 : index === 1 ? 700 : index === 2 ? 464 : index === 3 ? 422 : index === 4 ? 432 : 481}
              height={index === 0 ? 212 : index === 1 ? 472 : index === 2 ? 174 : index === 3 ? 161 : index === 4 ? 125 : 311}
              unoptimized
              className={styles.layer}
              style={
                {
                  "--desktop-width": `${layer.desktopWidth}px`,
                  "--desktop-closed-y": `${layer.desktopClosedY}px`,
                  "--desktop-open-y": `${layer.desktopOpenY}px`,
                  "--mobile-width": `${layer.mobileWidth}px`,
                  "--mobile-closed-y": `${layer.mobileClosedY}px`,
                  "--mobile-open-y": `${layer.mobileOpenY}px`,
                  "--delay": `${index * 55}ms`,
                  "--close-delay": `${(layers.length - 1 - index) * 45}ms`,
                  zIndex: index + 1,
                } as LayerStyle
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
