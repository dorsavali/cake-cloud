export type CakeShowcaseItem = {
  title: string;
  description: string;
  image: string;
  imageAfter: string;
  imageAlt: string;
  ctaLabel: string;
  ctaHref?: string;
};

export const cakeShowcaseItems: CakeShowcaseItem[] = [
  {
    title: "Ready-to-Eat",
    description:
      "Freshly baked artisan pastries. Pickup or delivery via Uber Eats.",
    image: "/images/homeCakes/1-720.webp",
    imageAfter: "/images/homeCakes/1in-720.webp",
    imageAlt: "Ready-to-eat artisan pastry",
    ctaLabel: "Explore",
    ctaHref: "/DailyMenu",
  },
  {
    title: "Custom Cakes",
    description: "Personalised celebration cakes with two ordering methods.",
    image: "/images/homeCakes/2-720.webp",
    imageAfter: "/images/homeCakes/2in-720.webp",
    imageAlt: "Custom berry celebration cake",
    ctaLabel: "Explore",
  },
  {
    title: "Pet Treats",
    description:
      "Handcrafted treats made just for your furry friends. Safe, wholesome, and baked with the same love as everything else we make.",
    image: "/images/homeCakes/3-720.webp",
    imageAfter: "/images/homeCakes/3in-720.webp",
    imageAlt: "Handcrafted pet-friendly cake",
    ctaLabel: "Explore",
  },
];
