import { json, methodNotAllowed } from "../http/json.js";
import { stripInventoryMetadata } from "../services/square.js";
import { getCachedCatalogItems } from "./catalog.js";
import type { ApiEnv } from "../types/env.js";

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

const toPublicProduct = <T extends CatalogProduct>(product: T) => {
  const { customAttributes: _customAttributes, ...publicProduct } =
    stripInventoryMetadata(product);
  return publicProduct;
};

type CatalogProduct = Awaited<ReturnType<typeof getCachedCatalogItems>>[number];
const getInventoryAwareDailyMenu = (env: ApiEnv) =>
  getCachedCatalogItems(env);

const recommendedRank = (product: CatalogProduct) => {
  const raw = product.customAttributes.recommended_rank;
  const rank = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(rank) && rank >= 0
    ? rank
    : Number.POSITIVE_INFINITY;
};

const toCard = (product: CatalogProduct) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  variationName: product.variationName,
  price: product.price,
  image: product.image,
  stock: product.stock,
  available: product.available,
});

const homeRecommendationRank = (product: CatalogProduct) => {
  const raw =
    product.customAttributes.home_recommend ??
    product.customAttributes.home_recommend_rank;
  const rank = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(rank) && rank >= 1 && rank <= 4 ? rank : null;
};

export async function handleCategories(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed();

  try {
    const products = await getCachedCatalogItems(env);
    const categories = [...new Set(products.flatMap((product) => product.dailyMenuCategories))]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
    return json({ categories });
  } catch (error) {
    console.error("[api] Categories endpoint failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Categories are temporarily unavailable" }, 502);
  }
}

export async function handleProductDetail(
  request: Request,
  env: ApiEnv,
  productId: string,
): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed();

  try {
    const products = await getInventoryAwareDailyMenu(env);
    const product = products.find((item) => item.id === productId);
    if (!product) return json({ error: "Product not found" }, 404);
    return json({ product: toPublicProduct(product) });
  } catch (error) {
    console.error("[api] Product detail endpoint failed", {
      productId,
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Product is temporarily unavailable" }, 502);
  }
}

export async function handleProductCards(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed();

  try {
    const url = new URL(request.url);
    const category = normalize(url.searchParams.get("category") ?? "");
    const productType = normalize(url.searchParams.get("productType") ?? "");
    const dietaryFilters = url.searchParams.getAll("dietary").map(normalize);
    const allergenFilters = url.searchParams.getAll("allergen").map(normalize);
    const sort = url.searchParams.get("sort") ?? "recommended";
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(24, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "9", 10) || 9));
    const products = await getInventoryAwareDailyMenu(env);
    const categoryProducts = products.filter(
      (product) =>
        category
          ? product.categories.some((name) => normalize(name) === category)
          : product.dailyMenuCategories.length > 0,
    );

    // Facets are computed from the whole category (ignoring the active allergen
    // selection) so options stay on screen while the user is filtering.
    const allergenCounts = new Map<string, number>();
    for (const product of categoryProducts) {
      for (const allergen of new Set(product.allergens.map(normalize))) {
        allergenCounts.set(allergen, (allergenCounts.get(allergen) ?? 0) + 1);
      }
    }
    const allergenOptions = [...allergenCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => left.value.localeCompare(right.value));

    const filtered = categoryProducts.filter((product) => {
      const categories = product.categories.map(normalize);
      const dietary = product.dietaryPreferences.map(normalize);
      const allergens = product.allergens.map(normalize);
      const allProductTypes = !productType || productType.startsWith("all ");

      return (
        (allProductTypes || categories.includes(productType)) &&
        dietaryFilters.every((value) => dietary.includes(value)) &&
        allergenFilters.every((value) => !allergens.includes(value))
      );
    });

    filtered.sort((left, right) => {
      const availabilityOrder = Number(right.available) - Number(left.available);
      if (availabilityOrder !== 0) return availabilityOrder;

      if (sort === "price-asc") return left.price.amount - right.price.amount;
      if (sort === "price-desc") return right.price.amount - left.price.amount;
      if (sort === "az") return left.name.localeCompare(right.name);
      if (sort === "recommended") {
        return (
          recommendedRank(left) - recommendedRank(right) ||
          left.name.localeCompare(right.name)
        );
      }
      return 0;
    });

    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit).map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      variationName: product.variationName,
      price: product.price,
      image: product.image,
      stock: product.stock,
      available: product.available,
    }));

    return json(
      {
        items,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
        allergenOptions,
      },
    );
  } catch (error) {
    console.error("[api] Products endpoint failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Products are temporarily unavailable" }, 502);
  }
}

export async function handleInventorySnapshot(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed();

  try {
    const products = await getInventoryAwareDailyMenu(env);
    return json(
      {
        items: products.map((product) => ({
          id: product.id,
          variationId: product.variationId,
          variationName: product.variationName,
          price: product.price,
          stock: product.stock,
          available: product.available,
        })),
      },
    );
  } catch (error) {
    console.error("[api] Inventory endpoint failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Inventory is temporarily unavailable" }, 502);
  }
}

export async function handleRecommendations(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed();

  try {
    const products = await getInventoryAwareDailyMenu(env);
    const picks = products
      .map((product) => ({ product, rank: homeRecommendationRank(product) }))
      .filter(
        (entry): entry is { product: CatalogProduct; rank: number } =>
          entry.rank !== null,
      )
      .sort(
        (left, right) =>
          left.rank - right.rank ||
          left.product.name.localeCompare(right.product.name),
      )
      .filter(
        (entry, index, entries) =>
          entries.findIndex((candidate) => candidate.rank === entry.rank) ===
          index,
      )
      .slice(0, 4)
      .map(({ product }) => product);

    return json(
      { items: picks.map(toCard) },
    );
  } catch (error) {
    console.error("[api] Recommendations endpoint failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Recommendations are temporarily unavailable" }, 502);
  }
}
