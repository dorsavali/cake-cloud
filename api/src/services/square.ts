import type { ApiEnv } from "../types/env.js";

type SquareMoney = { amount?: number; currency?: string };
type SquareModifierOverride = {
  modifier_id?: string;
  on_by_default?: boolean;
  on_by_default_override?: string;
  hidden_online_override?: string;
};

type SquareCatalogObject = {
  type?: string;
  id?: string;
  is_deleted?: boolean;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
  custom_attribute_values?: Record<
    string,
    {
      name?: string;
      string_value?: string;
      number_value?: string;
      boolean_value?: boolean;
      selection_uid_values?: string[];
    }
  >;
  item_data?: {
    name?: string;
    description?: string;
    description_html?: string;
    description_plaintext?: string;
    is_archived?: boolean;
    image_ids?: string[];
    categories?: Array<{ id?: string }>;
    food_and_beverage_details?: {
      dietary_preferences?: Array<{
        standard_name?: string;
        custom_name?: string;
      }>;
      ingredients?: Array<{
        standard_name?: string;
        custom_name?: string;
      }>;
    };
    variations?: Array<{
      id?: string;
      present_at_all_locations?: boolean;
      present_at_location_ids?: string[];
      absent_at_location_ids?: string[];
      item_variation_data?: {
        name?: string;
        ordinal?: number;
        pricing_type?: string;
        price_money?: SquareMoney;
        image_ids?: string[];
        track_inventory?: boolean;
        location_overrides?: Array<{
          location_id?: string;
          pricing_type?: string;
          price_money?: SquareMoney;
          sold_out?: boolean;
        }>;
      };
    }>;
    modifier_list_info?: Array<{
      modifier_list_id?: string;
      enabled?: boolean;
      hidden_online?: boolean;
      ordinal?: number;
      min_selected_modifiers?: number;
      max_selected_modifiers?: number;
      modifier_overrides?: SquareModifierOverride[];
    }>;
  };
  modifier_list_data?: {
    name?: string;
    ordinal?: number;
    selection_type?: string;
    allow_quantities?: boolean;
    min_selected_modifiers?: number;
    max_selected_modifiers?: number;
    hidden_from_customer?: boolean;
    modifiers?: SquareCatalogObject[];
  };
  modifier_data?: {
    name?: string;
    price_money?: SquareMoney;
    on_by_default?: boolean;
    hidden_online?: boolean;
    ordinal?: number;
    modifier_list_id?: string;
    location_overrides?: Array<{
      location_id?: string;
      price_money?: SquareMoney;
      sold_out?: boolean;
    }>;
  };
  image_data?: { url?: string };
  category_data?: {
    name?: string;
    image_ids?: string[];
    parent_category?: { id?: string; ordinal?: number };
  };
  custom_attribute_definition_data?: {
    name?: string;
    selection_config?: {
      allowed_selections?: Array<{ uid?: string; name?: string }>;
    };
  };
};

type SquareCatalogListResponse = {
  objects?: SquareCatalogObject[];
  related_objects?: SquareCatalogObject[];
  cursor?: string;
};

export type CatalogItemSnapshot = {
  id: string;
  variationId: string | null;
  price: { amount: number; currency: string };
  available: boolean;
};

export type StorefrontProduct = {
  id: string;
  variationId: string | null;
  name: string;
  description: string;
  descriptionHtml: string;
  variationName: string;
  price: { amount: number; currency: string };
  variations: Array<{
    id: string;
    name: string;
    price: { amount: number; currency: string };
    stock: number | null;
    available: boolean;
    inventoryTracked: boolean;
    availableWithoutStock: boolean;
  }>;
  modifierLists: Array<{
    id: string;
    name: string;
    minSelected: number;
    maxSelected: number;
    modifiers: Array<{
      id: string;
      name: string;
      price: number;
      defaultSelected: boolean;
    }>;
  }>;
  image: string | null;
  images: string[];
  categories: string[];
  categoryPaths: string[][];
  dailyMenuCategories: string[];
  ingredients: string;
  dietaryPreferences: string[];
  allergens: string[];
  stock: number | null;
  available: boolean;
  popularityScore: number;
  customAttributes: Record<string, string | number | boolean | string[]>;
};

export class SquareInventoryUnavailableError extends Error {
  constructor() {
    super("Square inventory is temporarily unavailable");
    this.name = "SquareInventoryUnavailableError";
  }
}

export function stripInventoryMetadata(product: StorefrontProduct) {
  return {
    ...product,
    variations: product.variations.map(
      ({
        inventoryTracked: _inventoryTracked,
        availableWithoutStock: _availableWithoutStock,
        ...variation
      }) => variation,
    ),
  };
}

type InventoryCount = {
  catalog_object_id?: string;
  state?: string;
  quantity?: string;
};

type BatchRetrieveInventoryCountsResponse = {
  counts?: InventoryCount[];
  cursor?: string;
};

type SquareOrder = {
  line_items?: Array<{
    catalog_object_id?: string;
    quantity?: string;
  }>;
};

type SearchOrdersResponse = {
  orders?: SquareOrder[];
  cursor?: string;
};

export const getSquareBaseUrl = (environment: ApiEnv["SQUARE_ENVIRONMENT"]) =>
  environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

export const isSquareCheckoutEnabled = (env: ApiEnv) =>
  env.SQUARE_ENVIRONMENT === "sandbox" ||
  (env.SQUARE_ENVIRONMENT === "production" &&
    env.SQUARE_PRODUCTION_CHECKOUT_ENABLED === "true");

const squareHeaders = (env: ApiEnv) => ({
  authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
  "square-version": "2026-08-19",
});

const squareResponseLog = (stage: string, response: Response) => ({
  stage,
  status: response.status,
  statusText: response.statusText,
  contentType: response.headers.get("content-type"),
  requestId:
    response.headers.get("x-request-id") ??
    response.headers.get("square-request-id") ??
    response.headers.get("cf-ray"),
});

const popularityCache = new Map<
  string,
  { expiresAt: number; quantities: Map<string, number> }
>();

type InventoryCacheEntry = {
  expiresAt: number;
  quantities: Map<string, number>;
  variationKey: string;
};

type InventoryBackoff = {
  attempts: number;
  retryAt: number;
};

const inventoryCache = new Map<string, InventoryCacheEntry>();
const inventoryRequests = new Map<string, Promise<Map<string, number> | null>>();
const inventoryBackoff = new Map<string, InventoryBackoff>();
const inventoryCacheDurationMs = 15_000;
const inventoryMaximumBackoffMs = 60_000;

const inventoryCacheKey = (env: ApiEnv) =>
  `${env.SQUARE_ENVIRONMENT}:${env.SQUARE_APPLICATION_ID}:${env.SQUARE_LOCATION_ID}`;

const inventoryVariationKey = (variationIds: string[]) =>
  [...variationIds].sort().join(",");

async function getInventoryByVariation(
  env: ApiEnv,
  variationIds: string[],
): Promise<Map<string, number> | null> {
  if (variationIds.length === 0) return new Map();

  const quantities = new Map<string, number>();
  let cursor: string | undefined;

  try {
    do {
      const response = await fetch(
        `${getSquareBaseUrl(env.SQUARE_ENVIRONMENT)}/v2/inventory/counts/batch-retrieve`,
        {
          method: "POST",
          headers: {
            ...squareHeaders(env),
            "content-type": "application/json",
          },
          body: JSON.stringify({
            catalog_object_ids: variationIds,
            location_ids: [env.SQUARE_LOCATION_ID],
            states: ["IN_STOCK"],
            limit: 1000,
            cursor,
          }),
        },
      );

      if (!response.ok) {
        console.error(
          "[square] Inventory request failed",
          squareResponseLog("inventory", response),
        );
        return null;
      }

      const page = (await response.json()) as BatchRetrieveInventoryCountsResponse;
      for (const count of page.counts ?? []) {
        if (!count.catalog_object_id || count.state !== "IN_STOCK") continue;
        const quantity = Number.parseFloat(count.quantity ?? "0");
        if (!Number.isFinite(quantity)) continue;
        quantities.set(
          count.catalog_object_id,
          (quantities.get(count.catalog_object_id) ?? 0) + quantity,
        );
      }
      cursor = page.cursor;
    } while (cursor);

    return quantities;
  } catch {
    return null;
  }
}

export async function getFreshInventoryByVariation(
  env: ApiEnv,
  variationIds: string[],
): Promise<Map<string, number> | null> {
  return getInventoryByVariation(env, [...new Set(variationIds)]);
}

async function getCachedInventoryByVariation(
  env: ApiEnv,
  variationIds: string[],
): Promise<Map<string, number> | null> {
  if (variationIds.length === 0) return new Map();

  const cacheKey = inventoryCacheKey(env);
  const variationKey = inventoryVariationKey(variationIds);
  const cached = inventoryCache.get(cacheKey);
  const now = Date.now();
  if (
    cached &&
    cached.variationKey === variationKey &&
    cached.expiresAt > now
  ) {
    return cached.quantities;
  }

  const backoff = inventoryBackoff.get(cacheKey);
  if (backoff && backoff.retryAt > now) {
    return cached?.variationKey === variationKey ? cached.quantities : null;
  }

  const existingRequest = inventoryRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = getInventoryByVariation(env, variationIds)
    .then((quantities) => {
      if (!quantities) {
        const attempts = (inventoryBackoff.get(cacheKey)?.attempts ?? 0) + 1;
        const exponentialDelay = Math.min(
          inventoryMaximumBackoffMs,
          1_000 * 2 ** Math.min(attempts - 1, 6),
        );
        const jitter = Math.floor(Math.random() * 500);
        inventoryBackoff.set(cacheKey, {
          attempts,
          retryAt: Date.now() + exponentialDelay + jitter,
        });
        return cached?.variationKey === variationKey
          ? cached.quantities
          : null;
      }

      inventoryBackoff.delete(cacheKey);
      inventoryCache.set(cacheKey, {
        expiresAt: Date.now() + inventoryCacheDurationMs,
        quantities,
        variationKey,
      });
      return quantities;
    })
    .finally(() => inventoryRequests.delete(cacheKey));

  inventoryRequests.set(cacheKey, request);
  return request;
}

export async function refreshStorefrontInventory(
  env: ApiEnv,
  products: StorefrontProduct[],
): Promise<StorefrontProduct[]> {
  const trackedVariationIds = products.flatMap((product) =>
    product.variations
      .filter((variation) => variation.inventoryTracked)
      .map((variation) => variation.id),
  );
  if (trackedVariationIds.length === 0) return products;

  const quantities = await getCachedInventoryByVariation(
    env,
    trackedVariationIds,
  );
  if (!quantities) return products;

  return products.map((product) => {
    const variations = product.variations.map((variation) => {
      if (!variation.inventoryTracked) return variation;
      const stock = quantities.get(variation.id) ?? 0;
      return {
        ...variation,
        stock,
        available: variation.availableWithoutStock && stock > 0,
      };
    });
    const primaryVariation =
      variations.find((variation) => variation.available) ?? variations[0];

    return {
      ...product,
      variationId: primaryVariation?.id ?? null,
      variationName: primaryVariation?.name ?? "",
      price: primaryVariation?.price ?? product.price,
      stock: primaryVariation?.stock ?? null,
      available: variations.some((variation) => variation.available),
      variations,
    };
  });
}

async function getPopularityByVariation(env: ApiEnv): Promise<Map<string, number>> {
  const cacheKey = `${env.SQUARE_ENVIRONMENT}:${env.SQUARE_APPLICATION_ID}`;
  const cached = popularityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.quantities;
  }

  const baseUrl = getSquareBaseUrl(env.SQUARE_ENVIRONMENT);
  const locationsResponse = await fetch(`${baseUrl}/v2/locations`, {
    headers: squareHeaders(env),
  });
  if (!locationsResponse.ok) {
    console.error(
      "[square] Locations request failed",
      squareResponseLog("locations", locationsResponse),
    );
    throw new Error(`Square Locations request failed (${locationsResponse.status})`);
  }

  const locationsData = (await locationsResponse.json()) as {
    locations?: Array<{ id?: string; status?: string }>;
  };
  const locationIds = (locationsData.locations ?? [])
    .filter((location) => location.id && location.status !== "INACTIVE")
    .map((location) => location.id as string);
  const quantities = new Map<string, number>();
  const startAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  for (let offset = 0; offset < locationIds.length; offset += 10) {
    const locationBatch = locationIds.slice(offset, offset + 10);
    let cursor: string | undefined;

    do {
      const response = await fetch(`${baseUrl}/v2/orders/search`, {
        method: "POST",
        headers: {
          ...squareHeaders(env),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          location_ids: locationBatch,
          cursor,
          limit: 1000,
          return_entries: false,
          query: {
            filter: {
              date_time_filter: {
                closed_at: { start_at: startAt },
              },
              state_filter: {
                states: ["COMPLETED"],
              },
            },
            sort: {
              sort_field: "CLOSED_AT",
              sort_order: "DESC",
            },
          },
        }),
      });

      if (!response.ok) {
        console.error(
          "[square] Orders request failed",
          squareResponseLog("orders", response),
        );
        throw new Error(`Square Orders request failed (${response.status})`);
      }

      const page = (await response.json()) as SearchOrdersResponse;
      for (const order of page.orders ?? []) {
        for (const lineItem of order.line_items ?? []) {
          if (!lineItem.catalog_object_id) continue;
          const quantity = Number.parseFloat(lineItem.quantity ?? "0");
          if (!Number.isFinite(quantity) || quantity <= 0) continue;
          quantities.set(
            lineItem.catalog_object_id,
            (quantities.get(lineItem.catalog_object_id) ?? 0) + quantity,
          );
        }
      }
      cursor = page.cursor;
    } while (cursor);
  }

  popularityCache.set(cacheKey, {
    expiresAt: Date.now() + 5 * 60 * 1000,
    quantities,
  });
  return quantities;
}

const variationSizeRank = (name: string) => {
  const normalized = name.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (/\b(extra small|x small|xs)\b/.test(normalized)) return 0;
  if (/\bsmall\b/.test(normalized)) return 1;
  if (/\b(medium|regular)\b/.test(normalized)) return 2;
  if (/\b(extra large|x large|xl)\b/.test(normalized)) return 4;
  if (/\blarge\b/.test(normalized)) return 3;
  return Number.POSITIVE_INFINITY;
};

const normalizeCategoryName = (name: string) =>
  name.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

export const maxModifierSelectionsForStorefront = (
  categories: string[],
  listName: string,
  squareLimit: number,
) => {
  const isDrink = categories.some((category) =>
    /\bdrinks?\b/.test(normalizeCategoryName(category)),
  );
  if (!isDrink) return squareLimit;
  return normalizeCategoryName(listName).includes("syrup") ? 0 : 1;
};

export const sanitizeSquareDescriptionHtml = (html: string) =>
  html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<[^>]*>/g, (tag) => {
      const match = /^<\s*(\/?)\s*(p|ul|ol|li|strong|em|br)\b[^>]*>$/i.exec(
        tag,
      );
      if (!match) return "";
      const [, closing, name] = match;
      return name.toLowerCase() === "br"
        ? "<br>"
        : `<${closing ? "/" : ""}${name.toLowerCase()}>`;
    });

const isPresentAtLocation = (
  object: {
    present_at_all_locations?: boolean;
    present_at_location_ids?: string[];
    absent_at_location_ids?: string[];
  },
  locationId?: string,
) => {
  if (!locationId) return true;
  if (object.absent_at_location_ids?.includes(locationId)) return false;
  if (object.present_at_location_ids?.length) {
    return object.present_at_location_ids.includes(locationId);
  }
  return object.present_at_all_locations !== false;
};

export async function getCatalogItems(
  env: ApiEnv,
  options: {
    includeInventory?: boolean;
    includePopularity?: boolean;
    requireInventory?: boolean;
  } = {},
): Promise<StorefrontProduct[]> {
  if (!env.SQUARE_ACCESS_TOKEN) {
    console.error("[square] Catalog request cannot start", {
      stage: "configuration",
      reason: "SQUARE_ACCESS_TOKEN is missing",
      environment: env.SQUARE_ENVIRONMENT,
      hasApplicationId: Boolean(env.SQUARE_APPLICATION_ID),
      hasLocationId: Boolean(env.SQUARE_LOCATION_ID),
    });
    throw new Error("Square access token is not configured");
  }

  const objects: SquareCatalogObject[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      types: "ITEM,IMAGE,CATEGORY,CUSTOM_ATTRIBUTE_DEFINITION,MODIFIER_LIST",
    });
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(
      `${getSquareBaseUrl(env.SQUARE_ENVIRONMENT)}/v2/catalog/list?${params}`,
      {
        headers: squareHeaders(env),
      },
    );

    if (!response.ok) {
      console.error(
        "[square] Catalog request failed",
        squareResponseLog("catalog", response),
      );
      // Upstream response bodies can contain account data and must not be
      // exposed through public API errors.
      throw new Error(`Square Catalog request failed (${response.status})`);
    }

    const page = (await response.json()) as SquareCatalogListResponse;
    objects.push(...(page.objects ?? []));
    cursor = page.cursor;
  } while (cursor);

  const imageUrls = new Map(
    objects
      .filter((object) => object.type === "IMAGE" && object.id)
      .map((object) => [object.id as string, object.image_data?.url]),
  );
  const categoriesById = new Map(
    objects
      .filter((object) => object.type === "CATEGORY" && object.id)
      .map((object) => [object.id as string, object]),
  );
  const modifierListsById = new Map<string, SquareCatalogObject>();
  const modifierObjectsById = new Map<string, SquareCatalogObject>();
  for (const object of objects) {
    if (object.type === "MODIFIER" && object.id) {
      modifierObjectsById.set(object.id, object);
    }
    if (object.type !== "MODIFIER_LIST" || !object.id) continue;
    modifierListsById.set(object.id, object);
    for (const modifier of object.modifier_list_data?.modifiers ?? []) {
      if (modifier.id) modifierObjectsById.set(modifier.id, modifier);
    }
  }
  const categoryPath = (categoryId: string) => {
    const names: string[] = [];
    const visited = new Set<string>();
    let currentId: string | undefined = categoryId;

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const category = categoriesById.get(currentId);
      if (!category) break;
      if (category.category_data?.name) names.push(category.category_data.name);
      currentId = category.category_data?.parent_category?.id;
    }

    return names;
  };
  const customAttributeSelections = new Map<string, string>();
  for (const object of objects.filter(
    (object) => object.type === "CUSTOM_ATTRIBUTE_DEFINITION",
  )) {
    for (const selection of
      object.custom_attribute_definition_data?.selection_config
        ?.allowed_selections ?? []) {
      if (selection.uid && selection.name) {
        customAttributeSelections.set(selection.uid, selection.name);
      }
    }
  }
  const variationIds = objects
    .filter((object) => object.type === "ITEM")
    .flatMap((item) => item.item_data?.variations ?? [])
    .map((variation) => variation.id)
    .filter((id): id is string => Boolean(id));
  const popularityRequest = options.includePopularity === false
    ? Promise.resolve(new Map<string, number>())
    : getPopularityByVariation(env).catch((error) => {
        console.warn("[square] Popularity lookup failed; using zero scores", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Catalog browsing must stay available if Orders or Locations
        // permissions are missing. Popularity safely falls back to zero.
        return new Map<string, number>();
      });
  const inventoryRequest = options.includeInventory === false
    ? Promise.resolve(null)
    : getInventoryByVariation(env, variationIds);
  const [popularityByVariation, inventoryByVariation] = await Promise.all([
    popularityRequest,
    inventoryRequest,
  ]);
  if (
    options.requireInventory === true &&
    options.includeInventory !== false &&
    inventoryByVariation === null
  ) {
    throw new SquareInventoryUnavailableError();
  }

  return objects
    .filter(
      (object) =>
        object.type === "ITEM" &&
        object.id &&
        !object.is_deleted &&
        !object.item_data?.is_archived,
    )
    .map((item) => {
      const variations = (item.item_data?.variations ?? [])
        .flatMap((variation) => {
          const data = variation.item_variation_data;
          const location = data?.location_overrides?.find(
            (override) => override.location_id === env.SQUARE_LOCATION_ID,
          );
          const money = location?.price_money ?? data?.price_money;
          const pricingType = location?.pricing_type ?? data?.pricing_type;
          if (
            !variation.id ||
            pricingType === "VARIABLE_PRICING" ||
            typeof money?.amount !== "number"
          ) {
            return [];
          }

          const inventoryTracked = data?.track_inventory === true;
          const stock =
            inventoryTracked && inventoryByVariation
              ? (inventoryByVariation.get(variation.id) ?? 0)
              : null;
          const availableWithoutStock =
            isPresentAtLocation(item, env.SQUARE_LOCATION_ID) &&
            isPresentAtLocation(variation, env.SQUARE_LOCATION_ID) &&
            location?.sold_out !== true;

          return [
            {
              id: variation.id,
              name: data?.name ?? "Regular",
              price: {
                amount: money.amount,
                currency: money.currency ?? "AUD",
              },
              stock,
              availableWithoutStock,
              inventoryTracked,
              available:
                availableWithoutStock &&
                (stock === null || stock > 0),
            },
          ];
        })
        .sort(
          (left, right) =>
            variationSizeRank(left.name) - variationSizeRank(right.name),
        );
      const primaryVariation =
        variations.find((candidate) => candidate.available) ?? variations[0];
      const variation = item.item_data?.variations?.find(
        (candidate) => candidate.id === primaryVariation?.id,
      );
      const imageId =
        item.item_data?.image_ids?.[0] ??
        variation?.item_variation_data?.image_ids?.[0];
      const imageIds = [
        ...(item.item_data?.image_ids ?? []),
        ...(item.item_data?.variations ?? []).flatMap(
          (candidate) => candidate.item_variation_data?.image_ids ?? [],
        ),
      ];
      const foodDetails = item.item_data?.food_and_beverage_details;
      const customAttributes = Object.entries(
        item.custom_attribute_values ?? {},
      );
      const ingredients = customAttributes.find(([key, value]) =>
        `${key} ${value.name ?? ""}`.toLowerCase().includes("ingredient"),
      )?.[1].string_value ?? "";
      const storefrontCustomAttributes: StorefrontProduct["customAttributes"] = {};
      for (const [key, value] of customAttributes) {
          const name = (value.name ?? key)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
          if (!name) continue;
          if (value.string_value !== undefined) {
            storefrontCustomAttributes[name] = value.string_value;
            continue;
          }
          if (value.number_value !== undefined) {
            const number = Number(value.number_value);
            if (Number.isFinite(number)) storefrontCustomAttributes[name] = number;
            continue;
          }
          if (value.boolean_value !== undefined) {
            storefrontCustomAttributes[name] = value.boolean_value;
            continue;
          }
          if (value.selection_uid_values) {
            storefrontCustomAttributes[name] = value.selection_uid_values.map(
              (uid) => customAttributeSelections.get(uid) ?? uid,
            );
          }
      }

      const modifierLists = (item.item_data?.modifier_list_info ?? [])
        .flatMap((info, index) => {
          const list = info.modifier_list_id
            ? modifierListsById.get(info.modifier_list_id)
            : undefined;
          const data = list?.modifier_list_data;
          if (!list?.id || !data || info.enabled === false) return [];

          const overrides = new Map(
            (info.modifier_overrides ?? [])
              .filter((override) => override.modifier_id)
              .map((override) => [override.modifier_id as string, override]),
          );
          const modifiers = (data.modifiers ?? []).flatMap((modifier) => {
            const modifierData =
              modifier.modifier_data ??
              (modifier.id
                ? modifierObjectsById.get(modifier.id)?.modifier_data
                : undefined);
            if (!modifier.id || !modifierData) return [];
            const override = overrides.get(modifier.id);
            const hiddenOnline =
              override?.hidden_online_override === "YES" ||
              (override?.hidden_online_override !== "NO" &&
                modifierData.hidden_online === true);
            const location = modifierData.location_overrides?.find(
              (entry) => entry.location_id === env.SQUARE_LOCATION_ID,
            );
            if (hiddenOnline || location?.sold_out === true) return [];

            return [
              {
                id: modifier.id,
                name: modifierData.name ?? "Option",
                price:
                  location?.price_money?.amount ??
                  modifierData.price_money?.amount ??
                  0,
                defaultSelected:
                  override?.on_by_default_override === "YES" ||
                  (override?.on_by_default_override !== "NO" &&
                    (override?.on_by_default ??
                      modifierData.on_by_default ??
                      false)),
              },
            ];
          });
          if (modifiers.length === 0) return [];

          const selectionLimit = (value: unknown, fallback: number) =>
            typeof value === "number" && Number.isInteger(value) && value >= 0
              ? value
              : fallback;
          return [
            {
              id: list.id,
              name: data.name ?? "Options",
              minSelected: selectionLimit(
                info.min_selected_modifiers,
                selectionLimit(data.min_selected_modifiers, 0),
              ),
              maxSelected: selectionLimit(
                info.max_selected_modifiers,
                selectionLimit(data.max_selected_modifiers, 0),
              ),
              ordinal: info.ordinal ?? data.ordinal ?? index,
              modifiers,
            },
          ];
        })
        .sort((left, right) => left.ordinal - right.ordinal)
        .map(({ ordinal: _ordinal, ...list }) => list);
      const categoryPaths = (item.item_data?.categories ?? []).flatMap(
        (category) => {
          if (!category.id) return [];
          const path = categoryPath(category.id);
          return path.length > 0 ? [path] : [];
        },
      );
      const categories = [...new Set(categoryPaths.flat())];
      const dailyMenuCategories = [
        ...new Set(
          categoryPaths.flatMap((path) => {
            const dailyMenuIndex = path.findIndex(
              (name) => normalizeCategoryName(name) === "daily menu",
            );
            return dailyMenuIndex > 0 ? [path[dailyMenuIndex - 1]] : [];
          }),
        ),
      ];
      const storefrontModifierLists = modifierLists.map((list) => ({
        ...list,
        maxSelected: maxModifierSelectionsForStorefront(
          categories,
          list.name,
          list.maxSelected,
        ),
      }));

      return {
        id: item.id as string,
        variationId: primaryVariation?.id ?? null,
        name: item.item_data?.name ?? "Untitled product",
        description:
          item.item_data?.description_plaintext ??
          item.item_data?.description ??
          "",
        descriptionHtml: sanitizeSquareDescriptionHtml(
          item.item_data?.description_html ?? "",
        ),
        variationName: primaryVariation?.name ?? "",
        price: primaryVariation?.price ?? { amount: 0, currency: "AUD" },
        variations,
        modifierLists: storefrontModifierLists,
        image: imageId ? (imageUrls.get(imageId) ?? null) : null,
        images: [...new Set(imageIds)]
          .map((id) => imageUrls.get(id))
          .filter((url): url is string => Boolean(url)),
        categories,
        categoryPaths,
        dailyMenuCategories,
        ingredients,
        dietaryPreferences: (foodDetails?.dietary_preferences ?? [])
          .map((preference) => preference.standard_name ?? preference.custom_name)
          .filter((name): name is string => Boolean(name)),
        allergens: (foodDetails?.ingredients ?? [])
          .map((ingredient) => ingredient.standard_name ?? ingredient.custom_name)
          .filter((name): name is string => Boolean(name)),
        stock: primaryVariation?.stock ?? null,
        available: variations.some((candidate) => candidate.available),
        popularityScore: (item.item_data?.variations ?? []).reduce(
          (total, itemVariation) =>
            total +
            (itemVariation.id
              ? (popularityByVariation.get(itemVariation.id) ?? 0)
              : 0),
          0,
        ),
        customAttributes: storefrontCustomAttributes,
      };
    });
}

export type CakeModifier = {
  id: string;
  name: string;
  price: number;
  defaultSelected: boolean;
};

export type CakeModifierList = {
  id: string;
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  minSelected: number;
  maxSelected: number;
  modifiers: CakeModifier[];
};

export type CakeShape = "round" | "square" | "heart";

export type CakeSize = {
  id: string;
  variationId: string;
  name: string;
  label: string;
  serves: string;
  shape: CakeShape;
  image: string | null;
  images: string[];
  price: { amount: number; currency: string };
  designModifier: CakeModifier | null;
  modifierLists: CakeModifierList[];
};

export type CakeDesign = {
  id: string;
  name: string;
  description: string;
  image: string | null;
  images: string[];
  sizes: CakeSize[];
};

const cakeCategoryNames = new Set([
  "custom cake",
  "custom cake design",
  "custom cake designs",
]);

/** Cake designs are the direct child categories of the Custom Cake category. */
export async function getCakeDesigns(env: ApiEnv): Promise<CakeDesign[]> {
  if (!env.SQUARE_ACCESS_TOKEN) {
    throw new Error("Square access token is not configured");
  }

  const searchUrl = `${getSquareBaseUrl(env.SQUARE_ENVIRONMENT)}/v2/catalog/search`;
  const search = async (
    body: Record<string, unknown>,
    stage: string,
  ): Promise<SquareCatalogListResponse> => {
    const response = await fetch(searchUrl, {
      method: "POST",
      headers: { ...squareHeaders(env), "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error(
        "[square] Cake catalog request failed",
        squareResponseLog(stage, response),
      );
      throw new Error(`Square Catalog request failed (${response.status})`);
    }
    return (await response.json()) as SquareCatalogListResponse;
  };

  const categoryObjects: SquareCatalogObject[] = [];
  let cursor: string | undefined;
  do {
    const page = await search(
      {
        object_types: ["CATEGORY"],
        include_related_objects: true,
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      },
      "cake-categories",
    );
    categoryObjects.push(
      ...(page.objects ?? []),
      ...(page.related_objects ?? []),
    );
    cursor = page.cursor;
  } while (cursor);

  const rootIds = new Set(
    categoryObjects
      .filter(
        (object) =>
          object.type === "CATEGORY" &&
          object.id &&
          !object.is_deleted &&
          cakeCategoryNames.has(
            object.category_data?.name?.trim().toLocaleLowerCase("en") ?? "",
          ),
      )
      .map((object) => object.id as string),
  );

  if (rootIds.size === 0) return [];

  const designCategories = categoryObjects
    .filter(
      (object) =>
        object.type === "CATEGORY" &&
        object.id &&
        !object.is_deleted &&
        rootIds.has(object.category_data?.parent_category?.id ?? ""),
    )
    .sort(
      (left, right) =>
        (left.category_data?.parent_category?.ordinal ?? 0) -
          (right.category_data?.parent_category?.ordinal ?? 0) ||
        (left.category_data?.name ?? "").localeCompare(
          right.category_data?.name ?? "",
        ),
    );

  const designIds = designCategories.map((category) => category.id as string);
  if (designIds.length === 0) return [];

  const itemObjects: SquareCatalogObject[] = [];
  cursor = undefined;
  do {
    const page = await search(
      {
        object_types: ["ITEM"],
        include_related_objects: true,
        query: {
          set_query: {
            attribute_name: "categories",
            attribute_values: designIds,
          },
        },
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      },
      "cake-size-items",
    );
    itemObjects.push(...(page.objects ?? []), ...(page.related_objects ?? []));
    cursor = page.cursor;
  } while (cursor);

  const allObjects = [...categoryObjects, ...itemObjects];
  const imageUrls = new Map(
    allObjects
      .filter((object) => object.type === "IMAGE" && object.id)
      .map((object) => [object.id as string, object.image_data?.url]),
  );
  const modifierObjects = new Map<string, SquareCatalogObject>();
  const modifierLists = new Map<string, SquareCatalogObject>();
  for (const object of itemObjects) {
    if (object.type === "MODIFIER" && object.id) {
      modifierObjects.set(object.id, object);
    }
    if (object.type !== "MODIFIER_LIST" || !object.id) continue;
    modifierLists.set(object.id, object);
    for (const modifier of object.modifier_list_data?.modifiers ?? []) {
      if (modifier.id) modifierObjects.set(modifier.id, modifier);
    }
  }

  const modifierFor = (
    modifier: SquareCatalogObject,
    override?: SquareModifierOverride,
    includeHidden = false,
  ): CakeModifier | null => {
    const data =
      modifier.modifier_data ??
      (modifier.id ? modifierObjects.get(modifier.id)?.modifier_data : undefined);
    if (!modifier.id || !data) return null;
    const location = data.location_overrides?.find(
      (entry) => entry.location_id === env.SQUARE_LOCATION_ID,
    );
    const hiddenOnline =
      override?.hidden_online_override === "YES" ||
      (override?.hidden_online_override !== "NO" && data.hidden_online === true);
    if ((!includeHidden && hiddenOnline) || location?.sold_out === true) return null;
    return {
      id: modifier.id,
      name: data.name ?? "Option",
      price: location?.price_money?.amount ?? data.price_money?.amount ?? 0,
      defaultSelected:
        override?.on_by_default_override === "YES" ||
        (override?.on_by_default_override !== "NO" &&
          (override?.on_by_default ?? data.on_by_default ?? false)),
    };
  };

  const shapeFor = (name: string): CakeShape => {
    const normalized = name.trim().toLocaleLowerCase("en");
    if (normalized.startsWith("heart")) return "heart";
    if (normalized.startsWith("square")) return "square";
    return "round";
  };
  const sizeDetails = (name: string) => {
    const dimensions = /\(\s*(\d+)\s*["”]?\s*\*\s*(\d+)\s*["”]?\s*\)/.exec(
      name,
    );
    if (!dimensions) return { label: name, serves: "" };
    const key = `${dimensions[1]}x${dimensions[2]}`;
    const serves: Record<string, string> = {
      "6x3": "8-10",
      "6x4": "10-14",
      "6x5": "12-16",
      "6x6": "15-20",
      "6x7": "18-24",
      "8x4": "20-25",
      "8x5": "25-30",
      "8x6": "30-36",
      "8x7": "36-44",
      "10x4": "30-35",
      "10x5": "35-45",
      "10x6": "45-55",
    };
    return {
      label: `${dimensions[1]}” x ${dimensions[2]}”`,
      serves: serves[key] ?? "",
    };
  };

  const sizeItems = itemObjects.filter(
    (object) =>
      object.type === "ITEM" &&
      object.id &&
      !object.is_deleted &&
      !object.item_data?.is_archived,
  );

  return designCategories.map((category): CakeDesign => {
    const designId = category.id as string;
    const designName = category.category_data?.name ?? "Custom cake";
    const designImages = [...new Set(category.category_data?.image_ids ?? [])]
      .map((id) => imageUrls.get(id))
      .filter((url): url is string => Boolean(url));

    const sizes = sizeItems.flatMap((item): CakeSize[] => {
      if (!item.item_data?.categories?.some((entry) => entry.id === designId)) {
        return [];
      }
      const variations = [...(item.item_data.variations ?? [])].sort(
        (left, right) =>
          (left.item_variation_data?.ordinal ?? 0) -
          (right.item_variation_data?.ordinal ?? 0),
      );
      const variation = variations.find((candidate) => {
        const data = candidate.item_variation_data;
        const location = data?.location_overrides?.find(
          (entry) => entry.location_id === env.SQUARE_LOCATION_ID,
        );
        const price = location?.price_money ?? data?.price_money;
        return (
          candidate.id &&
          location?.sold_out !== true &&
          (location?.pricing_type ?? data?.pricing_type) !== "VARIABLE_PRICING" &&
          typeof price?.amount === "number" &&
          price.amount >= 0
        );
      });
      if (!variation?.id) return [];
      const variationData = variation.item_variation_data;
      const locationPrice = variationData?.location_overrides?.find(
        (entry) => entry.location_id === env.SQUARE_LOCATION_ID,
      )?.price_money;
      const money = locationPrice ?? variationData?.price_money;
      if (typeof money?.amount !== "number") return [];

      let designModifier: CakeModifier | null = null;
      const lists = (item.item_data.modifier_list_info ?? [])
        .flatMap((info, index) => {
          const list = info.modifier_list_id
            ? modifierLists.get(info.modifier_list_id)
            : undefined;
          const data = list?.modifier_list_data;
          if (!list?.id || !data || info.enabled === false) return [];
          const overrides = new Map(
            (info.modifier_overrides ?? [])
              .filter((override) => override.modifier_id)
              .map((override) => [override.modifier_id as string, override]),
          );
          const isDesignList = /^design$/i.test(data.name ?? "");
          if (isDesignList) {
            const match = (data.modifiers ?? []).find((modifier) => {
              const modifierData =
                modifier.modifier_data ??
                (modifier.id
                  ? modifierObjects.get(modifier.id)?.modifier_data
                  : undefined);
              return (
                modifier.id &&
                modifierData?.name?.trim().toLocaleLowerCase("en") ===
                  designName.trim().toLocaleLowerCase("en")
              );
            });
            const matchData =
              match?.modifier_data ??
              (match?.id
                ? modifierObjects.get(match.id)?.modifier_data
                : undefined);
            const location = matchData?.location_overrides?.find(
              (entry) => entry.location_id === env.SQUARE_LOCATION_ID,
            );
            designModifier =
              match?.id && matchData
                ? {
                    id: match.id,
                    name: matchData.name ?? designName,
                    price:
                      location?.price_money?.amount ??
                      matchData.price_money?.amount ??
                      0,
                    defaultSelected: true,
                  }
                : null;
            return [];
          }
          const modifiers = (data.modifiers ?? [])
            .map((modifier) =>
              modifierFor(
                modifier,
                modifier.id ? overrides.get(modifier.id) : undefined,
                false,
              ),
            )
            .filter((modifier): modifier is CakeModifier => Boolean(modifier));
          if (modifiers.length === 0) return [];
          const minSelected =
            typeof info.min_selected_modifiers === "number" &&
            info.min_selected_modifiers >= 0
              ? info.min_selected_modifiers
              : (data.min_selected_modifiers ?? 0);
          const maxSelected =
            typeof info.max_selected_modifiers === "number" &&
            info.max_selected_modifiers >= 0
              ? info.max_selected_modifiers
              : (data.max_selected_modifiers ?? 0);
          return [
            {
              id: list.id,
              name: data.name ?? "Options",
              selectionType: (maxSelected === 1
                ? "SINGLE"
                : "MULTIPLE") as CakeModifierList["selectionType"],
              minSelected,
              maxSelected,
              ordinal: info.ordinal ?? data.ordinal ?? index,
              modifiers,
            },
          ];
        })
        .sort((left, right) => left.ordinal - right.ordinal)
        .map(({ ordinal: _ordinal, ...list }) => list);

      const itemName = item.item_data.name ?? "Cake size";
      const details = sizeDetails(itemName);
      const sizeImages = [
        ...(item.item_data.image_ids ?? []),
        ...(variationData?.image_ids ?? []),
      ]
        .map((id) => imageUrls.get(id))
        .filter((url): url is string => Boolean(url));
      return [
        {
          id: item.id as string,
          variationId: variation.id,
          name: itemName,
          label: details.label,
          serves: details.serves,
          shape: shapeFor(itemName),
          image: sizeImages[0] ?? null,
          images: [...new Set(sizeImages)],
          price: {
            amount: money.amount,
            currency: money.currency ?? "AUD",
          },
          designModifier,
          modifierLists: lists,
        },
      ];
    });
    const shapeRank: Record<CakeShape, number> = {
      round: 0,
      square: 1,
      heart: 2,
    };
    sizes.sort((left, right) => {
      const leftDimensions = left.label.match(/\d+/g)?.map(Number) ?? [];
      const rightDimensions = right.label.match(/\d+/g)?.map(Number) ?? [];
      return (
        shapeRank[left.shape] - shapeRank[right.shape] ||
        (leftDimensions[0] ?? Number.POSITIVE_INFINITY) -
          (rightDimensions[0] ?? Number.POSITIVE_INFINITY) ||
        (leftDimensions[1] ?? Number.POSITIVE_INFINITY) -
          (rightDimensions[1] ?? Number.POSITIVE_INFINITY) ||
        left.name.localeCompare(right.name)
      );
    });

    return {
      id: designId,
      name: designName,
      description: "",
      image: designImages[0] ?? null,
      images: designImages,
      sizes,
    };
  });
}

/**
 * Re-check only the catalog items that are about to be purchased. This keeps
 * browsing cache-friendly without downloading the full Square catalog during
 * every checkout.
 */
export async function getCatalogItemSnapshots(
  env: ApiEnv,
  itemIds: string[],
): Promise<Map<string, CatalogItemSnapshot>> {
  const uniqueIds = [...new Set(itemIds)].filter(Boolean);
  if (uniqueIds.length === 0) return new Map();

  const response = await fetch(
    `${getSquareBaseUrl(env.SQUARE_ENVIRONMENT)}/v2/catalog/batch-retrieve`,
    {
      method: "POST",
      headers: squareHeaders(env),
      body: JSON.stringify({
        object_ids: uniqueIds,
        include_related_objects: false,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) {
    console.error(
      "[square] Checkout catalog validation failed",
      squareResponseLog("catalog-validation", response),
    );
    throw new Error(`Square Catalog validation failed (${response.status})`);
  }

  const data = (await response.json()) as SquareCatalogListResponse;
  const snapshots = new Map<string, CatalogItemSnapshot>();
  for (const item of data.objects ?? []) {
    if (item.type !== "ITEM" || !item.id) continue;
    const variations = (item.item_data?.variations ?? []).flatMap((variation) => {
      const variationData = variation.item_variation_data;
      const location = variationData?.location_overrides?.find(
        (override) => override.location_id === env.SQUARE_LOCATION_ID,
      );
      const money = location?.price_money ?? variationData?.price_money;
      const pricingType = location?.pricing_type ?? variationData?.pricing_type;
      if (
        !variation.id ||
        pricingType === "VARIABLE_PRICING" ||
        typeof money?.amount !== "number"
      ) {
        return [];
      }
      return [{
        id: variation.id,
        price: {
          amount: money.amount,
          currency: money.currency ?? "AUD",
        },
        available:
          isPresentAtLocation(item, env.SQUARE_LOCATION_ID) &&
          isPresentAtLocation(variation, env.SQUARE_LOCATION_ID) &&
          location?.sold_out !== true,
      }];
    });
    const primaryVariation =
      variations.find((variation) => variation.available) ?? variations[0];
    snapshots.set(item.id, {
      id: item.id,
      variationId: primaryVariation?.id ?? null,
      price: primaryVariation?.price ?? { amount: 0, currency: "AUD" },
      available: Boolean(
        !item.is_deleted &&
        !item.item_data?.is_archived &&
        primaryVariation?.available,
      ),
    });
  }
  return snapshots;
}
