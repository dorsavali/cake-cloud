export type NavigationItem = {
  href: string;
  label: string;
  children?: NavigationItem[];
};

const dailyMenuChildren: NavigationItem[] = [
  { href: "/menu#cakes-and-pastries", label: "Cakes & Pastries" },
  { href: "/menu#drinks", label: "Drinks" },
  { href: "/menu#packages", label: "Packages" },
  { href: "/menu#pet-treats", label: "Treats (Pet Treats)" },
];

export const desktopNavigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Daily Menu", children: dailyMenuChildren },
  { href: "/custom-cakes", label: "Custom Cakes" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
];

export const mobileNavigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Daily Menu", children: dailyMenuChildren },
  { href: "/custom-cakes", label: "Custom Cakes" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
];
