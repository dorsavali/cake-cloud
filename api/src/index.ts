interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  SQUARE_ACCESS_TOKEN: string;
  SQUARE_APPLICATION_ID: string;
  SQUARE_ENVIRONMENT: "sandbox" | "production";
}

type SquareCatalogSearchResponse = {
  items?: unknown[];
  cursor?: string;
};

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });

const getSquareBaseUrl = (environment: Env["SQUARE_ENVIRONMENT"]) =>
  environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

async function getCatalogItems(env: Env): Promise<unknown[]> {
  if (!env.SQUARE_ACCESS_TOKEN) {
    throw new Error("Square access token is not configured");
  }

  const items: unknown[] = [];
  let cursor: string | undefined;

  do {
    const response = await fetch(
      `${getSquareBaseUrl(env.SQUARE_ENVIRONMENT)}/v2/catalog/search-catalog-items`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
          "content-type": "application/json",
          "square-version": "2026-08-19",
        },
        body: JSON.stringify(cursor ? { cursor } : {}),
      },
    );

    if (!response.ok) {
      // Never include Square's response body here: upstream diagnostics can
      // contain account data that must not be returned to the browser.
      throw new Error(`Square Catalog request failed (${response.status})`);
    }

    const page = (await response.json()) as SquareCatalogSearchResponse;
    items.push(...(page.items ?? []));
    cursor = page.cursor;
  } while (cursor);

  return items;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      if (request.method !== "GET") {
        return json({ error: "Method not allowed" }, 405);
      }

      return json({ status: "ok" });
    }

    if (url.pathname === "/api/catalog/items") {
      if (request.method !== "GET") {
        return json({ error: "Method not allowed" }, 405);
      }

      try {
        return json({ items: await getCatalogItems(env) });
      } catch {
        return json({ error: "Catalog is temporarily unavailable" }, 502);
      }
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
