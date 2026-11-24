import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo";

export const dynamic = "force-static";

const pages = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/DailyMenu", changeFrequency: "daily", priority: 0.9 },
  { path: "/custom-cakes", changeFrequency: "monthly", priority: 0.9 },
  { path: "/custom-cakes/from-scratch", changeFrequency: "monthly", priority: 0.8 },
  { path: "/host", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", changeFrequency: "yearly", priority: 0.6 },
  { path: "/club", changeFrequency: "monthly", priority: 0.6 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency,
    priority,
  }));
}
