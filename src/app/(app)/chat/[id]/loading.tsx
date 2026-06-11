import { Skeleton } from '@/components/ui/skeleton';

export default function ChatConversationLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Topbar de la conversación */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Skeleton className="h-7 w-64" />
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 space-y-8 max-w-3xl mx-auto w-full">
        {/* User message */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-2/3 rounded-2xl" />
        </div>
        {/* Assistant message */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        {/* User message */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-1/2 rounded-2xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-10/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <Skeleton className="h-12 max-w-3xl mx-auto rounded-2xl" />
      </div>
    </div>
  );
}
