type IconProps = {
  className?: string;
};

export function MenuIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 28 22" fill="none" aria-hidden="true">
      <path d="M1 1H27M1 11H27M1 21H27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function UberEatsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 34 24" aria-hidden="true">
      <text x="17" y="10" textAnchor="middle" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="700">UBER</text>
      <text x="17" y="19" textAnchor="middle" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="700">EATS</text>
    </svg>
  );
}
