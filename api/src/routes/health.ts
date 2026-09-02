import { json, methodNotAllowed } from "../http/json.js";

export function handleHealth(request: Request): Response {
  if (request.method !== "GET") {
    return methodNotAllowed();
  }

  return json({ status: "ok" });
}
