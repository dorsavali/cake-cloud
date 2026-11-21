export type HostPackage = {
  id: string;
  name: string;
  description: string;
  descriptionHtml: string;
  image: string | null;
  categories: string[];
  price: {
    amount: number;
    currency: string;
  };
  priceUnit: string;
  minimumGuests: number | null;
  maximumGuests: number | null;
  includedItems: string[];
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
  enquiryOnly: boolean;
  displayOrder: number;
};
