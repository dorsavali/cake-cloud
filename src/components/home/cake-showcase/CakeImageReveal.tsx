"use client";

import Image from "next/image";
import { useState } from "react";

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

  return (
    <div
      className="relative size-[326px] overflow-hidden rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      tabIndex={0}
      onPointerEnter={() => setIsRevealed(true)}
      onPointerLeave={() => setIsRevealed(false)}
      onFocus={() => setIsRevealed(true)}
      onBlur={() => setIsRevealed(false)}
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
          sizes="326px"
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
          sizes="326px"
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
