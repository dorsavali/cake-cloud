import assert from "node:assert/strict";
import { test } from "node:test";

import { getFreshInventoryByVariation } from "../dist/services/square.js";

test("fresh inventory checks bypass storefront storage and deduplicate variation IDs", async (t) => {
  const env = {
    SQUARE_ACCESS_TOKEN: "test-token",
    SQUARE_ENVIRONMENT: "sandbox",
    SQUARE_LOCATION_ID: "test-location",
  };
  let requests = 0;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    requests += 1;
    const body = JSON.parse(options.body);
    assert.deepEqual(body.catalog_object_ids, ["variation"]);
    assert.deepEqual(body.location_ids, ["test-location"]);
    return Response.json({ counts: [
      { catalog_object_id: "variation", state: "IN_STOCK", quantity: String(6 - requests) },
    ] });
  });

  assert.equal((await getFreshInventoryByVariation(env, ["variation", "variation"])).get("variation"), 5);
  assert.equal((await getFreshInventoryByVariation(env, ["variation"])).get("variation"), 4);
});
