import { Skeleton } from "@/components/ui";

export default function NodeLoading() {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[264px_minmax(0,1fr)]" aria-busy="true" aria-live="polite">
      <div className="order-2 lg:order-1">
        <Skeleton className="h-72 rounded-card" />
      </div>
      <div className="order-1 min-w-0 space-y-4 lg:order-2">
        <Skeleton className="h-4 w-56" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-9 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-card" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-card" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
