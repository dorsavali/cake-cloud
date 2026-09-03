function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-[#ded6c8]/75 ${className}`} />;
}

export function ProductDetailLoading() {
  return (
    <div
      role="status"
      aria-label="Loading product details"
      className="mx-auto w-full max-w-[1220px] px-8 pb-18 pt-2"
    >
      <SkeletonLine className="h-4 w-40" />

      <div className="mt-2 grid grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] items-start gap-6">
        <div>
          <div className="aspect-square animate-pulse rounded-2xl border border-luxury-accent/25 bg-[#e5ddcf]/80" />
          <div className="mt-3 flex gap-2.5">
            <div className="size-16 animate-pulse rounded-xl bg-[#ded6c8]/75" />
            <div className="size-16 animate-pulse rounded-xl bg-[#ded6c8]/75" />
            <div className="size-16 animate-pulse rounded-xl bg-[#ded6c8]/75" />
          </div>
        </div>

        <div className="rounded-2xl border border-luxury-accent/35 bg-accent/80 px-6 py-4">
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
