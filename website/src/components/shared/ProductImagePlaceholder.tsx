type ProductImagePlaceholderProps = {
  className?: string;
  compact?: boolean;
};

export function ProductImagePlaceholder({
  className = "",
  compact = false,
}: ProductImagePlaceholderProps) {
  return (
    <span
      role="img"
      aria-label="No image available"
      className={`flex size-full items-center justify-center bg-[#eee8dc] font-signika text-accent-dark/40 ${
        compact ? "p-1" : "flex-col gap-2 p-4 text-sm"
      } ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className={compact ? "size-4" : "size-7"}
      >
        <path
          d="M4.75 5.75a2 2 0 0 1 2-2h10.5a2 2 0 0 1 2 2v12.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2V5.75Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="m6.5 16 3.2-3.25a1 1 0 0 1 1.42 0l1.38 1.4 1.3-1.32a1 1 0 0 1 1.42 0L18 15.65M15.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {compact ? <span className="sr-only">No image</span> : <span>No image</span>}
    </span>
  );
}
