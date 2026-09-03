import type { DailyMenuProduct } from "@/components/daily-menu/types";

import { apiUrl } from "./api";

const browserCacheDurationMs = 60_000;
const productCache = new Map<
  string,
  { expiresAt: number; product: DailyMenuProduct }
>();
const productRequests = new Map<string, Promise<DailyMenuProduct>>();

function storageKey(productId: string) {
  return `cake-cloud:product:${productId}:v1`;
}

function readSessionCache(productId: string) {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.sessionStorage.getItem(storageKey(productId));
    if (!stored) return null;
    const parsed = JSON.parse(stored) as {
      expiresAt?: number;
      product?: DailyMenuProduct;
    };
    if (
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Date.now() ||
      !parsed.product
    ) {
      window.sessionStorage.removeItem(storageKey(productId));
      return null;
    }
    return { expiresAt: parsed.expiresAt, product: parsed.product };
  } catch {
    return null;
  }
}

function saveProduct(productId: string, product: DailyMenuProduct) {
  const cached = {
    expiresAt: Date.now() + browserCacheDurationMs,
    product,
  };
  productCache.set(productId, cached);
  try {
    window.sessionStorage.setItem(storageKey(productId), JSON.stringify(cached));
  } catch {
    // Memory caching still works when browser storage is unavailable.
  }
}

export async function getProductById(
  productId: string,
): Promise<DailyMenuProduct> {
  const memory = productCache.get(productId);
  if (memory && memory.expiresAt > Date.now()) return memory.product;

  const session = readSessionCache(productId);
  if (session) {
    productCache.set(productId, session);
    return session.product;
  }

  const pending = productRequests.get(productId);
  if (pending) return pending;

  const request = fetch(
    apiUrl(`/api/products/${encodeURIComponent(productId)}`),
  )
    .then(async (response) => {
      if (!response.ok) throw new Error("Product request failed");
      const data = (await response.json()) as { product?: DailyMenuProduct };
      if (!data.product) throw new Error("Product not found");
      saveProduct(productId, data.product);
      return data.product;
    })
    .finally(() => productRequests.delete(productId));

  productRequests.set(productId, request);
  return request;
}

export function clearProductCatalogCache() {
  productCache.clear();
  if (typeof window === "undefined") return;
  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith("cake-cloud:product:")) {
      window.sessionStorage.removeItem(key);
    }
  }
}
