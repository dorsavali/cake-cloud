import { CakeShowcaseItem } from "./CakeShowcaseItem";
import { cakeShowcaseItems } from "./data";

export function CakeShowcase() {
  return (
    <section
      dir="ltr"
      aria-label="Explore Cake Cloud collections"
      className="hidden bg-accent bg-[url('/images/pattern/background.webp')] bg-cover bg-center py-12 lg:block"
    >
      <div className="mx-auto w-full max-w-[1100px] px-8">
        {cakeShowcaseItems.map((item) => (
          <CakeShowcaseItem key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}
