"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./CakeCustomiser.module.css";

export function CakeSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.current?.contains(event.target) && details.current) {
        details.current.open = false;
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  return <>
    <label className={`${styles.select} ${styles.desktopSelect}`}>{label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select>
    </label>
    <div className={`${styles.select} ${styles.mobileSelect}`}>
      <span id={id}>{label}</span>
      <details ref={details} onKeyDown={(event) => {
        if (event.key === "Escape" && details.current) {
          details.current.open = false;
          details.current.querySelector("summary")?.focus();
        }
      }}>
        <summary aria-labelledby={`${id} ${id}-value`}><span id={`${id}-value`}>{value}</span><svg className={styles.selectChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></summary>
        <div className={styles.selectOptions} role="group" aria-labelledby={id}>
          {options.map((option) => <label key={option}>
            <input type="radio" name={id} checked={value === option} onChange={() => {
              onChange(option);
              if (details.current) {
                details.current.open = false;
                details.current.querySelector("summary")?.focus();
              }
            }} />
            <span>{option}</span>
          </label>)}
        </div>
      </details>
    </div>
  </>;
}
