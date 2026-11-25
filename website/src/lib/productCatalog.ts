import type { DailyMenuProduct } from "@/components/daily-menu/types";

import { apiUrl } from "./api";

export async function getProductById(productId: string): Promise<DailyMenuProduct> {
  const response = await fetch(
    apiUrl(`/api/products/${encodeURIComponent(productId)}`),
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error("Product request failed");
  const data = (await response.json()) as { product?: DailyMenuProduct };
  if (!data.product) throw new Error("Product not found");
  return data.product;
}
