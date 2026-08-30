type IconProps = {
  className?: string;
};

export function LocationIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21S18 15.7 18 10A6 6 0 1 0 6 10C6 15.7 12 21 12 21Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function MessageIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 11.5A7.5 7.5 0 0 1 8.4 17.8L4 19L5.2 14.6A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
