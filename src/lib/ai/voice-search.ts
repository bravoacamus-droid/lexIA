/**
 * Implementación del tool search_normativa que el Abogado Virtual
 * llamará durante cada llamada de voz.
 *
 * Reutiliza el mismo hybrid_search (cosine + FTS español) que usa el
 * chat de LexIA, sobre la base de 371 documentos / 10,409 chunks.
 *
 * El modelo Gemini Live API decide cuándo llamarlo según el system
 * prompt. Esta función NO toca audio: solo recibe palabras clave,
 * consulta la BD y devuelve fragmentos textuales relevantes con su
 * cita normativa correspondiente.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { embedOne } from '@/lib/ai/embeddings';

export interface NormativaSearchResult {
  /** Tipo del documento (ley, reglamento, directiva, opinion, etc.). */
  type: string;
  /** Número/identificador del documento (ej. "Ley N° 32069 Art. 67.5"). */
  citation: string;
  /** Título completo del documento. */
  title: string;
  /** Fragmento de texto relevante. */
  snippet: string;
  /** Score de relevancia 0-1. */
  similarity: number;
}

export interface SearchOptions {
  query: string;
  /** Filtrar por tipo. Si no se pasa, busca en todos los tipos. */
  filter_type?: string | null;
  /** Cuántos chunks devolver (default 5, max 10). */
  match_count?: number;
}

const VALID_TYPES = new Set([
  'ley',
  'reglamento',
  'directiva',
  'opinion',
  'pronunciamiento',
  'resolucion',
  'resolucion_tce',
  'lineamiento',
  'codigo_etica',
  'guia',
  'tupa',
  'manual_seace',
  'comunicado',
]);

/**
 * Ejecuta la búsqueda híbrida y normaliza los resultados a la forma
 * que el modelo Live API espera recibir.
 *
 * Si el filter_type no es válido (el modelo a veces lo inventa), se
 * ignora silenciosamente para no perder la consulta.
 */
export async function searchNormativa(
  opts: SearchOptions,
): Promise<NormativaSearchResult[]> {
  const matchCount = Math.min(opts.match_count ?? 5, 10);
  const filterType =
    opts.filter_type && VALID_TYPES.has(opts.filter_type)
      ? opts.filter_type
      : null;

  let embedding: number[];
  try {
    const v = await embedOne(opts.query, 'RETRIEVAL_QUERY');
    embedding = v as unknown as number[];
  } catch (e) {
    console.error('[voice-search] embed error:', (e as Error).message);
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('hybrid_search', {
    query_text: opts.query,
    query_embedding: embedding,
    match_count: matchCount,
    filter_type: filterType,
  });
  if (error) {
    console.error('[voice-search] hybrid_search error:', error.message);
    return [];
  }

  interface HybridRow {
    document_id: string;
    content: string;
    doc_title: string;
    doc_type: string;
    doc_number: string | null;
    similarity: number;
  }

  const rows = (data || []) as HybridRow[];
  return rows.map((r) => {
    const numberPart = r.doc_number ? ` ${r.doc_number}` : '';
    const typeLabel = formatTypeLabel(r.doc_type);
    return {
      type: r.doc_type,
      citation: `${typeLabel}${numberPart}`.trim(),
      title: r.doc_title,
      snippet: r.content.slice(0, 1200),
      similarity: r.similarity,
    };
  });
}

/**
 * Formatea el resultado para inyectarlo de vuelta a Gemini Live como
 * respuesta de la function call. Texto legible para que el modelo lo
 * use en su respuesta hablada.
 */
export function formatResultsForLLM(
  results: NormativaSearchResult[],
): string {
  if (results.length === 0) {
    return 'No se encontraron resultados en la base normativa para esta consulta. Sugiérele al usuario verificar en el portal del OECE o consultar a un abogado colegiado para el caso específico.';
  }

  const items = results
    .map((r, i) => {
      return `[Fuente ${i + 1}] ${r.citation} — ${r.title}\n${r.snippet}`;
    })
    .join('\n\n---\n\n');

  return `Encontré ${results.length} fragmento(s) relevante(s) en la base normativa de LexIA. Úsalos para responder al usuario citando cada fuente con su número de artículo o documento exacto. NO inventes citas que no estén en estos fragmentos.\n\n${items}`;
}

function formatTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ley: 'Ley',
    reglamento: 'Reglamento',
    directiva: 'Directiva',
    opinion: 'Opinión DTN',
    pronunciamiento: 'Pronunciamiento OECE',
    resolucion: 'Resolución',
    resolucion_tce: 'Resolución TCE',
    lineamiento: 'Lineamiento',
    codigo_etica: 'Código de Ética',
    guia: 'Guía',
    tupa: 'TUPA',
    manual_seace: 'Manual SEACE',
    comunicado: 'Comunicado',
  };
  return labels[type] || type;
}
