import { json, methodNotAllowed } from "../http/json.js";
import { getCatalogItems } from "../services/square.js";
import type { ApiEnv } from "../types/env.js";

export async function handleCatalogItems(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  try {
    return json({ items: await getCatalogItems(env) });
  } catch {
    return json({ error: "Catalog is temporarily unavailable" }, 502);
  }
}
