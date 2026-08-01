import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { embedOne } from '@/lib/ai/embeddings';
import type { NormativeDocType } from '@/lib/supabase/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

const requestSchema = z.object({
  query: z.string().min(0).max(500),
  /**
   * Búsqueda multi-tag (queries en paralelo). Si se envía no vacío,
   * tiene prioridad sobre `query`. Cada string se busca por separado
   * y los resultados se combinan; un documento que matchea N de las
   * queries se rankea con bonus proporcional. Inspirado en el feature
   * de LEX Contrataciones (pero con brand LexIA).
   */
  queries: z.array(z.string().min(1).max(80)).max(8).optional(),
  type: z
    .enum([
      'ley',
      'reglamento',
      'directiva',
      'opinion',
      'pronunciamiento',
      'resolucion_tce',
      'manual_seace',
      'tupa',
      'comunicado',
      'guia',
      'lineamiento',
      'codigo_etica',
      'resolucion',
    ])
    .nullable()
    .optional(),
  year: z.number().int().min(1990).max(2100).nullable().optional(),
  /**
   * Entidad emisora — pedido de César (01/08/2026): "respecto a las
   * Directivas se tendría que clasificar por año y entidad (OECE, Perú
   * Compras y DGA), de la misma forma los lineamientos". Se guarda en
   * metadata.entidad al ingerir/normalizar.
   */
  entidad: z.string().min(2).max(40).nullable().optional(),
  /**
   * Filtro por ley aplicable: 'ley_32069' (vigente desde abr-2025) o
   * 'ley_30225' (régimen anterior). Si no se envía o es null, no se
   * filtra. Pedido por César para evitar mezclar jurisprudencia de
   * ambas leyes en una misma búsqueda.
   */
  law: z.enum(['ley_32069', 'ley_30225']).nullable().optional(),
  limit: z.number().int().min(1).max(50).optional(),
  offset: z.number().int().min(0).optional(),
});

interface HybridRow {
  chunk_id: string;
  document_id: string;
  content: string;
  doc_title: string;
  doc_type: NormativeDocType;
  doc_number: string | null;
  similarity: number;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }

  const { query, queries, type, year, law, entidad, limit = 12, offset = 0 } = parsed.data;
  const trimmed = query.trim();
  // Normalizar queries multi-tag: dedupe + trim + filter vacíos.
  const multiTags = Array.from(
    new Set((queries || []).map((q) => q.trim()).filter(Boolean)),
  ).slice(0, 8);
  const isMultiTag = multiTags.length > 0;

  // Sin query → listar docs (paginable) con filtros + conteo total para saber
  // cuándo terminar el infinite scroll.
  if (!trimmed && !isMultiTag) {
    let q = supabase
      .from('normative_documents')
      .select(
        'id, type, number, title, summary, date, source_url, applicable_law, ai_summary, metadata',
        {
          count: 'exact',
        },
      )
      .order('date', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);
    if (type) q = q.eq('type', type);
    if (entidad) q = q.eq('metadata->>entidad', entidad);
    if (year) {
      q = q.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    }
    if (law) q = q.contains('applicable_law', [law]);
    const { data, count, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      mode: 'browse',
      documents: data || [],
      results: [],
      total: count ?? null,
      offset,
      limit,
      hasMore: count != null ? offset + (data?.length || 0) < count : false,
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Búsqueda con queries (multi-tag o single)
  //
  // Estrategia: lanzamos una hybrid_search por cada query/tag en
  // paralelo. Los chunks devueltos se agrupan por document_id. Un
  // documento que aparece en N queries gana bonus (∝ N). El score
  // final es la suma de similitudes ponderada.
  //
  // Multi-tag con 1 sola query equivale al flujo single. Se mantiene
  // retrocompat: si no envías `queries`, usamos [query].
  // ──────────────────────────────────────────────────────────────
  const activeQueries = isMultiTag ? multiTags : [trimmed];

  // Embedding por query en paralelo
  let queryEmbeddings: Array<number[] | null>;
  try {
    queryEmbeddings = await Promise.all(
      activeQueries.map((q) => embedOne(q, 'RETRIEVAL_QUERY').catch(() => null)),
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'embedding_failed', detail: (err as Error).message },
      { status: 500 },
    );
  }

  // Hybrid search por query — SECUENCIAL con AbortController.
  //
  // Bug reportado por César 01/07/2026: "Subsanación de ofertas" con
  // tags [subsanación, omisión, anexo] mostraba "Sin resultados".
  //
  // Causa: hybrid_search tarda 6-8s por query en el corpus de 12k chunks.
  // Con Promise.all las 3 queries paralelas excedían el statement_timeout
  // de Postgres (canceling statement due to statement timeout) y las 3
  // devolvían vacío. Además paralelo no ayuda si el DB ya está saturado.
  //
  // Fix: correr secuencialmente. Cada query respeta su tiempo. El total
  // es lineal (3 tags × 7s ≈ 21s) pero devuelve resultados reales.
  const perQueryRows: Array<Array<HybridRow & { _q: number }>> = [];
  for (let i = 0; i < activeQueries.length; i++) {
    const emb = queryEmbeddings[i];
    if (!emb) {
      perQueryRows.push([]);
      continue;
    }
    const { data, error } = await supabase.rpc('hybrid_search', {
      query_text: activeQueries[i],
      query_embedding: emb,
      match_count: 8,
      filter_type: type || null,
      filter_law: law ? [law] : null,
    });
    if (error) {
      console.error('[search] hybrid_search error para query', activeQueries[i], ':', error.message);
      perQueryRows.push([]);
      continue;
    }
    perQueryRows.push(((data || []) as HybridRow[]).map((r) => ({ ...r, _q: i })));
  }

  // Agrupar chunks por documento. Para cada doc anotamos en qué
  // queries apareció (set) para calcular bonus multi-tag.
  const byDoc = new Map<
    string,
    {
      document_id: string;
      doc_type: NormativeDocType;
      doc_number: string | null;
      doc_title: string;
      topChunkContent: string;
      score: number;
      chunkCount: number;
      matchedQueries: Set<number>;
    }
  >();

  for (const rows of perQueryRows) {
    for (const r of rows as Array<HybridRow & { _q: number }>) {
      const existing = byDoc.get(r.document_id);
      if (existing) {
        existing.chunkCount += 1;
        existing.score += r.similarity;
        existing.matchedQueries.add(r._q);
      } else {
        byDoc.set(r.document_id, {
          document_id: r.document_id,
          doc_type: r.doc_type,
          doc_number: r.doc_number,
          doc_title: r.doc_title,
          topChunkContent: r.content,
          score: r.similarity,
          chunkCount: 1,
          matchedQueries: new Set([r._q]),
        });
      }
    }
  }

  // Hidratar fechas + summaries + resumen IA + temas
  const docIds = Array.from(byDoc.keys());
  const docMetaMap = new Map<
    string,
    {
      date: string | null;
      summary: string | null;
      source_url: string | null;
      ai_summary: {
        de_que_trata?: string;
        temas?: string[];
        questions?: Array<{ key: string; label: string; answer: string }>;
      } | null;
    }
  >();
  if (docIds.length > 0) {
    const { data: metas } = await supabase
      .from('normative_documents')
      .select('id, date, summary, source_url, ai_summary')
      .in('id', docIds);
    if (metas) {
      for (const m of metas as Array<{
        id: string;
        date: string | null;
        summary: string | null;
        source_url: string | null;
        ai_summary: {
        de_que_trata?: string;
        temas?: string[];
        questions?: Array<{ key: string; label: string; answer: string }>;
      } | null;
      }>) {
        docMetaMap.set(m.id, m);
      }
    }
  }

  // Bonus multi-tag: documentos que matchean N queries reciben score
  // ponderado por N. Asegura que un doc con todos los tags suba sobre
  // uno con un solo tag aunque la similitud individual sea menor.
  const results = Array.from(byDoc.values())
    .map((r) => ({
      ...r,
      matchedCount: r.matchedQueries.size,
      finalScore: r.score * (1 + (r.matchedQueries.size - 1) * 0.5),
    }))
    .sort((a, b) => {
      if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
      return b.finalScore - a.finalScore;
    })
    .slice(0, limit)
    .map((r) => ({
      document_id: r.document_id,
      doc_type: r.doc_type,
      doc_number: r.doc_number,
      doc_title: r.doc_title,
      topChunkContent: r.topChunkContent,
      score: r.finalScore,
      chunkCount: r.chunkCount,
      matchedCount: r.matchedCount,
      matchedQueries: Array.from(r.matchedQueries),
      ...(docMetaMap.get(r.document_id) || {
        date: null,
        summary: null,
        source_url: null,
      }),
    }));

  return NextResponse.json({
    mode: 'search',
    results,
    queries: activeQueries,
    multiTag: isMultiTag,
  });
}
