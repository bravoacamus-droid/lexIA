'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, ChevronDown, FileText, Layers, ExternalLink, ArrowUpRight, MessageCircleQuestion } from 'lucide-react';
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
 *
 * Desde el documento 11 de César (30/09/2026) el acto se pinta con sus
 * datos oficiales —tomados del Tablero normativo del OECE—: número y
 * título («Directiva N° 0002-2025-EF/54.01 - Disposiciones…»), vigencia,
 * la ficha oficial y, al desplegar, cada resolución con su fecha y su
 * enlace, distinguiendo el texto original de las modificatorias. Sin
 * resumen: «solo basta con el título para saber el tema».
 */

export interface DocumentoDeActo {
  id: string;
  type: NormativeDocType;
  number: string | null;
  title: string;
  summary: string | null;
  date: string | null;
  source_url: string | null;
  acto_clave?: string | null;
  metadata?: {
    package_folder?: string | null;
    entidad?: string | null;
    parte_rol?: string | null;
    parte_etiqueta?: string | null;
    parte_fecha?: string | null;
    parte_url?: string | null;
  } | null;
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
    return etiqueta.slice(papel.length).replace(/^[\s·:-]+/, '');
  }
  return etiqueta;
}

/** El nombre del distintivo de cada pieza, más preciso que el papel genérico. */
function distintivo(papel: PapelDeParte, etiqueta: string): string {
  if (papel === 'norma') return /^Texto actualizado/.test(etiqueta) ? 'Texto actualizado' : 'Texto de la norma';
  if (papel === 'modificatoria') return /^Rectificaci/.test(etiqueta) ? 'Rectificación' : 'Modificación';
  return nombreDePapel(papel);
}

function hrefDocumento(id: string, volver?: string): string {
  const base = `/biblioteca/documento/${id}`;
  return volver ? `${base}?volver=${encodeURIComponent(volver)}` : base;
}

/** «Vigente desde…», «Vigente del… al…», «Derogada». */
export function Vigencia({
  desde,
  hasta,
  derogada,
}: {
  desde: string | null;
  hasta: string | null;
  derogada: boolean;
}) {
  if (derogada) {
    return (
      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:bg-rose-950 dark:text-rose-300">
        Derogada
      </span>
    );
  }
  if (!desde) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {hasta ? `Vigente del ${formatDate(desde)} al ${formatDate(hasta)}` : `Vigente desde ${formatDate(desde)}`}
    </span>
  );
}

export function TarjetaDeActo({
  acto,
  volverHref,
  savedIds,
  onSave,
  onUnsave,
  abierto,
  onAlternar,
}: {
  acto: ActoNormativo<DocumentoDeActo>;
  volverHref?: string;
  savedIds: Set<string>;
  onSave: (id: string) => void;
  onUnsave: (id: string) => void;
  /** Lo controla la lista, para volver a dejarlo abierto al regresar. */
  abierto: boolean;
  onAlternar: () => void;
}) {
  const principal = acto.principal;
  const info = acto.info;
  const meta = getDocTypeMeta(principal.type);
  // Sin datos oficiales (actos que el tablero no trae), el resumen sigue
  // ayudando a saber de qué trata; con ellos, el título basta.
  const resumen = info ? null : getSummarySnippet(principal.ai_summary) ?? principal.summary;
  const entidad = info?.entidad ?? principal.metadata?.entidad ?? null;
  const anexos = acto.partes.length - acto.fuentes;
  const guardado = savedIds.has(principal.id);
  const fuente = info?.url ?? principal.metadata?.parte_url ?? principal.source_url ?? null;

  // Resoluciones del tablero cuyo texto no está en la biblioteca: se
  // listan igual, con su enlace oficial (pedido de César: ver la
  // resolución que aprueba y cada modificación con su fecha).
  const etiquetas = acto.partes.map((p) => p.parte.etiqueta);
  const soloEnLaFuente = (info?.documentos ?? []).filter(
    (d) => d.rol !== 'anexo' && !etiquetas.some((e) => e.includes(d.nombre)),
  );

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      data-ancla={acto.clave}
      className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-brand-400 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('border-transparent', meta.bg, meta.color)}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.tagColor }} />
            {meta.label}
          </Badge>
          {entidad && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {entidad}
            </span>
          )}
          {info ? (
            <Vigencia desde={info.vigente_desde} hasta={info.vigente_hasta} derogada={info.derogada} />
          ) : (
            acto.fecha && <span className="text-xs text-muted-foreground">{formatDate(acto.fecha)}</span>
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
          {info ? (
            <>
              <span className="text-foreground">{info.numero}</span>
              {info.titulo && <span className="font-medium text-foreground/80"> - {info.titulo}</span>}
            </>
          ) : (
            acto.titulo
          )}
        </h3>
      </Link>

      {resumen && <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">{resumen}</p>}
      {info?.nota && <p className="mt-1.5 text-[12.5px] leading-relaxed text-amber-800 dark:text-amber-300">{info.nota}</p>}

      {/* Las piezas del acto. El recuento es lo que César compara contra
          la lista oficial, así que se dice en claro. */}
      <div className="mt-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={abierto}
            className="flex items-center gap-2 text-left text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span>
              {acto.fuentes} documento{acto.fuentes === 1 ? '' : 's'}
              {anexos > 0 && ` · ${anexos} anexo${anexos === 1 ? '' : 's'}`}
            </span>
            <span className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400">
              {abierto ? 'Ocultar' : 'Ver las partes'}
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', abierto && 'rotate-180')} />
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            {fuente && (
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                <a href={fuente} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  Fuente oficial
                </a>
              </Button>
            )}
            <Button asChild size="sm" variant="ghost" className="text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40">
              <Link
                href={`/chat?new=1&q=${encodeURIComponent(`Explícame los puntos clave de la ${acto.titulo.slice(0, 160)}. ¿Qué establece y a quién afecta?`)}`}
              >
                <MessageCircleQuestion className="h-3.5 w-3.5" />
                Preguntar
              </Link>
            </Button>
            <Button asChild size="sm" variant="subtle">
              <Link href={hrefDocumento(principal.id, volverHref)}>
                Abrir
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>

        {abierto && (
          <ul className="mt-2.5 space-y-1.5">
            {acto.partes.map(({ doc, parte }) => {
              const papel = distintivo(parte.papel, parte.etiqueta);
              const fecha = doc.metadata?.parte_fecha ?? null;
              const enlace = doc.metadata?.parte_url ?? doc.source_url;
              return (
                <li key={doc.id} className="flex items-center gap-1.5">
                  <Link
                    href={hrefDocumento(doc.id, volverHref)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border/70 px-3 py-2 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:hover:border-brand-800 dark:hover:bg-brand-950/25"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', TINTE[parte.papel])}>
                      {papel}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">{sinRepetir(parte.etiqueta, papel)}</span>
                    {fecha && <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">{formatDate(fecha)}</span>}
                  </Link>
                  {enlace ? (
                    <a
                      href={enlace}
                      target="_blank"
                      rel="noreferrer"
                      title="Fuente oficial de este documento"
                      aria-label="Fuente oficial de este documento"
                      className="rounded-lg border border-border/70 p-2 text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="w-[34px]" />
                  )}
                </li>
              );
            })}
            {soloEnLaFuente.map((d) => (
              <li key={d.nombre} className="flex items-center gap-1.5">
                <a
                  href={d.url ?? fuente ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-dashed border-border px-3 py-2 transition-colors hover:border-brand-300"
                  title="El texto de esta resolución está en la fuente oficial"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      d.rol === 'aprueba' ? TINTE.aprueba : TINTE.modificatoria,
                    )}
                  >
                    {d.rol === 'aprueba' ? 'Resolución que la aprueba' : d.rol === 'rectificacion' ? 'Rectificación' : d.rol === 'modificacion' ? 'Modificación' : 'Documento relacionado'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">{d.nombre}</span>
                  {d.fecha && <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">{formatDate(d.fecha)}</span>}
                </a>
                <span className="w-[34px]" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.article>
  );
}
