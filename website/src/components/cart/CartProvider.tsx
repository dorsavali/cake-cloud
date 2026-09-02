"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string;
  name: string;
  unitPrice: number;
  currency: string;
  quantity: number;
};

type AddCartItem = Omit<CartItem, "quantity"> & { quantity?: number };

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: AddCartItem) => void;
  setItemQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
};

const initialItems: CartItem[] = [
  {
    id: "demo-almond-croissant",
    name: "Almond Croissant",
    unitPrice: 950,
    currency: "AUD",
    quantity: 1,
  },
  {
    id: "demo-fudge-brownie",
    name: "Fudge Brownie",
    unitPrice: 690,
    currency: "AUD",
    quantity: 1,
  },
];

const CartContext = createContext<CartContextValue | null>(null);

function formatMoney(amountInCents: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountInCents / 100);
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CartDrawer({
  items,
  isOpen,
  closeCart,
  setItemQuantity,
  removeItem,
}: Pick<
  CartContextValue,
  "items" | "isOpen" | "closeCart" | "setItemQuantity" | "removeItem"
>) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCart, isOpen]);

  const totalInCents = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const currency = items[0]?.currency ?? "AUD";

  return (
    <div
      className={`fixed inset-0 z-[100] transition-[visibility] duration-500 ${
        isOpen ? "visible" : "invisible delay-500"
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close cart"
        tabIndex={isOpen ? 0 : -1}
        onClick={closeCart}
        className={`absolute inset-0 bg-accent-dark/55 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        dir="ltr"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className={`absolute inset-y-0 right-0 flex w-[calc(100%_-_20px)] max-w-[390px] flex-col bg-accent text-accent-dark shadow-[-12px_0_36px_rgb(0_0_0/12%)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:w-[365px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-luxury-accent/25 px-5">
          <h2 id="cart-title" className="font-kalnia text-lg font-medium">
            Your Order
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="size-7 text-accent-dark/70 transition-colors hover:text-accent-dark focus-visible:outline-2 focus-visible:outline-primary"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="font-signika text-sm text-accent-dark/70">
              Your cart is empty.
            </p>
          ) : (
            <ul className="space-y-5">
              {items.map((item) => (
                <li key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div>
                    <h3 className="font-signika text-sm font-medium">{item.name}</h3>
                    <p className="mt-1 font-signika text-xs font-light text-accent-dark/65 lg:text-sm">
                      {formatMoney(item.unitPrice, item.currency)} each
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={`Decrease ${item.name} quantity`}
                      onClick={() => setItemQuantity(item.id, item.quantity - 1)}
                      className="flex size-6 items-center justify-center rounded-full border border-luxury-accent/55 font-signika text-sm font-light text-primary transition-colors hover:bg-primary hover:text-accent"
                    >
                      −
                    </button>
                    <span className="min-w-2 text-center font-signika text-xs">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${item.name} quantity`}
                      onClick={() => setItemQuantity(item.id, item.quantity + 1)}
                      className="flex size-6 items-center justify-center rounded-full border border-luxury-accent/55 font-signika text-sm font-light text-primary transition-colors hover:bg-primary hover:text-accent"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeItem(item.id)}
                      className="ml-0.5 size-5 font-signika text-base font-light text-accent-dark/55 transition-colors hover:text-accent-dark"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="shrink-0 border-t border-luxury-accent/25 px-5 py-4">
          <div className="flex items-center justify-between font-signika text-sm font-medium lg:text-base">
            <span>Total</span>
            <span>{formatMoney(totalInCents, currency)}</span>
          </div>
          <button
            type="button"
            disabled={items.length === 0}
            className="mt-4 flex h-[52px] w-full items-center justify-center rounded-[18px] bg-primary font-kalnia text-lg font-medium text-accent transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-45"
          >
            Checkout
          </button>
        </footer>
      </aside>
    </div>
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [isOpen, setIsOpen] = useState(false);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((newItem: AddCartItem) => {
    setItems((currentItems) => {
      const existing = currentItems.find((item) => item.id === newItem.id);
      if (existing) {
        return currentItems.map((item) =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + (newItem.quantity ?? 1) }
            : item,
        );
      }
      return [...currentItems, { ...newItem, quantity: newItem.quantity ?? 1 }];
    });
    setIsOpen(true);
  }, []);

  const setItemQuantity = useCallback((id: string, quantity: number) => {
    setItems((currentItems) =>
      quantity <= 0
        ? currentItems.filter((item) => item.id !== id)
        : currentItems.map((item) =>
            item.id === id ? { ...item, quantity } : item,
          ),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      items,
      isOpen,
      openCart,
      closeCart,
      addItem,
      setItemQuantity,
      removeItem,
    }),
    [items, isOpen, openCart, closeCart, addItem, setItemQuantity, removeItem],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer {...value} />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
