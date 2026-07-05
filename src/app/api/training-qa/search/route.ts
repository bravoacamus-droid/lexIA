import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { embedOne } from '@/lib/ai/embeddings';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * Endpoint que busca Q&A del balotario OECE de Certificación por
 * similaridad semántica.
 *
 * Se invoca desde /api/chat cuando detectamos que la pregunta del
 * usuario tiene forma de examen. El resultado se inyecta como contexto
 * adicional al modelo (además de los chunks normativos del hybrid_search).
 *
 * Body: { query: string, limit?: number, minSimilarity?: number }
 */
const requestSchema = z.object({
  query: z.string().min(3).max(500),
  limit: z.number().int().min(1).max(10).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
});

interface QARow {
  id: string;
  section: string | null;
  question: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_letter: 'a' | 'b' | 'c' | 'd';
  correct_text: string | null;
  similarity: number;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { query, limit = 3, minSimilarity = 0.7 } = parsed.data;

  // Embedding de la consulta
  let embedding: number[];
  try {
    embedding = (await embedOne(query, 'RETRIEVAL_QUERY')) as unknown as number[];
  } catch (e) {
    console.error('[training-qa/search] embed error:', (e as Error).message);
    return NextResponse.json({ error: 'embed_failed' }, { status: 500 });
  }

  const { data, error } = await supabase.rpc('search_training_qa', {
    query_embedding: embedding,
    match_count: limit,
    min_similarity: minSimilarity,
  });
  if (error) {
    console.error('[training-qa/search] rpc error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as QARow[];
  return NextResponse.json({
    results: rows.map((r) => ({
      id: r.id,
      section: r.section,
      question: r.question,
      options: {
        a: r.option_a,
        b: r.option_b,
        c: r.option_c,
        d: r.option_d,
      },
      correctLetter: r.correct_letter,
      correctText: r.correct_text,
      similarity: r.similarity,
    })),
  });
}
