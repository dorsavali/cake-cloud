"use client";

import { useCallback, useEffect, useState } from "react";

import { cakeStepNames, type CakeStep } from "./CakeProgress";

/** Returns the step encoded in the URL hash, or null when there is none. */
function hashStep(): CakeStep | null {
  const hash = window.location.hash.replace(/^#/, "");
  return (cakeStepNames as readonly string[]).includes(hash) ? (hash as CakeStep) : null;
}

/**
 * Keeps the visible step in sync with the browser history.
 *
 * Every forward step pushes a hash entry, so the browser back button returns to
 * the previous step of the cake flow instead of leaving the page. The design
 * step is the first entry (no hash), which makes "back" from Customise land on
 * the design grid as expected.
 */
export function useCakeStep(onDesign: () => void) {
  const [step, setStep] = useState<CakeStep>(() =>
    typeof window === "undefined" ? "customise" : hashStep() ?? "customise",
  );

  useEffect(() => {
    if (!hashStep()) window.location.hash = "customise";

    const sync = () => {
      const next = hashStep();
      if (next) setStep(next);
      else onDesign();
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [onDesign]);

  const go = useCallback((next: CakeStep) => {
    if (next === "design") {
      onDesign();
      return;
    }
    if (hashStep() === next) {
      setStep(next);
      return;
    }
    window.location.hash = next;
    setStep(next);
  }, [onDesign]);

  const back = useCallback((fallback: CakeStep) => {
    if (window.history.length > 1) window.history.back();
    else go(fallback);
  }, [go]);

  return { step, go, back };
}
