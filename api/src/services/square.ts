import type { ApiEnv } from "../types/env.js";

type SquareMoney = { amount?: number; currency?: string };

type SquareCatalogObject = {
  type?: string;
  id?: string;
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
    description_plaintext?: string;
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
      item_variation_data?: {
        name?: string;
        price_money?: SquareMoney;
        image_ids?: string[];
        track_inventory?: boolean;
      };
    }>;
    modifier_list_info?: Array<{
      modifier_list_id?: string;
      enabled?: boolean;
      hidden_online?: boolean;
      ordinal?: number;
      min_selected_modifiers?: number;
      max_selected_modifiers?: number;
      modifier_overrides?: Array<{
        modifier_id?: string;
        on_by_default?: boolean;
      }>;
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
    ordinal?: number;
    modifier_list_id?: string;
  };
  image_data?: { url?: string };
  category_data?: { name?: string };
  custom_attribute_definition_data?: {
    name?: string;
    selection_config?: {
      allowed_selections?: Array<{ uid?: string; name?: string }>;
    };
  };
};

type SquareCatalogListResponse = {
  objects?: SquareCatalogObject[];
  cursor?: string;
};

type StorefrontProduct = {
  id: string;
  variationId: string | null;
  name: string;
  description: string;
  variationName: string;
  price: { amount: number; currency: string };
  image: string | null;
  images: string[];
  categories: string[];
  ingredients: string;
  dietaryPreferences: string[];
  allergens: string[];
  stock: number | null;
  popularityScore: number;
  customAttributes: Record<string, string | number | boolean | string[]>;
};

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

const getSquareBaseUrl = (environment: ApiEnv["SQUARE_ENVIRONMENT"]) =>
  environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

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

export async function getCatalogItems(
  env: ApiEnv,
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
      types: "ITEM,IMAGE,CATEGORY,CUSTOM_ATTRIBUTE_DEFINITION",
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
  const categoryNames = new Map(
    objects
      .filter((object) => object.type === "CATEGORY" && object.id)
      .map((object) => [object.id as string, object.category_data?.name]),
  );
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
  let popularityByVariation = new Map<string, number>();
  try {
    popularityByVariation = await getPopularityByVariation(env);
  } catch (error) {
    console.warn("[square] Popularity lookup failed; using zero scores", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Catalog browsing must stay available if Orders or Locations permissions
    // are missing. Popularity safely falls back to zero in that case.
  }
  const variationIds = objects
    .filter((object) => object.type === "ITEM")
    .flatMap((item) => item.item_data?.variations ?? [])
    .map((variation) => variation.id)
    .filter((id): id is string => Boolean(id));
  const inventoryByVariation = await getInventoryByVariation(env, variationIds);

  return objects
    .filter((object) => object.type === "ITEM" && object.id)
    .map((item) => {
      const variation = item.item_data?.variations?.find(
        (variation) => variation.item_variation_data?.price_money?.amount != null,
      );
      const money = variation?.item_variation_data?.price_money;
      const imageId =
        item.item_data?.image_ids?.[0] ??
        variation?.item_variation_data?.image_ids?.[0];
      const imageIds = [
        ...(item.item_data?.image_ids ?? []),
        ...(variation?.item_variation_data?.image_ids ?? []),
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

      return {
        id: item.id as string,
        variationId: variation?.id ?? null,
        name: item.item_data?.name ?? "Untitled product",
        description:
          item.item_data?.description_plaintext ??
          item.item_data?.description ??
          "",
        variationName: variation?.item_variation_data?.name ?? "",
        price: {
          amount: money?.amount ?? 0,
          currency: money?.currency ?? "AUD",
        },
        image: imageId ? (imageUrls.get(imageId) ?? null) : null,
        images: [...new Set(imageIds)]
          .map((id) => imageUrls.get(id))
          .filter((url): url is string => Boolean(url)),
        categories: (item.item_data?.categories ?? [])
          .map((category) =>
            category.id ? categoryNames.get(category.id) : undefined,
          )
          .filter((name): name is string => Boolean(name)),
        ingredients,
        dietaryPreferences: (foodDetails?.dietary_preferences ?? [])
          .map((preference) => preference.standard_name ?? preference.custom_name)
          .filter((name): name is string => Boolean(name)),
        allergens: (foodDetails?.ingredients ?? [])
          .map((ingredient) => ingredient.standard_name ?? ingredient.custom_name)
          .filter((name): name is string => Boolean(name)),
        stock:
          variation?.item_variation_data?.track_inventory && inventoryByVariation
            ? (inventoryByVariation.get(variation.id as string) ?? 0)
            : null,
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

export type CakeDesign = {
  id: string;
  variationId: string | null;
  name: string;
  description: string;
  image: string | null;
  images: string[];
  price: { amount: number; currency: string };
  modifierLists: CakeModifierList[];
};

const normalizeCatalogName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const wholeNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : fallback;

/**
 * Cake designs are the items in the "Custom Cake Designs" Square category. Each
 * design carries the modifier lists that are attached to it in the dashboard,
 * so prices and options stay in sync with Square without a deploy.
 */
export async function getCakeDesigns(env: ApiEnv): Promise<CakeDesign[]> {
  if (!env.SQUARE_ACCESS_TOKEN) {
    throw new Error("Square access token is not configured");
  }

  const objects: SquareCatalogObject[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      types: "ITEM,MODIFIER_LIST,MODIFIER,IMAGE,CATEGORY",
    });
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(
      `${getSquareBaseUrl(env.SQUARE_ENVIRONMENT)}/v2/catalog/list?${params}`,
      { headers: squareHeaders(env) },
    );

    if (!response.ok) {
      console.error(
        "[square] Cake catalog request failed",
        squareResponseLog("cake-catalog", response),
      );
      throw new Error(`Square Catalog request failed (${response.status})`);
    }

    const page = (await response.json()) as SquareCatalogListResponse;
    objects.push(...(page.objects ?? []));
    cursor = page.cursor;
  } while (cursor);

  const categories = objects.filter(
    (object) => object.type === "CATEGORY" && object.id,
  );
  const exactCategory = categories.find(
    (object) =>
      normalizeCatalogName(object.category_data?.name ?? "") ===
      "custom cake designs",
  );
  const matchingCategories = categories.filter((object) =>
    normalizeCatalogName(object.category_data?.name ?? "").includes(
      "custom cake",
    ),
  );
  const categoryIds = new Set(
    (exactCategory ? [exactCategory] : matchingCategories)
      .map((object) => object.id)
      .filter((id): id is string => Boolean(id)),
  );

  const imageUrls = new Map(
    objects
      .filter((object) => object.type === "IMAGE" && object.id)
      .map((object) => [object.id as string, object.image_data?.url]),
  );

  const modifierObjects = new Map<string, SquareCatalogObject>();
  for (const object of objects) {
    if (object.type === "MODIFIER" && object.id) {
      modifierObjects.set(object.id, object);
    }
  }

  const modifierLists = new Map<string, SquareCatalogObject>();
  for (const object of objects) {
    if (object.type !== "MODIFIER_LIST" || !object.id) continue;
    modifierLists.set(object.id, object);
    for (const modifier of object.modifier_list_data?.modifiers ?? []) {
      if (modifier.id) modifierObjects.set(modifier.id, modifier);
    }
  }

  return objects
    .filter(
      (object) =>
        object.type === "ITEM" &&
        object.id &&
        (object.item_data?.categories ?? []).some(
          (category) => category.id && categoryIds.has(category.id),
        ),
    )
    .map((item) => {
      const variation = item.item_data?.variations?.find(
        (candidate) =>
          candidate.item_variation_data?.price_money?.amount != null,
      );
      const money = variation?.item_variation_data?.price_money;
      const imageIds = [
        ...(item.item_data?.image_ids ?? []),
        ...(variation?.item_variation_data?.image_ids ?? []),
      ];
      const images = [...new Set(imageIds)]
        .map((id) => imageUrls.get(id))
        .filter((url): url is string => Boolean(url));

      const modifierListsOnItem = (
        item.item_data?.modifier_list_info ?? []
      )
        .flatMap((info, index) => {
          const list = info.modifier_list_id
            ? modifierLists.get(info.modifier_list_id)
            : undefined;
          const data = list?.modifier_list_data;
          if (
            !list?.id ||
            !data ||
            info.enabled === false ||
            info.hidden_online === true ||
            data.hidden_from_customer === true
          ) {
            return [];
          }

          const overrides = new Map(
            (info.modifier_overrides ?? [])
              .filter((override) => override.modifier_id)
              .map((override) => [
                override.modifier_id as string,
                override.on_by_default === true,
              ]),
          );

          const modifiers = (data.modifiers ?? [])
            .flatMap((modifier): CakeModifier[] => {
              const modifierData = modifier.modifier_data ??
                (modifier.id ? modifierObjects.get(modifier.id)?.modifier_data : undefined);
              if (!modifier.id || !modifierData) return [];
              return [
                {
                  id: modifier.id,
                  name: modifierData.name ?? "Option",
                  price: modifierData.price_money?.amount ?? 0,
                  defaultSelected: overrides.get(modifier.id) === true,
                },
              ];
            })
            .sort((left, right) => {
              const leftOrdinal =
                modifierObjects.get(left.id)?.modifier_data?.ordinal ?? 0;
              const rightOrdinal =
                modifierObjects.get(right.id)?.modifier_data?.ordinal ?? 0;
              return leftOrdinal - rightOrdinal;
            });

          if (modifiers.length === 0) return [];

          const selectionType: CakeModifierList["selectionType"] =
            data.selection_type === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
          const maxDefault = selectionType === "MULTIPLE" ? 0 : 1;
          // -1 means "no item-level override" in the Square API.
          const overrideOr = (override: unknown, fallback: number) =>
            typeof override === "number" &&
            Number.isInteger(override) &&
            override >= 0
              ? override
              : fallback;

          return [
            {
              id: list.id,
              name: data.name ?? "Options",
              selectionType,
              minSelected: overrideOr(
                info.min_selected_modifiers,
                wholeNumber(data.min_selected_modifiers, 0),
              ),
              maxSelected: overrideOr(
                info.max_selected_modifiers,
                wholeNumber(data.max_selected_modifiers, maxDefault),
              ),
              ordinal: info.ordinal ?? data.ordinal ?? index,
              modifiers,
            },
          ];
        })
        .sort((left, right) => left.ordinal - right.ordinal)
        .map(({ ordinal: _ordinal, ...list }) => list);

      return {
        id: item.id as string,
        variationId: variation?.id ?? null,
        name: item.item_data?.name ?? "Custom cake",
        description:
          item.item_data?.description_plaintext ??
          item.item_data?.description ??
          "",
        image: images[0] ?? null,
        images,
        price: {
          amount: money?.amount ?? 0,
          currency: money?.currency ?? "AUD",
        },
        modifierLists: modifierListsOnItem,
      };
    });
}
