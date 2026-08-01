import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * COSIDO DE FRAGMENTOS VECINOS (context stitching).
 *
 * PROBLEMA GENERAL que resuelve (medido 01/08/2026): el troceado del
 * corpus parte los documentos por tamaño, no por unidad normativa, así
 * que con frecuencia un artículo queda separado de su detalle. Caso
 * real: el fragmento 302 del texto de la Ley termina exactamente en
 * "364.6." y la TABLA de porcentajes de multa (3-6%, 7-10%, MYPES
 * 1-4% / 5-8%) está en el 303. La búsqueda recupera el 302 —que
 * menciona el numeral— y el modelo nunca ve las cifras, así que
 * responde en genérico.
 *
 * Esto afecta a toda tabla, enumeración o artículo largo del corpus,
 * no a un tema puntual: encabezado en un fragmento y contenido en el
 * siguiente es el patrón más común del texto legal troceado.
 *
 * Diseño conservador — los vecinos se AGREGAN, nunca desplazan a los
 * fragmentos ya seleccionados, de modo que ninguna respuesta que hoy
 * funciona puede perder información.
 */

export interface StitchableChunk {
  chunk_id: string;
  document_id: string;
  content: string;
  doc_title: string;
  doc_type: string;
  doc_number: string | null;
  similarity: number;
}

/**
 * Devuelve los fragmentos contiguos (índice ±1) de los `topN` más
 * relevantes que aún no estén en la selección.
 *
 * @param maxAdd  tope de fragmentos añadidos, para no inflar el prompt.
 * @returns array vacío ante cualquier fallo — nunca rompe el retrieval.
 */
export async function fetchNeighborChunks(
  supabase: SupabaseClient,
  selected: StitchableChunk[],
  { topN = 5, maxAdd = 5 }: { topN?: number; maxAdd?: number } = {},
): Promise<StitchableChunk[]> {
  if (selected.length === 0 || maxAdd <= 0) return [];

  try {
    const semilla = selected.slice(0, topN);
    const ids = semilla.map((c) => c.chunk_id);

    // 1. Índice de cada fragmento semilla (hybrid_search no lo devuelve).
    const { data: metas, error: metaErr } = await supabase
      .from('normative_chunks')
      .select('id, document_id, chunk_index')
      .in('id', ids);
    if (metaErr || !metas) return [];

    // 2. Condiciones (documento, índice±1) de los vecinos a traer.
    const yaSeleccionados = new Set(selected.map((c) => c.chunk_id));
    const condiciones: string[] = [];
    for (const m of metas as Array<{
      id: string;
      document_id: string;
      chunk_index: number;
    }>) {
      for (const delta of [1, -1]) {
        const idx = m.chunk_index + delta;
        if (idx < 0) continue;
        condiciones.push(`and(document_id.eq.${m.document_id},chunk_index.eq.${idx})`);
      }
    }
    if (condiciones.length === 0) return [];

    const { data: vecinos, error: vecErr } = await supabase
      .from('normative_chunks')
      .select(
        'id, document_id, content, chunk_index, normative_documents(title, type, number)',
      )
      .or(condiciones.join(','))
      .limit(maxAdd * 3);
    if (vecErr || !vecinos) return [];

    // PostgREST tipa la relación como array; normalizamos a objeto.
    type VecinoRaw = {
      id: string;
      document_id: string;
      content: string;
      normative_documents:
        | { title: string; type: string; number: string | null }
        | Array<{ title: string; type: string; number: string | null }>
        | null;
    };
    const primeraRel = (r: VecinoRaw['normative_documents']) =>
      Array.isArray(r) ? r[0] ?? null : r;

    const out: StitchableChunk[] = [];
    for (const v of vecinos as unknown as VecinoRaw[]) {
      const rel = primeraRel(v.normative_documents);
      if (yaSeleccionados.has(v.id)) continue;
      if (out.length >= maxAdd) break;
      yaSeleccionados.add(v.id);
      out.push({
        chunk_id: v.id,
        document_id: v.document_id,
        content: v.content,
        doc_title: rel?.title ?? '',
        doc_type: rel?.type ?? '',
        doc_number: rel?.number ?? null,
        // Los vecinos no compiten por relevancia: heredan un score
        // ligeramente inferior al de su fragmento origen para que el
        // orden de presentación los mantenga junto a él.
        similarity: 0,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Inserta cada vecino inmediatamente después de un fragmento del mismo
 * documento, para que el texto se lea continuo en el prompt.
 */
export function mergeNeighbors<T extends StitchableChunk>(
  selected: T[],
  neighbors: T[],
): T[] {
  if (neighbors.length === 0) return selected;
  const out: T[] = [];
  const pendientes = [...neighbors];
  for (const c of selected) {
    out.push(c);
    for (let i = pendientes.length - 1; i >= 0; i--) {
      if (pendientes[i].document_id === c.document_id) {
        out.push(pendientes[i]);
        pendientes.splice(i, 1);
      }
    }
  }
  // Vecinos de documentos que ya no están en la lista (no debería pasar)
  return [...out, ...pendientes];
}
