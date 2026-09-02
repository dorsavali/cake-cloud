export function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export const methodNotAllowed = () => json({ error: "Method not allowed" }, 405);
export const notFound = () => json({ error: "Not found" }, 404);
