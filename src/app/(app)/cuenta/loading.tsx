import { Skeleton } from '@/components/ui/skeleton';

export default function CuentaLoading() {
  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-64" />
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        {/* Sidebar nav */}
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4">
          <Skeleton className="h-16 w-full max-w-md" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
