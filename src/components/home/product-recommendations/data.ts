export type ProductMoney = {
  amount: number;
  currency: "AUD";
};

export type RecommendedProduct = {
  id: string;
  name: string;
  price: ProductMoney;
  image: string;
  imageAlt: string;
  href: string;
};

// Placeholder data. A Square catalog response can be mapped to this shape later.
export const recommendedProducts: RecommendedProduct[] = [
  {
    id: "cake-01",
    name: "Cake No.01",
    price: { amount: 999, currency: "AUD" },
    image: "/images/homeCakes/1.png",
    imageAlt: "Strawberry celebration cake",
    href: "/menu#cake-01",
  },
  {
    id: "cake-02",
    name: "Cake No.02",
    price: { amount: 999, currency: "AUD" },
    image: "/images/homeCakes/2.png",
    imageAlt: "Mango celebration cake",
    href: "/menu#cake-02",
  },
  {
    id: "cake-03",
    name: "Cake No.03",
    price: { amount: 999, currency: "AUD" },
    image: "/images/homeCakes/3.png",
    imageAlt: "White floral celebration cake",
    href: "/menu#cake-03",
  },
  {
    id: "cake-04",
    name: "Cake No.04",
    price: { amount: 999, currency: "AUD" },
    image: "/images/homeCakes/1in.png",
    imageAlt: "Cake Cloud layered cake",
    href: "/menu#cake-04",
  },
];
