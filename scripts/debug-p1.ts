import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { embedOne } from '../src/lib/ai/embeddings';
config({ path: '.env.local' });

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const queries = [
    'Cuáles son los plazos exactos para la difusión del requerimiento',
    'plazo difusión del requerimiento',
    'Art 51.2 plazos consultas técnicas',
    'cinco días hábiles difusión requerimiento',
  ];

  const CHUNK_113_ID = '$CHUNK113ID';

  // Get doc id for Ley 32069
  const { data: doc } = await admin
    .from('normative_documents')
    .select('id')
    .ilike('number', '%32069%DS%')
    .single();
  const docId = (doc as { id: string }).id;

  // Get chunk 113 id
  const { data: c113 } = await admin
    .from('normative_chunks')
    .select('id')
    .eq('document_id', docId)
    .eq('chunk_index', 113)
    .single();
  const chunk113Id = (c113 as { id: string }).id;

  console.log(`\nChunk 113 UUID: ${chunk113Id}\n`);

  for (const q of queries) {
    console.log(`\n══════════════════════════════════════════════════`);
    console.log(`Query: "${q}"`);
    console.log(`══════════════════════════════════════════════════`);
    const emb = await embedOne(q, 'RETRIEVAL_QUERY');

    for (const matchCount of [10, 15, 20]) {
      const { data: chunks } = await (admin as any).rpc('hybrid_search', {
        query_text: q,
        query_embedding: emb,
        match_count: matchCount,
        filter_type: null,
        filter_law: null,
      });
      const rows = (chunks || []) as Array<{ chunk_id: string; similarity: number; doc_number: string | null; doc_type: string; content: string }>;
      const pos113 = rows.findIndex((r) => r.chunk_id === chunk113Id);
      console.log(`\n  match_count=${matchCount}: chunk 113 pos=${pos113 >= 0 ? pos113 + 1 : 'NO ESTÁ'} / ${rows.length}`);
      if (pos113 < 0) {
        console.log(`    Top 5 devueltos:`);
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          console.log(`      [${i + 1}] ${rows[i].doc_type.padEnd(15)} · ${(rows[i].doc_number || '').slice(0, 35).padEnd(35)} · sim=${rows[i].similarity.toFixed(3)}`);
        }
      }
    }
  }
}

main().catch(console.error);
