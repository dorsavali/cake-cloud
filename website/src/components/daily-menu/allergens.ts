// Allergens come straight from the Square catalog (raw enum values such as
// "gluten" or "milk"), so the filter always matches real product data.
export type AllergenOption = {
  value: string;
  count: number;
};

export function formatAllergenLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
