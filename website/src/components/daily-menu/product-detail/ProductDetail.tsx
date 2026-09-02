"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { apiUrl } from "@/lib/api";

import type { DailyMenuProduct } from "../types";
import styles from "./ProductDetail.module.css";

const storageInstructions =
  "Best enjoyed fresh. Keep at room temperature and consume within 24 hours.";
const preparationNotes =
  "Baked fresh daily; quantity subject to production capacity.";

function formatPrice(product: DailyMenuProduct) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: product.price.currency,
    minimumFractionDigits: 2,
  }).format(product.price.amount / 100);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-luxury-accent/20 py-5 first:border-t-0">
      <h2 className="font-signika text-[11px] font-normal uppercase tracking-[0.16em] text-accent-dark/55">
        {label}
      </h2>
      <div className="mt-3 font-signika text-sm font-light leading-6 text-accent-dark">
        {children}
      </div>
    </div>
  );
}

export function ProductDetail() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");
  const { addItem } = useCart();
  const [products, setProducts] = useState<DailyMenuProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadProduct = async () => {
      try {
        const response = await fetch(apiUrl("/api/products"), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Product request failed");
        const data = (await response.json()) as { items?: DailyMenuProduct[] };
        setProducts(data.items ?? []);
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    void loadProduct();
    return () => controller.abort();
  }, []);

  const product = useMemo(
    () => products.find((item) => item.id === productId),
    [productId, products],
  );

  if (isLoading) {
    return <p className="py-40 text-center font-signika text-accent-dark/65">Loading product...</p>;
  }

  if (error || !product) {
    return (
      <div className="py-40 text-center font-signika text-accent-dark">
        <p>Product not found.</p>
        <Link href="/DailyMenu" className="mt-4 inline-block text-primary underline">Back to Daily Menu</Link>
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
  const ingredients = product.ingredients || product.allergens.join(", ") || "Not specified";
  const allergens = product.allergens.join(", ") || "Not specified";
  const dietary = product.dietaryPreferences.join(", ") || "Not specified";

  const moveImage = (direction: number) => {
    if (images.length < 2) return;
    setActiveImage((current) => (current + direction + images.length) % images.length);
  };

  const addToCart = () => {
    if (quantity < 1) return;

    addItem({
      id: product.id,
      name: product.name,
      unitPrice: product.price.amount,
      currency: product.price.currency,
      quantity,
    });
    setQuantity(0);
  };

  return (
    <div dir="ltr" className="mx-auto w-full max-w-[1320px] px-8 pb-28 pt-8 text-accent-dark">
      <Link href="/DailyMenu" className="inline-flex items-center gap-2 font-signika text-sm text-accent-dark/60 transition-colors hover:text-primary">
        <span aria-hidden="true">←</span> Back to Daily Products
      </Link>

      <div className="mt-7 grid grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] items-start gap-7">
        <section aria-label="Product images" className="min-w-0">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-luxury-accent/55 bg-[#eee8dc]">
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
            <div className="mt-4 flex gap-3 overflow-x-auto px-1 pb-1">
              {images.map((image, index) => (
                <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`Show image ${index + 1}`} className={`${styles.thumbnail} relative size-16 shrink-0 overflow-hidden rounded-xl border-2 ${index === activeImage ? "border-primary opacity-100" : "border-transparent opacity-70"}`}>
                  <Image src={image} alt="" fill unoptimized className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-luxury-accent/55 bg-accent px-7 py-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-kalnia text-[28px] font-medium leading-tight">{product.name}</h1>
              {product.variationName && <p className="mt-1 font-signika text-sm font-light text-accent-dark/60">{product.variationName}</p>}
            </div>
            <p className="shrink-0 font-kalnia text-2xl font-normal text-primary">{formatPrice(product)}</p>
          </div>

          {categoryTags.length > 0 && <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 font-signika text-xs text-accent-dark/60">{categoryTags.map((category) => <span key={category}>{category}</span>)}</div>}

          <div className="mt-5">
            <DetailRow label="About this item">{product.description || "No description available."}</DetailRow>
            <DetailRow label="Ingredients">{ingredients}</DetailRow>
            <DetailRow label="Allergen information">{allergens}</DetailRow>
            <DetailRow label="Dietary information">{dietary}</DetailRow>
            <DetailRow label="Storage / serving instructions">{storageInstructions}</DetailRow>
            <DetailRow label="Preparation notes">{preparationNotes}</DetailRow>
          </div>

          <div className="flex items-center gap-8 border-t border-luxury-accent/20 pt-5 font-signika text-sm">
            <span>Daily / limited capacity</span>
            <span className="text-[#e88900]">Only 10 left</span>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-luxury-accent/25 bg-accent/95 px-8 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1390px] gap-4">
          <div className="flex h-14 w-[150px] shrink-0 items-center justify-around rounded-2xl bg-primary font-signika text-accent">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((current) => Math.max(0, current - 1))} className="size-10 text-xl">−</button>
            <span>{quantity}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((current) => current + 1)} className="size-10 text-xl">+</button>
          </div>
          <button
            type="button"
            disabled={quantity < 1}
            onClick={addToCart}
            className={`${styles.actionButton} h-14 flex-1 rounded-2xl border border-luxury-accent bg-accent font-kalnia text-lg font-medium disabled:cursor-not-allowed disabled:opacity-45`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
