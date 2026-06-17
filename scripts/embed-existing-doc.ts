/**
 * Embebe los chunks de un normative_document que ya tiene raw_text persistido
 * pero quedó sin chunks (porque la ingesta original falló en el paso de embed).
 *
 * Uso: pnpm exec tsx scripts/embed-existing-doc.ts <document_id>
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { chunkText } from '../src/lib/ingestion/chunker';

loadEnv({ path: join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;
const BATCH = 5;
const SLEEP_BETWEEN_BATCHES_MS = 12_000;
const MAX_ATTEMPTS = 12;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;
  let attempts = 0;
  while (true) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: EMBEDDING_DIM,
        })),
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as { embeddings: Array<{ values: number[] }> };
      return json.embeddings.map((e) => e.values);
    }
    if (res.status === 429 && attempts < MAX_ATTEMPTS) {
      attempts += 1;
      const wait = Math.min(8000 * 2 ** Math.min(attempts - 1, 4), 90_000);
      console.log(`  ⏸  rate limit, espera ${Math.round(wait / 1000)}s (intento ${attempts}/${MAX_ATTEMPTS})`);
      await sleep(wait);
      continue;
    }
    throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

async function main() {
  const docId = process.argv[2];
  if (!docId) {
    console.error('Uso: embed-existing-doc.ts <document_id>');
    process.exit(1);
  }

  // 1. Cargar doc
  const { data: doc, error } = await supabase
    .from('normative_documents')
    .select('id, number, raw_text')
    .eq('id', docId)
    .single();
  if (error || !doc) {
    console.error('Doc no encontrado', error);
    process.exit(1);
  }
  type DocRow = { id: string; number: string; raw_text: string };
  const d = doc as DocRow;
  console.log(`📄 ${d.number}`);
  console.log(`   raw_text: ${d.raw_text.length.toLocaleString()} chars`);

  // 2. Borrar chunks existentes (por si quedaron a medias)
  await supabase.from('normative_chunks').delete().eq('document_id', d.id);

  // 3. Chunk
  const chunks = chunkText(d.raw_text);
  console.log(`🔪 ${chunks.length} chunks generados`);

  // 4. Embed en batches conservadores con persistencia parcial
  const startedAt = Date.now();
  let inserted = 0;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    process.stdout.write(`   batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(chunks.length / BATCH)}  ${slice.length} chunks…`);
    const embeddings = await embedBatch(slice.map((c) => c.content));

    const rows = slice.map((c, idx) => ({
      document_id: d.id,
      chunk_index: c.index,
      content: c.content,
      embedding: embeddings[idx] as never,
      metadata: { source: d.number, heading: c.heading } as never,
    }));
    const { error: chunkErr } = await supabase
      .from('normative_chunks')
      .insert(rows as never);
    if (chunkErr) {
      console.log(' ✗');
      console.error(`   insert chunks failed: ${chunkErr.message}`);
      process.exit(1);
    }
    inserted += slice.length;
    console.log(` ✓ (acum: ${inserted})`);

    if (i + BATCH < chunks.length) await sleep(SLEEP_BETWEEN_BATCHES_MS);
  }
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\n✅ ${inserted} chunks insertados en ${elapsed}s`);
}

main().catch((e) => {
  console.error('\n✗ Falló:', e);
  process.exit(1);
});
