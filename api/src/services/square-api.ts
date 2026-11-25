import type { ApiEnv } from "../types/env.js";

export function squareFetch(
  env: ApiEnv,
  path: `/v2/${string}`,
  { method = "GET", body, timeoutMs = 15_000 }: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<Response> {
  const baseUrl = env.SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
  return fetch(baseUrl + path, {
    method,
    headers: {
      authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      "Square-Version": "2026-08-19",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function squareApi<T>(
  env: ApiEnv,
  path: `/v2/${string}`,
  body?: unknown,
): Promise<T> {
  const response = await squareFetch(env, path, {
    method: body === undefined ? "GET" : "PUT",
    body,
  });
  if (!response.ok) throw new Error("Square verification unavailable");
  return response.json() as Promise<T>;
}
