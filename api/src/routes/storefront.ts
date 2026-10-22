import { json, methodNotAllowed } from "../http/json.js";
import { getCachedCatalogItems } from "./catalog.js";
import type { ApiEnv } from "../types/env.js";

const responseCacheHeaders = {
  "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=60",
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

const toPublicProduct = <T extends { customAttributes: unknown }>(product: T) => {
  const { customAttributes: _customAttributes, ...publicProduct } = product;
  return publicProduct;
};

type CatalogProduct = Awaited<ReturnType<typeof getCachedCatalogItems>>[number];

const toCard = (product: CatalogProduct) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  variationName: product.variationName,
  price: product.price,
  image: product.image,
  stock: product.stock,
});

// Home "Our Recommends" row: best sellers from the main menu plus one
// signature item from drinks and pet treats.
const homeRecommendationPlan = [
  { category: "cakes & pastries", count: 2 },
  { category: "drinks", count: 1 },
  { category: "pet treats", count: 1 },
] as const;

const homeRecommendationTotal = homeRecommendationPlan.reduce(
  (total, step) => total + step.count,
  0,
);

const byPopularity = (left: CatalogProduct, right: CatalogProduct) =>
  right.popularityScore - left.popularityScore;

export async function handleCategories(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed();

  try {
    const products = await getCachedCatalogItems(env);
    const categories = [...new Set(products.flatMap((product) => product.categories))]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
    return json({ categories }, 200, responseCacheHeaders);
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
    const products = await getCachedCatalogItems(env);
    const product = products.find((item) => item.id === productId);
    if (!product) return json({ error: "Product not found" }, 404);
    return json({ product: toPublicProduct(product) }, 200, responseCacheHeaders);
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
    const sort = url.searchParams.get("sort") ?? "popular";
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(24, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "9", 10) || 9));
    const products = await getCachedCatalogItems(env);
    const categoryProducts = products.filter(
      (product) =>
        !category || product.categories.some((name) => normalize(name) === category),
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
      if (sort === "price-asc") return left.price.amount - right.price.amount;
      if (sort === "price-desc") return right.price.amount - left.price.amount;
      if (sort === "az") return left.name.localeCompare(right.name);
      return right.popularityScore - left.popularityScore;
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
      200,
      responseCacheHeaders,
    );
  } catch (error) {
    console.error("[api] Products endpoint failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Products are temporarily unavailable" }, 502);
  }
}

export async function handleRecommendations(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed();

  try {
    const products = await getCachedCatalogItems(env);
    const picks: CatalogProduct[] = [];

    for (const step of homeRecommendationPlan) {
      const matches = products
        .filter((product) =>
          product.categories.some((name) => normalize(name) === step.category),
        )
        .sort(byPopularity)
        .slice(0, step.count);

      for (const product of matches) {
        if (!picks.some((pick) => pick.id === product.id)) picks.push(product);
      }
    }

    // Backfill from the overall best sellers if a category has no products yet,
    // so the home row always keeps the same number of cards.
    if (picks.length < homeRecommendationTotal) {
      for (const product of [...products].sort(byPopularity)) {
        if (picks.length >= homeRecommendationTotal) break;
        if (!picks.some((pick) => pick.id === product.id)) picks.push(product);
      }
    }

    return json(
      { items: picks.slice(0, homeRecommendationTotal).map(toCard) },
      200,
      responseCacheHeaders,
    );
  } catch (error) {
    console.error("[api] Recommendations endpoint failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Recommendations are temporarily unavailable" }, 502);
  }
}
