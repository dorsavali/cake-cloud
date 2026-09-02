import { CakeShowcaseItem } from "./CakeShowcaseItem";
import { cakeShowcaseItems } from "./data";

export function CakeShowcase() {
  return (
    <section
      dir="ltr"
      aria-label="Explore Cake Cloud collections"
      className="py-8 lg:py-12"
    >
      <div className="mx-auto w-full max-w-[1100px] px-4 lg:px-8">
        {cakeShowcaseItems.map((item) => (
          <CakeShowcaseItem key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}
