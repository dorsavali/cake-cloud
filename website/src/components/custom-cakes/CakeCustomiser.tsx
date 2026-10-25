"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CakeProgress } from "./CakeProgress";
import { defaultSelections, incompleteLists, isColourList, money, toggleModifier, colourFor, type CakeDesign, type CakeModifierList } from "./cake-types";
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

function ModifierGroup({
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
  const multiple = list.selectionType === "MULTIPLE";
  const showColours = isColourList(list.name);
  const small = list.modifiers.length > 6;

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-[9px] text-[9px] uppercase tracking-[.15em] text-[#88857d] md:text-[10px]">
        {list.name}
        {list.minSelected > 0 ? <span className="text-[#b05249]"> · Required</span> : null}
        {multiple && list.maxSelected > 0 ? <span className="normal-case tracking-[.02em] text-[#88857d]"> · up to {list.maxSelected}</span> : null}
      </legend>
      <div className="-m-[3px] flex flex-nowrap gap-2 overflow-x-auto p-[3px] [overscroll-behavior-x:contain] [scrollbar-width:none] md:m-0 md:flex-wrap md:overflow-visible md:p-0 [&::-webkit-scrollbar]:hidden">
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
                {modifier.price > 0 ? ` +${money(modifier.price, currency)}` : ""}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function CakeCustomiser({
  design,
  selections,
  message,
  subtotal,
  priceError,
  onSelectionsChange,
  onMessageChange,
  onBack,
  onNext,
}: {
  design: CakeDesign;
  selections: Record<string, string[]>;
  message: string;
  subtotal?: number;
  priceError?: string;
  onSelectionsChange: (selections: Record<string, string[]>) => void;
  onMessageChange: (message: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [activeImage, setActiveImage] = useState(0);
  const guide = useRef<HTMLDialogElement>(null);
  const defaultsApplied = useRef(false);

  useEffect(() => {
    if (defaultsApplied.current) return;
    defaultsApplied.current = true;
    const defaults = defaultSelections(design);
    if (Object.keys(defaults).length > 0 && Object.keys(selections).length === 0) {
      onSelectionsChange(defaults);
    }
  });

  const images = design.images;
  const missing = incompleteLists(design, selections);
  const sizeList = design.modifierLists.find((list) => /size/i.test(list.name));
  const heroImage = images[Math.min(activeImage, Math.max(images.length - 1, 0))];
  const currency = design.price.currency;

  return (
    <main className={`${pageShell} pb-[30px]`}>
      <div className={container}>
        <div className={`${topbar} mt-6`}>
          <div className={progressInTopbar}>
            <CakeProgress current={1} onBack={onBack} />
          </div>
          <Link href="/custom-cakes/from-scratch" className={modeLink}>
            <span aria-hidden="true" className={modeIcon}>✨</span> From Scratch
          </Link>
        </div>

        <h1 className={pageTitle}>Customise Your Cake</h1>
        <div className="grid grid-cols-1 items-start gap-7 md:grid-cols-[minmax(0,.94fr)_minmax(0,2fr)] md:gap-[30px]">
          <section className="min-w-0" aria-label={`${design.name} gallery`}>
            <div className="relative aspect-square overflow-hidden rounded-[10px] bg-[#eee8db] md:rounded-xl">
              {heroImage ? (
                <Image src={heroImage} alt={design.name} fill unoptimized priority className="object-contain" />
              ) : (
                <div className="grid size-full place-items-center text-[13px] text-accent-dark/40"><span>Photo coming soon</span></div>
              )}
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 grid size-[30px] -translate-y-1/2 place-items-center rounded-full border-0 bg-accent/85 text-2xl leading-none text-[#88857d]"
                    aria-label="Previous cake image"
                    onClick={() => setActiveImage((activeImage + images.length - 1) % images.length)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 grid size-[30px] -translate-y-1/2 place-items-center rounded-full border-0 bg-accent/85 text-2xl leading-none text-[#88857d]"
                    aria-label="Next cake image"
                    onClick={() => setActiveImage((activeImage + 1) % images.length)}
                  >
                    ›
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
                    <Image src={image} alt="" fill unoptimized className="object-contain" />
                  </button>
                ))}
              </div>
            ) : null}
            {design.description ? <p className="mt-3 text-[13px] leading-[1.6] text-accent-dark/60">{design.description}</p> : null}
          </section>

          <section aria-label="Cake customisation" className="flex min-w-0 flex-col gap-6 md:gap-[18px]">
            {sizeList ? (
              <div className="-mb-3 flex justify-end">
                <button type="button" className="border-0 bg-none p-0 text-[11px] text-primary underline" onClick={() => guide.current?.showModal()}>
                  Size Guide
                </button>
              </div>
            ) : null}
            {design.modifierLists.map((list) => (
              <ModifierGroup
                key={list.id}
                list={list}
                selectedIds={selections[list.id] ?? []}
                currency={currency}
                onChange={(modifierIds) => onSelectionsChange({ ...selections, [list.id]: modifierIds })}
              />
            ))}
            <label className="flex flex-col gap-[5px] text-[13px] md:text-sm">
              Message on Cake (optional)
              <input
                value={message}
                onChange={(event) => onMessageChange(event.target.value)}
                placeholder="Happy Birthday!"
                maxLength={80}
                className="w-full min-w-0 rounded-[7px] border border-[#e3d7c2] bg-[#f5f0e7] px-3 py-2 text-accent-dark placeholder:text-[#99949a] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary max-md:min-h-9"
              />
            </label>
            {priceError && <p role="alert" className="text-xs text-[#a0443c]">{priceError}</p>}
            {missing.length > 0 && <p className="-mt-2 text-xs text-[#a0443c]" role="status">Choose an option for {missing.map((list) => list.name).join(", ")}.</p>}
            <div className="flex flex-nowrap items-center justify-between gap-3 border-t border-[#e3d7c250] pt-4">
              <output aria-live="polite" aria-label="Cake price" className="whitespace-nowrap font-kalnia text-[19px] text-primary md:text-[23px]">
                {subtotal === undefined ? "…" : money(subtotal, currency)}
              </output>
              <button
                type="button"
                className={primaryButtonInline}
                disabled={missing.length > 0}
                onClick={() => { onNext(); window.scrollTo(0, 0); }}
              >
                Next: Pick a Date
              </button>
            </div>
          </section>
        </div>
        {sizeList ? (
          <dialog ref={guide} className="m-auto max-w-[min(420px,calc(100%-40px))] rounded-2xl border border-luxury-accent bg-accent p-7 text-accent-dark backdrop:bg-[#46424866] backdrop:backdrop-blur-[4px]">
            <h2 className="mb-4 font-kalnia text-[23px]">Size Guide</h2>
            <p className="my-3.5 text-sm leading-[1.7]">Approximate servings for each cake diameter.</p>
            <ul className="my-3.5 list-disc pl-[18px] text-sm leading-[1.7]">{sizeList.modifiers.map((modifier) => <li key={modifier.id}>{modifier.name}</li>)}</ul>
            <form method="dialog"><button className={primaryButtonInline}>Close</button></form>
          </dialog>
        ) : null}
      </div>
    </main>
  );
}
