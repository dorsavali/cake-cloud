"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "./CakeBaseSelector.module.css";
import { CakeCustomiser } from "./CakeCustomiser";

const steps = ["Design", "Customise", "Date", "Summary", "Payment"];
const bases = [
  { id: "classic-round", name: "Classic Round", image: "/images/homeCakes/1-720.webp", alt: "Vanilla cake with a red heart on a green floral plate" },
  { id: "layered-dream", name: "Layered Dream", image: "/images/homeCakes/2-720.webp", alt: "Cream cake topped with berries and cherries on a scalloped plate" },
  { id: "floral-garden", name: "Floral Garden", image: "/images/homeCakes/3-720.webp", alt: "Chocolate cake with piped chocolate decoration on a floral plate" },
];

export function CakeBaseSelector() {
  const [selectedBase, setSelectedBase] = useState<string | null>(null);

  if (selectedBase) {
    const base = bases.find((item) => item.id === selectedBase)!;
    return <CakeCustomiser base={base} onBack={() => setSelectedBase(null)} />;
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <Link href="/" className={styles.home}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 6-6 6 6 6M4 12h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Home
          </Link>
          <span className={styles.mode}><span aria-hidden="true">✦</span> From Scratch</span>
        </div>

        <nav aria-label="Custom cake progress" className={styles.progress}>
          <ol>
            {steps.map((step, index) => (
              <li key={step} aria-current={index === 0 ? "step" : undefined}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <span className={styles.stepLabel}>{step}</span>
              </li>
            ))}
          </ol>
        </nav>

        <h1 className={styles.title}>Choose Your Base</h1>
        <div className={styles.grid} role="group" aria-label="Cake base">
          {bases.map((base) => (
            <button key={base.id} type="button" className={styles.card} aria-pressed={selectedBase === base.id} aria-label={`Choose ${base.name}`} onClick={() => setSelectedBase(base.id)}>
              <div className={styles.image}>
                <Image src={base.image} alt={base.alt} fill unoptimized priority={base.id !== "floral-garden"} sizes="(min-width: 1536px) 332px, (min-width: 768px) 22vw, 46vw" className={styles.cakeImage} />
              </div>
              <div className={styles.caption}>
                <span>{base.name}</span>
                <span className={styles.add} aria-hidden="true">{selectedBase === base.id ? "✓" : "+"}</span>
              </div>
            </button>
          ))}
        </div>
        <p className={styles.selection} role="status">
          {selectedBase ? `${bases.find((base) => base.id === selectedBase)?.name} selected` : ""}
        </p>
      </div>
    </main>
  );
}
