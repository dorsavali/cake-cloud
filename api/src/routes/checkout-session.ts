import { json, methodNotAllowed } from "../http/json.js";

export function handleCheckoutSession(request: Request): Response {
  if (request.method !== "POST") return methodNotAllowed();
  // Generate once before checkout; the client retains it for network retries.
  return json({ idempotencyKey: crypto.randomUUID() });
}
