type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const requestsByClient = new Map<string, RateLimitEntry>();
const windowDurationMs = 60_000;
const requestLimit = 120;

function getClientId(request: Request): string {
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  if (cloudflareIp) return cloudflareIp;

  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedIp || "local-development";
}

function removeExpiredEntries(now: number) {
  if (requestsByClient.size < 1_000) return;
  for (const [clientId, entry] of requestsByClient) {
    if (entry.resetAt <= now) requestsByClient.delete(clientId);
  }
}

export function applyPublicApiRateLimit(request: Request): Response | null {
  const now = Date.now();
  const clientId = getClientId(request);
  const existing = requestsByClient.get(clientId);
  const entry =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + windowDurationMs };

  entry.count += 1;
  requestsByClient.set(clientId, entry);
  removeExpiredEntries(now);

  if (entry.count <= requestLimit) return null;

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((entry.resetAt - now) / 1000),
  );
  return Response.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": String(retryAfterSeconds),
        "x-ratelimit-limit": String(requestLimit),
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(Math.ceil(entry.resetAt / 1000)),
      },
    },
  );
}
