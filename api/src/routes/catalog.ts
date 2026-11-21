import { json, methodNotAllowed } from "../http/json.js";
import { getCatalogItems } from "../services/square.js";
import type { ApiEnv } from "../types/env.js";

type CatalogItems = Awaited<ReturnType<typeof getCatalogItems>>;

type CatalogOptions = {
  includeInventory?: boolean;
  includePopularity?: boolean;
  variant?: string;
};

const catalogCache = new Map<
  string,
  { expiresAt: number; items: CatalogItems }
>();
const catalogRequests = new Map<string, Promise<CatalogItems>>();
// Webhooks normally refresh this immediately. The short TTL is a fallback for
// missed deliveries and keeps local development consistent with production.
const catalogCacheDurationMs = 135 * 60 * 1000;

const catalogCacheKey = (env: ApiEnv, variant = "full") =>
  `${env.SQUARE_ENVIRONMENT}:${env.SQUARE_APPLICATION_ID}:${variant}`;

function setCatalogCache(
  env: ApiEnv,
  items: CatalogItems,
  options: CatalogOptions = {},
): void {
  catalogCache.set(catalogCacheKey(env, options.variant), {
    expiresAt: Date.now() + catalogCacheDurationMs,
    items,
  });
}

async function refreshCatalogVariant(
  env: ApiEnv,
  options: CatalogOptions = {},
): Promise<CatalogItems> {
  const cacheKey = catalogCacheKey(env, options.variant);
  const existingRequest = catalogRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = getCatalogItems(env, options)
    .then((items) => {
      setCatalogCache(env, items, options);
      return items;
    })
    .finally(() => catalogRequests.delete(cacheKey));

  catalogRequests.set(cacheKey, request);
  return request;
}

export async function getCachedCatalogItems(
  env: ApiEnv,
  options: CatalogOptions = {},
): Promise<CatalogItems> {
  const cacheKey = catalogCacheKey(env, options.variant);
  const cached = catalogCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items;

  const existingRequest = catalogRequests.get(cacheKey);
  if (existingRequest) {
    try {
      return await existingRequest;
    } catch (error) {
      if (cached) return cached.items;
      throw error;
    }
  }

  const request = getCatalogItems(env, options)
    .then((items) => {
      setCatalogCache(env, items, options);
      return items;
    })
    .finally(() => catalogRequests.delete(cacheKey));

  catalogRequests.set(cacheKey, request);
  try {
    return await request;
  } catch (error) {
    // An expired response is safer than taking the storefront offline while
    // Square is temporarily unavailable. Scheduled/webhook refreshes will
    // replace it atomically as soon as a fresh request succeeds.
    if (cached) return cached.items;
    throw error;
  }
}

export async function refreshCatalogCache(env: ApiEnv): Promise<void> {
  const items = await refreshCatalogVariant(env);

  // The scheduled full refresh can also warm the lightweight daily-menu
  // variant without making a second request to Square.
  setCatalogCache(env, items, {
    includePopularity: false,
    variant: "daily-menu",
  });
  setCatalogCache(env, items, {
    includeInventory: false,
    includePopularity: false,
    variant: "host",
  });
}

export async function refreshDailyMenuCatalogCache(
  env: ApiEnv,
): Promise<void> {
  await refreshCatalogVariant(env, {
    includePopularity: false,
    variant: "daily-menu",
  });
}

export async function refreshStorefrontCatalogCaches(
  env: ApiEnv,
): Promise<void> {
  const items = await getCatalogItems(env, {
    includePopularity: false,
  });
  setCatalogCache(env, items, {
    includePopularity: false,
    variant: "daily-menu",
  });
  setCatalogCache(env, items, {
    includeInventory: false,
    includePopularity: false,
    variant: "host",
  });
}

export async function refreshHostCatalogCache(env: ApiEnv): Promise<void> {
  await refreshCatalogVariant(env, {
    includeInventory: false,
    includePopularity: false,
    variant: "host",
  });
}

export async function handleCatalogItems(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  try {
    const items = (await getCachedCatalogItems(env)).map(
      ({ customAttributes: _customAttributes, ...product }) => product,
    );
    return json(
      { items },
      200,
      {
        "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=60",
      },
    );
  } catch (error) {
    console.error("[api] Catalog endpoint failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Catalog is temporarily unavailable" }, 502);
  }
}
