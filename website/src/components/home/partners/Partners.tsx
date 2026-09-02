import Image from "next/image";

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
] as const;

export function Partners() {
  return (
    <section
      dir="ltr"
      aria-labelledby="partners-heading"
      className="py-16 lg:flex lg:min-h-[430px] lg:items-center lg:py-0"
    >
      <div className="mx-auto w-full max-w-[1100px] px-4 text-center text-accent-dark lg:px-8 lg:py-10">
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

        <ul className="mt-10 grid grid-cols-2 gap-4 lg:mt-9 lg:grid-cols-4">
          {partners.map((partner) => (
            <li
              key={partner.name}
              className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl bg-accent px-3 py-5 lg:min-h-[145px] lg:rounded-xl lg:px-4"
            >
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
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
