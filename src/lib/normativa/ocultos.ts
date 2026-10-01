import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActoInfo } from './actos';

/**
 * Lo que no se muestra ni se cita: normas derogadas, vencidas o
 * retiradas (columna `oculto`, documento 11 de César, 30/09/2026).
 *
 * Son pocas decenas y cambian solo cuando se corre un script, así que se
 * guardan en memoria unos minutos en vez de consultarlas en cada
 * búsqueda. La búsqueda híbrida del chat (RPC hybrid_search) está afinada
 * para rendir y no se toca: se filtra su salida con este conjunto.
 */
let cache: { ids: Set<string>; hasta: number } | null = null;

export async function idsOcultos(supabase: SupabaseClient): Promise<Set<string>> {
  if (cache && cache.hasta > Date.now()) return cache.ids;
  const { data } = await supabase.from('normative_documents').select('id').eq('oculto', true).limit(5000);
  const ids = new Set((data || []).map((d) => d.id as string));
  cache = { ids, hasta: Date.now() + 5 * 60_000 };
  return ids;
}

/** Los datos oficiales de los actos a los que pertenecen estos textos. */
export async function actosDe(
  supabase: SupabaseClient,
  claves: Array<string | null | undefined>,
): Promise<Record<string, ActoInfo>> {
  const unicas = Array.from(new Set(claves.filter((c): c is string => !!c)));
  if (unicas.length === 0) return {};
  const { data } = await supabase
    .from('normative_acts')
    .select('clave, tipo, entidad, numero, titulo, url, documentos, vigente_desde, vigente_hasta, derogada, nota')
    .in('clave', unicas);
  return Object.fromEntries((data || []).map((a) => [a.clave as string, a as ActoInfo]));
}
