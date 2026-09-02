import type { ApiEnv } from "../types/env.js";

type SquareMoney = { amount?: number; currency?: string };

type SquareCatalogObject = {
  type?: string;
  id?: string;
  custom_attribute_values?: Record<
    string,
    { name?: string; string_value?: string }
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
      };
    }>;
  };
  image_data?: { url?: string };
  category_data?: { name?: string };
};

type SquareCatalogListResponse = {
  objects?: SquareCatalogObject[];
  cursor?: string;
};

type StorefrontProduct = {
  id: string;
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
  popularityScore: number;
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

const popularityCache = new Map<
  string,
  { expiresAt: number; quantities: Map<string, number> }
>();

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
    throw new Error("Square access token is not configured");
  }

  const objects: SquareCatalogObject[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ types: "ITEM,IMAGE,CATEGORY" });
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(
      `${getSquareBaseUrl(env.SQUARE_ENVIRONMENT)}/v2/catalog/list?${params}`,
      {
        headers: squareHeaders(env),
      },
    );

    if (!response.ok) {
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
  let popularityByVariation = new Map<string, number>();
  try {
    popularityByVariation = await getPopularityByVariation(env);
  } catch {
    // Catalog browsing must stay available if Orders or Locations permissions
    // are missing. Popularity safely falls back to zero in that case.
  }

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

      return {
        id: item.id as string,
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
        popularityScore: (item.item_data?.variations ?? []).reduce(
          (total, itemVariation) =>
            total +
            (itemVariation.id
              ? (popularityByVariation.get(itemVariation.id) ?? 0)
              : 0),
          0,
        ),
      };
    });
}
