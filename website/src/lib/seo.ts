import type { Metadata } from "next";

export const siteUrl = new URL("https://cake-cloud.com.au");

const socialImage = {
  url: "/images/logo/MainLogoC1.png",
  width: 666,
  height: 581,
  alt: "Cake Cloud boutique cakes and pastries",
};

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
};

export function createPageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const canonical = new URL(path, siteUrl).toString();
  const socialTitle = title.includes("Cake Cloud") ? title : `${title} | Cake Cloud`;

  return {
    title,
    description,
    alternates: noIndex ? undefined : { canonical },
    openGraph: {
      type: "website",
      locale: "en_AU",
      url: canonical,
      siteName: "Cake Cloud",
      title: socialTitle,
      description,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [socialImage.url],
    },
    robots: noIndex
      ? { index: false, follow: false, noarchive: true }
      : { index: true, follow: true },
  };
}
