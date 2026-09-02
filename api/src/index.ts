import { handleApiRequest } from "./handler.js";
import type { WorkerEnv } from "./types/env.js";

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return (await handleApiRequest(request, env)) ?? env.ASSETS.fetch(request);
  },
};
