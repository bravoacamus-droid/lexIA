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

/**
 * Marcadores que ABREN una disposición normativa: numerales ("11.5.",
 * "364.6.", "2.1.3.") y encabezados de artículo. Son los puntos de corte
 * correctos: el fragmento debe EMPEZAR aquí, nunca terminar aquí.
 */
const APERTURA_DISPOSICION =
  /(?:^|\s)(?=(?:\d{1,3}(?:\.\d{1,2}){1,3}\.\s)|(?:Art[íi]culo\s+\d{1,3}\b))/g;

/** Abreviaturas cuyo punto NO cierra una oración. */
const ABREVIATURAS =
  /(?:\b(?:art|arts|inc|incs|num|n[úu]m|lit|cap|p[áa]g|sr|sra|dr|ing|ltda|aprox|etc|ss|vs|d\.s|r\.m|r\.d|n\.°|n°)\.)\s*$/i;

/** Numeral suelto al final ("364.6.") — corta la regla de su contenido. */
const NUMERAL_FINAL = /\b\d{1,3}(?:\.\d{1,2}){1,3}\.?\s*$/;

/**
 * Divide en oraciones SIN cortar después de un numeral o una abreviatura.
 *
 * Bug corregido el 01/08/2026: el separador anterior era
 * `split(/(?<=[.!?])\s+/)`, que trata "364.6. " como fin de oración
 * porque termina en punto y espacio. Resultado medido: el 29.9% de los
 * fragmentos del texto íntegro de la Ley 32069 + Reglamento terminaba
 * en un numeral huérfano, dejando su contenido (tablas de multas,
 * plazos, requisitos) en el fragmento siguiente. La búsqueda recuperaba
 * el encabezado y el modelo nunca veía las cifras.
 */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[.!?]\s+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const hasta = m.index + 1; // incluye el signo de puntuación
    const cola = text.slice(Math.max(0, hasta - 16), hasta);
    // No cortar si el "punto" pertenece a un numeral o una abreviatura.
    if (NUMERAL_FINAL.test(cola) || ABREVIATURAS.test(cola)) continue;
    const frase = text.slice(last, hasta).trim();
    if (frase) out.push(frase);
    last = m.index + m[0].length;
  }
  const resto = text.slice(last).trim();
  if (resto) out.push(resto);
  return out.length > 0 ? out : [text];
}

/**
 * Trocea un bloque largo. Prioriza cortar JUSTO ANTES de cada
 * disposición (numeral o artículo) para que cada fragmento empiece con
 * su identificador y lo lleve junto a su contenido. Si el bloque no
 * tiene esa estructura, cae al corte por oraciones.
 */
function splitLargeParagraph(p: string, target: number): string[] {
  if (p.length <= target) return [p];

  // 1. Cortar en las aperturas de disposición.
  const cortes: number[] = [];
  APERTURA_DISPOSICION.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = APERTURA_DISPOSICION.exec(p))) {
    const pos = m.index + m[0].length;
    if (pos > 0 && pos < p.length) cortes.push(pos);
    if (APERTURA_DISPOSICION.lastIndex === m.index) APERTURA_DISPOSICION.lastIndex++;
  }

  let unidades: string[];
  if (cortes.length >= 2) {
    unidades = [];
    let prev = 0;
    for (const c of cortes) {
      const u = p.slice(prev, c).trim();
      if (u) unidades.push(u);
      prev = c;
    }
    const ultimo = p.slice(prev).trim();
    if (ultimo) unidades.push(ultimo);
    // Una disposición aún más larga que el máximo se parte por oraciones.
    unidades = unidades.flatMap((u) => (u.length > target ? splitSentences(u) : [u]));
  } else {
    unidades = splitSentences(p);
  }

  // 2. Reagrupar hasta el tamaño objetivo.
  const out: string[] = [];
  let acc = '';
  for (const u of unidades) {
    if (acc.length + u.length > target && acc.length > 0) {
      out.push(acc.trim());
      acc = u;
    } else {
      acc = acc ? `${acc} ${u}` : u;
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
