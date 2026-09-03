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
      {itemCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-primary font-signika text-xs font-medium leading-none text-accent shadow-[0_1px_4px_rgb(70_66_72/18%)]"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
}
