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
