#!/usr/bin/env tsx
/**
 * Ingestor "lento" — para procesar PDFs cuando el TPM (tokens per minute)
 * está apretado. Procesa 1 chunk a la vez con sleep agresivo entre cada uno.
 *
 * Uso:
 *   npx tsx scripts/ingest-slow.ts data/normativa/pronunciamiento/foo.pdf
 *   npx tsx scripts/ingest-slow.ts                     # procesa TODO data/normativa/
 *
 * Diseñado para terminar PDFs que el ingest normal no pudo (rate limits).
 */
import { config as loadEnv } from 'dotenv';
import { join, basename } from 'node:path';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local') });
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DATA_DIR = join(process.cwd(), 'data', 'normativa');
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;
const CHUNK_TARGET_CHARS = 1400;

// Configuración "lenta"
const WAIT_BETWEEN_CHUNKS_MS = 3500; // 3.5s entre embeddings
const MAX_RETRY_WAIT_MS = 60_000;

const VALID_TYPES = ['ley', 'reglamento', 'directiva', 'opinion', 'pronunciamiento', 'resolucion_tce'] as const;
type DocType = (typeof VALID_TYPES)[number];

interface DocMeta {
  number: string;
  title: string;
  date?: string;
  summary?: string;
  source_url?: string;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: true });
  return String(result.text).trim();
}

function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ');
  const paragraphs = clean.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    const sep = current ? '\n\n' : '';
    const candidate = current + sep + p;
    if (candidate.length > CHUNK_TARGET_CHARS && current.length > CHUNK_TARGET_CHARS * 0.4) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function embedOne(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_KEY}`;
  let attempt = 0;
  while (true) {
    attempt += 1;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: EMBEDDING_DIM,
      }),
    });
    if (res.ok) {
      const j = (await res.json()) as { embedding: { values: number[] } };
      return j.embedding.values;
    }
    if (res.status === 429 && attempt <= 8) {
      const wait = Math.min(8_000 * 2 ** (attempt - 1), MAX_RETRY_WAIT_MS);
      process.stdout.write(`(429, esperando ${Math.round(wait / 1000)}s) `);
      await sleep(wait);
      continue;
    }
    throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

async function processPdf(pdfPath: string, type: DocType): Promise<{ ok: boolean; chunks?: number; reason?: string }> {
  const jsonPath = pdfPath.replace(/\.pdf$/i, '.json');
  if (!existsSync(jsonPath)) return { ok: false, reason: 'sin .json hermano' };

  const meta = JSON.parse(readFileSync(jsonPath, 'utf-8')) as DocMeta;
  if (!meta.number || !meta.title) return { ok: false, reason: 'metadata incompleta' };

  // Idempotencia
  const { data: existing } = await supabase
    .from('normative_documents')
    .select('id')
    .eq('type', type)
    .eq('number', meta.number)
    .maybeSingle();
  if (existing) return { ok: true, chunks: 0, reason: 'ya existe' };

  // Extraer texto
  const buffer = readFileSync(pdfPath);
  const text = await extractPdfText(buffer);
  if (text.length < 200) return { ok: false, reason: 'PDF sin texto' };

  // Insertar doc
  const { data: inserted, error: insErr } = await supabase
    .from('normative_documents')
    .insert({
      type,
      number: meta.number,
      title: meta.title,
      summary: meta.summary || null,
      date: meta.date || null,
      source_url: meta.source_url || null,
      raw_text: text,
      metadata: { ingested_from: basename(pdfPath), mode: 'slow' },
    })
    .select('id')
    .single();
  if (insErr || !inserted) return { ok: false, reason: `insert: ${insErr?.message}` };

  // Chunkear
  const chunks = chunkText(text);
  console.log(`\n  ${chunks.length} chunks a embebir (1 cada ${WAIT_BETWEEN_CHUNKS_MS / 1000}s, ~${Math.round((chunks.length * WAIT_BETWEEN_CHUNKS_MS) / 60000)} min)...`);

  // Embed uno por uno
  const embeddings: number[][] = [];
  try {
    for (let i = 0; i < chunks.length; i++) {
      process.stdout.write(`  [${i + 1}/${chunks.length}] `);
      const start = Date.now();
      const emb = await embedOne(chunks[i]);
      embeddings.push(emb);
      const elapsed = Date.now() - start;
      console.log(`OK (${elapsed}ms)`);
      if (i < chunks.length - 1) {
        await sleep(WAIT_BETWEEN_CHUNKS_MS);
      }
    }
  } catch (err) {
    await supabase.from('normative_documents').delete().eq('id', inserted.id);
    return { ok: false, reason: `embed agotado: ${(err as Error).message.slice(0, 120)}` };
  }

  // Insertar chunks
  const rows = chunks.map((content, i) => ({
    document_id: inserted.id,
    chunk_index: i,
    content,
    embedding: embeddings[i] as never,
    metadata: { source: meta.number } as never,
  }));
  const { error: chunkErr } = await supabase.from('normative_chunks').insert(rows);
  if (chunkErr) return { ok: false, reason: `insert chunks: ${chunkErr.message}` };

  return { ok: true, chunks: chunks.length };
}

async function main() {
  const arg = process.argv[2];
  const targets: Array<{ path: string; type: DocType }> = [];

  if (arg && existsSync(arg)) {
    // Detectar tipo por carpeta padre
    const parent = arg.replace(/\\/g, '/').split('/').slice(-2, -1)[0] as DocType;
    if (!VALID_TYPES.includes(parent)) {
      console.error(`Tipo desconocido: ${parent}`);
      process.exit(1);
    }
    targets.push({ path: arg, type: parent });
  } else {
    // Recorrer toda data/normativa
    for (const type of VALID_TYPES) {
      const dir = join(DATA_DIR, type);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      for (const f of readdirSync(dir)) {
        if (f.toLowerCase().endsWith('.pdf')) {
          targets.push({ path: join(dir, f), type });
        }
      }
    }
  }

  console.log(`Procesando ${targets.length} PDFs en modo lento (~${WAIT_BETWEEN_CHUNKS_MS / 1000}s/chunk)\n`);

  let done = 0;
  let skipped = 0;
  let failed = 0;
  let totalChunks = 0;

  for (const { path, type } of targets) {
    process.stdout.write(`\n▶ ${type} :: ${basename(path)}`);
    const result = await processPdf(path, type);
    if (result.ok) {
      if (result.reason === 'ya existe') {
        console.log('  [SKIP ya existe]');
        skipped += 1;
      } else {
        console.log(`  [OK ${result.chunks} chunks]`);
        done += 1;
        totalChunks += result.chunks || 0;
      }
    } else {
      console.log(`  [FAIL ${result.reason}]`);
      failed += 1;
    }
  }

  console.log('\n────────────────────────────────────');
  console.log(`Resumen: ${done} nuevos · ${totalChunks} chunks · ${skipped} skip · ${failed} fail`);

  const { count: docs } = await supabase
    .from('normative_documents')
    .select('id', { count: 'exact', head: true });
  const { count: chunks } = await supabase
    .from('normative_chunks')
    .select('id', { count: 'exact', head: true });
  console.log(`En BD: ${docs} docs · ${chunks} chunks`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
