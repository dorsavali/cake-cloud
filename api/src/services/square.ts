import type { ApiEnv } from "../types/env.js";

type SquareMoney = { amount?: number; currency?: string };

type SquareCatalogObject = {
  type?: string;
  id?: string;
  item_data?: {
    name?: string;
    image_ids?: string[];
    variations?: Array<{
      item_variation_data?: { price_money?: SquareMoney };
    }>;
  };
  image_data?: { url?: string };
};

type SquareCatalogListResponse = {
  objects?: SquareCatalogObject[];
  cursor?: string;
};

type StorefrontProduct = {
  id: string;
  name: string;
  price: { amount: number; currency: string };
  image: string | null;
};

const getSquareBaseUrl = (environment: ApiEnv["SQUARE_ENVIRONMENT"]) =>
  environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

export async function getCatalogItems(
  env: ApiEnv,
): Promise<StorefrontProduct[]> {
  if (!env.SQUARE_ACCESS_TOKEN) {
    throw new Error("Square access token is not configured");
  }

  const objects: SquareCatalogObject[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ types: "ITEM,IMAGE" });
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(
      `${getSquareBaseUrl(env.SQUARE_ENVIRONMENT)}/v2/catalog/list?${params}`,
      {
        headers: {
          authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
          "square-version": "2026-08-19",
        },
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

  return objects
    .filter((object) => object.type === "ITEM" && object.id)
    .map((item) => {
      const money = item.item_data?.variations?.find(
        (variation) => variation.item_variation_data?.price_money?.amount != null,
      )?.item_variation_data?.price_money;
      const imageId = item.item_data?.image_ids?.[0];

      return {
        id: item.id as string,
        name: item.item_data?.name ?? "Untitled product",
        price: {
          amount: money?.amount ?? 0,
          currency: money?.currency ?? "AUD",
        },
        image: imageId ? (imageUrls.get(imageId) ?? null) : null,
      };
    });
}
