import { json, methodNotAllowed } from "../http/json.js";
import { getCachedCatalogItems } from "./catalog.js";
import type { ApiEnv } from "../types/env.js";

const responseCacheHeaders = {
  "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=60",
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

const hostCategoryNames = new Set(["host", "host packages"]);

const hasHostCategory = (categoryPaths: string[][]) =>
  categoryPaths.some((path) =>
    path.some((category) => hostCategoryNames.has(normalize(category))),
  );

const directHostCategories = (categoryPaths: string[][]) => [
  ...new Set(
    categoryPaths.flatMap((path) => {
      const hostIndex = path.findIndex((category) =>
        hostCategoryNames.has(normalize(category)),
      );
      return hostIndex > 0 ? [path[hostIndex - 1]] : [];
    }),
  ),
];

const attributeString = (
  attributes: Record<string, string | number | boolean | string[]>,
  key: string,
) => {
  const value = attributes[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value.trim() : "";
};

const attributeNumber = (
  attributes: Record<string, string | number | boolean | string[]>,
  key: string,
) => {
  const value = attributes[key];
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

export async function handleHostPackages(
  request: Request,
  env: ApiEnv,
): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed();

  try {
    const products = await getCachedCatalogItems(env, {
      includeInventory: false,
      includePopularity: false,
      variant: "host",
    });
    const packages = products
      .filter((product) => {
        const section = normalize(
          attributeString(product.customAttributes, "site_section"),
        );
        const belongsToHost =
          section === "host" || hasHostCategory(product.categoryPaths);
        return (
          belongsToHost &&
          product.available &&
          Boolean(product.variationId) &&
          product.price.currency === "AUD" &&
          product.price.amount > 0
        );
      })
      .map((product) => {
        const includedItems = attributeString(
          product.customAttributes,
          "included_items",
        )
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean);
        const pricingModel = attributeString(
          product.customAttributes,
          "pricing_model",
        );

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          image: product.image,
          categories: directHostCategories(product.categoryPaths),
          price: product.price,
          priceUnit:
            pricingModel === "fixed"
              ? "package"
              : attributeString(product.customAttributes, "price_unit") ||
                "head",
          minimumGuests: attributeNumber(
            product.customAttributes,
            "minimum_guests",
          ) ?? attributeNumber(product.customAttributes, "minimum_quantity"),
          maximumGuests: attributeNumber(
            product.customAttributes,
            "maximum_guests",
          ),
          includedItems,
          enquiryOnly:
            product.customAttributes.enquiry_only === true ||
            normalize(String(product.customAttributes.enquiry_only ?? "")) ===
              "true",
          displayOrder:
            attributeNumber(product.customAttributes, "display_order") ?? 9999,
        };
      })
      .sort(
        (left, right) =>
          left.displayOrder - right.displayOrder ||
          left.name.localeCompare(right.name),
      );

    const categories = [
      ...new Set(packages.flatMap((hostPackage) => hostPackage.categories)),
    ].sort((left, right) => left.localeCompare(right));

    return json({ packages, categories }, 200, responseCacheHeaders);
  } catch {
    return json({ error: "Host packages are temporarily unavailable" }, 502);
  }
}
