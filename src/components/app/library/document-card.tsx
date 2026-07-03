'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Star,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Tag,
  MessageCircleQuestion,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, getDocTypeMeta, formatDate } from '@/lib/utils';
import { HighlightedText } from '@/components/app/library/highlighted-text';
import type { NormativeDocType } from '@/lib/supabase/types';

interface DocumentMini {
  id: string;
  type: NormativeDocType;
  number: string | null;
  title: string;
  summary: string | null;
  date: string | null;
  source_url: string | null;
  /** Resumen IA generado (si existe). */
  ai_summary?: {
    de_que_trata?: string;
    temas?: string[];
  } | null;
}

interface Props {
  document: DocumentMini;
  excerpt?: string;
  /** Términos a resaltar en title/excerpt (búsqueda multi-tag). */
  highlightTerms?: string[];
  /** Cuántos de los terms matchearon en este doc. */
  matchedCount?: number;
  /** Total de queries activos. */
  totalQueries?: number;
  isSaved?: boolean;
  onSave?: () => void;
  onUnsave?: () => void;
}

export function DocumentCard({
  document,
  excerpt,
  highlightTerms = [],
  matchedCount,
  totalQueries = 0,
  isSaved,
  onSave,
  onUnsave,
}: Props) {
  const meta = getDocTypeMeta(document.type);
  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="group rounded-xl border border-border bg-card p-5 hover:border-brand-400 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Badge variant="outline" className={cn('border-transparent', meta.bg, meta.color)}>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full mr-1"
              style={{ backgroundColor: meta.tagColor }}
            />
            {meta.label}
          </Badge>
          {document.number && (
            <span className="text-xs font-mono text-muted-foreground truncate">
              {document.number}
            </span>
          )}
          {document.date && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(document.date)}
              </span>
            </>
          )}
          {totalQueries >= 2 && typeof matchedCount === 'number' && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5',
                matchedCount === totalQueries
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-secondary text-muted-foreground',
              )}
              title={`Coincide con ${matchedCount} de ${totalQueries} términos buscados`}
            >
              <CheckCircle2 className="h-3 w-3" />
              {matchedCount}/{totalQueries}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isSaved ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onUnsave}
              aria-label="Quitar de la biblioteca"
              className="text-amber-500 hover:text-amber-600"
            >
              <Star className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSave}
              aria-label="Guardar en biblioteca"
              className="text-muted-foreground hover:text-amber-500"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Link href={`/biblioteca/documento/${document.id}`} className="block group/title">
        <h3 className="text-base font-semibold leading-snug tracking-tight group-hover/title:text-brand-700 dark:group-hover/title:text-brand-400 transition-colors">
          <HighlightedText
            text={document.title}
            terms={highlightTerms}
            maxLength={500}
          />
        </h3>
      </Link>

      {/* Resumen IA — reemplaza al summary genérico si existe.
          Es el fix visible al feedback de César: "no se muestran los
          resúmenes". Diseño discreto con ícono ✨ para diferenciarlo
          del contenido puro del documento. */}
      {document.ai_summary?.de_que_trata && !excerpt && (
        <div className="mt-2.5 flex items-start gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-brand-500 shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
            <HighlightedText
              text={document.ai_summary.de_que_trata}
              terms={highlightTerms}
              maxLength={220}
            />
          </p>
        </div>
      )}

      {/* Tags de temas principales (si el resumen IA los tiene) */}
      {document.ai_summary?.temas && document.ai_summary.temas.length > 0 && !excerpt && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Tag className="h-3 w-3 text-muted-foreground/70" />
          {document.ai_summary.temas.slice(0, 4).map((tema) => (
            <span
              key={tema}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground hover:bg-brand-100 dark:hover:bg-brand-950 hover:text-brand-700 dark:hover:text-brand-400 transition-colors"
            >
              {tema}
            </span>
          ))}
        </div>
      )}

      {/* Fallback al summary del extractor si NO hay ai_summary */}
      {document.summary && !document.ai_summary?.de_que_trata && !excerpt && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
          <HighlightedText
            text={document.summary}
            terms={highlightTerms}
            maxLength={220}
          />
        </p>
      )}

      {excerpt && (
        <div className="mt-3 border-l-2 border-brand-500 bg-brand-50/30 dark:bg-brand-950/30 pl-3 py-2 text-sm leading-relaxed">
          <p className="text-foreground/85 italic">
            "
            <HighlightedText text={excerpt} terms={highlightTerms} maxLength={300} />
            "
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        {document.source_url && (
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <a href={document.source_url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3" />
              Fuente original
            </a>
          </Button>
        )}
        {/* Botón "Preguntar" — pre-carga una pregunta con contexto del
            documento y abre una conversación nueva en el chat. Feedback
            César 01/07/2026: ref UI del cliente muestra este acceso
            rápido para mover al usuario del hallazgo a la consulta. */}
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40"
        >
          <Link href={buildAskChatUrl(document)}>
            <MessageCircleQuestion className="h-3.5 w-3.5" />
            Preguntar
          </Link>
        </Button>
        <Button asChild size="sm" variant="subtle">
          <Link href={`/biblioteca/documento/${document.id}`}>
            Abrir
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </motion.article>
  );
}

/**
 * Construye la URL para abrir el chat con una pregunta pre-cargada
 * sobre este documento. El endpoint /chat?new=1&q=... crea una
 * conversación nueva y envía la pregunta como primer mensaje del usuario.
 */
function buildAskChatUrl(doc: DocumentMini): string {
  const meta = getDocTypeMeta(doc.type);
  const label = doc.number || doc.title.slice(0, 80);
  // Pregunta redactada en 1ra persona para que el chat responda con
  // contexto de este documento específico.
  const q = `Explícame los puntos clave del ${meta.label} ${label}. ¿Qué establece y a quién afecta?`;
  return `/chat?new=1&q=${encodeURIComponent(q)}`;
}
