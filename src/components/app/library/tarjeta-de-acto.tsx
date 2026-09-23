'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, ChevronDown, FileText, Layers, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, getDocTypeMeta, formatDate } from '@/lib/utils';
import { getSummarySnippet } from '@/lib/ai/document-summary';
import { nombreDePapel, type ActoNormativo, type PapelDeParte } from '@/lib/normativa/actos';
import type { NormativeDocType } from '@/lib/supabase/types';

/**
 * Un acto normativo, con sus partes dentro.
 *
 * Hasta setiembre de 2026 cada pieza —la directiva, la resolución que la
 * aprueba, sus modificatorias y sus anexos— era una tarjeta propia con
 * el mismo título, así que la biblioteca parecía llena de duplicados.
 * César lo reportó contando: «aquí se duplica 7 veces, solo debe haber
 * dos fuentes». Aquí el acto aparece una vez y dice cuántas fuentes
 * tiene; las piezas se despliegan y cada una se abre por su lado.
 */

export interface DocumentoDeActo {
  id: string;
  type: NormativeDocType;
  number: string | null;
  title: string;
  summary: string | null;
  date: string | null;
  source_url: string | null;
  metadata?: { package_folder?: string | null; entidad?: string | null } | null;
  ai_summary?: {
    de_que_trata?: string;
    temas?: string[];
    questions?: Array<{ key: string; label: string; answer: string }>;
  } | null;
}

const TINTE: Record<PapelDeParte, string> = {
  norma: 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300',
  aprueba: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  modificatoria: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  anexo: 'bg-secondary text-muted-foreground',
  otro: 'bg-secondary text-muted-foreground',
};

/** Quita del texto el prefijo que ya dice el distintivo. */
function sinRepetir(etiqueta: string, papel: string): string {
  if (etiqueta === papel) return '';
  if (etiqueta.toLowerCase().startsWith(papel.toLowerCase())) {
    return etiqueta.slice(papel.length).replace(/^[\s·-]+/, '');
  }
  return etiqueta;
}

function hrefDocumento(id: string, volver?: string): string {
  const base = `/biblioteca/documento/${id}`;
  return volver ? `${base}?volver=${encodeURIComponent(volver)}` : base;
}

export function TarjetaDeActo({
  acto,
  volverHref,
  savedIds,
  onSave,
  onUnsave,
}: {
  acto: ActoNormativo<DocumentoDeActo>;
  volverHref?: string;
  savedIds: Set<string>;
  onSave: (id: string) => void;
  onUnsave: (id: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const principal = acto.principal;
  const meta = getDocTypeMeta(principal.type);
  const resumen = getSummarySnippet(principal.ai_summary) ?? principal.summary;
  const entidad = principal.metadata?.entidad ?? null;
  const anexos = acto.partes.length - acto.fuentes;
  const guardado = savedIds.has(principal.id);

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-brand-400 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('border-transparent', meta.bg, meta.color)}>
            <span
              className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: meta.tagColor }}
            />
            {meta.label}
          </Badge>
          {entidad && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {entidad}
            </span>
          )}
          {acto.fecha && (
            <span className="text-xs text-muted-foreground">{formatDate(acto.fecha)}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => (guardado ? onUnsave(principal.id) : onSave(principal.id))}
          aria-label={guardado ? 'Quitar de la biblioteca' : 'Guardar en biblioteca'}
          className={guardado ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-amber-500'}
        >
          <Star className={cn('h-4 w-4', guardado && 'fill-current')} />
        </Button>
      </div>

      <Link href={hrefDocumento(principal.id, volverHref)} className="group/title block">
        <h3 className="text-base font-semibold leading-snug tracking-tight transition-colors group-hover/title:text-brand-700 dark:group-hover/title:text-brand-400">
          {acto.titulo}
        </h3>
      </Link>

      {resumen && (
        <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
          {resumen}
        </p>
      )}

      {/* Las piezas del acto. El recuento es lo que César va a comparar
          contra la lista oficial, así que se dice en claro. */}
      <div className="mt-3 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="flex w-full items-center gap-2 text-left text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span>
            {acto.fuentes} fuente{acto.fuentes === 1 ? '' : 's'}
            {anexos > 0 && ` · ${anexos} anexo${anexos === 1 ? '' : 's'}`}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-brand-600 dark:text-brand-400">
            {abierto ? 'Ocultar' : 'Ver las partes'}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', abierto && 'rotate-180')} />
          </span>
        </button>

        {abierto && (
          <ul className="mt-2.5 space-y-1.5">
            {acto.partes.map(({ doc, parte }) => (
              <li key={doc.id}>
                <Link
                  href={hrefDocumento(doc.id, volverHref)}
                  className="flex items-center gap-2.5 rounded-lg border border-border/70 px-3 py-2 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:hover:border-brand-800 dark:hover:bg-brand-950/25"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      TINTE[parte.papel],
                    )}
                  >
                    {nombreDePapel(parte.papel)}
                  </span>
                  {/* Solo la parte de la etiqueta que el distintivo de al
                      lado no dice ya: si no, se leería «Resolución que la
                      aprueba · Resolución que la aprueba N.° 006-2026». */}
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">
                    {sinRepetir(parte.etiqueta, nombreDePapel(parte.papel))}
                  </span>
                  {doc.source_url && (
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.article>
  );
}
