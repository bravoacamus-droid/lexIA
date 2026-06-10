#!/usr/bin/env tsx
/**
 * Smoke test del RAG: embebe una query y la pasa por hybrid_search().
 * Útil para validar que la base normativa quedó útil tras la ingesta.
 *
 * Uso:
 *   npx tsx scripts/test-rag-query.ts "ampliación de plazo"
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

const q = process.argv.slice(2).join(' ').trim() || 'subsanación de ofertas';

async function embedOne(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 1024,
    }),
  });
  if (!res.ok) throw new Error(`embed ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { embedding: { values: number[] } };
  return json.embedding.values;
}

async function main() {
  console.log(`Query: "${q}"\n`);
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const embedding = await embedOne(q);

  const { data, error } = await supabase.rpc('hybrid_search', {
    query_text: q,
    query_embedding: embedding as unknown as number[],
    match_count: 5,
    filter_type: null,
  });

  if (error) {
    console.error('hybrid_search falló:', error.message);
    process.exit(1);
  }

  const rows = (data || []) as Array<{
    chunk_id: string;
    document_id: string;
    content: string;
    score: number;
    doc_type: string;
    doc_number: string;
    doc_title: string;
  }>;

  if (rows.length === 0) {
    console.log('Sin resultados.');
    return;
  }

  rows.forEach((r, i) => {
    console.log(`#${i + 1}  score=${r.score?.toFixed(3) ?? '?'}  [${r.doc_type}] ${r.doc_number}`);
    console.log(`     ${r.doc_title}`);
    console.log(`     ${r.content.slice(0, 220).replace(/\s+/g, ' ')}...`);
    console.log();
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
