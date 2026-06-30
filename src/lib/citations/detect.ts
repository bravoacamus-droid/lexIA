/**
 * Detector de citas textuales dentro de respuestas del chat / abogado virtual.
 *
 * Las respuestas del modelo mencionan documentos normativos con texto
 * natural ("Art. 51", "Opinión N° 001-2017", "Pronunciamiento 287-2026").
 * Sin tratamiento estas menciones quedan como texto plano y el usuario
 * no puede abrirlas con un click — César lo señaló en Observaciones.docx
 * el 28/06/2026: "Cesar menciona la estructura a darle click a las fuentes
 * también, el texto no tiene buen espaciado, no facilita la lectura".
 *
 * Este módulo:
 *   1. Detecta menciones por patrón regex (Art, Op, Pron, Res, Dir).
 *   2. Intenta resolverlas contra los sources del mensaje actual.
 *   3. Solo enlaza menciones que coincidan con un source — si la
 *      mención no aparece en sources, queda como texto sin link
 *      (refuerza la defensa anti-alucinación).
 */

import type { ChatSource } from '@/lib/supabase/types';

export interface TextCitationMatch {
  /** Texto literal del match en la respuesta. */
  text: string;
  /** Posición de inicio en el string original. */
  start: number;
  /** Posición de fin (exclusiva). */
  end: number;
  /** El source que resuelve esta mención. Null si no se encontró. */
  source: ChatSource | null;
  /** Categoría detectada — útil para tooltips/icons. */
  kind:
    | 'articulo_ley'
    | 'articulo_reglamento'
    | 'articulo'
    | 'opinion'
    | 'pronunciamiento'
    | 'resolucion'
    | 'directiva';
  /** El número/identificador extraído (ej. "51.1", "287-2026"). */
  number: string;
}

interface Pattern {
  kind: TextCitationMatch['kind'];
  /** Regex con grupo capturador del número del documento. */
  rx: RegExp;
}

/**
 * Patrones por categoría. Diseñados para ser conservadores: matchean
 * solo si hay un número (no enlazan "el artículo" suelto sin número).
 */
const PATTERNS: Pattern[] = [
  // "Art. 51 de la Ley", "Artículo 51.1 de la Ley 32069"
  {
    kind: 'articulo_ley',
    rx: /\b(?:Art(?:[íi]culo|\.)\s+)(\d+(?:\.\d+)*)\b(?=[^.]{0,40}\bLey\b)/g,
  },
  // "Art. 156 del Reglamento", "Artículo 51 del Reglamento"
  {
    kind: 'articulo_reglamento',
    rx: /\b(?:Art(?:[íi]culo|\.)\s+)(\d+(?:\.\d+)*)\b(?=[^.]{0,40}\bReglamento\b)/g,
  },
  // "Art. 51" o "Artículo 51.1" sueltos (sin Ley/Reglamento contextual)
  {
    kind: 'articulo',
    rx: /\b(?:Art(?:[íi]culo|\.)\s+)(\d+(?:\.\d+)*)\b/g,
  },
  // "Opinión N° 001-2017", "Opinión D000054-2026-OECE-DTN"
  {
    kind: 'opinion',
    rx: /\bOpini[óo]n\s*(?:N\.?°|N°|n[uú]m\.?|n[uú]mero)?\s*(D?\d{1,5}(?:[-\/]\d{2,4})?(?:[-\/](?:OECE-?)?DTN)?)\b/gi,
  },
  // "Pronunciamiento 287-2026/OECE-DSAT" o "Pronunciamiento N° 287-2026"
  {
    kind: 'pronunciamiento',
    rx: /\bPronunciamiento\s*(?:N\.?°|N°)?\s*(\d{1,5}(?:[-\/]\d{2,4})?(?:[-\/](?:OECE-?)?DSAT)?)\b/gi,
  },
  // "Resolución 05055-2026-TCE-S3", "Resolución N° 04993-2026-TCP-S3"
  {
    kind: 'resolucion',
    rx: /\bResoluci[óo]n\s*(?:N\.?°|N°)?\s*(\d{2,6}(?:[-\/]\d{2,4})?(?:[-\/]TC[EP][-\/]?S?\d{1,2})?)\b/gi,
  },
  // "Directiva 007-2025-OECE-CD"
  {
    kind: 'directiva',
    rx: /\bDirectiva\s*(?:N\.?°|N°)?\s*(\d{2,4}[-\/]\d{2,4}(?:[-\/](?:OECE-?)?CD)?)\b/gi,
  },
];

/**
 * Normaliza un número de cita para comparar: quita prefijos comunes,
 * pasa a minúsculas, colapsa separadores - / y "n°".
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/n\.?°/g, '')
    .replace(/[\s\.]/g, '')
    .replace(/[\/]/g, '-')
    .replace(/^d0*/, 'd')  // "D000054" → "d54"
    .trim();
}

/**
 * Dado el texto de la respuesta y los sources del mensaje, devuelve
 * los matches en orden de aparición sin solapamiento. Para cada match
 * intenta resolver el source comparando `number` con el `doc_number`
 * de cada source (después de normalizar).
 *
 * Estrategia de prioridad: patrones más específicos primero (Art con
 * "Ley", Art con "Reglamento", Art suelto, Opinion, Pronunciamiento,
 * Resolución, Directiva). Si una posición ya tiene un match no se
 * sobre-escribe.
 */
export function detectTextCitations(
  text: string,
  sources: ChatSource[],
): TextCitationMatch[] {
  const occupied: boolean[] = new Array(text.length).fill(false);
  const matches: TextCitationMatch[] = [];

  // Map de doc_number normalizado → ChatSource para lookup rápido.
  // Para artículos, los sources son los chunks devueltos del RAG; si
  // el chunk corresponde a "Ley 32069 Art. 51.1" el source.doc_number
  // suele ser solo "32069". Por eso para artículos NO matcheamos por
  // número de artículo (ningún source tiene como doc_number el #
  // del artículo). En su lugar, hacemos link al primer source del tipo
  // ley o reglamento.
  const numberIndex = new Map<string, ChatSource>();
  for (const s of sources) {
    if (s.doc_number) {
      numberIndex.set(normalize(s.doc_number), s);
    }
  }
  const lawSource = sources.find((s) => s.doc_type === 'ley');
  const regSource = sources.find((s) => s.doc_type === 'reglamento');

  for (const { kind, rx } of PATTERNS) {
    rx.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      // Skip si la zona ya está ocupada por un match anterior (más específico)
      let overlap = false;
      for (let i = start; i < end; i++) {
        if (occupied[i]) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;

      const num = m[1];
      let source: ChatSource | null = null;
      if (kind === 'articulo_ley') source = lawSource ?? null;
      else if (kind === 'articulo_reglamento') source = regSource ?? null;
      else if (kind === 'articulo') source = lawSource ?? regSource ?? null;
      else source = numberIndex.get(normalize(num)) ?? null;

      matches.push({
        text: m[0],
        start,
        end,
        source,
        kind,
        number: num,
      });
      for (let i = start; i < end; i++) occupied[i] = true;
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}
