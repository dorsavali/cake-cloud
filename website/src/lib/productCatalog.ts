import type { DailyMenuProduct } from "@/components/daily-menu/types";

import { apiUrl } from "./api";

const storageKey = "cake-cloud:product-catalog:v1";
const browserCacheDurationMs = 60_000;

let memoryCache: { expiresAt: number; items: DailyMenuProduct[] } | null = null;
let pendingRequest: Promise<DailyMenuProduct[]> | null = null;

function readSessionCache() {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as {
      expiresAt?: number;
      items?: DailyMenuProduct[];
    };
    if (
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Date.now() ||
      !Array.isArray(parsed.items)
    ) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }
    return { expiresAt: parsed.expiresAt, items: parsed.items };
  } catch {
    return null;
  }
}

function saveCache(items: DailyMenuProduct[]) {
  const cached = {
    expiresAt: Date.now() + browserCacheDurationMs,
    items,
  };
  memoryCache = cached;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(cached));
  } catch {
    // Memory caching still works when browser storage is unavailable.
  }
}

export async function getProductCatalog(): Promise<DailyMenuProduct[]> {
  if (memoryCache && memoryCache.expiresAt > Date.now()) {
    return memoryCache.items;
  }

  const sessionCache = readSessionCache();
  if (sessionCache) {
    memoryCache = sessionCache;
    return sessionCache.items;
  }

  if (pendingRequest) return pendingRequest;

  pendingRequest = fetch(apiUrl("/api/products"))
    .then(async (response) => {
      if (!response.ok) throw new Error("Products request failed");
      const data = (await response.json()) as { items?: DailyMenuProduct[] };
      const items = data.items ?? [];
      saveCache(items);
      return items;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function clearProductCatalogCache() {
  memoryCache = null;
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(storageKey);
  }
}
