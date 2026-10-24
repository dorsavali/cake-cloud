import shared from "./CakeBaseSelector.module.css";

export const cakeSteps = ["Design", "Customise", "Date", "Summary", "Payment"];

export function CakeProgress({ current, onBack }: { current: number; onBack?: () => void }) {
  return (
    <nav aria-label="Custom cake progress" className={shared.progress}>
      <ol>
        {cakeSteps.map((step, index) => (
          <li key={step} aria-current={index === current ? "step" : undefined}>
            {index === 0 && onBack ? (
              <button type="button" className={shared.stepButton} onClick={onBack}>
                <span className={`${shared.stepNumber} ${shared.complete}`}>✓</span>
                <span className={shared.stepLabel}>{step}</span>
              </button>
            ) : (
              <>
                <span className={`${shared.stepNumber} ${index < current ? shared.complete : ""}`}>{index < current ? "✓" : index + 1}</span>
                <span className={shared.stepLabel}>{step}</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
