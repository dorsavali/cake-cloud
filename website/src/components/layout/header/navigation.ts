export type NavigationItem = {
  href: string;
  label: string;
  children?: NavigationItem[];
};

export const desktopNavigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/DailyMenu", label: "Daily Menu" },
  { href: "/custom-cakes?start=1", label: "Custom Cakes" },
  { href: "/events", label: "Host" },
  { href: "/about", label: "About" },
];

export const mobileNavigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/DailyMenu", label: "Daily Menu" },
  { href: "/custom-cakes?start=1", label: "Custom Cakes" },
  { href: "/events", label: "Host" },
  { href: "/about", label: "About" },
];
