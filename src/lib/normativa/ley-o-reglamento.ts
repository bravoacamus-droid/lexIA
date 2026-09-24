/**
 * ¿Este fragmento es de la Ley N° 32069 o de su Reglamento?
 *
 * La biblioteca tiene la Ley y el Reglamento en un solo documento —el
 * consolidado de Editora Perú, «Ley General de Contrataciones Públicas
 * N° 32069 y su Reglamento»—, así que un fragmento llega al modelo con
 * ese título y nada más. El numeral 44.6 («El requerimiento no incluye
 * exigencias desproporcionadas… ni hace referencia a… marca») es del
 * Reglamento; el 46.4 («El requerimiento se formula de manera clara y
 * objetiva») es de la Ley. Midiendo la versión mejorada del
 * requerimiento (23/09/2026), el modelo atribuyó el 44.6 a la Ley en
 * dos hallazgos de siete: con el título que recibe, no tenía forma de
 * saberlo.
 *
 * La frontera se busca, no se fija: es el fragmento donde el Decreto
 * Supremo N° 009-2025-EF dice «Aprobar el Reglamento de la Ley N°
 * 32069». Lo anterior es la Ley; de ahí en adelante, el decreto y su
 * Reglamento. Si el consolidado se vuelve a ingestar, la frontera se
 * mueve con él.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type ParteDeLaNorma = 'ley' | 'reglamento';

export const ROTULO_PARTE: Record<ParteDeLaNorma, string> = {
  ley: 'Ley N° 32069',
  reglamento: 'Reglamento de la Ley N° 32069 (Decreto Supremo N° 009-2025-EF)',
};

interface Frontera {
  documentId: string;
  primerFragmentoDelReglamento: number;
}

let cache: { valor: Frontera | null; hasta: number } | null = null;
const VIGENCIA_MS = 30 * 60 * 1000;

async function frontera(supabase: SupabaseClient): Promise<Frontera | null> {
  if (cache && cache.hasta > Date.now()) return cache.valor;
  let valor: Frontera | null = null;
  const { data: doc, error } = await supabase
    .from('normative_documents')
    .select('id')
    .eq('type', 'ley')
    .ilike('title', '%32069%Reglamento%')
    .limit(1)
    .maybeSingle();
  if (!error && doc) {
    const documentId = (doc as { id: string }).id;
    // Acotado al documento: un ilike sobre todos los fragmentos agota el
    // tiempo y devuelve vacío sin error.
    const { data: f, error: e2 } = await supabase
      .from('normative_chunks')
      .select('chunk_index')
      .eq('document_id', documentId)
      .ilike('content', '%Aprobar el Reglamento de la Ley N%32069%')
      .order('chunk_index', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!e2 && f) valor = { documentId, primerFragmentoDelReglamento: (f as { chunk_index: number }).chunk_index };
    if (e2) console.error('[ley-o-reglamento] no se encontró la frontera:', e2.message);
  } else if (error) {
    console.error('[ley-o-reglamento] no se encontró el consolidado:', error.message);
  }
  cache = { valor, hasta: Date.now() + VIGENCIA_MS };
  return valor;
}

/**
 * La parte de cada fragmento del consolidado, por su id. Los fragmentos
 * de otros documentos no aparecen en el resultado.
 */
export async function partesDeLaNorma(
  supabase: SupabaseClient,
  fragmentos: Array<{ chunk_id: string; document_id?: string; doc_id?: string }>,
): Promise<Map<string, ParteDeLaNorma>> {
  const partes = new Map<string, ParteDeLaNorma>();
  const f = await frontera(supabase).catch(() => null);
  if (!f) return partes;
  const ids = fragmentos.filter((x) => (x.document_id ?? x.doc_id) === f.documentId).map((x) => x.chunk_id);
  if (ids.length === 0) return partes;
  const { data, error } = await supabase.from('normative_chunks').select('id, chunk_index').in('id', ids);
  if (error) {
    console.error('[ley-o-reglamento] no se pudo leer la posición:', error.message);
    return partes;
  }
  for (const c of (data ?? []) as Array<{ id: string; chunk_index: number }>) {
    partes.set(c.id, c.chunk_index < f.primerFragmentoDelReglamento ? 'ley' : 'reglamento');
  }
  return partes;
}

/**
 * Para rotular un sustento: devuelve, por fragmento, « · PARTE: LEY (…)»
 * o « · PARTE: REGLAMENTO (…)», o nada si el fragmento es de otro
 * documento. Es lo que añaden todos los que arman un sustento.
 */
export async function rotuladorDeParte(
  supabase: SupabaseClient,
  fragmentos: Array<{ chunk_id: string; document_id?: string; doc_id?: string }>,
): Promise<(chunkId: string) => string> {
  const partes = await partesDeLaNorma(supabase, fragmentos);
  return (chunkId: string) => {
    const parte = partes.get(chunkId);
    return parte ? ` · PARTE: ${parte.toUpperCase()} (${ROTULO_PARTE[parte]})` : '';
  };
}

/** La regla que acompaña al sustento cuando lleva partes. */
export const REGLA_PARTE =
  'Los fragmentos de la Ley N° 32069 y su Reglamento indican «PARTE: LEY» o «PARTE: REGLAMENTO». ' +
  'Atribuye cada artículo o numeral a la norma de su parte: un numeral de un fragmento de PARTE: ' +
  'REGLAMENTO se cita como del Reglamento aprobado por Decreto Supremo N° 009-2025-EF, nunca como de la Ley.';

/**
 * El sustento con la regla al final, si lleva fragmentos rotulados. Va
 * dentro del propio sustento para que la reciba cualquier prompt que lo
 * use, sin tener que acordarse de añadirla en cada uno.
 */
export function conNotaDeParte(sustento: string): string {
  return sustento.includes('· PARTE: ') ? `${sustento}\n\n---\n\nNOTA: ${REGLA_PARTE}` : sustento;
}
