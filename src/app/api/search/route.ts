import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { embedOne } from '@/lib/ai/embeddings';
import type { NormativeDocType } from '@/lib/supabase/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

const requestSchema = z.object({
  query: z.string().min(0).max(500),
  type: z
    .enum(['ley', 'reglamento', 'directiva', 'opinion', 'pronunciamiento', 'resolucion_tce'])
    .nullable()
    .optional(),
  year: z.number().int().min(1990).max(2100).nullable().optional(),
  limit: z.number().int().min(1).max(50).optional(),
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

  const { query, type, year, limit = 12 } = parsed.data;
  const trimmed = query.trim();

  // Sin query → listar docs (paginable) con filtros
  if (!trimmed) {
    let q = supabase
      .from('normative_documents')
      .select('id, type, number, title, summary, date, source_url')
      .order('date', { ascending: false })
      .limit(limit);
    if (type) q = q.eq('type', type);
    if (year) {
      q = q.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    }
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      mode: 'browse',
      documents: data || [],
      results: [],
    });
  }

  // Con query → hybrid search
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedOne(trimmed, 'RETRIEVAL_QUERY');
  } catch (err) {
    return NextResponse.json(
      { error: 'embedding_failed', detail: (err as Error).message },
      { status: 500 },
    );
  }

  const { data: rows, error } = await supabase.rpc('hybrid_search', {
    query_text: trimmed,
    query_embedding: queryEmbedding,
    match_count: limit * 2,
    filter_type: type || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Agrupar chunks por documento — el primer hit es el más relevante
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
    }
  >();

  for (const r of (rows || []) as HybridRow[]) {
    const existing = byDoc.get(r.document_id);
    if (existing) {
      existing.chunkCount += 1;
      existing.score += r.similarity;
    } else {
      byDoc.set(r.document_id, {
        document_id: r.document_id,
        doc_type: r.doc_type,
        doc_number: r.doc_number,
        doc_title: r.doc_title,
        topChunkContent: r.content,
        score: r.similarity,
        chunkCount: 1,
      });
    }
  }

  // Hidratar fechas y summaries
  const docIds = Array.from(byDoc.keys());
  let docMetaMap = new Map<
    string,
    { date: string | null; summary: string | null; source_url: string | null }
  >();
  if (docIds.length > 0) {
    const { data: metas } = await supabase
      .from('normative_documents')
      .select('id, date, summary, source_url')
      .in('id', docIds);
    if (metas) {
      for (const m of metas as Array<{
        id: string;
        date: string | null;
        summary: string | null;
        source_url: string | null;
      }>) {
        docMetaMap.set(m.id, m);
      }
    }
  }

  const results = Array.from(byDoc.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => ({
      ...r,
      ...(docMetaMap.get(r.document_id) || {
        date: null,
        summary: null,
        source_url: null,
      }),
    }));

  return NextResponse.json({ mode: 'search', results });
}
