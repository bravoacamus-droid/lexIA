/**
 * Clasificador automático de tipo normativo a partir de la URL y/o el
 * texto del link descubierto. Se ejecuta ANTES de insertar el documento
 * en BD para que un PDF descargado de la colección "directivas" del OECE
 * (que en realidad mezcla manuales, TUPA, guías, etc.) caiga en su tipo
 * real y no contamine la categoría "directiva".
 *
 * Reglas en orden — la primera que matchea gana. Si ninguna matchea, se
 * devuelve el `defaultType` que el scraping_sources tenía configurado
 * (típicamente el "tipo dominante" de esa colección del OECE).
 *
 * Patrones derivados del análisis real de los 288 documentos del corpus
 * actual (commit 3b41de1). Cuando aparezca un patrón nuevo, agregar una
 * regla aquí en lugar de ir a parchar a mano la BD.
 */

export type NormativeDocType =
  | 'ley'
  | 'reglamento'
  | 'directiva'
  | 'opinion'
  | 'pronunciamiento'
  | 'resolucion_tce'
  | 'manual_seace'
  | 'tupa'
  | 'comunicado'
  | 'guia'
  | 'lineamiento'
  | 'codigo_etica'
  | 'resolucion';

interface ClassifyRule {
  type: NormativeDocType;
  /** Patrón que se busca en la URL completa (case-insensitive). */
  urlPattern?: RegExp;
  /** Patrón que se busca en el texto del link (case-insensitive). */
  textPattern?: RegExp;
  /** Descripción humana para debugging. */
  label: string;
}

/**
 * Reglas de clasificación en ORDEN DE PRIORIDAD (las más específicas primero).
 *
 * Ejemplos de URLs / textos vistos en el corpus real:
 *  - URL: ".../manuales-seace-manual-de-usuario-..."
 *    → manual_seace
 *  - URL: ".../444989-comunicados-perucompras-reglamento-..."
 *    → comunicado
 *  - URL: ".../7983873-...-modificacion-del-tupa-del-oece.pdf"
 *    → tupa
 *  - URL: ".../guia-reactivacion-obras-paralizadas.pdf"
 *  - URL: ".../preguntas-frecuentes-seace-...pdf"
 *  - URL: ".../tablero-normativo-oece-...pdf"
 *    → guia
 *  - Text: "Directiva N.° 007-2025-OECE-CD"
 *    → directiva
 *  - URL: ".../pronunciamientos-oece-pronunciamiento-n-..."
 *    → pronunciamiento
 *  - URL: ".../opiniones-oece-opinion-n-..."
 *    → opinion
 *  - URL: ".../resolucion-tce-..." o nombre numero-AAAA-tce-sN
 *    → resolucion_tce
 */
export const CLASSIFICATION_RULES: ClassifyRule[] = [
  // MUY específicas primero
  {
    type: 'tupa',
    urlPattern: /modificacion[-_]del[-_]tupa|\btupa[-_](?:oece|osce)\b|tupa[-_]oece[-_]lugares/i,
    textPattern: /\btupa\b|texto\s+único\s+de\s+procedimientos/i,
    label: 'TUPA',
  },
  {
    type: 'guia',
    urlPattern:
      /\bguia[-_]|guia\.pdf|preguntas[-_]frecuentes|tablero[-_]normativo|\bfaq\b/i,
    textPattern: /^gu[ií]a|preguntas\s+frecuentes|tablero\s+normativo|\bfaq\b/i,
    label: 'Guía / FAQ / Tablero',
  },
  {
    type: 'manual_seace',
    urlPattern: /manuales[-_]seace[-_]manual|\bmanual[-_]de[-_]usuario|manual[-_]general/i,
    textPattern: /^manual\s+(de\s+usuario|general)/i,
    label: 'Manual de usuario / general del SEACE',
  },
  {
    type: 'comunicado',
    urlPattern: /comunicados[-_](?:oece|osce|perucompras)|reglamento[-_]de[-_]organizacion/i,
    textPattern: /^comunicado|reglamento\s+de\s+organizaci[oó]n\s+y\s+funciones/i,
    label: 'Comunicado / ROF',
  },

  // Documentos normativos vinculantes
  {
    type: 'codigo_etica',
    urlPattern: /codigo[-_]de[-_]etica|c[oó]digo[-_]etica/i,
    textPattern: /c[oó]digo\s+de\s+[ée]tica/i,
    label: 'Código de Ética',
  },
  {
    type: 'lineamiento',
    urlPattern: /lineamiento[s]?[-_](?:n[-_°º]?|oece|peru[-_]?compras)|lineamientos[-_]para[-_]el[-_]cumplimiento/i,
    textPattern: /^lineamiento[s]?\s+(n[°º.]?\s*\d|para)/i,
    label: 'Lineamiento OECE / Perú Compras',
  },
  {
    type: 'resolucion',
    urlPattern:
      /resoluci[oó]n[-_]directoral|resoluci[oó]n[-_]jefatural|resoluci[oó]n[-_]n[-_°º]?\s?\d+[-_]\d{4}[-_]ef[-_]?5401|resoluci[oó]n[-_]\d{4,}[-_]\d{4}[-_](?:pre|jefatura|oece)|resoluci[oó]n[-_]n[-_°º]?[-_]?\d{2,6}[-_]\d{4}|resoluci[oó]n[-_]que[-_](?:aprueba|modifica|corrige|rectifica)|resoluci[oó]n[-_]de[-_](?:aprobaci[oó]n|modificaci[oó]n)|\d{6,}[-_]resoluci[oó]n/i,
    // textPattern también captura "Resolución que aprueba la directiva",
    // "Resolución que modifica por primera vez", "Resolución directoral N° X",
    // "Resolución jefatural", etc.
    textPattern:
      /^(?:\d+[.\s-]+)?resoluci[oó]n(?:\s+(?:directoral|jefatural|que|de|n[°º.]?))/i,
    label: 'Resolución Directoral / Jefatural / Aprobatoria',
  },
  {
    type: 'directiva',
    urlPattern: /\d{3,}[-_]\d{4}[-_]oece[-_]cd|\d{4}[-_]\d{4}[-_]ef[-_]?5401|directiva[-_]n[-_°º]?\s?\d+|directiva[-_]\d|directiva[-_](?:oece|peru[-_]?compras|dga)/i,
    textPattern: /^directiva\s+n[°º.]?\s*\d/i,
    label: 'Directiva',
  },
  {
    type: 'pronunciamiento',
    urlPattern: /pronunciamientos?[-_](?:oece|osce|dsat)|pronunciamiento[-_]n/i,
    textPattern: /^pronunciamiento/i,
    label: 'Pronunciamiento',
  },
  {
    type: 'opinion',
    urlPattern: /opiniones[-_](?:oece|osce|dtn)|opinion[-_]n/i,
    textPattern: /^opini[oó]n\s+n/i,
    label: 'Opinión DTN',
  },
  {
    type: 'resolucion_tce',
    urlPattern: /resoluciones[-_]tce|\d+[-_]\d{4}[-_]tce[-_]s\d|resolucion[-_]n[-_°º]?\s?\d+.*tce/i,
    textPattern: /^resoluci[oó]n\s+n[°º.]?\s*\d+.*tce|sala\s+plena.*tce/i,
    label: 'Resolución TCE',
  },

  // Marcos normativos (poco frecuentes en scraping, casi siempre en upload manual)
  {
    type: 'ley',
    urlPattern: /\bley[-_]n[-_°º]?\s?\d|\bley[-_]\d{4,}/i,
    textPattern: /^ley\s+n[°º.]?\s*\d/i,
    label: 'Ley',
  },
  {
    type: 'reglamento',
    urlPattern: /reglamento[-_]ds[-_]\d|ds[-_]\d{3,}[-_]\d{4}[-_]ef|reglamento[-_]de[-_]la[-_]ley/i,
    textPattern: /^reglamento(?:\s+de\s+la\s+ley)?\s+/i,
    label: 'Reglamento (DS / Ley)',
  },
];

interface ClassifyInput {
  url: string;
  linkText?: string;
  defaultType: NormativeDocType;
}

interface ClassifyOutput {
  type: NormativeDocType;
  /** true si se reclasificó respecto del defaultType. */
  reclassified: boolean;
  /** Regla que ganó el match (para debugging / logs). */
  matchedRule?: string;
}

/**
 * Clasifica un documento descubierto en base a URL + texto del link.
 * Devuelve el tipo más probable y si se reclasificó respecto del default.
 */
export function classifyByPattern(input: ClassifyInput): ClassifyOutput {
  const url = input.url.toLowerCase();
  const text = (input.linkText || '').toLowerCase();

  for (const rule of CLASSIFICATION_RULES) {
    const urlMatch = rule.urlPattern && rule.urlPattern.test(url);
    const textMatch = rule.textPattern && rule.textPattern.test(text);
    if (urlMatch || textMatch) {
      return {
        type: rule.type,
        reclassified: rule.type !== input.defaultType,
        matchedRule: rule.label,
      };
    }
  }

  return {
    type: input.defaultType,
    reclassified: false,
  };
}
