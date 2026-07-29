'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, BookOpen, Target } from 'lucide-react';
import { getDocTypeMeta } from '@/lib/utils';
import { formatNormativaText } from '@/lib/normativa/format-raw';
import type { ChatSource } from '@/lib/supabase/types';

interface Props {
  open: boolean;
  onClose: () => void;
  chunk: ChatSource | null;
  /** Numeral/artículo detectado en el chat cerca del chip [N] (ej: "125.2").
   *  Cuando existe, dentro del sheet se resalta con un <mark> y se hace
   *  auto-scroll al primer match. Feedback César 08/07/2026: el modal
   *  mostraba todo el chunk y no era evidente qué parte citaba la
   *  respuesta — la contradicción era aparente, no real. */
  focus?: string | null;
}

export function ChunkSheet({ open, onClose, chunk, focus }: Props) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Feedback César 30/06/2026: "puedes hacer más ancha esa ventana que
          se abre para estructurarlo mejor". Antes era max-w-lg (512px),
          ahora max-w-2xl (672px) que aprovecha mejor el ancho de pantalla
          y permite que el texto respire con la nueva estructura. */}
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
        {chunk && (
          <ChunkSheetContent chunk={chunk} focus={focus} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ChunkSheetContent({
  chunk,
  focus,
  onClose,
}: {
  chunk: ChatSource;
  focus?: string | null;
  onClose: () => void;
}) {
  const meta = getDocTypeMeta(chunk.doc_type);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const markRef = useRef<HTMLElement | null>(null);

  // Pre-computamos el markdown con <mark> alrededor de `focus` cuando
  // aplica. Lo hacemos ANTES de pasar a formatNormativaText porque ese
  // helper puede reformatear saltos de línea/párrafos; queremos que el
  // mark quede en HTML crudo que remark-gfm respeta.
  const bodyMarkdown = useMemo(() => {
    const formatted = formatNormativaText(chunk.snippet);
    if (!focus || focus.trim().length === 0) return formatted;
    // Escapa el foco para regex y matchea word-boundary flexible
    // (el numeral suele estar rodeado de espacios o puntuación).
    const escaped = focus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Aceptamos "125.2", "artículo 125.2", "Art. 125.2" — envolvemos
    // solo el numeral en sí para no distorsionar la puntuación.
    const re = new RegExp(`(${escaped})`, 'g');
    return formatted.replace(
      re,
      '<mark data-lexia-focus="true">$1</mark>',
    );
  }, [chunk.snippet, focus]);

  // Auto-scroll al primer <mark> cuando aparece el sheet.
  useEffect(() => {
    if (!focus) return;
    const t = setTimeout(() => {
      const el = scrollRef.current?.querySelector<HTMLElement>(
        'mark[data-lexia-focus="true"]',
      );
      if (el) {
        markRef.current = el;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
    return () => clearTimeout(t);
  }, [focus, chunk.chunk_id]);

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

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-8 py-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-brand-600 dark:text-brand-400">
            Fragmento citado
          </div>
          {focus && (
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              <Target className="h-3 w-3" />
              {focus}
            </div>
          )}
        </div>
        {/* Feedback César 30/06/2026: aplicar el MISMO estilo del chat al
            fragmento citado. Antes era prose-sm con estructura recortada.
            Ahora usa prose-lexia completo (idéntico al chat) para consistencia
            visual entre "cita en el chat" y "cita en el fragmento".
            08/07/2026: agregamos <mark> al artículo/numeral cuando el usuario
            hizo click desde una cita numérica del chat, para que salte
            visualmente y podamos hacer auto-scroll a él. */}
        <div className="relative rounded-lg border-l-4 border-brand-500 bg-brand-50/30 dark:bg-brand-950/20 pl-6 pr-4 py-5">
          <div className="prose-lexia [&_mark]:bg-amber-200 dark:[&_mark]:bg-amber-500/30 [&_mark]:text-amber-950 dark:[&_mark]:text-amber-100 [&_mark]:px-1 [&_mark]:rounded [&_mark]:font-semibold">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              // rehype-raw permite renderizar el <mark> inline que
              // inyectamos arriba. El input viene de nuestra propia
              // snippet, no de user-generated content, así que no hay
              // riesgo de XSS aquí.
              rehypePlugins={[rehypeRaw]}
            >
              {bodyMarkdown}
            </ReactMarkdown>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
          {focus
            ? `Se destacó automáticamente el fragmento que corresponde a "${focus}" citado en la respuesta. `
            : 'Este es el fragmento que sustenta la afirmación que estaba citada en la respuesta de LexIA. '}
          Para revisar el documento completo, abre el visor de la biblioteca.
        </p>
      </div>

      <div className="border-t border-border px-6 py-4 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
        <Button asChild>
          <Link
            // `volver`: el visor regresa a esta conversación, no a la
            // biblioteca (observación César 27/07/2026). `resaltar`: el
            // visor hace scroll y marca el fragmento citado.
            href={`/biblioteca/documento/${chunk.doc_id}?volver=${encodeURIComponent(
              typeof window !== 'undefined'
                ? window.location.pathname
                : '/chat',
            )}&resaltar=${encodeURIComponent(
              (focus || chunk.snippet.replace(/\s+/g, ' ').trim().slice(0, 80)),
            )}`}
            onClick={onClose}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir documento completo
          </Link>
        </Button>
      </div>
    </>
  );
}
