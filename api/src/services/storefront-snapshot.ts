import type { ApiEnv } from "../types/env.js";

type Snapshot<T> = { items: T[]; refreshedAt: number; workerVersion?: string };
type SnapshotBucket = NonNullable<ApiEnv["STOREFRONT_CACHE"]>;
type RefreshReason = "startup" | "scheduled" | "change";

async function readSnapshot<T>(bucket: SnapshotBucket, key: string) {
  const object = await bucket.get(key);
  if (!object) return null;
  const snapshot = await object.json<Snapshot<T>>();
  if (!Array.isArray(snapshot.items) || !Number.isFinite(snapshot.refreshedAt)) {
    throw new Error("Invalid storefront snapshot");
  }
  return { snapshot, etag: object.etag };
}

export async function storefrontSnapshot<T>(
  env: ApiEnv,
  file: "menu.json" | "cakes.json",
  reason: RefreshReason,
  load: (previous: T[] | undefined) => Promise<T[]>,
): Promise<T[]> {
  const bucket = env.STOREFRONT_CACHE;
  if (!bucket) throw new Error("Storefront R2 storage is not configured");

  const key = `storefront/v1/${env.SQUARE_ENVIRONMENT}/${encodeURIComponent(env.SQUARE_APPLICATION_ID)}/${encodeURIComponent(env.SQUARE_LOCATION_ID ?? "all")}/${file}`;
  const workerVersion = env.CF_VERSION_METADATA?.id;
  let current = await readSnapshot<T>(bucket, key);
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (reason === "startup" && current && current.snapshot.workerVersion === workerVersion) {
        return current.snapshot.items;
      }
      const items = await load(current?.snapshot.items);
      const snapshot: Snapshot<T> = { items, refreshedAt: Date.now(), workerVersion };
      const saved = await bucket.put(key, JSON.stringify(snapshot), {
        onlyIf: current ? { etagMatches: current.etag } : { etagDoesNotMatch: "*" },
        httpMetadata: { contentType: "application/json" },
      });
      if (saved) return items;
      current = await readSnapshot<T>(bucket, key);
    }
    throw new Error("Concurrent storefront refresh did not settle");
  } catch (error) {
    if (reason !== "startup" || !current) throw error;
    console.error("[catalog] Refresh failed, serving stale cache", {
      file,
      cacheAgeSeconds: Math.round((Date.now() - current.snapshot.refreshedAt) / 1000),
      error: error instanceof Error ? error.message : String(error),
    });
    return current.snapshot.items;
  }
}
