import assert from "node:assert/strict";
import { test } from "node:test";

import { refreshStorefrontInventory } from "../dist/services/square.js";

const makeProduct = ({
  availableWithoutStock = true,
  id = "item",
  variationId = "variation",
} = {}) => ({
  id,
  variationId,
  name: "Test item",
  description: "",
  descriptionHtml: "",
  variationName: "Regular",
  price: { amount: 1000, currency: "AUD" },
  variations: [
    {
      id: variationId,
      name: "Regular",
      price: { amount: 1000, currency: "AUD" },
      stock: 0,
      available: false,
      inventoryTracked: true,
      availableWithoutStock,
    },
  ],
  modifierLists: [],
  image: null,
  images: [],
  categories: ["Daily Menu"],
  categoryPaths: [["Cakes", "Daily Menu"]],
  dailyMenuCategories: ["Cakes"],
  ingredients: "",
  dietaryPreferences: [],
  allergens: [],
  stock: 0,
  available: false,
  popularityScore: 0,
  customAttributes: {},
});

const makeEnv = () => ({
  SQUARE_ACCESS_TOKEN: "test-token",
  SQUARE_APPLICATION_ID: crypto.randomUUID(),
  SQUARE_ENVIRONMENT: "sandbox",
  SQUARE_LOCATION_ID: "test-location",
});

test("inventory refresh batches and deduplicates concurrent Square requests", async (t) => {
  const env = makeEnv();
  let requests = 0;
  let requestBody;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    requests += 1;
    requestBody = JSON.parse(options.body);
    return Response.json({
      counts: [
        {
          catalog_object_id: "variation",
          state: "IN_STOCK",
          quantity: "5",
        },
      ],
    });
  });

  const product = makeProduct();
  const [first, second] = await Promise.all([
    refreshStorefrontInventory(env, [product]),
    refreshStorefrontInventory(env, [product]),
  ]);

  assert.equal(requests, 1);
  assert.deepEqual(requestBody.location_ids, ["test-location"]);
  assert.equal(first[0].stock, 5);
  assert.equal(first[0].available, true);
  assert.deepEqual(second, first);
});

test("manual Square sold-out status still wins over a positive stock count", async (t) => {
  const env = makeEnv();
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      counts: [
        {
          catalog_object_id: "variation",
          state: "IN_STOCK",
          quantity: "5",
        },
      ],
    }),
  );

  const [product] = await refreshStorefrontInventory(env, [
    makeProduct({ availableWithoutStock: false }),
  ]);

  assert.equal(product.stock, 5);
  assert.equal(product.available, false);
});

test("a failed Square refresh keeps the last healthy inventory", async (t) => {
  const env = makeEnv();
  let now = 1_000_000;
  let requests = 0;
  t.mock.method(Date, "now", () => now);
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async () => {
    requests += 1;
    if (requests === 1) {
      return Response.json({
        counts: [
          {
            catalog_object_id: "variation",
            state: "IN_STOCK",
            quantity: "5",
          },
        ],
      });
    }
    return new Response(null, { status: 429, statusText: "Too Many Requests" });
  });

  const product = makeProduct();
  const [healthy] = await refreshStorefrontInventory(env, [product]);
  now += 16_000;
  const [stale] = await refreshStorefrontInventory(env, [product]);

  assert.equal(requests, 2);
  assert.equal(healthy.stock, 5);
  assert.equal(stale.stock, 5);
  assert.equal(stale.available, true);
});
