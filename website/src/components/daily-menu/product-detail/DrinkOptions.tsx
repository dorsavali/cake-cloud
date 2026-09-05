export const drinkChoices = {
  size: ["Small (240ml)", "Regular (350ml)", "Large (450ml)"],
  temperature: ["Hot", "Cold"],
  milk: ["Whole Milk", "Oat Milk", "Almond Milk"],
  syrup: ["Standard (2 Pumps)", "Less Sweet (1 Pump)", "Sugar-Free"],
  caffeine: ["Regular (Double Shot)", "Decaf"],
} as const;

export type DrinkSelection = { [Key in keyof typeof drinkChoices]: string };

export const defaultDrinkSelection: DrinkSelection = {
  size: drinkChoices.size[0],
  temperature: drinkChoices.temperature[0],
  milk: drinkChoices.milk[0],
  syrup: drinkChoices.syrup[0],
  caffeine: drinkChoices.caffeine[0],
};

export function DrinkOptions({ value, onChange, largeSurcharge }: {
  value: DrinkSelection;
  onChange: (value: DrinkSelection) => void;
  largeSurcharge: string;
}) {
  return (
    <div className="mt-6 space-y-6 border-b border-luxury-accent/20 pb-5 font-signika">
      {(["size", "temperature"] as const).map((key) => (
        <fieldset key={key}>
          <legend className="mb-2.5 text-[11px] uppercase tracking-[0.16em] text-accent-dark/55">{key}</legend>
          <div className="flex flex-wrap gap-2.5">
            {drinkChoices[key].map((choice) => (
              <label key={choice} className="cursor-pointer">
                <input type="radio" name={`drink-${key}`} value={choice} checked={value[key] === choice} onChange={() => onChange({ ...value, [key]: choice })} className="peer sr-only" />
                <span className="block rounded-full border border-luxury-accent px-5 py-2 text-xs transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary lg:text-sm">
                  {choice}{choice === drinkChoices.size[2] ? ` +${largeSurcharge}` : ""}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {([
        ["milk", "Milk Choice"],
        ["syrup", "Sweetness / Syrup"],
        ["caffeine", "Caffeine"],
      ] as const).map(([key, label]) => (
        <label key={key} className="block text-sm lg:text-base">
          <span className="mb-1.5 block">{label}</span>
          <select value={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.value })} className="w-full rounded-lg border border-luxury-accent/35 bg-[#f4f0e8] px-4 py-2.5 text-accent-dark focus-visible:outline-2 focus-visible:outline-primary">
            {drinkChoices[key].map((choice) => <option key={choice}>{choice}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}
