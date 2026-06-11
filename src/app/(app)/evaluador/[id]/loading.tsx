import { Skeleton } from '@/components/ui/skeleton';

export default function EvaluacionLoading() {
  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Resumen ejecutivo */}
      <Skeleton className="h-40 rounded-xl" />

      {/* Matriz comparativa */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-44" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
