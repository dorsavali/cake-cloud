"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { getProductById } from "@/lib/productCatalog";

import type { DailyMenuProduct } from "../types";
import styles from "./ProductDetail.module.css";
import { ProductDetailLoading } from "./ProductDetailLoading";
import { defaultDrinkSelection, DrinkOptions, type DrinkSelection } from "./DrinkOptions";

const storageInstructions =
  "Best enjoyed fresh. Keep at room temperature and consume within 24 hours.";
const preparationNotes =
  "Baked fresh daily; quantity subject to production capacity.";

function formatPrice(product: DailyMenuProduct, amount = product.price.amount) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: product.price.currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function formatAllergen(value: string) {
  const normalized = value.replace(/_/g, " ").trim().toLowerCase();
  return normalized
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : "";
}

function formatDietaryPreference(value: string) {
  const normalized = value.replace(/_/g, " ").toLowerCase().trim();
  return normalized
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : "";
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
  const [quantity, setQuantity] = useState(0);
  const [drinkSelection, setDrinkSelection] = useState<DrinkSelection>(defaultDrinkSelection);

  useEffect(() => {
    let isActive = true;

    const loadProduct = async () => {
      setLoadState("loading");
      setProduct(null);
      setResolvedProductId(null);
      setDrinkSelection(defaultDrinkSelection);
      setQuantity(0);
      setActiveImage(0);

      try {
        if (!productId) throw new Error("Missing product id");
        const fetchedProduct = await getProductById(productId);
        if (isActive) {
          setProduct(fetchedProduct);
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
  const categoryTags = product.categories.slice(0, 3);
  const isDrink = product.categories.some((category) => category.trim().toLowerCase() === "drinks");
  const unitPrice = product.price.amount + (isDrink && drinkSelection.size === "Large (450ml)" ? 100 : 0);
  const ingredients = product.ingredients?.trim() ?? "";
  const allergens = product.allergens
    .map(formatAllergen)
    .filter(Boolean)
    .join(", ") || "Not specified";
  const dietary = product.dietaryPreferences
    .map(formatDietaryPreference)
    .filter(Boolean)
    .join(", ") || "Not specified";
  const maximumQuantity =
    product.stock === null
      ? Number.POSITIVE_INFINITY
      : Math.max(0, Math.floor(product.stock));

  const moveImage = (direction: number) => {
    if (images.length < 2) return;
    setActiveImage((current) => (current + direction + images.length) % images.length);
  };

  const addToCart = () => {
    if (quantity < 1) return;

    addItem({
      id: product.id,
      options: isDrink ? { ...drinkSelection } : undefined,
      variationId: product.variationId,
      name: product.name,
      unitPrice,
      currency: product.price.currency,
      quantity,
      maxQuantity: product.stock === null ? null : maximumQuantity,
    });
    setQuantity(0);
  };

  return (
    <div dir="ltr" className="mx-auto w-full max-w-[1220px] px-4 pb-20 pt-2 text-accent-dark lg:px-8 lg:pb-18">
      <Link href="/DailyMenu" className="inline-flex items-center gap-2 font-signika text-xs text-accent-dark/60 transition-colors hover:text-primary lg:text-sm">
        <span aria-hidden="true">←</span> Back to Daily Products
      </Link>

      <div className="mt-3 grid grid-cols-1 items-start gap-4 lg:mt-2 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-6">
        <section aria-label="Product images" className="min-w-0">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-luxury-accent/55 bg-[#eee8dc] lg:rounded-2xl">
            {selectedImage ? (
              <Image src={selectedImage} alt={product.name} fill priority unoptimized className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center font-signika text-accent-dark/45">No image</div>
            )}
            {images.length > 1 && (
              <>
                <button type="button" aria-label="Previous image" onClick={() => moveImage(-1)} className="absolute left-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-accent/90 font-signika shadow">←</button>
                <button type="button" aria-label="Next image" onClick={() => moveImage(1)} className="absolute right-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-accent/90 font-signika shadow">→</button>
              </>
            )}
          </div>
          {images.length > 0 && (
            <div className="mt-1 flex justify-center gap-2 overflow-x-auto px-1 pb-1 lg:mt-3 lg:justify-start lg:gap-2.5">
              {images.map((image, index) => (
                <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`Show image ${index + 1}`} className={`${styles.thumbnail} relative size-11 shrink-0 overflow-hidden rounded-lg border-2 lg:size-16 lg:rounded-xl ${index === activeImage ? "border-primary opacity-100" : "border-transparent opacity-70"}`}>
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
              {product.variationName && <p className="mt-1 font-signika text-sm font-light text-accent-dark/60">{product.variationName}</p>}
            </div>
            <p aria-live="polite" className="shrink-0 font-kalnia text-lg font-normal text-primary lg:text-2xl">{formatPrice(product, unitPrice)}</p>
          </div>

          {categoryTags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5 font-signika text-[10px] text-accent-dark/60 lg:gap-x-7 lg:gap-y-1.5 lg:text-xs">{categoryTags.map((category) => <span key={category} className="rounded-full bg-[#eee8da] px-2 py-1 lg:bg-transparent lg:px-0 lg:py-0">{category}</span>)}</div>}

          {isDrink && <DrinkOptions value={drinkSelection} onChange={setDrinkSelection} largeSurcharge={formatPrice(product, 100)} />}

          <div className="mt-3">
            {isDrink ? (
              <DetailRow label="About & Ingredients">
                {[product.description?.trim(), ingredients].filter(Boolean).join(" ") || "No description available."}
              </DetailRow>
            ) : (
              <>
                <DetailRow label="About this item">{product.description || "No description available."}</DetailRow>
                {ingredients && <DetailRow label="Ingredients">{ingredients}</DetailRow>}
              </>
            )}
            <DetailRow label="Allergen information">{allergens}</DetailRow>
            {!isDrink && <DetailRow label="Dietary information">{dietary}</DetailRow>}
            {!isDrink && <DetailRow label="Storage / serving instructions">{storageInstructions}</DetailRow>}
            {!isDrink && <DetailRow label="Preparation notes">{preparationNotes}</DetailRow>}
          </div>

          {product.stock !== null && product.stock < 10 && (
            <div className="flex items-center gap-8 border-t border-luxury-accent/20 pt-3.5 font-signika text-sm">
              <span>Daily / limited capacity</span>
              <span className="text-[#e88900]">
                {product.stock === 0 ? "0 left" : `Only ${product.stock} left`}
              </span>
            </div>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-luxury-accent/25 bg-accent/95 px-3 py-2.5 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex max-w-[1390px] gap-2 lg:gap-4">
          <div className="flex h-12 w-[90px] shrink-0 items-center justify-around rounded-2xl bg-primary font-signika text-accent lg:w-[150px]">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((current) => Math.max(0, current - 1))} className="size-10 text-xl">−</button>
            <span>{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={quantity >= maximumQuantity}
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
            disabled={quantity < 1}
            onClick={addToCart}
            className={`${styles.actionButton} h-12 flex-1 rounded-2xl border border-luxury-accent bg-accent font-kalnia text-base font-medium disabled:cursor-not-allowed disabled:opacity-45`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
