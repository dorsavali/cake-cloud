import { json, methodNotAllowed } from "../http/json.js";
import { getCachedCatalogItems } from "./catalog.js";
import type { ApiEnv } from "../types/env.js";

const responseCacheHeaders = {
  "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=60",
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

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
  } catch {
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
    return json({ product }, 200, responseCacheHeaders);
  } catch {
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
    const minPrice = Number(url.searchParams.get("minPrice") ?? 0);
    const maxPrice = Number(url.searchParams.get("maxPrice") ?? Number.POSITIVE_INFINITY);
    const sort = url.searchParams.get("sort") ?? "popular";
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(24, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "9", 10) || 9));
    const products = await getCachedCatalogItems(env);
    const categoryProducts = products.filter(
      (product) =>
        !category || product.categories.some((name) => normalize(name) === category),
    );
    const maxAvailablePrice = categoryProducts.reduce(
      (highest, product) => Math.max(highest, product.price.amount / 100),
      20,
    );
    const filtered = categoryProducts.filter((product) => {
      const categories = product.categories.map(normalize);
      const dietary = product.dietaryPreferences.map(normalize);
      const allergens = product.allergens.map(normalize);
      const price = product.price.amount / 100;
      const allProductTypes = !productType || productType.startsWith("all ");

      return (
        (allProductTypes || categories.includes(productType)) &&
        dietaryFilters.every((value) => dietary.includes(value)) &&
        allergenFilters.every((value) => !allergens.includes(value)) &&
        price >= minPrice &&
        price <= maxPrice
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
        maxAvailablePrice,
      },
      200,
      responseCacheHeaders,
    );
  } catch {
    return json({ error: "Products are temporarily unavailable" }, 502);
  }
}
