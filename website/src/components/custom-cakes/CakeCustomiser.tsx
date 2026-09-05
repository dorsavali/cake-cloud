"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import shared from "./CakeBaseSelector.module.css";
import styles from "./CakeCustomiser.module.css";
import { CakeSelect } from "./CakeSelect";

// Temporary prices in AUD cents; replace with the Square catalogue later.
const sizes = [{ label: '6 servings (6″)', price: 0 }, { label: '12 servings (8″)', price: 2000 }, { label: '20 servings (10″)', price: 4000 }, { label: '30 servings (12″)', price: 7000 }];
const heights = [{ label: 'Standard (4″)', price: 0 }, { label: 'Tall (6″)', price: 3000 }];
const fillings = [{ label: "Pastry Cream", price: 0 }, { label: "Chantilly", price: 0 }, { label: "Fruit Compote", price: 1000 }, { label: "Pistachio Cream", price: 1500 }, { label: "Salted Caramel", price: 1500 }];
const colours = [{ label: "Ivory", hex: "#faf7f0" }, { label: "Blush", hex: "#efc2c2" }, { label: "Sage", hex: "#91ac88" }, { label: "Lavender", hex: "#c5b1d8" }, { label: "Chocolate", hex: "#8a593b" }, { label: "Dusty Rose", hex: "#c68779" }];
const decorations = ["Fresh Flowers", "Macarons", "Fruit Arrangement", "Gold Leaf", "Chocolate Shards", "Sugar Pearls", "Custom Topper"];
const money = (amount: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount / 100);

function ChoiceGroup({ title, options, selected, onChange }: { title: string; options: { label: string; price: number }[]; selected: number; onChange: (value: number) => void }) {
  return <fieldset className={styles.group}><legend>{title}</legend><div className={styles.choices}>{options.map((option, index) => <label key={option.label} className={styles.choice}><input type="radio" name={title} checked={selected === index} onChange={() => onChange(index)} /><span>{option.label}{option.price > 0 ? ` +$${option.price / 100}` : ""}</span></label>)}</div></fieldset>;
}

export function CakeCustomiser({ base, onBack }: { base: { id: string; name: string; image: string; alt: string }; onBack: () => void }) {
  const [size, setSize] = useState(0);
  const [height, setHeight] = useState(0);
  const [filling, setFilling] = useState(0);
  const [sponge, setSponge] = useState("Vanilla");
  const [frosting, setFrosting] = useState("Smooth Buttercream");
  const [colour, setColour] = useState("Ivory");
  const [extras, setExtras] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const guide = useRef<HTMLDialogElement>(null);
  const dateDialog = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState("");
  const images = [base.image, ...["/images/homeCakes/1-720.webp", "/images/homeCakes/2-720.webp", "/images/homeCakes/3-720.webp"].filter((image) => image !== base.image)];
  const total = 14500 + sizes[size].price + heights[height].price + fillings[filling].price + extras.length * 1200;

  return <main className={`${shared.page} ${styles.page}`}><div className={styles.content}>
    <div className={shared.toolbar}><Link href="/" className={shared.home}>← <span>Home</span></Link><span className={`${shared.mode} ${styles.mode}`}>✨ From Scratch</span></div>
    <nav aria-label="Custom cake progress" className={`${shared.progress} ${styles.progress}`}><ol>{["Design", "Customise", "Date", "Summary", "Payment"].map((step, index) => <li key={step} aria-current={index === 1 ? "step" : undefined}>{index === 0 ? <button type="button" onClick={onBack} className={styles.back}><span className={`${shared.stepNumber} ${styles.complete}`}>✓</span>Design</button> : <><span className={shared.stepNumber}>{index + 1}</span><span className={shared.stepLabel}>{step}</span></>}</li>)}</ol></nav>
    <h1 className={`${shared.title} ${styles.title}`}>Customise Your Cake</h1>
    <div className={styles.layout}>
      <section aria-label={`${base.name} gallery`}>
        <div className={styles.heroImage}><Image src={images[activeImage]} alt={activeImage === 0 ? base.alt : "Cake design inspiration"} fill unoptimized priority className={styles.image} /><button type="button" className={styles.previous} aria-label="Previous cake image" onClick={() => setActiveImage((activeImage + images.length - 1) % images.length)}>‹</button><button type="button" className={styles.next} aria-label="Next cake image" onClick={() => setActiveImage((activeImage + 1) % images.length)}>›</button></div>
        <div className={styles.thumbnails}>{images.map((image, index) => <button key={image} type="button" aria-label={`Show cake image ${index + 1}`} aria-pressed={activeImage === index} onClick={() => setActiveImage(index)}><Image src={image} alt="" fill unoptimized className={styles.image} /></button>)}</div>
      </section>
      <section aria-label="Cake customisation" className={styles.options}>
        <div className={styles.size}><button type="button" className={styles.guideLink} onClick={() => guide.current?.showModal()}>Size Guide</button><ChoiceGroup title="Size" options={sizes} selected={size} onChange={setSize} /></div>
        <ChoiceGroup title="Height" options={heights} selected={height} onChange={setHeight} />
        <CakeSelect label="Sponge Flavour" value={sponge} onChange={setSponge} options={["Vanilla", "Chocolate", "Lemon", "Red Velvet"]} />
        <ChoiceGroup title="Filling" options={fillings} selected={filling} onChange={setFilling} />
        <CakeSelect label="Frosting" value={frosting} onChange={setFrosting} options={["Smooth Buttercream", "Whipped Cream", "Chocolate Ganache"]} />
        <fieldset className={`${styles.group} ${styles.small}`}><legend>Cake Color</legend><div className={styles.choices}>{colours.map((item) => <label key={item.label} className={styles.colour}><input type="radio" name="Cake Color" checked={colour === item.label} onChange={() => setColour(item.label)} /><span><i style={{ background: item.hex }} />{item.label}</span></label>)}</div></fieldset>
        <fieldset className={`${styles.group} ${styles.small}`}><legend>Decorations (+$12 each)</legend><div className={styles.choices}>{decorations.map((item) => <label key={item} className={styles.choice}><input type="checkbox" checked={extras.includes(item)} onChange={() => setExtras((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} /><span>{item}</span></label>)}</div></fieldset>
        <label className={styles.select}>Message on Cake (optional)<input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Happy Birthday!" maxLength={80} /></label>
        <div className={styles.footer}><output aria-live="polite" aria-label="Cake price">{money(total)}</output><button type="button" className={styles.continue} onClick={() => dateDialog.current?.showModal()}>Next: Pick a Date</button></div>
      </section>
    </div>
    <dialog ref={guide} className={styles.dialog}><h2>Size Guide</h2><p>Approximate servings for each cake diameter.</p><ul>{sizes.map((item) => <li key={item.label}>{item.label}</li>)}</ul><form method="dialog"><button className={styles.continue}>Close</button></form></dialog>
    <dialog ref={dateDialog} className={styles.dialog}><h2>Pick a Date</h2><label className={styles.select}>Preferred date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><p>Your selections are kept while you choose a date. Availability will be confirmed later.</p><form method="dialog"><button className={styles.continue}>Back to Customise</button></form></dialog>
  </div></main>;
}
