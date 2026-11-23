import type { HostPackage } from "./types";

type ModifierList = HostPackage["modifierLists"][number];

function modifierPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function HostModifierQuantityOptions({
  list,
  currency,
  quantities,
  onChange,
}: {
  list: ModifierList;
  currency: string;
  quantities: Record<string, number>;
  onChange: (modifierId: string, quantity: number) => void;
}) {
  const required = list.minSelected > 0;

  return (
    <fieldset>
      <legend className="mb-2.5 text-[11px] uppercase tracking-[0.16em] text-accent-dark/55">
        {list.name}
        {required ? <span className="text-[#b05249]"> · Required</span> : null}
        <span className="normal-case tracking-normal text-accent-dark/40"> · Choose quantities</span>
      </legend>
      <div className="overflow-hidden rounded-lg border border-[#ddd0b9] bg-[#f5f0e7]">
        {list.modifiers.map((modifier, index) => {
          const quantity = quantities[modifier.id] ?? 0;
          return (
            <div
              key={modifier.id}
              className={`flex min-h-14 items-center gap-3 px-3 py-2.5 sm:px-4 ${index > 0 ? "border-t border-[#ddd0b9]" : ""}`}
            >
              <span className="min-w-0 flex-1 text-sm text-accent-dark lg:text-base">
                {modifier.name}
                {modifier.price !== 0 ? (
                  <span className="ml-1 text-accent-dark/55">
                    {modifier.price > 0 ? "+" : ""}{modifierPrice(modifier.price, currency)} each
                  </span>
                ) : null}
              </span>
              <div className="inline-flex shrink-0 items-center rounded-full border border-luxury-accent bg-[#faf7f0] p-0.5">
                <button
                  type="button"
                  aria-label={`Decrease ${modifier.name}`}
                  disabled={quantity === 0}
                  onClick={() => onChange(modifier.id, Math.max(0, quantity - 1))}
                  className="inline-flex size-9 items-center justify-center rounded-full text-xl text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  −
                </button>
                <output
                  aria-label={`${modifier.name} quantity`}
                  className="min-w-8 text-center text-sm font-medium tabular-nums text-accent-dark"
                >
                  {quantity}
                </output>
                <button
                  type="button"
                  aria-label={`Increase ${modifier.name}`}
                  disabled={quantity >= 999}
                  onClick={() => onChange(modifier.id, Math.min(999, quantity + 1))}
                  className="inline-flex size-9 items-center justify-center rounded-full text-xl text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
