/**
 * Sustento normativo de la biblioteca para un apartado que se redacta.
 *
 * Vivía dentro de la ruta de redactar un bloque. Sale aquí porque la
 * redacción en lote necesita exactamente el mismo sustento: si cada una
 * lo buscara a su manera, el texto que sale del botón de un apartado y
 * el que sale de "redactar todo" dejarían de parecerse.
 */
import { createClient } from '@/lib/supabase/server';
import { embedOne } from '@/lib/ai/embeddings';
import { conNotaDeParte, rotuladorDeParte } from '@/lib/normativa/ley-o-reglamento';

export async function sustentoNormativo(consulta: string): Promise<string> {
  try {
    const embedding = await embedOne(consulta, 'RETRIEVAL_QUERY');
    const supabase = createClient();
    const { data } = await supabase.rpc('hybrid_search', {
      query_text: consulta,
      query_embedding: embedding as unknown as number[],
      match_count: 5,
      filter_type: null,
    });
    const filas = (data ?? []) as Array<{
      chunk_id: string;
      document_id: string;
      content: string;
      doc_title: string;
      doc_type: string;
      doc_number: string | null;
    }>;
    if (filas.length === 0) return '';
    // La Ley y el Reglamento viven en un mismo documento: sin decir de
    // cuál es cada fragmento, el modelo atribuye numerales del
    // Reglamento a la Ley. Ver `ley-o-reglamento.ts`.
    const parte = await rotuladorDeParte(supabase, filas);
    return conNotaDeParte(filas
      .map((f, i) => {
        const etiqueta = `${f.doc_type}${f.doc_number ? ' ' + f.doc_number : ''}`;
        return `[${i + 1}] ${etiqueta} — ${f.doc_title}${parte(f.chunk_id)}\n${f.content.slice(0, 1200)}`;
      })
      .join('\n\n---\n\n'));
  } catch (e) {
    // Sin sustento se redacta igual: el prompt ya prohíbe citar norma que
    // no venga respaldada, así que la salida sale sin citas en vez de con
    // citas inventadas.
    console.error('[sustento] falló la búsqueda:', (e as Error).message);
    return '';
  }
}
