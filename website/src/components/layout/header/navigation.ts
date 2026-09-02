export type NavigationItem = {
  href: string;
  label: string;
  children?: NavigationItem[];
};

const dailyMenuChildren: NavigationItem[] = [
  { href: "/DailyMenu#cakes-and-pastries", label: "Cakes & Pastries" },
  { href: "/DailyMenu#drinks", label: "Drinks" },
  { href: "/DailyMenu#packages", label: "Packages" },
  { href: "/DailyMenu#pet-treats", label: "Treats (Pet Treats)" },
];

export const desktopNavigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/DailyMenu", label: "Daily Menu", children: dailyMenuChildren },
  { href: "/custom-cakes", label: "Custom Cakes" },
  { href: "/events", label: "Events and Celebration" },
  { href: "/about", label: "About" },
];

export const mobileNavigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/DailyMenu", label: "Daily Menu", children: dailyMenuChildren },
  { href: "/custom-cakes", label: "Custom Cakes" },
  { href: "/events", label: "Events and Celebration" },
  { href: "/about", label: "About" },
];
