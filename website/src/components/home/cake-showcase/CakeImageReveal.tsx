"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type CakeImageRevealProps = {
  image: string;
  imageAfter: string;
  alt: string;
};

export function CakeImageReveal({
  image,
  imageAfter,
  alt,
}: CakeImageRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    let observer: IntersectionObserver | undefined;

    const configureAnimation = () => {
      observer?.disconnect();
      observer = undefined;
      setIsRevealed(false);

      if (desktopQuery.matches) return;

      observer = new IntersectionObserver(
        ([entry]) => {
          setIsRevealed(entry.isIntersecting);
        },
        { threshold: 0.65 },
      );
      observer.observe(container);
    };

    configureAnimation();
    desktopQuery.addEventListener("change", configureAnimation);

    return () => {
      observer?.disconnect();
      desktopQuery.removeEventListener("change", configureAnimation);
    };
  }, []);

  const setDesktopReveal = (revealed: boolean) => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setIsRevealed(revealed);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative size-[150px] overflow-hidden rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:size-[326px]"
      tabIndex={0}
      onPointerEnter={() => setDesktopReveal(true)}
      onPointerLeave={() => setDesktopReveal(false)}
      onFocus={() => setDesktopReveal(true)}
      onBlur={() => setDesktopReveal(false)}
    >
      <div
        className={`absolute inset-0 will-change-transform transition-transform duration-1000 ease-[cubic-bezier(0.45,0,0.2,1)] ${
          isRevealed ? "rotate-[360deg]" : "rotate-0"
        }`}
      >
        <Image
          src={image}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 326px, 150px"
          unoptimized
          className={`object-cover transition-[opacity,filter] duration-700 ease-in-out ${
            isRevealed
              ? "blur-[1px] opacity-0 delay-0"
              : "blur-0 opacity-100 delay-150"
          }`}
        />
        <Image
          src={imageAfter}
          alt=""
          fill
          sizes="(min-width: 1024px) 326px, 150px"
          unoptimized
          className={`object-cover transition-[opacity,filter] duration-700 ease-in-out ${
            isRevealed
              ? "blur-0 opacity-100 delay-150"
              : "blur-[1px] opacity-0 delay-0"
          }`}
        />
      </div>
    </div>
  );
}
