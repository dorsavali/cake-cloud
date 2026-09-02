import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import styles from "./SpecialDemand.module.css";

const layers = [
  { file: "1exploded.webp", width: 310, closedY: 444, openY: 434 },
  { file: "2exploded.webp", width: 218, closedY: 360, openY: 284 },
  { file: "3exploded.webp", width: 145, closedY: 330, openY: 227 },
  { file: "4exploded.webp", width: 145, closedY: 300, openY: 169 },
  { file: "5exploded.webp", width: 145, closedY: 270, openY: 124 },
  { file: "6exploded.webp", width: 145, closedY: 220, openY: 27 },
] as const;

type LayerStyle = CSSProperties & {
  "--width": string;
  "--closed-y": string;
  "--open-y": string;
  "--delay": string;
  "--close-delay": string;
};

export function SpecialDemand() {
  return (
    <section
      dir="ltr"
      aria-labelledby="special-demand-heading"
      className="relative z-10 hidden overflow-visible py-10 lg:block"
    >
      <div className="mx-auto grid min-h-[500px] w-full max-w-[1100px] grid-cols-[minmax(0,1fr)_460px] items-center gap-20 px-8">
        <div>
          <h2
            id="special-demand-heading"
            className="font-kalnia text-[32px] font-medium leading-[1.15] text-accent-dark"
          >
            Need an Special Demand?
          </h2>
          <p className="mt-2 font-signika text-base text-accent-dark">
            Custom Cakes the way you want them.
          </p>

          <div className="mt-16 flex gap-8">
            <Link
              href="/custom-cakes"
              className="flex h-[68px] w-[264px] items-center justify-center gap-4 rounded-full border border-luxury-accent bg-accent font-signika text-base text-accent-dark transition-colors hover:bg-accent/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <span aria-hidden="true" className="text-2xl font-light">+</span>
              Customizables
            </Link>
            <Link
              href="/custom-cakes"
              className="flex h-[68px] w-[264px] items-center justify-center gap-4 rounded-full border border-luxury-accent bg-accent font-signika text-base text-accent-dark transition-colors hover:bg-accent/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <span aria-hidden="true" className="text-2xl font-light">+</span>
              From Scratch
            </Link>
          </div>
        </div>

        <div
          className={styles.cakeStage}
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
                  "--width": `${layer.width}px`,
                  "--closed-y": `${layer.closedY}px`,
                  "--open-y": `${layer.openY}px`,
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
