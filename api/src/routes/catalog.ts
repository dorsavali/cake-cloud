import { json, methodNotAllowed } from "../http/json.js";
import {
  getCatalogItems,
  stripInventoryMetadata,
} from "../services/square.js";
import type { ApiEnv } from "../types/env.js";

type CatalogItems = Awaited<ReturnType<typeof getCatalogItems>>;

type CatalogOptions = {
  includeInventory?: boolean;
  includePopularity?: boolean;
  variant?: string;
};

type CatalogSnapshot = {
  refreshedAt: number;
  workerVersion?: string;
  items: CatalogItems;
};

type SnapshotBucket = NonNullable<ApiEnv["STOREFRONT_CACHE"]>;

const snapshotKey = (env: ApiEnv) =>
  `storefront/v1/${env.SQUARE_ENVIRONMENT}/${encodeURIComponent(env.SQUARE_APPLICATION_ID)}/${encodeURIComponent(env.SQUARE_LOCATION_ID ?? "all")}/menu.json`;

async function readSnapshot(bucket: SnapshotBucket, key: string) {
  const object = await bucket.get(key);
  if (!object) return null;
  const snapshot = await object.json<CatalogSnapshot>();
  if (!Array.isArray(snapshot.items) || !Number.isFinite(snapshot.refreshedAt)) {
    throw new Error("Invalid storefront snapshot");
  }
  return { snapshot, etag: object.etag };
}

async function refreshSnapshot(
  env: ApiEnv,
  bucket: SnapshotBucket,
  key: string,
  current: Awaited<ReturnType<typeof readSnapshot>>,
  reason: "startup" | "scheduled" | "change",
): Promise<CatalogItems> {
  const workerVersion = env.CF_VERSION_METADATA?.id;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (reason === "startup" && current && current.snapshot.workerVersion === workerVersion) {
      return current.snapshot.items;
    }

    const items = await getCatalogItems(env, {
      includePopularity: reason !== "change" || !current,
      requireInventory: true,
    });
    if (reason === "change" && current) {
      const previousScores = Object.fromEntries(
        current.snapshot.items.map(({ id, popularityScore }) => [id, popularityScore]),
      );
      for (const item of items) item.popularityScore = previousScores[item.id] ?? 0;
    }
    const snapshot: CatalogSnapshot = {
      refreshedAt: Date.now(),
      workerVersion,
      items,
    };
    const saved = await bucket.put(key, JSON.stringify(snapshot), {
      onlyIf: current ? { etagMatches: current.etag } : { etagDoesNotMatch: "*" },
      httpMetadata: { contentType: "application/json" },
    });
    if (saved) return items;
    current = await readSnapshot(bucket, key);
  }
  throw new Error("Concurrent storefront refresh did not settle");
}

export async function getCachedCatalogItems(
  env: ApiEnv,
  options: CatalogOptions = {},
): Promise<CatalogItems> {
  const bucket = env.STOREFRONT_CACHE;
  if (!bucket) return getCatalogItems(env, options);

  const key = snapshotKey(env);
  const current = await readSnapshot(bucket, key);
  try {
    return await refreshSnapshot(env, bucket, key, current, "startup");
  } catch (error) {
    if (!current) throw error;
    console.error("[catalog] Refresh failed, serving stale cache", {
      variant: options.variant ?? "full",
      cacheAgeSeconds: Math.round((Date.now() - current.snapshot.refreshedAt) / 1000),
      error: error instanceof Error ? error.message : String(error),
    });
    return current.snapshot.items;
  }
}

async function refreshCatalog(
  env: ApiEnv,
  reason: "scheduled" | "change",
): Promise<void> {
  const bucket = env.STOREFRONT_CACHE;
  if (!bucket) {
    await getCatalogItems(env, { includePopularity: reason === "scheduled" });
    return;
  }
  const key = snapshotKey(env);
  await refreshSnapshot(env, bucket, key, await readSnapshot(bucket, key), reason);
}

export async function refreshCatalogCache(env: ApiEnv): Promise<void> {
  await refreshCatalog(env, "scheduled");
}

export async function refreshStorefrontCatalogCaches(env: ApiEnv): Promise<void> {
  await refreshCatalog(env, "change");
}

export async function refreshHostCatalogCache(env: ApiEnv): Promise<void> {
  await refreshCatalog(env, "change");
}

export async function handleCatalogItems(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  try {
    const items = (await getCachedCatalogItems(env)).map((item) => {
      const { customAttributes: _customAttributes, ...product } =
        stripInventoryMetadata(item);
      return product;
    });
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
