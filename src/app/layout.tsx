
import "./globals.css";

import type { Metadata } from "next";

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
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
