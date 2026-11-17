type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const paginationButtonClass =
  "inline-flex size-10 items-center justify-center rounded-full border border-luxury-accent/45 bg-accent/72 text-accent-dark [transition:color_180ms_ease,border-color_180ms_ease,background-color_180ms_ease,transform_180ms_ease] [&:not(:disabled):hover]:-translate-y-px [&:not(:disabled):hover]:border-primary [&:not(:disabled):hover]:bg-primary [&:not(:disabled):hover]:text-accent disabled:cursor-default disabled:opacity-[0.38]";

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Product pages" className="mt-8 flex items-center justify-center gap-2 font-signika">
      <button
        type="button"
        aria-label="Previous page"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className={`${paginationButtonClass} text-lg`}
      >
        <span aria-hidden="true">←</span>
      </button>

      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
        <button
          key={page}
          type="button"
          aria-label={`Page ${page}`}
          aria-current={page === currentPage ? "page" : undefined}
          onClick={() => onPageChange(page)}
          className={`${paginationButtonClass} text-sm font-medium ${
            page === currentPage ? "border-primary! bg-primary! text-accent!" : ""
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        aria-label="Next page"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className={`${paginationButtonClass} text-lg`}
      >
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
