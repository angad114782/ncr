/**
 * Loading placeholders that look like the content they stand in for (the grey shimmer you know from YouTube),
 * shown while data or a page chunk is still on its way — never a blank page or a lone spinner.
 * The shimmer itself is CSS (`.skeleton` in index.css); the same classes draw the boot skeleton in index.html.
 */

/** A shimmering block. Size and shape come from `className` (e.g. "h-4 w-40", "h-52 rounded-[24px]"). */
export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />
}

/** `lines` grey text lines; the last one is shorter, like a real paragraph. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div aria-hidden="true" className={`flex flex-col gap-2.5 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full'}`} />
      ))}
    </div>
  )
}

/** Same footprint as PropertyCard. */
export function PropertyCardSkeleton() {
  return (
    <div aria-hidden="true" className="glass rounded-[24px] overflow-hidden">
      <Skeleton className="h-52 !rounded-none" />
      <div className="p-5 flex flex-col gap-3">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3.5 w-1/2" />
        <div className="flex gap-4 pt-3 border-t border-[var(--glass-border)]">
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 4, className = 'grid sm:grid-cols-2 lg:grid-cols-4 gap-5' }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <PropertyCardSkeleton key={i} />)}
    </div>
  )
}

/** Property / agent / article page while its data is still being fetched. */
export function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="py-6 flex flex-col gap-6">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-[280px] md:h-[440px] rounded-[28px]" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <SkeletonText lines={5} className="mt-2" />
        </div>
        <Skeleton className="h-64 rounded-[24px]" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}

/** A panel (admin / agent / dashboard) while its code or data loads: top bar, sidebar, content rows. */
export function PanelSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="min-h-screen p-4 md:p-6 flex gap-6">
      <div className="hidden md:flex flex-col gap-3 w-60 shrink-0">
        <Skeleton className="h-12 rounded-[16px]" />
        {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-10 rounded-full" />)}
      </div>
      <div className="flex-1 flex flex-col gap-5 min-w-0">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-[20px]" />)}
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-[16px]" />)}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}

/** A table / list inside a panel. */
export function ListSkeleton({ rows = 6 }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="flex flex-col gap-3">
      <Skeleton className="h-9 w-56" />
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-14 rounded-[16px]" />)}
      <span className="sr-only">Loading…</span>
    </div>
  )
}
