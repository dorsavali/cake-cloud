
import "./globals.css";

import type { Metadata } from "next";

import { CartProvider } from "@/components/cart";

export const metadata: Metadata = {
  title: "Cake Cloud",
  description: "Cake Cloud website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <CartProvider>
          <div className="mx-auto min-h-dvh w-full max-w-[1536px]">{children}</div>
        </CartProvider>
      </body>
    </html>
  );
}
