"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import shared from "./CakeBaseSelector.module.css";
import styles from "./CakeCustomiser.module.css";
import { useCakeQuote } from "./useCakeQuote";
import { CakePickup } from "./CakePickup";
import { CakeProgress } from "./CakeProgress";
import { useDraftState } from "./useDraftState";
import { draftBoolean, draftText } from "./draft-storage";
import {
  colourFor,
  defaultSelections,
  incompleteLists,
  isColourList,
  money,
  selectedModifiers,
  toggleModifier,
  type CakeConfig,
  type CakeDesign,
  type CakeModifierList,
} from "./cake-types";

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

  return (
    <fieldset className={`${styles.group} ${list.modifiers.length > 6 ? styles.small : ""}`}>
      <legend>
        {list.name}
        {list.minSelected > 0 ? <span className={styles.required}> · Required</span> : null}
        {multiple && list.maxSelected > 0 ? <span className={styles.limit}> · up to {list.maxSelected}</span> : null}
      </legend>
      <div className={styles.choices}>
        {list.modifiers.map((modifier) => {
          const checked = selectedIds.includes(modifier.id);
          const disabled = multiple && !checked && list.maxSelected > 0 && selectedIds.length >= list.maxSelected;
          const hex = showColours ? colourFor(modifier.name) : null;
          return (
            <label key={modifier.id} className={hex ? styles.colour : styles.choice}>
              <input
                type={multiple ? "checkbox" : "radio"}
                name={list.id}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(toggleModifier(list, selectedIds, modifier.id))}
              />
              <span>
                {hex ? <i style={{ background: hex }} /> : null}
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

export function CakeCustomiser({ design, onBack }: { design: CakeDesign; onBack: () => void }) {
  const [rawSelections, setSelections] = useDraftState<Record<string, string[]>>("selections", {}, (value): value is Record<string, string[]> =>
    !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.entries(value).every(([key, ids]) => key.length <= 200 && Array.isArray(ids) && ids.length <= 50 && ids.every((id) => typeof id === "string" && id.length <= 200)));
  const [message, setMessage] = useDraftState("message", "", (value): value is string => draftText(value) && value.length <= 80);
  const [activeImage, setActiveImage] = useState(0);
  const guide = useRef<HTMLDialogElement>(null);
  const defaultsApplied = useRef(false);
  const [pickingDate, setPickingDate] = useDraftState("pickingDate", false, draftBoolean);
  const [time, setTime] = useDraftState("time", "", draftText);
  const [date, setDate] = useDraftState("date", "", draftText);

  useEffect(() => {
    if (defaultsApplied.current) return;
    defaultsApplied.current = true;
    const defaults = defaultSelections(design);
    if (Object.keys(defaults).length > 0) {
      setSelections((current) => (Object.keys(current).length > 0 ? current : defaults));
    }
  }, [design, setSelections]);

  const selections = design.modifierLists
    .map((list) => ({ listId: list.id, modifierIds: (rawSelections[list.id] ?? []).filter((id) => list.modifiers.some((modifier) => modifier.id === id)) }))
    .filter((selection) => selection.modifierIds.length > 0);
  const cake: CakeConfig = { design: design.id, selections, message };
  const { quote, error: priceError } = useCakeQuote(cake);
  const total = quote?.subtotal;
  const currency = design.price.currency;
  const images = design.images;
  const missing = incompleteLists(design, rawSelections);
  const sizeList = design.modifierLists.find((list) => /size/i.test(list.name));
  const heroImage = images[Math.min(activeImage, Math.max(images.length - 1, 0))];

  const summary = [
    { label: "Design", value: design.name },
    ...design.modifierLists.flatMap((list) => {
      const names = selectedModifiers(list, rawSelections[list.id] ?? []).map((modifier) => modifier.name);
      return names.length > 0 ? [{ label: list.name, value: names.join(", ") }] : [];
    }),
    { label: "Message", value: message || "None" },
    { label: "Total", value: total === undefined ? "…" : money(total, currency) },
  ];

  if (pickingDate) return <CakePickup cake={cake} onBack={() => setPickingDate(false)} date={date} time={time} onDateChange={setDate} onTimeChange={setTime} summary={summary} />;

  const handleBack = () => {
    setPickingDate(false);
    onBack();
  };

  return (
    <main className={`${shared.page} ${styles.page}`}>
      <div className={styles.content}>
        <div className={styles.topbar}>
          <CakeProgress current={1} onBack={handleBack} />
          <Link href="/custom-cakes/from-scratch" className={`${shared.mode} ${styles.mode}`}>✨ From Scratch</Link>
        </div>

        <h1 className={`${shared.title} ${styles.title}`}>Customise Your Cake</h1>
        <div className={styles.layout}>
          <section aria-label={`${design.name} gallery`}>
            <div className={styles.heroImage}>
              {heroImage ? (
                <Image src={heroImage} alt={design.name} fill unoptimized priority className={styles.image} />
              ) : (
                <div className={styles.placeholder}><span>Photo coming soon</span></div>
              )}
              {images.length > 1 ? (
                <>
                  <button type="button" className={styles.previous} aria-label="Previous cake image" onClick={() => setActiveImage((activeImage + images.length - 1) % images.length)}>‹</button>
                  <button type="button" className={styles.next} aria-label="Next cake image" onClick={() => setActiveImage((activeImage + 1) % images.length)}>›</button>
                </>
              ) : null}
            </div>
            {images.length > 1 ? (
              <div className={styles.thumbnails}>{images.map((image, index) => (
                <button key={image} type="button" aria-label={`Show cake image ${index + 1}`} aria-pressed={activeImage === index} onClick={() => setActiveImage(index)}>
                  <Image src={image} alt="" fill unoptimized className={styles.image} />
                </button>
              ))}</div>
            ) : null}
            {design.description ? <p className={styles.description}>{design.description}</p> : null}
          </section>

          <section aria-label="Cake customisation" className={styles.options}>
            {sizeList ? <div className={styles.size}><button type="button" className={styles.guideLink} onClick={() => guide.current?.showModal()}>Size Guide</button></div> : null}
            {design.modifierLists.map((list) => (
              <ModifierGroup
                key={list.id}
                list={list}
                selectedIds={rawSelections[list.id] ?? []}
                currency={currency}
                onChange={(modifierIds) => setSelections((current) => ({ ...current, [list.id]: modifierIds }))}
              />
            ))}
            <label className={styles.select}>Message on Cake (optional)<input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Happy Birthday!" maxLength={80} /></label>
            {priceError && <p role="alert">{priceError}</p>}
            {missing.length > 0 && <p className={styles.missing} role="status">Choose an option for {missing.map((list) => list.name).join(", ")}.</p>}
            <div className={styles.footer}>
              <output aria-live="polite" aria-label="Cake price">{total === undefined ? "…" : money(total, currency)}</output>
              <button type="button" className={styles.continue} disabled={missing.length > 0} onClick={() => { setPickingDate(true); window.scrollTo(0, 0); }}>Next: Pick a Date</button>
            </div>
          </section>
        </div>
        {sizeList ? (
          <dialog ref={guide} className={styles.dialog}>
            <h2>Size Guide</h2>
            <p>Approximate servings for each cake diameter.</p>
            <ul>{sizeList.modifiers.map((modifier) => <li key={modifier.id}>{modifier.name}</li>)}</ul>
            <form method="dialog"><button className={styles.continue}>Close</button></form>
          </dialog>
        ) : null}
      </div>
    </main>
  );
}
