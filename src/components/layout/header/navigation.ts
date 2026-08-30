export type NavigationItem = {
  href: string;
  label: string;
};

export const desktopNavigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/custom-cakes", label: "Custom Cakes" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
];

export const mobileNavigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Daily Menu" },
  { href: "/custom-cakes", label: "Custom Cakes" },
  { href: "/corporate", label: "Corporate" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
];
