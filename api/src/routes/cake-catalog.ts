import { json, methodNotAllowed } from "../http/json.js";
import { getCakeDesigns, type CakeDesign } from "../services/square.js";
import type { ApiEnv } from "../types/env.js";

type CakeDesigns = CakeDesign[];

const cache = new Map<string, { expiresAt: number; designs: CakeDesigns }>();
const requests = new Map<string, Promise<CakeDesigns>>();
// Keep the expensive cake hierarchy warm for a day. Square catalog webhooks
// invalidate and eagerly refresh it as soon as a catalog change is published.
const cacheDurationMs = 24 * 60 * 60 * 1000;

const cacheKey = (env: ApiEnv) =>
  `cake:v4:${env.SQUARE_ENVIRONMENT}:${env.SQUARE_APPLICATION_ID}:${env.SQUARE_LOCATION_ID ?? "all"}`;

export async function getCachedCakeDesigns(env: ApiEnv): Promise<CakeDesigns> {
  const key = cacheKey(env);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.designs;

  const existing = requests.get(key);
  if (existing) {
    try {
      return await existing;
    } catch (error) {
      if (cached) return cached.designs;
      throw error;
    }
  }

  const request = getCakeDesigns(env)
    .then((designs) => {
      cache.set(key, { expiresAt: Date.now() + cacheDurationMs, designs });
      return designs;
    })
    .finally(() => requests.delete(key));

  requests.set(key, request);
  try {
    return await request;
  } catch (error) {
    // Keep serving the last healthy design catalogue during a temporary
    // Square failure. A later webhook or scheduled refresh will replace it.
    if (cached) return cached.designs;
    throw error;
  }
}

export async function refreshCakeCatalogCache(env: ApiEnv): Promise<void> {
  const key = cacheKey(env);
  const existingRequest = requests.get(key);
  if (existingRequest) {
    await existingRequest;
    return;
  }

  const request = getCakeDesigns(env)
    .then((designs) => {
      cache.set(key, { expiresAt: Date.now() + cacheDurationMs, designs });
      return designs;
    })
    .finally(() => requests.delete(key));

  requests.set(key, request);
  await request;
}

export async function handleCakeCatalog(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed();

  try {
    const designs = await getCachedCakeDesigns(env);
    return json(
      { designs },
      200,
      {
        "cache-control":
          "public, max-age=30, s-maxage=60, stale-while-revalidate=60",
      },
    );
  } catch (error) {
    console.error("[api] Cake catalog endpoint failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Custom cakes are temporarily unavailable" }, 502);
  }
}
