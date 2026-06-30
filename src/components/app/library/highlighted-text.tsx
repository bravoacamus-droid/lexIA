'use client';

import { useMemo } from 'react';

interface Props {
  text: string;
  /** Términos a resaltar. Cada uno con su color por índice. */
  terms: string[];
  /** Máximo de caracteres a renderizar (ahorra DOM). */
  maxLength?: number;
  className?: string;
}

/**
 * Resalta múltiples términos dentro de un texto, asignando un color
 * distinto a cada término (rotando entre 8 colores). Útil para
 * mostrar resultados de búsqueda multi-tag mostrando visualmente
 * cuáles palabras matchearon en cada documento.
 *
 * Estrategia:
 *   - Compila un único regex con alternancia para minimizar pasadas
 *   - Detección case-insensitive y diacritic-insensitive (acentos)
 *   - Highlight con <mark> + clases tailwind del set en
 *     tag-search-input.TAG_COLORS (sin border, solo fondo)
 *   - Si maxLength se rebasa: trunca al fragmento que contenga al
 *     menos un match (busca contexto)
 */
export function HighlightedText({
  text,
  terms,
  maxLength = 280,
  className,
}: Props) {
  const segments = useMemo(() => buildSegments(text, terms, maxLength), [text, terms, maxLength]);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.matchIndex < 0) {
          return <span key={i}>{seg.text}</span>;
        }
        const cls = HIGHLIGHT_BG[seg.matchIndex % HIGHLIGHT_BG.length];
        return (
          <mark
            key={i}
            className={`${cls} rounded px-0.5 -mx-0.5 font-medium`}
          >
            {seg.text}
          </mark>
        );
      })}
    </span>
  );
}

/**
 * Solo el background del color — coherente con TAG_COLORS pero sin
 * border (queremos resaltar palabras dentro del flujo del texto sin
 * agregar cajas).
 */
const HIGHLIGHT_BG = [
  'bg-amber-200/70 text-amber-950 dark:bg-amber-500/30 dark:text-amber-50',
  'bg-emerald-200/70 text-emerald-950 dark:bg-emerald-500/30 dark:text-emerald-50',
  'bg-sky-200/70 text-sky-950 dark:bg-sky-500/30 dark:text-sky-50',
  'bg-rose-200/70 text-rose-950 dark:bg-rose-500/30 dark:text-rose-50',
  'bg-violet-200/70 text-violet-950 dark:bg-violet-500/30 dark:text-violet-50',
  'bg-orange-200/70 text-orange-950 dark:bg-orange-500/30 dark:text-orange-50',
  'bg-teal-200/70 text-teal-950 dark:bg-teal-500/30 dark:text-teal-50',
  'bg-pink-200/70 text-pink-950 dark:bg-pink-500/30 dark:text-pink-50',
];

interface Segment {
  text: string;
  /** Índice del término que matcheó, -1 si es texto normal. */
  matchIndex: number;
}

/**
 * Construye segmentos para renderizar text con highlights. Devuelve
 * array alternado entre texto normal y matches.
 */
function buildSegments(text: string, terms: string[], maxLength: number): Segment[] {
  if (!text) return [];
  if (terms.length === 0) {
    return [{ text: clamp(text, maxLength), matchIndex: -1 }];
  }

  // Quitar diacríticos para matching insensitive
  const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const normText = normalize(text);
  const normTerms = terms.map(normalize);

  // Encontrar todos los matches con su índice de término
  type Match = { start: number; end: number; termIdx: number };
  const allMatches: Match[] = [];
  normTerms.forEach((nt, i) => {
    if (!nt || nt.length < 2) return;
    const escaped = nt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const rx = new RegExp(escaped, 'gi');
      let m: RegExpExecArray | null;
      while ((m = rx.exec(normText)) !== null) {
        allMatches.push({ start: m.index, end: m.index + m[0].length, termIdx: i });
        if (m.index === rx.lastIndex) rx.lastIndex++;
      }
    } catch {
      // Si el escape falla (no debería), ignoramos esta query
    }
  });

  if (allMatches.length === 0) {
    return [{ text: clamp(text, maxLength), matchIndex: -1 }];
  }

  // Ordenar y resolver overlaps (favorece match más temprano + más largo)
  allMatches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - a.end;
  });
  const nonOverlap: Match[] = [];
  let cursor = -1;
  for (const m of allMatches) {
    if (m.start >= cursor) {
      nonOverlap.push(m);
      cursor = m.end;
    }
  }

  // Si el texto es largo: centrar en la ventana alrededor del primer match
  let displayText = text;
  let offset = 0;
  if (text.length > maxLength && nonOverlap.length > 0) {
    const first = nonOverlap[0];
    const half = Math.floor(maxLength / 2);
    const start = Math.max(0, first.start - half);
    const end = Math.min(text.length, start + maxLength);
    displayText = (start > 0 ? '… ' : '') + text.slice(start, end) + (end < text.length ? ' …' : '');
    offset = start - (start > 0 ? 2 : 0); // 2 = "… ".length
  }

  // Construir segmentos respetando el offset
  const segments: Segment[] = [];
  let pos = 0;
  for (const m of nonOverlap) {
    const adjStart = m.start - offset;
    const adjEnd = m.end - offset;
    if (adjEnd <= 0 || adjStart >= displayText.length) continue;
    const safeStart = Math.max(0, adjStart);
    const safeEnd = Math.min(displayText.length, adjEnd);
    if (safeStart > pos) {
      segments.push({ text: displayText.slice(pos, safeStart), matchIndex: -1 });
    }
    segments.push({
      text: displayText.slice(safeStart, safeEnd),
      matchIndex: m.termIdx,
    });
    pos = safeEnd;
  }
  if (pos < displayText.length) {
    segments.push({ text: displayText.slice(pos), matchIndex: -1 });
  }
  return segments;
}

function clamp(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + '…';
}
