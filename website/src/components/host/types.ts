export type HostPackage = {
  id: string;
  name: string;
  description: string;
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
  enquiryOnly: boolean;
  displayOrder: number;
};
