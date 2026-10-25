"use client";

/** A native select so the calendar dialog never clips its options. */
export function CakeSelect({ label, value, options, onChange, consistent = false }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  consistent?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-[13px] md:text-sm">
      <span className={consistent ? "sr-only" : "text-xs text-accent-dark/70 md:text-sm"}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-0 rounded-[7px] border border-[#e3d7c2] bg-[#f5f0e7] px-2.5 text-base text-accent-dark focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary md:h-[38px] md:px-3 md:text-sm"
      >
        {options.includes(value) ? null : <option>{value}</option>}
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
