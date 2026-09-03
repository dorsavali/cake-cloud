function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-[#ded6c8]/75 ${className}`} />;
}

export function ProductDetailLoading() {
  return (
    <div
      role="status"
      aria-label="Loading product details"
      className="mx-auto w-full max-w-[1220px] px-4 pb-20 pt-2 lg:px-8 lg:pb-18"
    >
      <SkeletonLine className="h-4 w-40" />

      <div className="mt-3 grid grid-cols-1 items-start gap-4 lg:mt-2 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-6">
        <div>
          <div className="aspect-square animate-pulse rounded-2xl border border-luxury-accent/25 bg-[#e5ddcf]/80" />
          <div className="mt-1 flex justify-center gap-2 lg:mt-3 lg:justify-start lg:gap-2.5">
            <div className="size-11 animate-pulse rounded-lg bg-[#ded6c8]/75 lg:size-16 lg:rounded-xl" />
            <div className="size-11 animate-pulse rounded-lg bg-[#ded6c8]/75 lg:size-16 lg:rounded-xl" />
            <div className="size-11 animate-pulse rounded-lg bg-[#ded6c8]/75 lg:size-16 lg:rounded-xl" />
          </div>
        </div>

        <div className="rounded-xl border border-luxury-accent/35 bg-accent/80 px-4 py-4 lg:rounded-2xl lg:px-6">
          <div className="flex items-start justify-between gap-8">
            <div className="w-2/3 space-y-3">
              <SkeletonLine className="h-7 w-3/4" />
              <SkeletonLine className="h-3 w-1/2" />
            </div>
            <SkeletonLine className="h-6 w-20" />
          </div>

          <div className="mt-4 flex gap-6">
            <SkeletonLine className="h-3 w-16" />
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-3 w-16" />
          </div>

          <div className="mt-3 space-y-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="border-t border-luxury-accent/15 pt-3.5">
                <SkeletonLine className="h-2.5 w-32" />
                <SkeletonLine className="mt-2.5 h-3.5 w-full" />
                <SkeletonLine className="mt-2 h-3.5 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Loading...</span>
    </div>
  );
}
