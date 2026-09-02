import { handleApiRequest, type ApiEnv } from "./handler.js";

interface Env extends ApiEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (await handleApiRequest(request, env)) ?? env.ASSETS.fetch(request);
  },
};
