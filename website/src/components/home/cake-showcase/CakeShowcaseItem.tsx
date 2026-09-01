import { Button } from "@/components/ui";

import type { CakeShowcaseItem as CakeShowcaseItemData } from "./data";
import { CakeImageReveal } from "./CakeImageReveal";

type CakeShowcaseItemProps = {
  item: CakeShowcaseItemData;
};

export function CakeShowcaseItem({ item }: CakeShowcaseItemProps) {
  return (
    <article className="grid grid-cols-[minmax(0,1fr)_150px] items-start gap-1 py-7 lg:min-h-[400px] lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-20 lg:py-0">
      <div className="max-w-[560px]">
        <h2 className="font-kalnia text-[24px] font-medium leading-[1.15] text-accent-dark lg:text-[40px]">
          {item.title}
        </h2>
        <p className="mt-5 max-w-[550px] font-signika text-[14px] leading-[1.3] text-accent-dark lg:mt-3 lg:text-[24px] lg:leading-[1.25]">
          {item.description}
        </p>
        <Button
          variant="outline"
          size="lg"
          font="display"
          className="mt-6 h-10! min-w-0! rounded-[20px]! px-8! py-2! text-[18px]! gap-2! lg:h-[60px]! lg:min-w-[238px]! lg:rounded-full! lg:px-10! lg:text-[32px]! [&:hover]:border-primary [&:hover]:bg-primary [&:hover]:text-accent"
        >
          {item.ctaLabel}
        </Button>
      </div>

      <div className="flex justify-end lg:justify-center">
        <CakeImageReveal
          image={item.image}
          imageAfter={item.imageAfter}
          alt={item.imageAlt}
        />
      </div>
    </article>
  );
}
