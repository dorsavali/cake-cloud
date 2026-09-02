export type DailyMenuProduct = {
  id: string;
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
  popularityScore: number;
};
