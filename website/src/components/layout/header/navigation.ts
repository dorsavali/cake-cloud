export type NavigationItem = {
  href: string;
  label: string;
  children?: NavigationItem[];
};

export const desktopNavigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/DailyMenu", label: "Daily Menu" },
  { href: "/custom-cakes", label: "Custom Cakes" },
  { href: "/events", label: "Events and Celebration" },
  { href: "/about", label: "About" },
];

export const mobileNavigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/DailyMenu", label: "Daily Menu" },
  { href: "/custom-cakes", label: "Custom Cakes" },
  { href: "/events", label: "Events and Celebration" },
  { href: "/about", label: "About" },
];
