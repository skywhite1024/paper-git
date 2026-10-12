import { Card, Eyebrow, Skeleton } from "@/components/ui";
import { L } from "@/lib/lexicon";

export default function WatchlistLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <Eyebrow className="block">{L.nav.watchlist}</Eyebrow>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-7 w-56 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-72" />
      <span className="sr-only">{L.watchlist.loading}</span>
      {[0, 1].map((i) => (
        <Card key={i} as="section" className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-7 w-20" />
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </Card>
      ))}
    </div>
  );
}
