export type ProductMoney = {
  amount: number;
  currency: string;
};

export type RecommendedProduct = {
  id: string;
  name: string;
  price: ProductMoney;
  image: string | null;
  imageAlt: string;
  href: string;
  available?: boolean;
};

// Placeholder data. A Square catalog response can be mapped to this shape later.
export const recommendedProducts: RecommendedProduct[] = [
  {
    id: "cake-01",
    name: "Cake No.01",
    price: { amount: 999, currency: "AUD" },
    image: null,
    imageAlt: "Strawberry celebration cake",
    href: "/DailyMenu#cake-01",
  },
  {
    id: "cake-02",
    name: "Cake No.02",
    price: { amount: 999, currency: "AUD" },
    image: null,
    imageAlt: "Mango celebration cake",
    href: "/DailyMenu#cake-02",
  },
  {
    id: "cake-03",
    name: "Cake No.03",
    price: { amount: 999, currency: "AUD" },
    image: null,
    imageAlt: "White floral celebration cake",
    href: "/DailyMenu#cake-03",
  },
  {
    id: "cake-04",
    name: "Cake No.04",
    price: { amount: 999, currency: "AUD" },
    image: null,
    imageAlt: "Cake Cloud layered cake",
    href: "/DailyMenu#cake-04",
  },
];
