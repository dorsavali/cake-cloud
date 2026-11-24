"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { ProductImagePlaceholder } from "@/components/shared/ProductImagePlaceholder";
import styles from "./CakeCustomiser.module.css";

import { CakeProgress } from "./CakeProgress";
import {
  colourFor,
  defaultSelections,
  incompleteLists,
  isColourList,
  modifierListLabel,
  money,
  toggleModifier,
  type CakeDesign,
  type CakeModifierList,
  type CakeShape,
  type CakeSize,
} from "./cake-types";
import {
  container,
  modeIcon,
  modeLink,
  pageShell,
  pageTitle,
  primaryButtonInline,
  progressInTopbar,
  topbar,
} from "./cake-ui";

const cakeShapeOrder: CakeShape[] = ["round", "square", "heart"];
const gallerySwipeThreshold = 40;
const cakeShapeLabels: Record<CakeShape, string> = {
  round: "Round",
  square: "Square",
  heart: "Heart",
};

const fieldLabelClassName =
  "text-[9px] uppercase tracking-[.15em] text-[#88857d] md:text-[10px]";
const fieldControlClassName =
  "min-h-10 w-full min-w-0 rounded-lg border border-[#ddd0b9] bg-[#f5f0e7] px-3 py-2 text-[13px] text-accent-dark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 md:text-sm";

const sizePrice = (amount: number, currency: string) => {
  if (amount === 0) return "Free";
  if (currency === "AUD") {
    return `+${new Intl.NumberFormat("en-AU", {
      minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount / 100)}$`;
  }
  return `+${money(amount, currency)}`;
};

function ShapeDropdown({
  value,
  options,
  onChange,
}: {
  value: CakeShape;
  options: CakeShape[];
  onChange: (shape: CakeShape) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-[#ddd0b9] bg-[#f5f0e7]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-between gap-3 border-0 bg-transparent px-3 py-2 text-left text-[13px] text-accent-dark outline-none transition-colors hover:bg-[#faf7f0] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20 md:text-sm"
      >
        <span>{cakeShapeLabels[value]}</span>
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rotate-45 border-b border-r border-accent-dark transition-transform ${open ? "rotate-[225deg]" : ""}`}
        />
      </button>
      <div
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div role="listbox" aria-label="Shape" className="border-t border-[#ddd0b9] py-1.5">
            {options.map((option) => {
              const selected = option === value;
              return (
                <button
                  key={option}
                  type="button"
                  tabIndex={open ? 0 : -1}
                  role="option"
                  aria-selected={selected}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:outline-none md:text-sm ${selected ? "font-medium text-primary" : "text-accent-dark"}`}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <span aria-hidden="true" className="w-4 shrink-0 text-primary">{selected ? "✓" : ""}</span>
                  <span>{cakeShapeLabels[option]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SizePicker({
  sizes,
  selected,
  open,
  onOpenChange,
  onChoose,
}: {
  sizes: CakeSize[];
  selected?: CakeSize;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (size: CakeSize) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[5px]">
      <div className={fieldLabelClassName}>Size</div>
      <div className="overflow-hidden rounded-lg border border-[#ddd0b9] bg-[#f5f0e7]">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
          className="flex min-h-10 w-full items-center justify-between gap-3 border-0 bg-transparent px-3 py-2 text-left text-[13px] text-accent-dark md:text-sm"
        >
          <span>
            {selected
              ? `${selected.label}${selected.serves ? `, Serves ${selected.serves}` : ""}`
              : "Choose a size"}
          </span>
          <span
            aria-hidden="true"
            className={`size-2 shrink-0 rotate-45 border-b border-r border-accent-dark transition-transform ${open ? "rotate-[225deg]" : ""}`}
          />
        </button>
        <div
          inert={!open}
          className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
        >
          <div className="min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-3 border-t border-[#ddd0b9] p-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {sizes.map((size) => {
              const checked = selected?.id === size.id;
              return (
                <button
                  key={size.id}
                  type="button"
                  tabIndex={open ? 0 : -1}
                  aria-pressed={checked}
                  onClick={() => onChoose(size)}
                  className={`${styles.sizeCard} group relative isolate aspect-[.72] overflow-hidden rounded-[11px] border border-[#c4a56c] bg-white text-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
                >
                  <span
                    aria-hidden="true"
                    className={`${styles.sizeCardFill} absolute inset-x-0 bottom-0 z-0 bg-primary`}
                  />
                  <span className="absolute inset-x-0 top-[7%] z-10 px-1.5 text-center transition-colors duration-300 group-hover:text-accent">
                    <strong className="block text-[15px] font-normal leading-tight xl:text-base">{size.label}</strong>
                    {size.serves ? <span className="mt-1 block text-[10px] font-medium leading-tight xl:text-[11px]">Serves {size.serves}</span> : null}
                  </span>
                  <span className="absolute inset-x-[5%] top-[27%] z-20 h-[45%] overflow-hidden">
                    {size.image ? (
                      <Image src={size.image} alt="" fill unoptimized sizes="150px" className="object-contain" />
                    ) : (
                      <ProductImagePlaceholder className="rounded-md" />
                    )}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 z-10 flex h-[42%] flex-col items-center justify-center px-1.5 pt-[12%] text-center text-[11px] leading-tight text-accent xl:text-xs">
                    From <strong className="mt-0.5 block text-[15px] font-normal xl:text-base">{sizePrice(size.price.amount, size.price.currency)}</strong>
                  </span>
                </button>
              );
            })}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedModifierDropdown({
  list,
  selectedIds,
  currency,
  onChange,
}: {
  list: CakeModifierList;
  selectedIds: string[];
  currency: string;
  onChange: (modifierIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const multiple = list.selectionType === "MULTIPLE";
  const selected = list.modifiers.filter((modifier) =>
    selectedIds.includes(modifier.id),
  );
  const selectedLabel = selected.length > 0
    ? selected.map((modifier) => modifier.name).join(", ")
    : `Choose ${modifierListLabel(list.name)}`;

  return (
    <div className="overflow-hidden rounded-lg border border-[#ddd0b9] bg-[#f5f0e7]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-between gap-3 border-0 bg-transparent px-3 py-2 text-left text-[13px] text-accent-dark outline-none transition-colors hover:bg-[#faf7f0] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20 md:text-sm"
      >
        <span className="truncate">{selectedLabel}</span>
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rotate-45 border-b border-r border-accent-dark transition-transform ${open ? "rotate-[225deg]" : ""}`}
        />
      </button>
      <div
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            role="listbox"
            aria-label={modifierListLabel(list.name)}
            aria-multiselectable={multiple}
            className="max-h-[300px] overflow-y-auto border-t border-[#ddd0b9] py-1.5"
          >
            {list.minSelected === 0 ? (
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                role="option"
                aria-selected={selected.length === 0}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:outline-none md:text-sm ${selected.length === 0 ? "font-medium text-primary" : "text-accent-dark"}`}
                onClick={() => {
                  onChange([]);
                  if (!multiple) setOpen(false);
                }}
              >
                <span aria-hidden="true" className="w-4 shrink-0 text-primary">{selected.length === 0 ? "✓" : ""}</span>
                <span>None · Free</span>
              </button>
            ) : null}
            {list.modifiers.map((modifier) => {
              const checked = selectedIds.includes(modifier.id);
              const disabled =
                multiple &&
                !checked &&
                list.maxSelected > 0 &&
                selectedIds.length >= list.maxSelected;
              return (
                <button
                  key={modifier.id}
                  type="button"
                  tabIndex={open ? 0 : -1}
                  role="option"
                  aria-selected={checked}
                  disabled={disabled}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 md:text-sm ${checked ? "font-medium text-primary" : "text-accent-dark"}`}
                  onClick={() => {
                    onChange(toggleModifier(list, selectedIds, modifier.id));
                    if (!multiple) setOpen(false);
                  }}
                >
                  <span aria-hidden="true" className="w-4 shrink-0 text-primary">{checked ? "✓" : ""}</span>
                  <span>
                    {modifier.name}
                    {modifier.price > 0
                      ? ` +${money(modifier.price, currency)}`
                      : " · Free"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModifierGroup({
  list,
  label,
  selectedIds,
  currency,
  onChange,
}: {
  list: CakeModifierList;
  label?: string;
  selectedIds: string[];
  currency: string;
  onChange: (modifierIds: string[]) => void;
}) {
  const labelId = useId();
  const displayLabel = label ?? modifierListLabel(list.name);
  const multiple = list.selectionType === "MULTIPLE";
  const showColours = isColourList(list.name);
  const showAnimatedDropdown = !showColours && list.modifiers.length >= 4;
  const small = list.modifiers.length > 6;

  return (
    <div className="flex min-w-0 flex-col gap-[5px]">
      <div id={labelId} className={fieldLabelClassName}>
        {displayLabel}
        {list.minSelected > 0 ? <span className="text-[#b05249]"> · Required</span> : null}
        {multiple && list.maxSelected > 0 ? <span className="text-[#88857d]"> · up to {list.maxSelected}</span> : null}
      </div>
      {showAnimatedDropdown ? (
        <AnimatedModifierDropdown
          list={list}
          selectedIds={selectedIds}
          currency={currency}
          onChange={onChange}
        />
      ) : (
        <div
          role={multiple ? "group" : "radiogroup"}
          aria-labelledby={labelId}
          className="flex flex-nowrap gap-2 overflow-x-auto pb-[3px] [overscroll-behavior-x:contain] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {list.modifiers.map((modifier) => {
            const checked = selectedIds.includes(modifier.id);
            const disabled = multiple && !checked && list.maxSelected > 0 && selectedIds.length >= list.maxSelected;
            const hex = showColours ? colourFor(modifier.name) : null;
            return (
              <label key={modifier.id} className="relative flex-none cursor-pointer md:flex-initial">
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={list.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(toggleModifier(list, selectedIds, modifier.id))}
                  className="peer absolute size-px opacity-0"
                />
                <span
                  className={`flex items-center gap-[7px] whitespace-nowrap rounded-full border border-[#dacfb9] px-[15px] py-2 text-[13px] transition-[background,color] duration-150 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-45 motion-reduce:transition-none ${hex ? "peer-checked:bg-primary/12 peer-checked:text-primary" : ""} ${small ? "px-[11px] py-1.5 text-[11px]" : ""}`}
                >
                  {hex ? <i className="size-[11px] rounded-full shadow-[0_0_0_1px_#46424810]" style={{ background: hex }} /> : null}
                  {modifier.name}
                  {modifier.price > 0 ? ` +${money(modifier.price, currency)}` : " · Free"}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CakeCustomiser({
  design,
  selectedSizeId,
  selections,
  message,
  subtotal,
  priceError,
  onSelectionsChange,
  onSizeChange,
  onMessageChange,
  onBack,
  onNext,
}: {
  design: CakeDesign;
  selectedSizeId: string | null;
  selections: Record<string, string[]>;
  message: string;
  subtotal?: number;
  priceError?: string;
  onSelectionsChange: (selections: Record<string, string[]>) => void;
  onSizeChange: (sizeId: string | null) => void;
  onMessageChange: (message: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [activeImage, setActiveImage] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const selectedSize = design.sizes.find((size) => size.id === selectedSizeId);
  const availableShapes = cakeShapeOrder.filter((candidate) =>
    design.sizes.some((size) => size.shape === candidate),
  );
  const [shape, setShape] = useState<CakeShape>(
    selectedSize?.shape ?? availableShapes[0] ?? "round",
  );
  const [sizeOpen, setSizeOpen] = useState(false);

  useEffect(() => {
    if (selectedSize || design.sizes.length === 0) return;
    const initialSize =
      design.sizes.find((candidate) => candidate.shape === shape) ??
      design.sizes[0];
    onSizeChange(initialSize.id);
  }, [design.sizes, onSizeChange, selectedSize, shape]);

  useEffect(() => {
    if (!selectedSize) return;
    const defaults = defaultSelections(selectedSize);
    if (Object.keys(defaults).length > 0 && Object.keys(selections).length === 0) {
      onSelectionsChange(defaults);
    }
  }, [onSelectionsChange, selectedSize, selections]);

  const images = [...new Set(design.images)];
  const sizes = design.sizes.filter((size) => size.shape === shape);
  const missing = selectedSize ? incompleteLists(selectedSize, selections) : [];
  const heroImage = images[Math.min(activeImage, Math.max(images.length - 1, 0))];
  const currency = selectedSize?.price.currency ?? "AUD";

  const moveImage = (direction: number) => {
    if (images.length < 2) return;
    setActiveImage(
      (current) => (current + direction + images.length) % images.length,
    );
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || images.length < 2) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (
      Math.abs(deltaX) < gallerySwipeThreshold ||
      Math.abs(deltaX) <= Math.abs(deltaY)
    ) return;
    moveImage(deltaX < 0 ? 1 : -1);
  };

  return (
    <main className={pageShell}>
      <div className={`${container} mx-auto max-w-[1476px]`}>
        <div className="flex items-center justify-between gap-3 md:block">
          <button className="inline-flex min-h-6 items-center border-0 bg-none p-0 font-[inherit] text-xs text-[#88857d] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary md:gap-2 md:text-[13px]" type="button" onClick={onBack}>
            ← <span>Back to Design</span>
          </button>
          <Link href="/custom-cakes/from-scratch" className={`${modeLink} md:hidden`}>
            <span aria-hidden="true" className={modeIcon}>✨</span> From Scratch
          </Link>
        </div>
        <div className={`${topbar} max-md:mt-5`}>
          <div className={progressInTopbar}>
            <CakeProgress current={1} onBack={onBack} />
          </div>
          <Link href="/custom-cakes/from-scratch" className={`${modeLink} max-md:hidden`}>
            <span aria-hidden="true" className={modeIcon}>✨</span> From Scratch
          </Link>
        </div>

        <h1 className={pageTitle}>Customise Your Cake</h1>
        <div className="grid grid-cols-1 items-start gap-7 md:grid-cols-[minmax(0,.94fr)_minmax(0,2fr)] md:gap-[30px]">
          <section
            className="min-w-0 md:sticky md:top-20"
            aria-label={`${design.name} gallery`}
          >
            <div
              className="relative aspect-square touch-pan-y overflow-hidden rounded-[10px] border border-luxury-accent/45 bg-[#eee8db] md:rounded-xl"
              onTouchStart={(event) => {
                const touch = event.touches[0];
                touchStart.current = { x: touch.clientX, y: touch.clientY };
              }}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={() => {
                touchStart.current = null;
              }}
            >
              {heroImage ? (
                <Image src={heroImage} alt={design.name} fill unoptimized preload sizes="(min-width: 768px) 32vw, 100vw" className="object-contain" />
              ) : (
                <ProductImagePlaceholder />
              )}
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-accent/90 font-signika text-accent-dark shadow"
                    aria-label="Previous cake image"
                    onClick={() => moveImage(-1)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-accent/90 font-signika text-accent-dark shadow"
                    aria-label="Next cake image"
                    onClick={() => moveImage(1)}
                  >
                    →
                  </button>
                </>
              ) : null}
            </div>
            {images.length > 1 ? (
              <div className="mt-3 flex gap-2.5 max-md:overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    aria-label={`Show cake image ${index + 1}`}
                    aria-pressed={activeImage === index}
                    onClick={() => setActiveImage(index)}
                    className="relative size-[50px] shrink-0 rounded-lg border border-transparent bg-accent/35 aria-pressed:border-primary md:size-[54px]"
                  >
                    <Image src={image} alt="" fill unoptimized sizes="54px" className="object-contain" />
                  </button>
                ))}
              </div>
            ) : null}
            {design.description ? <p className="mt-3 text-[13px] leading-[1.6] text-accent-dark/60">{design.description}</p> : null}
          </section>

          <section aria-label="Cake customisation" className="flex min-w-0 flex-col gap-6 md:gap-[18px]">
            <div className="flex min-w-0 flex-col gap-[5px]">
              <div className={fieldLabelClassName}>Shape</div>
              <ShapeDropdown
                value={shape}
                options={availableShapes}
                onChange={(nextShape) => {
                  setShape(nextShape);
                  if (selectedSize?.shape !== nextShape) {
                    onSizeChange(null);
                    onSelectionsChange({});
                    setSizeOpen(false);
                  }
                }}
              />
            </div>
            <SizePicker
              sizes={sizes}
              selected={selectedSize}
              open={sizeOpen}
              onOpenChange={setSizeOpen}
              onChoose={(size) => {
                setShape(size.shape);
                onSizeChange(size.id);
                onSelectionsChange(defaultSelections(size));
                setSizeOpen(false);
              }}
            />
            {selectedSize?.modifierLists.map((list) => (
                <ModifierGroup
                  key={list.id}
                  list={list}
                  selectedIds={selections[list.id] ?? []}
                  currency={currency}
                  onChange={(modifierIds) => onSelectionsChange({ ...selections, [list.id]: modifierIds })}
                />
              ))}
            <label className={`flex min-w-0 flex-col gap-[5px] ${fieldLabelClassName}`}>
              Message on Cake (optional)
              <input
                value={message}
                onChange={(event) => onMessageChange(event.target.value)}
                placeholder="Happy Birthday!"
                maxLength={80}
                className={`${fieldControlClassName} placeholder:text-[#99949a]`}
              />
            </label>
            {selectedSize && priceError && <p role="alert" className="text-xs text-[#a0443c]">{priceError}</p>}
            {missing.length > 0 && <p className="-mt-2 text-xs text-[#a0443c] md:text-base" role="status">Choose an option for {missing.map((list) => modifierListLabel(list.name)).join(", ")}.</p>}
            <div className="flex flex-nowrap items-center justify-between gap-3 border-t border-[#e3d7c250] pt-4">
              <output aria-live="polite" aria-label="Cake price" className="whitespace-nowrap font-signika text-[23px] text-primary lg:text-[35px]">
                {!selectedSize ? "—" : subtotal === undefined ? "…" : subtotal === 0 ? "Free" : money(subtotal, currency)}
              </output>
              <button
                type="button"
                className={primaryButtonInline}
                disabled={!selectedSize || missing.length > 0}
                onClick={() => { onNext(); window.scrollTo(0, 0); }}
              >
                Next: Pick a Date
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
