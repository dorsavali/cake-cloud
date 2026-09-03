import { handleApiRequest } from "./handler.js";
import { refreshCatalogCache } from "./routes/catalog.js";
import type { WorkerEnv } from "./types/env.js";

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return (await handleApiRequest(request, env)) ?? env.ASSETS.fetch(request);
  },
  scheduled(
    _controller: unknown,
    env: WorkerEnv,
    context: WorkerExecutionContext,
  ): void {
    context.waitUntil(refreshCatalogCache(env));
  },
};
