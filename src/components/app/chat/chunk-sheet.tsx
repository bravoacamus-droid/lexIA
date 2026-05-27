'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, BookOpen } from 'lucide-react';
import { getDocTypeMeta } from '@/lib/utils';
import type { ChatSource } from '@/lib/supabase/types';

interface Props {
  open: boolean;
  onClose: () => void;
  chunk: ChatSource | null;
}

export function ChunkSheet({ open, onClose, chunk }: Props) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        {chunk && <ChunkSheetContent chunk={chunk} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function ChunkSheetContent({
  chunk,
  onClose,
}: {
  chunk: ChatSource;
  onClose: () => void;
}) {
  const meta = getDocTypeMeta(chunk.doc_type);

  return (
    <>
      <SheetHeader className="p-6 pb-4 border-b border-border">
        <div className="flex items-start gap-3">
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
          >
            <BookOpen className={`h-4 w-4 ${meta.color}`} strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <Badge variant="outline" className={`mb-1.5 ${meta.color}`}>
              {meta.label}
            </Badge>
            <SheetTitle className="font-serif text-xl leading-snug">
              {chunk.doc_number || chunk.doc_title}
            </SheetTitle>
            {chunk.doc_number && (
              <SheetDescription className="mt-1 text-xs">
                {chunk.doc_title}
              </SheetDescription>
            )}
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
          Fragmento citado
        </div>
        <div className="relative rounded-r-md border-l-4 border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 px-5 py-4">
          <div
            className="prose-lexia prose-sm
              prose-headings:font-serif prose-headings:text-foreground
              prose-h1:text-base prose-h1:mt-0 prose-h1:mb-3 prose-h1:font-semibold
              prose-h2:text-sm prose-h2:mt-4 prose-h2:mb-2 prose-h2:uppercase prose-h2:tracking-wider prose-h2:text-brand-700 dark:prose-h2:text-brand-400
              prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1
              prose-p:text-[14px] prose-p:leading-relaxed prose-p:my-2
              prose-strong:text-foreground prose-strong:font-semibold
              prose-ul:my-2 prose-li:my-0.5 prose-li:text-[14px]
              prose-ol:my-2"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{chunk.snippet}</ReactMarkdown>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
          Este es el fragmento que sustenta la afirmación que estaba citada en la respuesta de
          LexIA. Para revisar el documento completo, abre el visor de la biblioteca normativa.
        </p>
      </div>

      <div className="border-t border-border px-6 py-4 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
        <Button asChild>
          <Link href={`/biblioteca/documento/${chunk.doc_id}`} onClick={onClose}>
            <ExternalLink className="h-4 w-4" />
            Abrir documento completo
          </Link>
        </Button>
      </div>
    </>
  );
}
