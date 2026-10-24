"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDraftState } from "./useDraftState";
import { clearCakeDraft } from "./draft-storage";
import { useCakeCatalog } from "./useCakeCatalog";
import { money, type CakeDesign } from "./cake-types";

import styles from "./CakeBaseSelector.module.css";
import { CakeCustomiser } from "./CakeCustomiser";
import { CakeProgress } from "./CakeProgress";
import { Footer } from "../layout/footer";

export function CakeBaseSelector() {
  const [ready, setReady] = useState(false);
  const [resetRevision, setResetRevision] = useState(0);
  const searchParams = useSearchParams();
  const shouldStartOver = searchParams.get("start") === "1";
  const { designs, error, retry } = useCakeCatalog();

  useEffect(() => {
    if (shouldStartOver) {
      clearCakeDraft();
      setResetRevision((revision) => revision + 1);
      const url = new URL(window.location.href);
      window.history.replaceState(null, "", url.pathname);
    }
    setReady(true);
  }, [shouldStartOver]);

  if (!ready) return <main className={styles.page} aria-busy="true"><div className={styles.content}>Loading your cake…</div></main>;
  return <CakeDraftFlow key={resetRevision} designs={designs} error={error} onRetry={retry} />;
}

function CakeDraftFlow({ designs, error, onRetry }: { designs?: CakeDesign[]; error?: string; onRetry: () => void }) {
  const [designId, setDesignId] = useDraftState<string | null>("design", null, (value): value is string | null => value === null || (typeof value === "string" && value.length <= 200));
  const design = designs?.find((item) => item.id === designId);

  if (design) return <CakeCustomiser key={design.id} design={design} onBack={() => setDesignId(null)} />;

  return (
    <section>
      <main className={styles.page}>
        <div className={styles.content}>
          <div className={styles.topbar}>
            <CakeProgress current={0} />
            <Link href="/custom-cakes/from-scratch" className={styles.mode}><span aria-hidden="true">✦</span> From Scratch</Link>
          </div>

          <h1 className={styles.title}>Choose Your Design</h1>

          {error ? (
            <div className={styles.notice} role="alert">
              <p>{error}</p>
              <button type="button" className={styles.retry} onClick={onRetry}>Try again</button>
            </div>
          ) : !designs ? (
            <p className={styles.notice} aria-live="polite">Loading cake designs…</p>
          ) : designs.length === 0 ? (
            <p className={styles.notice}>No custom cake designs are available right now.</p>
          ) : (
            <ul className={styles.grid} aria-label="Cake design">
              {designs.map((item) => (
                <li key={item.id} className={styles.item}>
                  <button type="button" className={styles.card} aria-pressed={designId === item.id} aria-label={`Choose ${item.name}`} onClick={() => setDesignId(item.id)}>
                    <span className={styles.image}>
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill unoptimized sizes="(min-width: 768px) 336px, 46vw" className={styles.cakeImage} />
                      ) : (
                        <span className={styles.placeholder}>No image</span>
                      )}
                    </span>
                    <span className={styles.caption}>
                      <span className={styles.captionText}>
                        <span className={styles.name}>{item.name}</span>
                        {item.description ? <span className={styles.description}>{item.description}</span> : null}
                        <span className={styles.price}>From {money(item.price.amount, item.price.currency)}</span>
                      </span>
                      <span className={styles.add} aria-hidden="true">{designId === item.id ? "✓" : "+"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </section>
  );
}
