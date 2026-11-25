import { json } from "../http/json.js";
import {
  getCatalogItems,
  isSquareCheckoutEnabled,
  SquareInventoryUnavailableError,
} from "../services/square.js";
import { expectedValue, signValue } from "../services/payment-verification.js";
import {
  createDailyMenuCheckout,
  type DailyInventoryHoldLine,
} from "../services/daily-inventory-reservations.js";
import {
  isInternationalPhone,
  normalizeSquareAddress,
  normalizeSquarePhone,
  upsertSquareCustomer,
} from "../services/square-customer.js";
import type { ApiEnv } from "../types/env.js";

const drinkChoices: Record<string, readonly string[]> = {
  temperature: ["Hot", "Cold"],
};

function inventoryConflictMessage(
  itemName: string,
  availableQuantity: number,
): string {
  if (availableQuantity > 0) {
    return `${itemName} only has ${availableQuantity} available right now. Reduce its quantity, remove it from your cart, or wait a few minutes and try again.`;
  }
  return `${itemName} is temporarily unavailable. Remove it from your cart to continue with the rest of your order, or wait a few minutes and try again.`;
}

type CartLine = {
  variationId?: unknown;
  quantity?: unknown;
  options?: unknown;
  modifierIds?: unknown;
};

export async function handleCartCheckout(request: Request, env: ApiEnv): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (
    !isSquareCheckoutEnabled(env) ||
    !env.SQUARE_ACCESS_TOKEN ||
    !env.SQUARE_LOCATION_ID
  ) {
    return json({ error: "Square checkout is not configured." }, 503);
  }
  try {
    const raw = await request.text();
    if (raw.length > 20_000) return json({ error: "Request too large" }, 413);
    const body = JSON.parse(raw) as { items?: unknown; idempotencyKey?: unknown; orderNumber?: unknown; name?: unknown; email?: unknown; phone?: unknown; address?: unknown; notes?: unknown; termsAccepted?: unknown; allergenAccepted?: unknown };
    if (body.termsAccepted !== true) throw new Error("Accept the terms and conditions.");
    if (body.allergenAccepted !== true) throw new Error("Accept the allergen and food safety information.");
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) throw new Error("Your cart is empty or too large.");
    if (typeof body.idempotencyKey !== "string" || !/^[a-f0-9-]{36}$/i.test(body.idempotencyKey)) throw new Error("Invalid checkout request");
    if (typeof body.orderNumber !== "string" || !/^CC-[A-Z0-9]{6,20}-[A-Z0-9]{4}$/.test(body.orderNumber)) throw new Error("Invalid order number");
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = normalizeSquarePhone(typeof body.phone === "string" ? body.phone.trim() : "");
    const address = normalizeSquareAddress(body.address);
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (!name || name.length > 100) throw new Error("Enter your full name.");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if (!isInternationalPhone(phone)) throw new Error("Enter a valid phone number with country code.");
    if (notes.length > 500) throw new Error("Notes must be 500 characters or fewer.");

    // Always load authoritative products, prices, and current inventory from Square.
    const products = await getCatalogItems(env, {
      includePopularity: false,
      requireInventory: true,
    });
    const lineItems: Array<Record<string, unknown>> = [];
    const inventoryLines = new Map<string, DailyInventoryHoldLine>();
    const inventoryItemNames = new Map<string, string>();
    let total = 0;
    for (const rawLine of body.items as CartLine[]) {
      if (!rawLine || typeof rawLine !== "object") throw new Error("Invalid cart item");
      const quantity = rawLine.quantity;
      if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 99) throw new Error("Invalid quantity");
      if (typeof rawLine.variationId !== "string") throw new Error("This item is unavailable.");
      const product = products.find((item) =>
        item.variations.some((variation) => variation.id === rawLine.variationId),
      );
      const variation = product?.variations.find(
        (candidate) => candidate.id === rawLine.variationId,
      );
      if (!product || !variation || !variation.available || variation.price.currency !== "AUD" || variation.price.amount < 1) throw new Error("This item is unavailable.");
      if (variation.stock !== null) {
        const itemName = product.variations.length > 1
          ? `${product.name} (${variation.name})`
          : product.name;
        inventoryItemNames.set(variation.id, itemName);
        const existingInventoryLine = inventoryLines.get(variation.id);
        const combinedQuantity =
          (existingInventoryLine?.quantity ?? 0) + (quantity as number);
        if (combinedQuantity > variation.stock) {
          throw new Error(
            inventoryConflictMessage(itemName, variation.stock),
          );
        }
        inventoryLines.set(variation.id, {
          variationId: variation.id,
          quantity: combinedQuantity,
          availableQuantity: variation.stock,
        });
      }

      const isDrink = product.categories.some((category) => {
        const normalized = category.trim().toLowerCase();
        return normalized === "drinks" || normalized === "drinks website";
      });
      const isWholeCake = product.categories.some((category) => {
        const normalized = category.trim().toLowerCase();
        return normalized === "whole cakes" || normalized === "whole cakes website";
      });
      const modifierIds = rawLine.modifierIds === undefined
        ? []
        : Array.isArray(rawLine.modifierIds) && rawLine.modifierIds.length <= 50
          ? rawLine.modifierIds.map((id) => {
              if (typeof id !== "string") throw new Error("Choose valid item options.");
              return id;
            })
          : (() => { throw new Error("Choose valid item options."); })();
      if (new Set(modifierIds).size !== modifierIds.length) {
        throw new Error("Choose valid item options.");
      }
      const selectedModifiers = product.modifierLists.flatMap((list) =>
        list.modifiers.filter((modifier) => modifierIds.includes(modifier.id)),
      );
      if (selectedModifiers.length !== modifierIds.length) {
        throw new Error("Choose valid item options.");
      }
      for (const list of product.modifierLists) {
        const selectedCount = list.modifiers.filter((modifier) =>
          modifierIds.includes(modifier.id),
        ).length;
        if (
          selectedCount < list.minSelected ||
          (list.maxSelected > 0 && selectedCount > list.maxSelected)
        ) throw new Error("Choose valid item options.");
      }

      const modifierOptions = Object.fromEntries(
        product.modifierLists.map((list) => {
          const selectedNames = list.modifiers
            .filter((modifier) => modifierIds.includes(modifier.id))
            .map((modifier) => modifier.name);
          return [list.name, selectedNames.join(", ") || "None"];
        }),
      );
      const expectsSize = product.variations.length > 1 || isDrink || isWholeCake;
      const expectedOptions: Record<string, string> = {
        ...(expectsSize ? { size: variation.name } : {}),
        ...(isDrink ? { temperature: "" } : {}),
        ...modifierOptions,
      };
      let note: string | undefined;
      if (Object.keys(expectedOptions).length > 0) {
        if (!rawLine.options || typeof rawLine.options !== "object" || Array.isArray(rawLine.options)) {
          throw new Error("Choose valid item options.");
        }
        const options = rawLine.options as Record<string, unknown>;
        if (isDrink) {
          if (
            Object.entries(drinkChoices).some(
              ([key, choices]) =>
                typeof options[key] !== "string" ||
                !choices.includes(options[key] as string),
            )
          ) throw new Error("Choose valid item options.");
          expectedOptions.temperature = options.temperature as string;
        }
        if (
          Object.keys(options).length !== Object.keys(expectedOptions).length ||
          Object.entries(expectedOptions).some(([key, value]) => options[key] !== value)
        ) throw new Error("Choose valid item options.");
        note = Object.entries(expectedOptions)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");
      } else if (rawLine.options !== undefined) {
        throw new Error("Invalid item options.");
      }
      total +=
        (variation.price.amount +
          selectedModifiers.reduce((sum, modifier) => sum + modifier.price, 0)) *
        (quantity as number);
      lineItems.push({
        catalog_object_id: variation.id,
        quantity: String(quantity),
        ...(selectedModifiers.length > 0
          ? {
              modifiers: selectedModifiers.map((modifier) => ({
                catalog_object_id: modifier.id,
              })),
            }
          : {}),
        ...(note ? { note } : {}),
      });
    }

    // Square's Orders view surfaces line-item notes more reliably than the
    // API-only reference and metadata fields. Keep the customer-facing order
    // number on the first item, matching custom-cake and host orders.
    const firstLineItem = lineItems[0];
    const firstLineNote = typeof firstLineItem.note === "string" ? firstLineItem.note : "";
    lineItems[0] = {
      ...firstLineItem,
      note: [
        `Order: ${body.orderNumber}`,
        notes ? `Customer notes: ${notes}` : "",
        firstLineNote,
      ].filter(Boolean).join("\n"),
    };

    const customerId = await upsertSquareCustomer(
      env,
      name,
      email,
      phone,
      address,
      body.idempotencyKey,
    );

    const expected = expectedValue(body.orderNumber, total, env.SQUARE_LOCATION_ID);
    const payload = {
      idempotency_key: body.idempotencyKey,
      order: {
        location_id: env.SQUARE_LOCATION_ID,
        customer_id: customerId,
        reference_id: body.orderNumber,
        line_items: lineItems,
        fulfillments: [{
          type: "PICKUP",
          state: "PROPOSED",
          pickup_details: {
            schedule_type: "ASAP",
            pickup_at: new Date().toISOString(),
            recipient: {
              display_name: name,
              email_address: email,
              phone_number: phone,
              customer_id: customerId,
            },
          },
        }],
        metadata: { cc_expected: expected, cc_signature: await signValue(env, expected), cc_status: "pending", cc_order_number: body.orderNumber, cc_order_type: "daily_menu" },
      },
      checkout_options: { redirect_url: new URL("/DailyMenu/payment-result/", env.WEBSITE_ORIGIN || "http://localhost:3000").href, allow_tipping: false, ask_for_shipping_address: false, enable_coupon: false, enable_loyalty: false },
      payment_note: `Cake Cloud daily menu order · ${body.orderNumber} · ${name}`,
    };
    const checkout = await createDailyMenuCheckout(
      env,
      body.idempotencyKey,
      [...inventoryLines.values()],
      payload,
    );
    if (!checkout.ok) {
      if (checkout.reason === "attempt-cancelled-inventory") {
        return json(
          {
            error:
              "Square inventory changed while you were checking out, so the payment link was cancelled to prevent an oversold order. Please review your cart and try again.",
            code: "CHECKOUT_ATTEMPT_CANCELLED_INVENTORY",
          },
          409,
        );
      }
      if (checkout.reason === "attempt-expired") {
        return json(
          {
            error:
              "Your previous checkout link expired. Please press Pay & Place Order again to start a new checkout.",
            code: "CHECKOUT_ATTEMPT_EXPIRED",
          },
          409,
        );
      }
      if (checkout.reason === "attempt-conflict") {
        return json(
          {
            error:
              "Your cart changed after checkout started. Wait for the current checkout to expire, then try again.",
            code: "CHECKOUT_ATTEMPT_CONFLICT",
            expiresAt: checkout.expiresAt,
          },
          409,
        );
      }
      return json(
        {
          error: inventoryConflictMessage(
            checkout.variationId
              ? (inventoryItemNames.get(checkout.variationId) ?? "This item")
              : "This item",
            checkout.availableQuantity ?? 0,
          ),
        },
        409,
      );
    }
    return json({ url: checkout.url, expiresAt: checkout.expiresAt });
  } catch (error) {
    if (error instanceof SquareInventoryUnavailableError) {
      return json(
        {
          error:
            "Live inventory is temporarily unavailable. Please try again shortly.",
        },
        503,
      );
    }
    return json({ error: error instanceof Error ? error.message : "Could not start checkout." }, 400);
  }
}
