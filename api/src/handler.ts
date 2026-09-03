import { notFound } from "./http/json.js";
import { handleCatalogItems } from "./routes/catalog.js";
import { handleHealth } from "./routes/health.js";
import { handleSquareWebhook } from "./routes/square-webhook.js";
import type { ApiEnv } from "./types/env.js";

export async function handleApiRequest(
  request: Request,
  env: ApiEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === "/api/health") {
    return handleHealth(request);
  }

  if (url.pathname === "/api/products") {
    return handleCatalogItems(request, env);
  }

  if (url.pathname === "/api/webhooks/square") {
    return handleSquareWebhook(request, env);
  }

  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    return notFound();
  }

  return null;
}
