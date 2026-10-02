/**
 * De qué norma es cada fragmento del texto íntegro de la Ley N° 32069 y
 * su Reglamento.
 *
 * El texto de El Peruano trae las dos en un solo documento: primero la
 * Ley, luego el Decreto Supremo N° 009-2025-EF con el Reglamento. Para
 * el modelo todos los fragmentos se llamaban igual, y citaba como
 * «artículo 44 de la Ley» los numerales 44.4 y 44.5 del Reglamento
 * (consulta de César sobre la condición de partner, 01/10/2026).
 *
 * El límite se busca, no se fija: donde el decreto dice «DECRETA:» y
 * empieza su artículo 1. Así sigue valiendo si el documento se vuelve a
 * trocear.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatSource } from '@/lib/supabase/types';

const ES_TEXTO_INTEGRO = /^Ley N° 32069 \+ DS N° 009-2025-EF/;

const limites = new Map<string, { indice: number; hasta: number }>();
const VIGENCIA_MS = 60 * 60_000;

async function limiteDe(supabase: SupabaseClient, documentId: string): Promise<number | null> {
  const guardado = limites.get(documentId);
  if (guardado && guardado.hasta > Date.now()) return guardado.indice;
  const { data } = await supabase
    .from('normative_chunks')
    .select('chunk_index')
    .eq('document_id', documentId)
    .ilike('content', '%Ley General de Contrataciones Públicas; DECRETA%')
    .order('chunk_index')
    .limit(1);
  const indice = (data?.[0] as { chunk_index?: number } | undefined)?.chunk_index;
  if (typeof indice !== 'number') return null;
  limites.set(documentId, { indice, hasta: Date.now() + VIGENCIA_MS });
  return indice;
}

/** Marca `parte` en las fuentes del texto íntegro. No toca las demás. */
export async function marcarParteDeNorma(supabase: SupabaseClient, fuentes: ChatSource[]): Promise<void> {
  const delIntegro = fuentes.filter((f) => f.doc_type === 'ley' && ES_TEXTO_INTEGRO.test(f.doc_number ?? ''));
  if (delIntegro.length === 0) return;
  try {
    const documento = delIntegro[0].doc_id;
    const limite = await limiteDe(supabase, documento);
    if (limite === null) return;
    const { data } = await supabase
      .from('normative_chunks')
      .select('id, chunk_index')
      .in('id', delIntegro.map((f) => f.chunk_id));
    const indice = new Map(((data ?? []) as Array<{ id: string; chunk_index: number }>).map((c) => [c.id, c.chunk_index]));
    for (const f of delIntegro) {
      const i = indice.get(f.chunk_id);
      if (typeof i !== 'number' || f.doc_id !== documento) continue;
      // El fragmento del límite ya es el decreto y el artículo 1 del Reglamento.
      f.parte =
        i < limite
          ? 'LEY N° 32069 (Ley General de Contrataciones Públicas)'
          : 'REGLAMENTO de la Ley N° 32069 (DS N° 009-2025-EF)';
    }
  } catch (e) {
    console.warn('[chat] parte de norma omitida:', (e as Error).message);
  }
}
