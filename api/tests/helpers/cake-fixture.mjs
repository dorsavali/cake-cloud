export const cakeSize = {
  id: "cake-size",
  variationId: "cake-variation",
  name: "Circle 6 Mini (6\"*3\")",
  label: "6” x 3”",
  serves: "8-10",
  shape: "round",
  image: null,
  images: [],
  price: { amount: 14500, currency: "AUD" },
  designModifier: null,
  modifierLists: [
    {
      id: "size",
      name: "Size",
      selectionType: "SINGLE",
      minSelected: 0,
      maxSelected: 1,
      modifiers: [
        { id: "size-large", name: "Large", price: 5000, defaultSelected: false },
        { id: "size-small", name: "Small", price: 0, defaultSelected: false },
      ],
    },
    {
      id: "height",
      name: "Height",
      selectionType: "SINGLE",
      minSelected: 0,
      maxSelected: 1,
      modifiers: [
        { id: "height-tall", name: "Tall", price: 2000, defaultSelected: false },
      ],
    },
    {
      id: "filling",
      name: "Filling",
      selectionType: "SINGLE",
      minSelected: 0,
      maxSelected: 1,
      modifiers: [
        { id: "filling-premium", name: "Premium", price: 3000, defaultSelected: false },
      ],
    },
    {
      id: "extras",
      name: "Extras",
      selectionType: "MULTIPLE",
      minSelected: 0,
      maxSelected: 0,
      modifiers: [
        { id: "flowers", name: "Fresh Flowers", price: 2500, defaultSelected: false },
        { id: "gold", name: "Gold Leaf", price: 1400, defaultSelected: false },
      ],
    },
  ],
};

export const cakeDesign = {
  id: "cake-design",
  name: "Classic Round",
  description: "",
  image: null,
  images: [],
  sizes: [cakeSize],
};

export const cake = {
  design: cakeDesign.id,
  size: cakeSize.id,
  selections: [],
  message: "",
};

export const cakeDesigns = [cakeDesign];

export function cakeCatalogResponse(options) {
  const body = JSON.parse(String(options?.body ?? "{}"));
  if (body.object_types?.includes("CATEGORY")) {
    return Response.json({
      objects: [
        {
          type: "CATEGORY",
          id: "cake-category",
          category_data: { name: "Custom Cake Designs" },
        },
        {
          type: "CATEGORY",
          id: cakeDesign.id,
          category_data: {
            name: cakeDesign.name,
            parent_category: { id: "cake-category", ordinal: 1 },
          },
        },
      ],
    });
  }

  const modifierLists = cakeSize.modifierLists.map((list, listIndex) => ({
    type: "MODIFIER_LIST",
    id: list.id,
    modifier_list_data: {
      name: list.name,
      ordinal: listIndex,
      min_selected_modifiers: list.minSelected,
      max_selected_modifiers: list.maxSelected,
      modifiers: list.modifiers.map((modifier, modifierIndex) => ({
        type: "MODIFIER",
        id: modifier.id,
        modifier_data: {
          name: modifier.name,
          ordinal: modifierIndex,
          price_money: { amount: modifier.price, currency: "AUD" },
          on_by_default: modifier.defaultSelected,
        },
      })),
    },
  }));

  return Response.json({
    objects: [
      {
        type: "ITEM",
        id: cakeSize.id,
        item_data: {
          name: cakeSize.name,
          categories: [{ id: cakeDesign.id }],
          variations: [
            {
              type: "ITEM_VARIATION",
              id: cakeSize.variationId,
              item_variation_data: {
                pricing_type: "FIXED_PRICING",
                price_money: cakeSize.price,
              },
            },
          ],
          modifier_list_info: cakeSize.modifierLists.map((list, ordinal) => ({
            modifier_list_id: list.id,
            enabled: true,
            ordinal,
            min_selected_modifiers: list.minSelected,
            max_selected_modifiers: list.maxSelected,
          })),
        },
      },
    ],
    related_objects: modifierLists,
  });
}

export function isCakeCatalogRequest(url) {
  return String(url).endsWith("/v2/catalog/search");
}
