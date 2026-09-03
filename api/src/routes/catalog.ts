import { json, methodNotAllowed } from "../http/json.js";
import { getCatalogItems } from "../services/square.js";
import type { ApiEnv } from "../types/env.js";

type CatalogItems = Awaited<ReturnType<typeof getCatalogItems>>;

const catalogCache = new Map<
  string,
  { expiresAt: number; items: CatalogItems }
>();
const catalogRequests = new Map<string, Promise<CatalogItems>>();
const catalogCacheDurationMs = 24 * 60 * 60 * 1000;

export async function getCachedCatalogItems(env: ApiEnv): Promise<CatalogItems> {
  const cacheKey = `${env.SQUARE_ENVIRONMENT}:${env.SQUARE_APPLICATION_ID}`;
  const cached = catalogCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items;

  const existingRequest = catalogRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = getCatalogItems(env)
    .then((items) => {
      catalogCache.set(cacheKey, {
        expiresAt: Date.now() + catalogCacheDurationMs,
        items,
      });
      return items;
    })
    .finally(() => catalogRequests.delete(cacheKey));

  catalogRequests.set(cacheKey, request);
  return request;
}

export function invalidateCatalogCache(env: ApiEnv): void {
  const cacheKey = `${env.SQUARE_ENVIRONMENT}:${env.SQUARE_APPLICATION_ID}`;
  catalogCache.delete(cacheKey);
}

export async function refreshCatalogCache(env: ApiEnv): Promise<void> {
  const cacheKey = `${env.SQUARE_ENVIRONMENT}:${env.SQUARE_APPLICATION_ID}`;
  const existingRequest = catalogRequests.get(cacheKey);
  if (existingRequest) {
    await existingRequest;
    return;
  }

  const request = getCatalogItems(env)
    .then((items) => {
      catalogCache.set(cacheKey, {
        expiresAt: Date.now() + catalogCacheDurationMs,
        items,
      });
      return items;
    })
    .finally(() => catalogRequests.delete(cacheKey));

  catalogRequests.set(cacheKey, request);
  await request;
}

export async function handleCatalogItems(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  try {
    return json(
      { items: await getCachedCatalogItems(env) },
      200,
      {
        "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=60",
      },
    );
  } catch {
    return json({ error: "Catalog is temporarily unavailable" }, 502);
  }
}
