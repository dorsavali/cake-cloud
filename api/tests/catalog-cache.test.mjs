import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getCachedCatalogItems,
  refreshStorefrontCatalogCaches,
} from "../dist/routes/catalog.js";

test("a failed Square refresh keeps the last healthy storefront cache", async (t) => {
  const env = {
    SQUARE_ACCESS_TOKEN: "test-token",
    SQUARE_APPLICATION_ID: crypto.randomUUID(),
    SQUARE_ENVIRONMENT: "sandbox",
    SQUARE_LOCATION_ID: "test-location",
  };
  let requests = 0;
  let squareAvailable = true;

  t.mock.method(globalThis, "fetch", async () => {
    requests += 1;
    if (!squareAvailable) {
      throw new Error("Square is temporarily unavailable");
    }
    return Response.json({ objects: [] });
  });

  const cached = await getCachedCatalogItems(env, {
    includePopularity: false,
    variant: "daily-menu",
  });
  assert.deepEqual(cached, []);

  squareAvailable = false;
  await assert.rejects(refreshStorefrontCatalogCaches(env));
  const servedAfterFailure = await getCachedCatalogItems(env, {
    includePopularity: false,
    variant: "daily-menu",
  });

  assert.deepEqual(servedAfterFailure, cached);
  assert.equal(requests, 2);
});
