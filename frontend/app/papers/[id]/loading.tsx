import { Skeleton } from "@/components/ui";

export default function PaperLoading() {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]" aria-busy="true" aria-live="polite">
      <div className="order-1 min-w-0 space-y-4 lg:order-2">
        <Skeleton className="h-4 w-64" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-full max-w-2xl" />
          <Skeleton className="h-7 w-2/3 max-w-xl" />
        </div>
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 rounded-card" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      </div>
      <div className="order-2 space-y-4 lg:order-1 lg:sticky lg:top-4">
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
      </div>
    </div>
  );
}
