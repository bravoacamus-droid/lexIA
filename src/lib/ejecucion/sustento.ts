/**
 * El sustento normativo de un caso de ejecución contractual.
 *
 * Para la ejecución, la búsqueda por parecido no basta: una ampliación
 * de plazo de obra se rige por el artículo 200 del Reglamento, y si la
 * búsqueda trae el 142 —el de bienes y servicios, que se le parece
 * mucho—, el informe cita el plazo equivocado. Por eso los artículos se
 * piden POR NÚMERO al texto consolidado de la Ley N.° 32069 y su
 * Reglamento: los que la matriz dice para esa actuación y ese tipo de
 * contrato. Cada uno va rotulado con su parte —Ley o Reglamento—, que es
 * lo que evitó que el modelo atribuyera a la Ley un numeral del
 * Reglamento.
 *
 * Aparte, por parecido, las opiniones y directivas que traten el caso:
 * son criterio, no norma, y se marcan así.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { embedOne } from '@/lib/ai/embeddings';
import { ROTULO_PARTE } from '@/lib/normativa/ley-o-reglamento';

let cache: { ley: string; reglamento: string; hasta: number } | null = null;

async function textoConsolidado(supabase: SupabaseClient): Promise<{ ley: string; reglamento: string } | null> {
  if (cache && cache.hasta > Date.now()) return cache;
  const { data, error } = await supabase
    .from('normative_documents')
    .select('raw_text')
    .eq('type', 'ley')
    .ilike('title', '%32069%Reglamento%')
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    console.error('[ejecucion/sustento] no se encontró el consolidado:', error?.message);
    return null;
  }
  const t = ((data as { raw_text: string }).raw_text ?? '').replace(/\s+/g, ' ');
  const corte = t.search(/Aprobar el Reglamento de la Ley N/);
  if (corte < 0) return null;
  cache = { ley: t.slice(0, corte), reglamento: t.slice(corte), hasta: Date.now() + 30 * 60 * 1000 };
  return cache;
}

/** Las cabeceras de página de Editora Perú que se cuelan a mitad de artículo. */
function limpiar(texto: string): string {
  return texto
    .replace(/\s*\d{1,3}\s*InicioNORMAS LEGALES ACTUALIZADAS(?: (?:Ley General de Contrataciones Públicas|Reglamento de la Ley General de Contrataciones Públicas))+\s*/g, ' ')
    .replace(/\s+(?:TÍTULO|CAPÍTULO|SUBCAPÍTULO) [IVXL\d]+ [A-ZÁÉÍÓÚÑ ,]+$/u, '')
    .trim();
}

/** El texto de un artículo: desde su rótulo hasta el siguiente. */
export function extraerArticulo(parte: string, n: number, tope = 6000): string | null {
  const re = new RegExp(`Art[íi]culo\\s+${n}\\.\\s`, 'g');
  // El último: el primero es el del índice.
  const m = [...parte.matchAll(re)].pop();
  if (!m || m.index === undefined) return null;
  const resto = parte.slice(m.index + 10);
  const sig = resto.search(/Art[íi]culo\s+\d+\.\s/);
  const fin = sig > 0 ? m.index + 10 + sig : m.index + tope;
  return limpiar(parte.slice(m.index, Math.min(fin, m.index + tope)));
}

export interface SustentoNormativo {
  texto: string;
  /** Los artículos que se encontraron, para la auditoría. */
  articulos: Array<{ parte: 'ley' | 'reglamento'; numero: number }>;
}

export async function articulosDeLaNorma(
  supabase: SupabaseClient,
  pedidos: { ley: number[]; reglamento: number[] },
): Promise<SustentoNormativo> {
  const norma = await textoConsolidado(supabase);
  if (!norma) return { texto: '', articulos: [] };
  const bloques: string[] = [];
  const articulos: SustentoNormativo['articulos'] = [];
  for (const parte of ['ley', 'reglamento'] as const) {
    for (const n of [...new Set(pedidos[parte])].sort((a, b) => a - b)) {
      const texto = extraerArticulo(norma[parte], n);
      if (!texto) continue;
      articulos.push({ parte, numero: n });
      bloques.push(`[${parte === 'ley' ? 'LEY' : 'REGLAMENTO'} — artículo ${n}] PARTE: ${parte.toUpperCase()} (${ROTULO_PARTE[parte]})\n${texto}`);
    }
  }
  return { texto: bloques.join('\n\n---\n\n'), articulos };
}

interface Fila {
  chunk_id: string;
  content: string;
  doc_title: string;
  doc_type: string;
  doc_number: string | null;
}

/** Opiniones y directivas parecidas al caso. Son criterio, no norma. */
export async function criteriosRelacionados(supabase: SupabaseClient, consulta: string): Promise<string> {
  try {
    const embedding = await embedOne(consulta, 'RETRIEVAL_QUERY');
    const tandas = await Promise.all(
      (['opinion', 'directiva'] as const).map(async (tipo) => {
        const { data, error } = await supabase.rpc('hybrid_search', {
          query_text: consulta,
          query_embedding: embedding as unknown as number[],
          match_count: tipo === 'opinion' ? 3 : 2,
          filter_type: tipo,
        });
        if (error) {
          console.error('[ejecucion/sustento] búsqueda falló:', tipo, error.message);
          return [] as Fila[];
        }
        return (data ?? []) as Fila[];
      }),
    );
    const vistos = new Set<string>();
    return tandas
      .flat()
      .filter((f) => !vistos.has(f.chunk_id) && (vistos.add(f.chunk_id), true))
      .map((f) => `[CRITERIO — ${f.doc_title}${f.doc_number ? ` (${f.doc_number})` : ''}]\n${f.content.slice(0, 1400)}`)
      .join('\n\n---\n\n');
  } catch (e) {
    console.error('[ejecucion/sustento] sin criterios:', (e as Error).message);
    return '';
  }
}
