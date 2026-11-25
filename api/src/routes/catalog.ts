import { json, methodNotAllowed } from "../http/json.js";
import {
  getCatalogItems,
  stripInventoryMetadata,
} from "../services/square.js";
import type { ApiEnv } from "../types/env.js";
import { storefrontSnapshot } from "../services/storefront-snapshot.js";

type CatalogItems = Awaited<ReturnType<typeof getCatalogItems>>;

function loadMenu(env: ApiEnv, includePopularity: boolean) {
  return getCatalogItems(env, { includePopularity, requireInventory: true });
}

export function getCachedCatalogItems(env: ApiEnv): Promise<CatalogItems> {
  return storefrontSnapshot(env, "menu.json", "startup", () => loadMenu(env, true));
}

export async function refreshCatalogCache(env: ApiEnv): Promise<void> {
  await storefrontSnapshot(env, "menu.json", "scheduled", () => loadMenu(env, true));
}

export async function refreshStorefrontCatalogCaches(env: ApiEnv): Promise<void> {
  await storefrontSnapshot<CatalogItems[number]>(env, "menu.json", "change", async (previous) => {
    const items = await loadMenu(env, !previous);
    if (previous) {
      const scores = Object.fromEntries(previous.map(({ id, popularityScore }) => [id, popularityScore]));
      for (const item of items) item.popularityScore = scores[item.id] ?? 0;
    }
    return items;
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
    const items = (await getCachedCatalogItems(env)).map((item) => {
      const { customAttributes: _customAttributes, ...product } =
        stripInventoryMetadata(item);
      return product;
    });
    return json({ items });
  } catch (error) {
    console.error("[api] Catalog endpoint failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Catalog is temporarily unavailable" }, 502);
  }
}
