import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getCatalogItems,
  SquareInventoryUnavailableError,
} from "../dist/services/square.js";

const env = {
  SQUARE_ACCESS_TOKEN: "test-token",
  SQUARE_APPLICATION_ID: "test-app",
  SQUARE_ENVIRONMENT: "sandbox",
  SQUARE_LOCATION_ID: "test-location",
};

const trackedItem = {
  type: "ITEM",
  id: "cake",
  present_at_all_locations: true,
  item_data: {
    name: "Tracked cake",
    variations: [
      {
        id: "cake-variation",
        present_at_all_locations: true,
        item_variation_data: {
          name: "Regular",
          pricing_type: "FIXED_PRICING",
          price_money: { amount: 1000, currency: "AUD" },
          track_inventory: true,
        },
      },
    ],
  },
};

test("checkout fails closed when Square inventory cannot be read", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async (url) =>
    String(url).includes("/v2/catalog/list")
      ? Response.json({ objects: [trackedItem] })
      : new Response(null, { status: 503 }),
  );

  await assert.rejects(
    getCatalogItems(env, {
      includePopularity: false,
      requireInventory: true,
    }),
    SquareInventoryUnavailableError,
  );
});

test("catalog browsing can still use its existing fallback", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async (url) =>
    String(url).includes("/v2/catalog/list")
      ? Response.json({ objects: [trackedItem] })
      : new Response(null, { status: 503 }),
  );

  const [product] = await getCatalogItems(env, { includePopularity: false });
  assert.equal(product.variations[0].stock, null);
  assert.equal(product.variations[0].available, true);
});
