import { useEffect, useRef, useState } from "react";

export const cakeSteps = ["Design", "Customise", "Date", "Summary", "Payment"] as const;

export type CakeStep = "design" | "customise" | "date" | "summary" | "payment";

export const cakeStepNames: readonly CakeStep[] = ["design", "customise", "date", "summary", "payment"];

export function CakeProgress({ current, onBack }: { current: number; onBack?: () => void }) {
  const previousDone = useRef<number[] | null>(null);
  const [, bump] = useState(0);

  const doneSteps = cakeSteps.map((_, index) => index).filter((index) => index < current);
  const baseline = previousDone.current ?? doneSteps;
  const animating = doneSteps.some((index) => !baseline.includes(index));

  useEffect(() => {
    previousDone.current = doneSteps;
    if (!animating) return;
    const timer = window.setTimeout(() => bump((value) => value + 1), 450);
    return () => window.clearTimeout(timer);
  });

  const isDone = (index: number) => index < current && (!animating || baseline.includes(index));

  return (
    <nav aria-label="Custom cake progress">
      <ol className="m-0 flex list-none p-0">
        {cakeSteps.map((step, index) => {
          const done = index < current;
          return (
            <li
              key={step}
              aria-current={index === current ? "step" : undefined}
              className={`flex min-w-0 flex-1 basis-1/5 items-center gap-[7px] text-xs text-[#88857d] max-md:gap-0 after:mr-2.5 after:h-px after:flex-1 after:bg-luxury-accent/25 after:transition-colors after:duration-[350ms] after:content-[''] last:after:hidden max-md:after:mr-0 ${isDone(index) ? "after:bg-primary" : ""}`}
            >
              {index === 0 && onBack ? (
                <button
                  type="button"
                  className="flex items-center gap-[7px] border-0 bg-none p-0 font-[inherit] text-inherit hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary max-md:gap-0"
                  onClick={onBack}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-primary bg-primary text-[10px] text-accent transition-[background-color,border-color,color] duration-[350ms] motion-reduce:transition-none md:size-[26px] md:text-[11px]">
                    ✓
                  </span>
                  <span className="min-w-0 truncate max-md:sr-only">{step}</span>
                </button>
              ) : (
                <>
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border border-luxury-accent/45 text-[10px] transition-[background-color,border-color,color] duration-[350ms] motion-reduce:transition-none md:size-[26px] md:text-[11px] ${done ? "border-primary bg-primary text-accent" : ""} ${index === current ? "border-primary text-primary shadow-[inset_0_0_0_1px_rgb(113_141_127_/_15%)]" : ""}`}
                  >
                    {done ? "✓" : index + 1}
                  </span>
                  <span className="min-w-0 truncate max-md:sr-only">{step}</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
