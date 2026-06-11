import { Skeleton } from '@/components/ui/skeleton';

export default function ChatLoading() {
  return (
    <div className="container max-w-3xl py-12 flex flex-col items-center text-center space-y-6">
      {/* Logo grande */}
      <Skeleton className="h-16 w-16 rounded-2xl" />

      {/* Título grande del hero */}
      <div className="space-y-3 w-full max-w-xl">
        <Skeleton className="h-10 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-2/3 mx-auto" />
      </div>

      {/* Sugerencias rápidas */}
      <div className="grid sm:grid-cols-2 gap-3 w-full max-w-2xl pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Input del prompt */}
      <Skeleton className="h-14 w-full max-w-2xl rounded-2xl mt-6" />
    </div>
  );
}
