/**
 * Chunker semántico para documentos normativos.
 *
 * Estrategia:
 *   1. Normaliza saltos de línea y espacios.
 *   2. Detecta y preserva "anclas" (encabezados de artículos, secciones,
 *      capítulos) — son los puntos naturales de corte.
 *   3. Agrupa párrafos contiguos hasta alcanzar el tamaño objetivo.
 *   4. Si un párrafo individual excede 2× el target, se subdivide por
 *      oraciones para que ningún chunk sea desproporcionadamente largo.
 *   5. Aplica overlap textual entre chunks contiguos (ventana deslizante
 *      sobre el final del chunk anterior) para mejorar el recall del RAG.
 *
 * Parámetros por defecto pensados para Gemini gemini-embedding-001:
 *   - targetChars: 1400 (~700 tokens en español)
 *   - overlapChars: 200 (~100 tokens)
 *   - maxChars: 2800 (límite duro para evitar chunks gigantes)
 */

export interface ChunkOptions {
  targetChars?: number;
  overlapChars?: number;
  maxChars?: number;
}

export interface Chunk {
  index: number;
  content: string;
  /**
   * Heading detectado en el contenido del chunk, si lo hay (ej "Artículo 49").
   * Sirve para enriquecer el metadata en BD y mejorar el ranking de FTS.
   */
  heading: string | null;
}

const DEFAULT_TARGET = 1400;
const DEFAULT_OVERLAP = 200;
const DEFAULT_MAX = 2800;

// Anclas estructurales típicas de normativa peruana
const HEADING_PATTERNS: RegExp[] = [
  /^Art[íi]culo\s+\d+[\s\.\-º°]*/i,
  /^Cap[íi]tulo\s+[IVXLCDM\d]+/i,
  /^T[íi]tulo\s+[IVXLCDM\d]+/i,
  /^Secci[óo]n\s+[IVXLCDM\d]+/i,
  /^Disposici[óo]n(es)?\s+(Complementaria|Final|Transitoria)/i,
  /^[IVX]+\.\s+[A-ZÁÉÍÓÚÑ]/, // "I. ANTECEDENTES", "II. ANÁLISIS"
];

function detectHeading(text: string): string | null {
  const firstLine = text.split('\n', 1)[0].trim();
  if (firstLine.length === 0 || firstLine.length > 120) return null;
  for (const p of HEADING_PATTERNS) {
    if (p.test(firstLine)) return firstLine;
  }
  return null;
}

function isShortHeadingParagraph(p: string): boolean {
  // Considera "ancla" un párrafo muy corto que coincide con un heading;
  // estos sirven como puntos naturales de inicio de chunk nuevo.
  if (p.length > 120) return false;
  return HEADING_PATTERNS.some((r) => r.test(p));
}

function splitLargeParagraph(p: string, target: number): string[] {
  if (p.length <= target) return [p];
  const sentences = p.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let acc = '';
  for (const s of sentences) {
    if (acc.length + s.length > target && acc.length > 0) {
      out.push(acc.trim());
      acc = s;
    } else {
      acc = acc ? `${acc} ${s}` : s;
    }
  }
  if (acc.trim()) out.push(acc.trim());
  return out;
}

function buildOverlap(prev: string, overlap: number): string {
  if (overlap <= 0 || !prev) return '';
  // Tomamos del final del párrafo anterior, cortando en límites de oración.
  const slice = prev.slice(-overlap);
  const m = slice.match(/[.!?]\s+(.+)$/);
  return m ? m[1] : slice;
}

export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const target = options.targetChars ?? DEFAULT_TARGET;
  const overlap = options.overlapChars ?? DEFAULT_OVERLAP;
  const max = options.maxChars ?? DEFAULT_MAX;

  // Normalización: tipos de salto + espacios excesivos
  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ ]+/g, '\n')
    .trim();

  if (clean.length === 0) return [];

  const paragraphs = clean
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => splitLargeParagraph(p, max));

  const chunks: Chunk[] = [];
  let current = '';
  let pushChunk = () => {
    const trimmed = current.trim();
    if (!trimmed) return;
    chunks.push({
      index: chunks.length,
      content: trimmed,
      heading: detectHeading(trimmed),
    });
    current = '';
  };

  for (const p of paragraphs) {
    const startsWithAnchor = isShortHeadingParagraph(p);

    // Forzamos cierre del chunk cuando: hay un heading nuevo Y el chunk
    // actual ya alcanzó al menos 40% del target. Esto evita chunks de
    // un solo título suelto y a la vez respeta las anclas estructurales.
    if (startsWithAnchor && current.length > target * 0.4) {
      pushChunk();
      const carry = buildOverlap(chunks[chunks.length - 1]?.content || '', overlap);
      current = carry ? `${carry}\n\n${p}` : p;
      continue;
    }

    const sep = current ? '\n\n' : '';
    const candidate = current + sep + p;
    if (candidate.length > target && current.length > target * 0.4) {
      pushChunk();
      const carry = buildOverlap(chunks[chunks.length - 1]?.content || '', overlap);
      current = carry ? `${carry}\n\n${p}` : p;
    } else {
      current = candidate;
    }
  }
  pushChunk();

  return chunks;
}
