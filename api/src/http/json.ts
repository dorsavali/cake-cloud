export function json(
  body: unknown,
  status = 200,
  headers: HeadersInit = { "cache-control": "no-store" },
): Response {
  return Response.json(body, {
    status,
    headers,
  });
}

export const methodNotAllowed = () => json({ error: "Method not allowed" }, 405);
export const notFound = () => json({ error: "Not found" }, 404);
