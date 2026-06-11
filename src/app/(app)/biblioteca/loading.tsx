import { Skeleton } from '@/components/ui/skeleton';

export default function BibliotecaLoading() {
  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>

      {/* Search bar */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* Type filters */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Layout: sidebar carpetas + grid de docs */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-32 rounded-xl" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
