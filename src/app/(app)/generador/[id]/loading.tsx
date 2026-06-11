import { Skeleton } from '@/components/ui/skeleton';

export default function GeneradorDocumentLoading() {
  return (
    <>
      {/* Sticky header del editor */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-14 z-10">
        <div className="container max-w-5xl flex items-center justify-between gap-4 py-3">
          <Skeleton className="h-7 w-72" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="container max-w-5xl pt-6">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      {/* Editor body */}
      <div className="container max-w-5xl py-4 pb-16">
        <div className="rounded-2xl border border-border bg-card shadow-soft p-10 space-y-3">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className={`h-4 ${i % 5 === 0 ? 'w-1/2' : 'w-full'}`} />
          ))}
        </div>
      </div>
    </>
  );
}
