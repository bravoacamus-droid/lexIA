#!/usr/bin/env tsx
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local') });
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function embedQuery(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 1024,
    }),
  });
  const j = await res.json();
  return j.embedding.values;
}

async function main() {
  const queries = [
    '¿En qué casos procede la subsanación de ofertas?',
    '¿Cuáles son los plazos para apelar al Tribunal de Contrataciones?',
    '¿Qué pasa si los adicionales de obra superan el 15%?',
  ];

  for (const q of queries) {
    console.log('\n═══════════════════════════════════════════════');
    console.log(`Q: ${q}`);
    console.log('═══════════════════════════════════════════════');
    const emb = await embedQuery(q);
    const { data, error } = await supabase.rpc('hybrid_search', {
      query_text: q,
      query_embedding: emb,
      match_count: 4,
      filter_type: null,
    });
    if (error) {
      console.error('Error:', error);
      continue;
    }
    for (const row of (data || []) as Array<{
      doc_type: string;
      doc_number: string;
      doc_title: string;
      content: string;
      similarity: number;
    }>) {
      console.log(`\n[score: ${row.similarity.toFixed(4)}] ${row.doc_type.toUpperCase()} ${row.doc_number}`);
      console.log(`   ${row.doc_title}`);
      console.log(`   ${row.content.slice(0, 180).replace(/\n/g, ' ')}...`);
    }
  }
}

main().catch(console.error);
