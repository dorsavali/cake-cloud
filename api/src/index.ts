import { handleApiRequest } from "./handler.js";
import { refreshCatalogCache } from "./routes/catalog.js";
import { refreshCakeCatalogCache } from "./routes/cake-catalog.js";
import type { WorkerEnv } from "./types/env.js";

export { DailyInventoryReservations } from "./durable-objects/daily-inventory-reservations.js";

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return (await handleApiRequest(request, env)) ?? env.ASSETS.fetch(request);
  },
  scheduled(
    controller: { cron: string },
    env: WorkerEnv,
    context: WorkerExecutionContext,
  ): void {
    context.waitUntil(
      controller.cron === "0 0,12 * * *"
        ? refreshCatalogCache(env)
        : refreshCakeCatalogCache(env),
    );
  },
};
