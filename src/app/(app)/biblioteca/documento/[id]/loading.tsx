import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentoLoading() {
  return (
    <div className="grid lg:grid-cols-[260px_1fr_240px] min-h-screen">
      {/* TOC sidebar */}
      <aside className="hidden lg:block border-r border-border p-5 space-y-3">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </aside>

      {/* Cuerpo del documento */}
      <article className="container max-w-3xl py-10 space-y-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-4 w-1/2" />

        <div className="space-y-3 mt-8">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className={`h-4 ${i % 4 === 0 ? 'w-11/12' : 'w-full'}`} />
          ))}
        </div>
      </article>

      {/* Highlights panel */}
      <aside className="hidden lg:block border-l border-border p-5 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </aside>
    </div>
  );
}
