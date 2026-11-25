import { json, methodNotAllowed } from "../http/json.js";
import { getCakeDesigns, type CakeDesign } from "../services/square.js";
import type { ApiEnv } from "../types/env.js";
import { storefrontSnapshot } from "../services/storefront-snapshot.js";

export function getCachedCakeDesigns(env: ApiEnv): Promise<CakeDesign[]> {
  return storefrontSnapshot(env, "cakes.json", "startup", () => getCakeDesigns(env));
}

export async function refreshCakeCatalogCache(env: ApiEnv): Promise<void> {
  await storefrontSnapshot(env, "cakes.json", "change", () => getCakeDesigns(env));
}

export async function handleCakeCatalog(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed();

  try {
    const designs = await getCachedCakeDesigns(env);
    return json({ designs });
  } catch (error) {
    console.error("[api] Cake catalog endpoint failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Custom cakes are temporarily unavailable" }, 502);
  }
}
