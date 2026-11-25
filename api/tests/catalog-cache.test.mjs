import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getCachedCatalogItems,
  refreshCatalogCache,
  refreshStorefrontCatalogCaches,
} from "../dist/routes/catalog.js";

function makeBucket() {
  let value = null;
  let revision = 0;
  return {
    async get() {
      if (value === null) return null;
      const data = value;
      return { etag: String(revision), json: async () => JSON.parse(data) };
    },
    async put(_key, data, { onlyIf }) {
      if ("etagMatches" in onlyIf ? onlyIf.etagMatches !== String(revision) : value !== null) {
        return null;
      }
      value = data;
      revision += 1;
      return {};
    },
  };
}

test("a failed Square refresh keeps the last healthy storefront cache", async (t) => {
  const env = {
    SQUARE_ACCESS_TOKEN: "test-token",
    SQUARE_APPLICATION_ID: crypto.randomUUID(),
    SQUARE_ENVIRONMENT: "sandbox",
    SQUARE_LOCATION_ID: "test-location",
    STOREFRONT_CACHE: makeBucket(),
  };
  let requests = 0;
  let squareAvailable = true;

  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.endsWith("/v2/locations")) return Response.json({ locations: [] });
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

test("storefront shares stock across Worker requests and refreshes on events, cron and deployment", async (t) => {
  const env = {
    SQUARE_ACCESS_TOKEN: "test-token",
    SQUARE_APPLICATION_ID: "test-app",
    SQUARE_ENVIRONMENT: "sandbox",
    SQUARE_LOCATION_ID: "test-location",
    STOREFRONT_CACHE: makeBucket(),
    CF_VERSION_METADATA: { id: "deployment-one" },
  };
  let stock = 5;
  let soldOut = false;
  let inventoryAvailable = true;
  let inventoryReads = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.endsWith("/v2/locations")) return Response.json({ locations: [] });
    if (url.includes("/v2/inventory/")) {
      inventoryReads += 1;
      if (!inventoryAvailable) return new Response(null, { status: 503 });
      return Response.json({ counts: [
        { catalog_object_id: "variation", state: "IN_STOCK", quantity: String(stock) },
      ] });
    }
    return Response.json({ objects: [{
      id: "item",
      type: "ITEM",
      item_data: {
        name: "Test item",
        variations: [{
          id: "variation",
          item_variation_data: {
            name: "Regular",
            pricing_type: "FIXED_PRICING",
            price_money: { amount: 1000, currency: "AUD" },
            track_inventory: true,
            location_overrides: [{ location_id: "test-location", sold_out: soldOut }],
          },
        }],
      },
    }] });
  });
  const read = async (worker = { ...env }) => (await getCachedCatalogItems(worker))[0];

  assert.equal((await read()).stock, 5);
  stock = 3;
  assert.equal((await read()).stock, 5);
  assert.equal(inventoryReads, 1);

  soldOut = true;
  await refreshStorefrontCatalogCaches(env);
  const refreshed = await read();
  assert.equal(refreshed.stock, 3);
  assert.equal(refreshed.available, false);

  soldOut = false;
  await refreshCatalogCache(env);
  assert.equal((await read()).available, true);

  stock = 2;
  const deployed = { ...env, CF_VERSION_METADATA: { id: "deployment-two" } };
  assert.equal((await read(deployed)).stock, 2);
  assert.equal((await read(deployed)).stock, 2);
  assert.equal(inventoryReads, 4);

  inventoryAvailable = false;
  t.mock.method(console, "error", () => {});
  await assert.rejects(refreshCatalogCache(deployed));
  assert.equal((await read(deployed)).stock, 2);
  assert.equal(inventoryReads, 5);
});
