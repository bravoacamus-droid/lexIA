#!/usr/bin/env tsx
/**
 * Pipeline de ingesta de PDFs normativos.
 *
 * Uso:
 *   1. Coloca PDFs en data/normativa/{type}/   (type = ley|reglamento|directiva|opinion|pronunciamiento|resolucion_tce)
 *   2. Cada PDF DEBE tener un archivo hermano .json con metadata:
 *      data/normativa/opinion/023-2024-DTN.pdf
 *      data/normativa/opinion/023-2024-DTN.json
 *   3. Ejecuta: npm run ingest
 *
 * Formato del .json hermano:
 *   {
 *     "number": "Opinión N° 023-2024/DTN",
 *     "title": "Sobre subsanación de ofertas",
 *     "date": "2024-03-12",         // YYYY-MM-DD
 *     "summary": "Sumilla breve...",
 *     "source_url": "https://www.gob.pe/osce/..." // opcional
 *   }
 *
 * El script es idempotente: si el doc (type+number) ya existe, lo skip.
 */
import { config as loadEnv } from 'dotenv';
import { join, basename, dirname } from 'node:path';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local') });
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_KEY) {
  console.error('Faltan credenciales en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DATA_DIR = join(process.cwd(), 'data', 'normativa');
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;
const CHUNK_TARGET_CHARS = 1400; // ~600-700 tokens

const VALID_TYPES = [
  'ley',
  'reglamento',
  'directiva',
  'opinion',
  'pronunciamiento',
  'resolucion_tce',
] as const;

type DocType = (typeof VALID_TYPES)[number];

interface DocMetadata {
  number: string;
  title: string;
  date?: string;
  summary?: string;
  source_url?: string;
}

// ════════════════════════════════════════════════════════
// PDF extraction
// ════════════════════════════════════════════════════════
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: true });
  return String(result.text).trim();
}

// ════════════════════════════════════════════════════════
// Chunking — respeta estructura por párrafos y artículos
// ════════════════════════════════════════════════════════
function chunkText(text: string): string[] {
  // Normalizar saltos de línea
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

  // Si algún chunk individual es enorme, partirlo por oraciones
  const finalChunks: string[] = [];
  for (const c of chunks) {
    if (c.length <= CHUNK_TARGET_CHARS * 2) {
      finalChunks.push(c);
      continue;
    }
    const sentences = c.split(/(?<=[.!?])\s+/);
    let acc = '';
    for (const s of sentences) {
      if (acc.length + s.length > CHUNK_TARGET_CHARS && acc.length > 0) {
        finalChunks.push(acc.trim());
        acc = s;
      } else {
        acc = acc ? `${acc} ${s}` : s;
      }
    }
    if (acc.trim()) finalChunks.push(acc.trim());
  }

  return finalChunks;
}

// ════════════════════════════════════════════════════════
// Embeddings batch — con retry exponencial para rate limits
// ════════════════════════════════════════════════════════
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  const BATCH = 25;

  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;

    let attempts = 0;
    const maxAttempts = 6;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: slice.map((text) => ({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: EMBEDDING_DIM,
          })),
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as { embeddings: Array<{ values: number[] }> };
        for (const e of json.embeddings) results.push(e.values);
        break;
      }

      if (res.status === 429 && attempts < maxAttempts) {
        attempts += 1;
        const wait = Math.min(8_000 * 2 ** (attempts - 1), 90_000);
        process.stdout.write(
          `\n    rate limit, esperando ${Math.round(wait / 1000)}s (intento ${attempts}/${maxAttempts})... `,
        );
        await sleep(wait);
        continue;
      }

      const errText = await res.text();
      throw new Error(`Gemini batch embed ${res.status}: ${errText.slice(0, 300)}`);
    }

    if (i + BATCH < texts.length) await sleep(1500);
  }
  return results;
}

// ════════════════════════════════════════════════════════
// Procesar un PDF
// ════════════════════════════════════════════════════════
async function processPdf(type: DocType, pdfPath: string): Promise<{ ok: boolean; reason?: string; chunks?: number }> {
  const jsonPath = pdfPath.replace(/\.pdf$/i, '.json');
  if (!existsSync(jsonPath)) {
    return { ok: false, reason: `Falta metadata .json hermano (${basename(jsonPath)})` };
  }

  let meta: DocMetadata;
  try {
    meta = JSON.parse(readFileSync(jsonPath, 'utf-8')) as DocMetadata;
  } catch (err) {
    return { ok: false, reason: `JSON inválido: ${(err as Error).message}` };
  }
  if (!meta.number || !meta.title) {
    return { ok: false, reason: 'metadata sin number o title' };
  }

  // Idempotencia: si ya existe doc con mismo type+number, skip
  const { data: existing } = await supabase
    .from('normative_documents')
    .select('id')
    .eq('type', type)
    .eq('number', meta.number)
    .maybeSingle();
  if (existing) {
    return { ok: true, reason: 'ya existe', chunks: 0 };
  }

  // Extraer texto
  const buffer = readFileSync(pdfPath);
  let text: string;
  try {
    text = await extractPdfText(buffer);
  } catch (err) {
    return { ok: false, reason: `Error extrayendo PDF: ${(err as Error).message}` };
  }
  if (text.length < 200) {
    return { ok: false, reason: 'PDF con muy poco texto (¿es un escaneo sin OCR?)' };
  }

  // Insertar documento
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
      metadata: { ingested_from: basename(pdfPath) },
    })
    .select('id')
    .single();
  if (insErr || !inserted) {
    return { ok: false, reason: `Insert doc falló: ${insErr?.message}` };
  }

  // Chunkear + embed + insert
  const chunks = chunkText(text);
  const embeddings = await embedBatch(chunks);
  const rows = chunks.map((content, i) => ({
    document_id: inserted.id,
    chunk_index: i,
    content,
    embedding: embeddings[i] as never,
    metadata: { source: meta.number } as never,
  }));

  const { error: chunkErr } = await supabase.from('normative_chunks').insert(rows);
  if (chunkErr) {
    return { ok: false, reason: `Insert chunks falló: ${chunkErr.message}` };
  }

  return { ok: true, chunks: chunks.length };
}

// ════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════
async function main() {
  if (!existsSync(DATA_DIR)) {
    console.error(`No existe ${DATA_DIR}. Crea la carpeta y coloca PDFs.`);
    process.exit(1);
  }

  console.log(`Buscando PDFs en ${DATA_DIR}...\n`);

  let totalDocs = 0;
  let totalChunks = 0;
  let skipped = 0;
  let failed = 0;

  for (const type of VALID_TYPES) {
    const typeDir = join(DATA_DIR, type);
    if (!existsSync(typeDir) || !statSync(typeDir).isDirectory()) continue;

    const pdfs = readdirSync(typeDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) continue;

    console.log(`\n=== ${type} (${pdfs.length} PDFs) ===`);
    for (const pdf of pdfs) {
      const pdfPath = join(typeDir, pdf);
      process.stdout.write(`  ${pdf.padEnd(50)} `);
      const result = await processPdf(type, pdfPath);
      if (result.ok) {
        if (result.reason === 'ya existe') {
          console.log('SKIP (ya existe)');
          skipped += 1;
        } else {
          console.log(`OK (${result.chunks} chunks)`);
          totalDocs += 1;
          totalChunks += result.chunks || 0;
        }
      } else {
        console.log(`FAIL: ${result.reason}`);
        failed += 1;
      }
    }
  }

  console.log('\n────────────────────────────────────');
  console.log(`Resumen: ${totalDocs} docs nuevos · ${totalChunks} chunks · ${skipped} skip · ${failed} fail`);

  const { count: totalDocsDb } = await supabase
    .from('normative_documents')
    .select('id', { count: 'exact', head: true });
  const { count: totalChunksDb } = await supabase
    .from('normative_chunks')
    .select('id', { count: 'exact', head: true });
  console.log(`En BD: ${totalDocsDb} docs · ${totalChunksDb} chunks`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
