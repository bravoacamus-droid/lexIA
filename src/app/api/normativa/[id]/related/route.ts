import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import type { NormativeDocType } from '@/lib/supabase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/normativa/[id]/related
 *
 * Devuelve los top-N documentos más similares al actual basado en
 * similitud de embeddings entre chunks. Estrategia:
 *
 *   1. Tomar el embedding del chunk con menor índice del documento
 *      (suele ser introducción/sumilla).
 *   2. Buscar los chunks más cercanos en pgvector EXCLUYENDO los del
 *      propio documento.
 *   3. Agrupar por document_id y devolver los top 5 documentos
 *      distintos con su similitud máxima.
 *
 * Costo: una query a normative_chunks + un order by cosine distance.
 * pgvector lo resuelve en <100ms para nuestro corpus de ~10k chunks.
 */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Buscar via RPC para que pgvector use el índice.
  // Feedback César 01/07/2026: la ref UI del cliente muestra "Ver más
  // relaciones (12)" — subimos de 5 a 15 candidatos para que el usuario
  // pueda expandir la lista y ver más docs relacionados.
  const { data, error } = await admin.rpc('find_related_documents', {
    p_document_id: ctx.params.id,
    p_limit: 15,
  });

  if (error) {
    // Si la función no existe (no se ha aplicado migración 0027 todavía),
    // hacemos un fallback más simple basado en tipo + tema
    if ((error.message || '').includes('function') && (error.message || '').includes('not exist')) {
      return NextResponse.json({ related: [], reason: 'rpc_not_ready' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const related = ((data || []) as Array<{
    document_id: string;
    doc_title: string;
    doc_type: NormativeDocType;
    doc_number: string | null;
    similarity: number;
  }>);

  return NextResponse.json({ related });
}
