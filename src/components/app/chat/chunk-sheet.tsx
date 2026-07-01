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
import { formatNormativaText } from '@/lib/normativa/format-raw';
import type { ChatSource } from '@/lib/supabase/types';

interface Props {
  open: boolean;
  onClose: () => void;
  chunk: ChatSource | null;
}

export function ChunkSheet({ open, onClose, chunk }: Props) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Feedback César 30/06/2026: "puedes hacer más ancha esa ventana que
          se abre para estructurarlo mejor". Antes era max-w-lg (512px),
          ahora max-w-2xl (672px) que aprovecha mejor el ancho de pantalla
          y permite que el texto respire con la nueva estructura. */}
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
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
            <SheetTitle className="text-lg font-semibold leading-snug">
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

      <div className="flex-1 overflow-y-auto scrollbar-thin px-8 py-6">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-brand-600 dark:text-brand-400 mb-3">
          Fragmento citado
        </div>
        {/* Feedback César 30/06/2026: aplicar el MISMO estilo del chat al
            fragmento citado. Antes era prose-sm con estructura recortada.
            Ahora usa prose-lexia completo (idéntico al chat) para consistencia
            visual entre "cita en el chat" y "cita en el fragmento". */}
        <div className="relative rounded-lg border-l-4 border-brand-500 bg-brand-50/30 dark:bg-brand-950/20 pl-6 pr-4 py-5">
          <div className="prose-lexia">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {formatNormativaText(chunk.snippet)}
            </ReactMarkdown>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
          Este es el fragmento que sustenta la afirmación que estaba citada en la
          respuesta de LexIA. Para revisar el documento completo, abre el visor
          de la biblioteca normativa.
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
