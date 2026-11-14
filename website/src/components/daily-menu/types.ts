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
  variations: Array<{
    id: string;
    name: string;
    price: {
      amount: number;
      currency: string;
    };
    stock: number | null;
    available: boolean;
  }>;
  modifierLists: Array<{
    id: string;
    name: string;
    minSelected: number;
    maxSelected: number;
    modifiers: Array<{
      id: string;
      name: string;
      price: number;
      defaultSelected: boolean;
    }>;
  }>;
  image: string | null;
  images: string[];
  categories: string[];
  dailyMenuCategories: string[];
  ingredients: string;
  dietaryPreferences: string[];
  allergens: string[];
  stock: number | null;
  available: boolean;
  popularityScore: number;
};

export type DailyMenuProductCard = Pick<
  DailyMenuProduct,
  | "id"
  | "name"
  | "description"
  | "variationName"
  | "price"
  | "image"
  | "stock"
  | "available"
>;
