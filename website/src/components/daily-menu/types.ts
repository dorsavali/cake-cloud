export type DailyMenuProduct = {
  id: string;
  variationId: string | null;
  name: string;
  description: string;
  variationName: string;
  price: {
    amount: number;
    currency: string;
  };
  image: string | null;
  images: string[];
  categories: string[];
  ingredients: string;
  dietaryPreferences: string[];
  allergens: string[];
  stock: number | null;
  popularityScore: number;
};
