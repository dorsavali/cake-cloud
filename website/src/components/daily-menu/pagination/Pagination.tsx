import styles from "./Pagination.module.css";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

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
        className={`${styles.button} inline-flex size-10 items-center justify-center rounded-full text-lg`}
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
          className={`${styles.button} ${page === currentPage ? styles.active : ""} inline-flex size-10 items-center justify-center rounded-full text-sm font-medium`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        aria-label="Next page"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className={`${styles.button} inline-flex size-10 items-center justify-center rounded-full text-lg`}
      >
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
