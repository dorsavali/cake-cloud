import { json, methodNotAllowed } from "../http/json.js";
import { invalidateCatalogCache } from "./catalog.js";
import type { ApiEnv } from "../types/env.js";

const supportedEvents = new Set([
  "catalog.version.updated",
  "inventory.count.updated",
]);
const processedEvents = new Map<string, number>();
const processedEventDurationMs = 24 * 60 * 60 * 1000;

type SquareWebhookEvent = {
  event_id?: string;
  type?: string;
};

function decodeBase64(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const decoded = atob(value);
    const bytes = new Uint8Array(new ArrayBuffer(decoded.length));
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function hasValidSquareSignature(
  signature: string,
  body: string,
  notificationUrl: string,
  signatureKey: string,
): Promise<boolean> {
  const signatureBytes = decodeBase64(signature);
  if (!signatureBytes || !signatureKey || !notificationUrl) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signatureKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(notificationUrl + body),
  );
}

function removeExpiredEventIds() {
  const now = Date.now();
  for (const [eventId, expiresAt] of processedEvents) {
    if (expiresAt <= now) processedEvents.delete(eventId);
  }
}

export async function handleSquareWebhook(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed();

  const rawBody = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature") ?? "";
  const notificationUrl = env.SQUARE_WEBHOOK_NOTIFICATION_URL || request.url;
  const isValid = await hasValidSquareSignature(
    signature,
    rawBody,
    notificationUrl,
    env.SQUARE_WEBHOOK_SIGNATURE_KEY,
  );

  if (!isValid) return json({ error: "Invalid webhook signature" }, 403);

  let event: SquareWebhookEvent;
  try {
    event = JSON.parse(rawBody) as SquareWebhookEvent;
  } catch {
    return json({ error: "Invalid webhook payload" }, 400);
  }

  removeExpiredEventIds();
  if (event.event_id && processedEvents.has(event.event_id)) {
    return json({ received: true });
  }

  if (event.event_id) {
    processedEvents.set(
      event.event_id,
      Date.now() + processedEventDurationMs,
    );
  }
  if (event.type && supportedEvents.has(event.type)) {
    invalidateCatalogCache(env);
  }

  return json({ received: true });
}
