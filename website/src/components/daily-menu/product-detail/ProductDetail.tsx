"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { ProductImagePlaceholder } from "@/components/shared/ProductImagePlaceholder";
import { getProductById } from "@/lib/productCatalog";

import {
  buildDailyMenuCategories,
  dailyMenuCategories,
} from "../category-tabs";
import type { DailyMenuProduct } from "../types";
import styles from "./ProductDetail.module.css";
import { ProductDetailLoading } from "./ProductDetailLoading";
import {
  defaultDrinkSelection,
  DrinkOptions,
  type DrinkSelection,
} from "./DrinkOptions";

const storageInstructions =
  "Best enjoyed fresh. Keep at room temperature and consume within 24 hours.";
const preparationNotes =
  "Baked fresh daily; quantity subject to production capacity.";
const swipeThreshold = 40;

function formatPrice(product: DailyMenuProduct, amount = product.price.amount) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: product.price.currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function capitalizeListItems(value: string) {
  return value.replace(
    /(^|[,;/]\s*)([a-z])/gi,
    (_, separator: string, letter: string) => separator + letter.toUpperCase(),
  );
}

function formatAllergen(value: string) {
  const normalized = value.replace(/_/g, " ").trim().toLowerCase();
  return capitalizeListItems(normalized);
}

function formatDietaryPreference(value: string) {
  const normalized = value.replace(/_/g, " ").toLowerCase().trim();
  return capitalizeListItems(normalized);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-luxury-accent/20 py-3.5 first:border-t-0">
      <h2 className="font-signika text-[9px] font-normal uppercase tracking-[0.16em] text-accent-dark/55 lg:text-[11px]">
        {label}
      </h2>
      <div className="mt-2 font-signika text-xs font-normal leading-5 text-accent-dark lg:text-sm">
        {children}
      </div>
    </div>
  );
}

export function ProductDetail() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");
  const { addItem } = useCart();
  const [product, setProduct] = useState<DailyMenuProduct | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "success" | "error">("loading");
  const [resolvedProductId, setResolvedProductId] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [imageDirection, setImageDirection] = useState<1 | -1>(1);
  const [quantity, setQuantity] = useState(0);
  const [selectedVariationId, setSelectedVariationId] = useState("");
  const [drinkSelection, setDrinkSelection] = useState<DrinkSelection>(defaultDrinkSelection);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadProduct = async () => {
      setLoadState("loading");
      setProduct(null);
      setResolvedProductId(null);
      setDrinkSelection(defaultDrinkSelection);
      setSelectedVariationId("");
      setQuantity(0);
      setActiveImage(0);

      try {
        if (!productId) throw new Error("Missing product id");
        const fetchedProduct = await getProductById(productId);
        if (isActive) {
          const isColdDrink = fetchedProduct.categories.some((category) => {
            const normalized = category.trim().toLowerCase();
            return normalized === "cold drinks" || normalized === "cold drinks website";
          });
          const modifierIdsByList = Object.fromEntries(
            fetchedProduct.modifierLists.map((list) => {
              const maximum =
                list.maxSelected > 0
                  ? list.maxSelected
                  : Number.POSITIVE_INFINITY;
              const selected = list.modifiers
                .filter((modifier) => modifier.defaultSelected)
                .slice(0, maximum)
                .map((modifier) => modifier.id);
              for (const modifier of list.modifiers) {
                if (selected.length >= list.minSelected) break;
                if (!selected.includes(modifier.id)) selected.push(modifier.id);
              }
              return [list.id, selected];
            }),
          );
          setProduct(fetchedProduct);
          setSelectedVariationId(
            fetchedProduct.variations.find((variation) => variation.available)
              ?.id ?? fetchedProduct.variations[0]?.id ?? "",
          );
          setDrinkSelection({
            ...defaultDrinkSelection,
            temperature: isColdDrink ? "Cold" : "Hot",
            modifierIdsByList,
          });
          setResolvedProductId(productId);
          setLoadState("success");
        }
      } catch {
        if (isActive) {
          setResolvedProductId(productId);
          setLoadState("error");
        }
      }
    };
    void loadProduct();
    return () => {
      isActive = false;
    };
  }, [productId]);

  if (loadState === "loading" || resolvedProductId !== productId) {
    return <ProductDetailLoading />;
  }

  if (loadState === "error" || !product) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[1320px] items-center justify-center px-8 text-center">
        <div className="rounded-2xl border border-luxury-accent/35 bg-accent/85 px-8 py-10 font-signika text-accent-dark">
          <p className="text-base">Unable to fetch product details.</p>
          <p className="mt-2 text-sm font-light text-accent-dark/60">
            Please try again in a moment.
          </p>
          <Link
            href="/DailyMenu"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-accent transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
          >
            <span aria-hidden="true" className="mr-2">←</span>
            Back to Daily Menu
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images?.length
    ? product.images
    : product.image
      ? [product.image]
      : [];
  const selectedImage = images[activeImage] ?? null;
  const categoryTags = product.categories
    .filter((category) => {
      const normalized = category.trim().toLowerCase();
      return !normalized.includes("website") && normalized !== "daily menu";
    })
    .slice(0, 3);
  const isDrink = product.categories.some((category) => {
    const normalized = category.trim().toLowerCase();
    return normalized === "drinks" || normalized === "drinks website";
  });
  const isWholeCake = product.categories.some((category) => {
    const normalized = category.trim().toLowerCase();
    return normalized === "whole cakes" || normalized === "whole cakes website";
  });
  const selectedVariation =
    product.variations.find((variation) => variation.id === selectedVariationId) ??
    product.variations[0];
  const selectedModifierIds = Object.values(
    drinkSelection.modifierIdsByList,
  ).flat();
  const selectedModifiers = product.modifierLists.flatMap((list) =>
    list.modifiers.filter((modifier) => selectedModifierIds.includes(modifier.id)),
  );
  const modifierOptions = Object.fromEntries(
    product.modifierLists.map((list) => {
      const selectedIds = drinkSelection.modifierIdsByList[list.id] ?? [];
      const selectedNames = list.modifiers
        .filter((modifier) => selectedIds.includes(modifier.id))
        .map((modifier) => modifier.name);
      return [list.name, selectedNames.join(", ") || "None"];
    }),
  );
  const modifierSelectionValid = product.modifierLists.every((list) => {
    const selectedCount = drinkSelection.modifierIdsByList[list.id]?.length ?? 0;
    return (
      selectedCount >= list.minSelected &&
      (list.maxSelected === 0 || selectedCount <= list.maxSelected)
    );
  });
  const unitPrice =
    (selectedVariation?.price.amount ?? product.price.amount) +
    selectedModifiers.reduce((total, modifier) => total + modifier.price, 0);
  const requestedReturnCategory = searchParams.get("category");
  const productMenuCategories = buildDailyMenuCategories(
    product.dailyMenuCategories ?? [],
  );
  const returnCategory =
    productMenuCategories.find(
      (category) => category.id === requestedReturnCategory,
    ) ??
    dailyMenuCategories.find(
      (category) => category.id === requestedReturnCategory,
    ) ??
    productMenuCategories[0] ??
    dailyMenuCategories.find((category) =>
      product.categories.some(
        (productCategory) =>
          productCategory.trim().toLowerCase() ===
          category.squareName.toLowerCase(),
      ),
    );
  const backHref = returnCategory
    ? `/DailyMenu?category=${encodeURIComponent(returnCategory.id)}`
    : "/DailyMenu";
  const ingredients = capitalizeListItems(product.ingredients?.trim() ?? "");
  const allergens = product.allergens
    .map(formatAllergen)
    .filter(Boolean)
    .join(", ") || "Not specified";
  const dietary = product.dietaryPreferences
    .map(formatDietaryPreference)
    .filter(Boolean)
    .join(", ") || "Not specified";
  const selectedStock = selectedVariation ? selectedVariation.stock : product.stock;
  const unavailable = selectedVariation
    ? selectedVariation.available === false
    : product.available === false;
  const maximumQuantity =
    unavailable
      ? 0
      : selectedStock === null
      ? Number.POSITIVE_INFINITY
      : Math.max(0, Math.floor(selectedStock));

  const moveImage = (direction: number) => {
    if (images.length < 2) return;
    setImageDirection(direction < 0 ? -1 : 1);
    setActiveImage((current) => (current + direction + images.length) % images.length);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || images.length < 2) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    moveImage(deltaX < 0 ? 1 : -1);
  };

  const addToCart = () => {
    if (quantity < 1 || unavailable || !modifierSelectionValid) return;

    const options = {
      ...(product.variations.length > 1 || isDrink || isWholeCake
        ? { size: selectedVariation?.name ?? "" }
        : {}),
      ...(isDrink ? { temperature: drinkSelection.temperature } : {}),
      ...modifierOptions,
    };

    addItem({
      id: product.id,
      options: Object.keys(options).length > 0 ? options : undefined,
      modifierIds:
        product.modifierLists.length > 0 ? selectedModifierIds : undefined,
      variationId: selectedVariation?.id ?? product.variationId,
      name: product.name,
      unitPrice,
      currency: product.price.currency,
      quantity,
      maxQuantity: selectedStock === null ? null : maximumQuantity,
    });
    setQuantity(0);
  };

  return (
    <div dir="ltr" className="mx-auto w-full max-w-[1220px] px-4 pb-6 pt-2 text-accent-dark lg:px-8 lg:pb-18">
      <Link href={backHref} className="inline-flex items-center gap-2 font-signika text-xs text-accent-dark/60 transition-colors hover:text-primary lg:text-sm">
        <span aria-hidden="true">←</span> Back to Daily Products
      </Link>

      <div className="mt-3 grid grid-cols-1 items-start gap-4 lg:mt-2 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-6">
        <section aria-label="Product images" className="min-w-0">
          <div
            className="relative aspect-square touch-pan-y overflow-hidden rounded-xl border border-luxury-accent/55 bg-[#eee8dc] lg:rounded-2xl"
            onTouchStart={(event) => {
              const touch = event.touches[0];
              touchStart.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => {
              touchStart.current = null;
            }}
          >
            {selectedImage ? (
              <Image
                key={`${selectedImage}-${activeImage}`}
                src={selectedImage}
                alt={product.name}
                fill
                priority
                unoptimized
                className={`${styles.productImage} ${imageDirection === 1 ? styles.slideFromRight : styles.slideFromLeft} object-cover`}
              />
            ) : (
              <ProductImagePlaceholder />
            )}
            {images.length > 1 && (
              <>
                <button type="button" aria-label="Previous image" onClick={() => moveImage(-1)} className="absolute left-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-accent/90 font-signika shadow">←</button>
                <button type="button" aria-label="Next image" onClick={() => moveImage(1)} className="absolute right-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-accent/90 font-signika shadow">→</button>
              </>
            )}
          </div>
          {images.length > 0 && (
            <div className="mt-3 hidden justify-start gap-2.5 overflow-x-auto px-1 pb-1 lg:flex">
              {images.map((image, index) => (
                <button key={`${image}-${index}`} type="button" onClick={() => {
                  setImageDirection(index < activeImage ? -1 : 1);
                  setActiveImage(index);
                }} aria-label={`Show image ${index + 1}`} className={`${styles.thumbnail} relative size-11 shrink-0 overflow-hidden rounded-lg border-2 lg:size-16 lg:rounded-xl ${index === activeImage ? "border-primary opacity-100" : "border-transparent opacity-70"}`}>
                  <Image src={image} alt="" fill unoptimized className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-luxury-accent/55 bg-accent px-4 py-4 lg:rounded-2xl lg:px-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-kalnia text-xl font-medium leading-tight lg:text-[26px]">{product.name}</h1>
            </div>
            <p aria-live="polite" className="shrink-0 font-signika text-lg font-normal text-primary lg:text-2xl">{formatPrice(product, unitPrice)}</p>
          </div>

          {categoryTags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5 font-signika text-[10px] text-accent-dark/60 lg:gap-x-7 lg:gap-y-1.5 lg:text-xs">{categoryTags.map((category) => <span key={category} className="rounded-full bg-[#eee8da] px-2 py-1 lg:bg-transparent lg:px-0 lg:py-0">{category}</span>)}</div>}

          {(product.variations.length > 1 ||
            product.modifierLists.length > 0) && (
            <DrinkOptions
              variations={product.variations}
              modifierLists={product.modifierLists}
              currency={product.price.currency}
              selectedVariationId={selectedVariation?.id ?? ""}
              onVariationChange={(variationId) => {
                setSelectedVariationId(variationId);
                setQuantity(0);
              }}
              value={drinkSelection}
              onChange={setDrinkSelection}
            />
          )}

          {!isDrink ? (
            <div className="mt-3">
              <DetailRow label="About this item">{product.description || "No description available."}</DetailRow>
              {ingredients && <DetailRow label="Ingredients">{ingredients}</DetailRow>}
              <DetailRow label="Allergen information">{allergens}</DetailRow>
              <DetailRow label="Dietary information">{dietary}</DetailRow>
              <DetailRow label="Storage / serving instructions">{storageInstructions}</DetailRow>
              <DetailRow label="Preparation notes">{preparationNotes}</DetailRow>
            </div>
          ) : null}

          {selectedStock !== null && selectedStock < 10 && (
            <div className="flex items-center gap-8 border-t border-luxury-accent/20 pt-3.5 font-signika text-sm">
              <span>Daily / limited capacity</span>
              <span className="text-[#e88900]">
                {selectedStock === 0 ? "0 left" : `Only ${selectedStock} left`}
              </span>
            </div>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-luxury-accent/25 bg-accent/95 px-3 py-2.5 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex max-w-[1390px] gap-2 lg:gap-4">
          <div className="flex h-12 w-[90px] shrink-0 items-center justify-around rounded-2xl bg-primary font-signika text-accent lg:w-[150px]">
            <button type="button" aria-label="Decrease quantity" disabled={unavailable} onClick={() => setQuantity((current) => Math.max(0, current - 1))} className="size-10 text-xl disabled:cursor-not-allowed disabled:opacity-35">−</button>
            <span>{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={unavailable || quantity >= maximumQuantity}
              onClick={() =>
                setQuantity((current) => Math.min(maximumQuantity, current + 1))
              }
              className="size-10 text-xl disabled:cursor-not-allowed disabled:opacity-35"
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={unavailable || quantity < 1 || !modifierSelectionValid}
            onClick={addToCart}
            className={`${styles.actionButton} h-12 flex-1 rounded-2xl border border-luxury-accent bg-accent font-kalnia text-base font-medium disabled:cursor-not-allowed disabled:opacity-45`}
          >
            {unavailable
              ? "Sold Out"
              : !modifierSelectionValid
                ? "Choose Required Options"
                : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
