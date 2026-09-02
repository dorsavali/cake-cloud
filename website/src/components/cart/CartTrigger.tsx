"use client";

import Image from "next/image";

import { useCart } from "./CartProvider";

export function CartTrigger({ className }: { className?: string }) {
  const { items, openCart } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Open shopping cart with ${itemCount} items`}
      className={`relative rounded-full p-1 transition-[background-color,transform] duration-200 hover:bg-primary/15 active:scale-95 active:bg-primary/30 outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary ${className ?? ""}`}
    >
      <Image src="/icons/cart.svg" alt="" width={38} height={38} unoptimized />
    </button>
  );
}
