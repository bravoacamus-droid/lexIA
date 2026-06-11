import { Skeleton } from '@/components/ui/skeleton';

export default function RnpLoading() {
  return (
    <div className="container max-w-5xl py-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-20 rounded-xl" />
    </div>
  );
}
