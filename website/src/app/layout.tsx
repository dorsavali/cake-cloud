
import "./globals.css";

import type { Metadata } from "next";

import { CartProvider } from "@/components/cart";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Cake Cloud | Boutique Cakes & Pastries in East Perth",
    template: "%s | Cake Cloud",
  },
  description:
    "Handcrafted cakes, pastries, daily bakes, custom celebration cakes, and event packages from Cake Cloud in East Perth, Western Australia.",
  applicationName: "Cake Cloud",
  keywords: [
    "Cake Cloud",
    "East Perth bakery",
    "custom cakes Perth",
    "celebration cakes Perth",
    "pastries East Perth",
    "cakes Perth",
  ],
  creator: "Cake Cloud",
  publisher: "Cake Cloud",
  category: "food",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "Bakery",
  "@id": "https://cake-cloud.com.au/#business",
  name: "Cake Cloud",
  url: "https://cake-cloud.com.au",
  logo: "https://cake-cloud.com.au/images/logo/MainLogoC1.png",
  image: "https://cake-cloud.com.au/images/logo/MainLogoC1.png",
  description:
    "Boutique cakes, pastries, custom celebration cakes, and event packages handcrafted in East Perth.",
  email: "info@cake-cloud.com.au",
  telephone: "+61 413 681 344",
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: "181 Adelaide Terrace",
    addressLocality: "East Perth",
    addressRegion: "WA",
    postalCode: "6004",
    addressCountry: "AU",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "06:30",
      closes: "17:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday", "Sunday"],
      opens: "08:00",
      closes: "16:00",
    },
  ],
  sameAs: [
    "https://www.instagram.com/cakecloudau/",
    "https://www.facebook.com/cakecloudau/",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body>
        <CartProvider>
          <div className="mx-auto min-h-dvh w-full max-w-[2048px]">{children}</div>
        </CartProvider>
      </body>
    </html>
  );
}
