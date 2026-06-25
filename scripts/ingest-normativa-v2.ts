#!/usr/bin/env tsx
/**
 * Ingesta v2 — re-entrenamiento de la base normativa desde cero.
 *
 * Diferencias respecto a scripts/ingest.ts:
 *   - NO es idempotente: borra todo y reingiere (etapa 0 ya hizo el reset, esto
 *     garantiza un re-entrenamiento limpio desde data/normativa/).
 *   - Usa el chunker compartido src/lib/ingestion/chunker.ts (anclas estructurales
 *     de la normativa + overlap controlado).
 *   - Persiste el heading detectado del chunk como metadata para enriquecer
 *     la búsqueda híbrida (FTS gana señal extra).
 *   - Reporta latencias y errores estructurados al final.
 *
 * Fuente exclusiva: data/normativa/{directiva,opinion,pronunciamiento,resolucion_tce}
 * Modelo embeddings: gemini-embedding-001 a 1024 dim.
 *
 * Uso:
 *   npx tsx scripts/ingest-normativa-v2.ts
 *   npx tsx scripts/ingest-normativa-v2.ts --dry-run   (solo lee y chunkea, no embebe ni inserta)
 *   npx tsx scripts/ingest-normativa-v2.ts --keep      (no borra lo existente; solo agrega)
 */
import { config as loadEnv } from 'dotenv';
import { join, basename } from 'node:path';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';

import { chunkText, type Chunk } from '../src/lib/ingestion/chunker';

loadEnv({ path: join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_KEY) {
  console.error('Faltan credenciales en .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const KEEP_EXISTING = args.includes('--keep');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DATA_DIR = join(process.cwd(), 'data', 'normativa');
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;

const VALID_TYPES = [
  'ley',
  'reglamento',
  'directiva',
  'opinion',
  'pronunciamiento',
  'resolucion_tce',
  // Tipos agregados en migración 0019 — antes todo lo no-normativo
  // del OECE caía en 'directiva' (chat citaba mal). Ahora separado:
  'manual_seace', // manuales operativos del SEACE (NO vinculantes)
  'tupa',         // Texto Único de Procedimientos Administrativos
  'comunicado',   // comunicados oficiales OECE/PERUCOMPRAS
  'guia',         // guías, tableros, FAQ (orientativos)
  // Tipos agregados en migración 0020 — DGA / OECE / Perú Compras:
  'lineamiento',  // orientativo, emite OECE/Perú Compras
  'codigo_etica', // regla de conducta, fuerza similar a directiva
  'resolucion',   // resoluciones directorales/jefaturales
] as const;

type DocType = (typeof VALID_TYPES)[number];

interface DocMetadata {
  number: string;
  title: string;
  date?: string;
  summary?: string;
  source_url?: string;
}

interface ProcessResult {
  type: DocType;
  filename: string;
  ok: boolean;
  reason?: string;
  chunks?: number;
  pages?: number;
  ms?: number;
}

// ════════════════════════════════════════════════════════
// PDF text extraction
// ════════════════════════════════════════════════════════
async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const data = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: true });
  return { text: String(result.text).trim(), pages: pdf.numPages };
}

// ════════════════════════════════════════════════════════
// Embeddings batch con retry exponencial
// ════════════════════════════════════════════════════════
function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  // BATCH agresivo: con paid tier Gemini permite hasta 30,000 req/min,
  // así que 25/batch × 2s = ~750 req/min, muy seguro y ~25× más rápido
  // que el modo conservador. Cambiar a 5 + sleep 12s si vuelve a free tier.
  const BATCH = 25;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;

  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    let attempts = 0;
    const maxAttempts = 10;
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
        const wait = Math.min(8000 * 2 ** (attempts - 1), 90_000);
        process.stdout.write(
          `\n    rate limit, esperando ${Math.round(wait / 1000)}s (intento ${attempts}/${maxAttempts})... `,
        );
        await sleep(wait);
        continue;
      }
      const errText = await res.text();
      throw new Error(`Gemini batch embed ${res.status}: ${errText.slice(0, 300)}`);
    }
    if (i + BATCH < texts.length) await sleep(2000);
  }
  return results;
}

// ════════════════════════════════════════════════════════
// Procesar un PDF
// ════════════════════════════════════════════════════════
async function processPdf(type: DocType, pdfPath: string): Promise<ProcessResult> {
  const filename = basename(pdfPath);
  const startedAt = Date.now();

  const jsonPath = pdfPath.replace(/\.pdf$/i, '.json');
  if (!existsSync(jsonPath)) {
    return { type, filename, ok: false, reason: 'Falta JSON hermano' };
  }

  let meta: DocMetadata;
  try {
    meta = JSON.parse(readFileSync(jsonPath, 'utf-8')) as DocMetadata;
  } catch (err) {
    return { type, filename, ok: false, reason: `JSON inválido: ${(err as Error).message}` };
  }

  // Algunos JSONs vienen sin number/title — los rellenamos con el filename.
  if (!meta.number) meta.number = basename(pdfPath, '.pdf');
  if (!meta.title) meta.title = filename;

  // Idempotencia con --keep: si ya existe doc con mismo (type, number), skip.
  if (KEEP_EXISTING) {
    const { data: existing } = await supabase
      .from('normative_documents')
      .select('id')
      .eq('type', type)
      .eq('number', meta.number)
      .maybeSingle();
    if (existing) {
      return {
        type,
        filename,
        ok: true,
        reason: 'ya existe',
        chunks: 0,
        ms: Date.now() - startedAt,
      };
    }
  }

  const buffer = readFileSync(pdfPath);
  let text: string;
  let pages: number;
  try {
    const r = await extractPdfText(buffer);
    text = r.text;
    pages = r.pages;
  } catch (err) {
    return { type, filename, ok: false, reason: `extract PDF: ${(err as Error).message}` };
  }
  if (text.length < 200) {
    return {
      type,
      filename,
      ok: false,
      reason: `PDF con muy poco texto (${text.length} chars) — ¿escaneo sin OCR?`,
    };
  }

  // Sanitizar caracteres NUL ( ) y otros escapes Unicode que Postgres
  // rechaza en columnas TEXT. Algunos PDFs los introducen como ruido.
  text = text.replace(/ /g, '').replace(/[￾￿]/g, '');

  const chunks: Chunk[] = chunkText(text);
  if (chunks.length === 0) {
    return { type, filename, ok: false, reason: 'chunker no produjo chunks' };
  }

  if (DRY_RUN) {
    return {
      type,
      filename,
      ok: true,
      chunks: chunks.length,
      pages,
      ms: Date.now() - startedAt,
    };
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
      metadata: {
        ingested_from: filename,
        pages,
      },
    })
    .select('id')
    .single();
  if (insErr || !inserted) {
    return { type, filename, ok: false, reason: `insert doc: ${insErr?.message}` };
  }

  // Embed
  let embeddings: number[][];
  try {
    embeddings = await embedBatch(chunks.map((c) => c.content));
  } catch (err) {
    await supabase.from('normative_documents').delete().eq('id', inserted.id);
    return { type, filename, ok: false, reason: `embed: ${(err as Error).message.slice(0, 160)}` };
  }

  const rows = chunks.map((c, i) => ({
    document_id: inserted.id,
    chunk_index: c.index,
    content: c.content,
    embedding: embeddings[i] as never,
    metadata: {
      source: meta.number,
      heading: c.heading,
    } as never,
  }));

  const { error: chunkErr } = await supabase.from('normative_chunks').insert(rows);
  if (chunkErr) {
    return { type, filename, ok: false, reason: `insert chunks: ${chunkErr.message}` };
  }

  return {
    type,
    filename,
    ok: true,
    chunks: chunks.length,
    pages,
    ms: Date.now() - startedAt,
  };
}

// ════════════════════════════════════════════════════════
// Reset previo (--keep para omitirlo)
// ════════════════════════════════════════════════════════
async function resetCorpus() {
  if (KEEP_EXISTING || DRY_RUN) return;
  console.log('Borrando corpus normativo previo (chunks + docs)...');
  await supabase
    .from('normative_chunks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase
    .from('normative_documents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
}

// ════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════
async function main() {
  if (!existsSync(DATA_DIR)) {
    console.error(`No existe ${DATA_DIR}`);
    process.exit(1);
  }
  console.log('═══════════════════════════════════════════════');
  console.log('  LexIA v2 · Ingesta de normativa');
  if (DRY_RUN) console.log('  MODO: --dry-run (no inserta ni embebe)');
  if (KEEP_EXISTING) console.log('  MODO: --keep (no borra lo existente)');
  console.log('═══════════════════════════════════════════════\n');

  await resetCorpus();

  const results: ProcessResult[] = [];
  for (const type of VALID_TYPES) {
    const typeDir = join(DATA_DIR, type);
    if (!existsSync(typeDir) || !statSync(typeDir).isDirectory()) continue;

    const pdfs = readdirSync(typeDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) continue;

    console.log(`\n=== ${type} (${pdfs.length} PDFs) ===`);
    for (const pdf of pdfs) {
      process.stdout.write(`  ${pdf.padEnd(58)} `);
      const r = await processPdf(type, join(typeDir, pdf));
      results.push(r);
      if (r.ok) {
        if (r.reason === 'ya existe') {
          console.log('SKIP (ya en BD)');
        } else {
          const ms = r.ms ? `${r.ms}ms` : '';
          console.log(`OK · ${r.pages}p · ${r.chunks} chunks · ${ms}`);
        }
      } else {
        console.log(`FAIL · ${r.reason}`);
      }
    }
  }

  // Resumen
  console.log('\n────────────────────────────────────');
  const byType = new Map<DocType, { ok: number; fail: number; chunks: number }>();
  for (const r of results) {
    const cur = byType.get(r.type) || { ok: 0, fail: 0, chunks: 0 };
    if (r.ok) {
      cur.ok += 1;
      cur.chunks += r.chunks || 0;
    } else {
      cur.fail += 1;
    }
    byType.set(r.type, cur);
  }
  for (const [type, st] of byType) {
    console.log(`  ${type.padEnd(20)} ${st.ok}/${st.ok + st.fail} OK · ${st.chunks} chunks`);
  }

  if (!DRY_RUN) {
    const { count: docs } = await supabase
      .from('normative_documents')
      .select('id', { count: 'exact', head: true });
    const { count: chunks } = await supabase
      .from('normative_chunks')
      .select('id', { count: 'exact', head: true });
    console.log(`\nEn BD: ${docs} docs · ${chunks} chunks`);
  }
}

main().catch((err) => {
  console.error('\n✗ Falló:', err);
  process.exit(1);
});
