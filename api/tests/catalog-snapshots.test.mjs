import { test } from "node:test";
import assert from "node:assert/strict";

import { getCatalogItemSnapshots } from "../dist/services/square.js";

const env = {
  SQUARE_ACCESS_TOKEN: "test-only-secret",
  SQUARE_APPLICATION_ID: "app",
  SQUARE_LOCATION_ID: "location",
  SQUARE_ENVIRONMENT: "sandbox",
};

const item = (overrides = {}) => ({
  type: "ITEM",
  id: "package",
  item_data: {
    name: "Morning Pastry Box",
    variations: [{
      id: "variation",
      item_variation_data: {
        name: "Regular",
        pricing_type: "FIXED_PRICING",
        price_money: { amount: 1800, currency: "AUD" },
        location_overrides: [{ location_id: "location", sold_out: false }],
      },
    }],
  },
  ...overrides,
});

test("checkout validation retrieves only requested Square items", async (t) => {
  let requestBody;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return Response.json({ objects: [item()] });
  });

  const snapshots = await getCatalogItemSnapshots(env, ["package", "package"]);
  assert.deepEqual(requestBody, {
    object_ids: ["package"],
    include_related_objects: false,
  });
  assert.deepEqual(snapshots.get("package"), {
    id: "package",
    variationId: "variation",
    price: { amount: 1800, currency: "AUD" },
    available: true,
  });
});

test("archived and sold-out Square items cannot pass checkout validation", async (t) => {
  let response = item({ item_data: { ...item().item_data, is_archived: true } });
  t.mock.method(globalThis, "fetch", async () => Response.json({ objects: [response] }));
  let snapshots = await getCatalogItemSnapshots(env, ["package"]);
  assert.equal(snapshots.get("package").available, false);

  response = item({
    item_data: {
      ...item().item_data,
      variations: [{
        ...item().item_data.variations[0],
        item_variation_data: {
          ...item().item_data.variations[0].item_variation_data,
          location_overrides: [{ location_id: "location", sold_out: true }],
        },
      }],
    },
  });
  snapshots = await getCatalogItemSnapshots(env, ["package"]);
  assert.equal(snapshots.get("package").available, false);
});

test("an item disabled for the Cake Cloud location is unavailable", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    objects: [item({
      present_at_all_locations: false,
      present_at_location_ids: ["another-location"],
    })],
  }));
  const snapshots = await getCatalogItemSnapshots(env, ["package"]);
  assert.equal(snapshots.get("package").available, false);
});
