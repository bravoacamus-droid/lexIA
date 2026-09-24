/**
 * El sustento con que se comprueba un hallazgo.
 *
 * La búsqueda general de la biblioteca trae sobre todo resoluciones del
 * Tribunal: son treinta y siete mil. Para decidir si un requerimiento
 * puede exigir algo, lo que manda son las bases estándar, la Ley y su
 * Reglamento, así que se piden aparte y van primero.
 *
 * Se midió con el TDR del servicio de transmisión de datos (23/09/2026):
 * el auditor marcó como «crítico» exigir comprobantes de pago para la
 * experiencia con privados, y las bases estándar dicen literalmente eso.
 * Sin las bases en el sustento, esa corrección habría empeorado el
 * requerimiento.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { embedOne } from '@/lib/ai/embeddings';
import { conNotaDeParte, rotuladorDeParte } from '@/lib/normativa/ley-o-reglamento';

interface Fila {
  chunk_id: string;
  document_id: string;
  content: string;
  doc_title: string;
  doc_type: string;
  doc_number: string | null;
}

const PEDIDOS: Array<{ tipo: string | null; cuantos: number }> = [
  { tipo: 'bases_estandar', cuantos: 3 },
  { tipo: 'ley', cuantos: 3 },
  { tipo: null, cuantos: 4 },
];

export type BuscarSustento = (consulta: string) => Promise<string>;

export function buscadorDeSustento(supabase: SupabaseClient): BuscarSustento {
  return async (consulta: string) => {
    try {
      const embedding = await embedOne(consulta, 'RETRIEVAL_QUERY');
      const tandas = await Promise.all(
        PEDIDOS.map(async ({ tipo, cuantos }) => {
          const { data, error } = await supabase.rpc('hybrid_search', {
            query_text: consulta,
            query_embedding: embedding as unknown as number[],
            match_count: cuantos,
            filter_type: tipo,
          });
          if (error) {
            console.error('[mejora] búsqueda de sustento falló:', tipo, error.message);
            return [] as Fila[];
          }
          return (data ?? []) as Fila[];
        }),
      );
      const vistos = new Set<string>();
      const filas = tandas.flat().filter((f) => !vistos.has(f.chunk_id) && (vistos.add(f.chunk_id), true));
      const parte = await rotuladorDeParte(supabase, filas);
      return conNotaDeParte(
        filas
          .map((f, i) => {
            const etiqueta = `${f.doc_type}${f.doc_number ? ' ' + f.doc_number : ''}`;
            return `[${i + 1}] ${etiqueta} — ${f.doc_title}${parte(f.chunk_id)}\n${f.content.slice(0, 1400)}`;
          })
          .join('\n\n---\n\n'),
      );
    } catch (e) {
      // Sin sustento no se descarta nada ni se cita nada: el prompt lo
      // dice, y la mejora sale como «lo decide el área usuaria».
      console.error('[mejora] sin sustento:', (e as Error).message);
      return '';
    }
  };
}
