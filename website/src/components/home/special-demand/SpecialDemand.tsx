"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import styles from "./SpecialDemand.module.css";

const layers = [
  { file: "1&2exploded.webp", sourceWidth: 604, sourceHeight: 293, desktopWidth: 310, desktopClosedY: 360, desktopOpenY: 360, mobileWidth: 145, mobileClosedY: 176, mobileOpenY: 176 },
  { file: "3exploded.webp", sourceWidth: 464, sourceHeight: 174, desktopWidth: 145, desktopClosedY: 330, desktopOpenY: 303, mobileWidth: 68, mobileClosedY: 165, mobileOpenY: 149 },
  { file: "4exploded.webp", sourceWidth: 422, sourceHeight: 161, desktopWidth: 145, desktopClosedY: 300, desktopOpenY: 244, mobileWidth: 68, mobileClosedY: 145, mobileOpenY: 121 },
  { file: "5exploded.webp", sourceWidth: 432, sourceHeight: 125, desktopWidth: 145, desktopClosedY: 270, desktopOpenY: 199, mobileWidth: 68, mobileClosedY: 125, mobileOpenY: 99 },
  { file: "6exploded.webp", sourceWidth: 481, sourceHeight: 311, desktopWidth: 145, desktopClosedY: 220, desktopOpenY: 102, mobileWidth: 68, mobileClosedY: 95, mobileOpenY: 53 },
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
      <div className="relative mx-auto min-h-[320px] w-full max-w-[1100px] px-4 lg:grid lg:min-h-[500px] lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:gap-20 lg:px-8">
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
              className="flex h-10 w-[200px] items-center justify-center gap-4 rounded-full border border-luxury-accent bg-accent font-signika text-sm text-accent-dark transition-colors hover:bg-accent/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary max-[479px]:h-11 max-[479px]:w-[180px] lg:h-[68px] lg:w-[264px] lg:text-base"
            >
              <span aria-hidden="true" className="text-2xl font-light">+</span>
              Customizables
            </Link>
            <Link
              href="/custom-cakes"
              className="flex h-10 w-[200px] items-center justify-center gap-4 rounded-full border border-luxury-accent bg-accent font-signika text-sm text-accent-dark transition-colors hover:bg-accent/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary max-[479px]:h-11 max-[479px]:w-[180px] lg:h-[68px] lg:w-[264px] lg:text-base"
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
              width={layer.sourceWidth}
              height={layer.sourceHeight}
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
