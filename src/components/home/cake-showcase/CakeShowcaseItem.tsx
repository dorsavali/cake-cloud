import { Button } from "@/components/ui";

import type { CakeShowcaseItem as CakeShowcaseItemData } from "./data";
import { CakeImageReveal } from "./CakeImageReveal";

type CakeShowcaseItemProps = {
  item: CakeShowcaseItemData;
};

export function CakeShowcaseItem({ item }: CakeShowcaseItemProps) {
  return (
    <article className="grid min-h-[400px] grid-cols-[minmax(0,1fr)_400px] items-center gap-20">
      <div className="max-w-[560px]">
        <h2 className="font-kalnia text-[40px] font-medium leading-[1.15] text-accent-dark">
          {item.title}
        </h2>
        <p className="mt-3 max-w-[550px] font-signika text-[24px] leading-[1.25] text-accent-dark">
          {item.description}
        </p>
        <Button
          variant="outline"
          size="lg"
          font="display"
          className="mt-6 min-w-[238px] [&:hover]:border-primary [&:hover]:bg-primary [&:hover]:text-accent"
        >
          {item.ctaLabel}
        </Button>
      </div>

      <div className="flex justify-center">
        <CakeImageReveal
          image={item.image}
          imageAfter={item.imageAfter}
          alt={item.imageAlt}
        />
      </div>
    </article>
  );
}
