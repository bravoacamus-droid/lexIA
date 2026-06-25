#!/usr/bin/env tsx
/**
 * Ingesta de los documentos que el cliente compartió en la carpeta
 * "DIRECTIVAS, LINEAMIENTOS Y OTROS/" en la raíz del proyecto.
 *
 * Estructura esperada:
 *   DIRECTIVAS, LINEAMIENTOS Y OTROS/
 *     ├─ 1. DGA/
 *     │    ├─ DIRECTIVAS - DGA/{Directiva N° XXXX-YYYY-EF54.01}/*.pdf
 *     │    ├─ GUÍA DE ACTUACIONES PREPARATORIAS - DGA/*.pdf+xlsx
 *     │    └─ RESOLUCIÓN DIRECTORAL - DGA/.../...pdf
 *     ├─ 2. OECE/
 *     │    ├─ CÓDIGO DE ÉTICA - OECE/*.pdf
 *     │    ├─ DIRECTIVAS - OECE/{Directiva N° XXX-YYYY-OECE-CD}/*.pdf
 *     │    └─ LINEAMIENTOS - OECE/{Lineamiento N° XXX-YYYY-OECE-CD}/*.pdf
 *     └─ 3. PERÚ COMPRAS/
 *          ├─ DIRECTIVA - PERÚ COMPRAS/{Directiva N° XXX-YYYY}/*.pdf
 *          └─ LINEAMIENTO - PERÚ COMPRAS/{Lineamientos...}/*.pdf
 *
 * El script clasifica automáticamente cada PDF usando classifier.ts
 * (que tiene reglas para detectar directiva, lineamiento, codigo_etica,
 * resolucion, guia según patrón de URL/nombre).
 *
 * Uso:
 *   npx tsx scripts/ingest-cliente-docs.ts                 # ingestar TODO
 *   npx tsx scripts/ingest-cliente-docs.ts --dry-run       # solo simular
 *   npx tsx scripts/ingest-cliente-docs.ts --sample 5      # solo 5 docs (prueba)
 *   npx tsx scripts/ingest-cliente-docs.ts --sample 5 --dry-run
 *
 * Idempotente: si un PDF ya está en BD (mismo metadata.original_path),
 * se omite.
 */
import { config as loadEnv } from 'dotenv';
import { join, basename, dirname, relative } from 'node:path';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';

import { chunkText, type Chunk } from '../src/lib/ingestion/chunker';
import {
  classifyByPattern,
  type NormativeDocType,
} from '../src/lib/scraping/classifier';

loadEnv({ path: join(process.cwd(), '.env.local') });

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/[\r\n"']/g, '');
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/[\r\n"']/g, '');
const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim().replace(/[\r\n"']/g, '');

if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_KEY) {
  console.error('❌ Faltan credenciales en .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const sampleIdx = args.indexOf('--sample');
const SAMPLE = sampleIdx >= 0 ? parseInt(args[sampleIdx + 1] || '0', 10) : 0;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ROOT_DIR = join(process.cwd(), 'DIRECTIVAS, LINEAMIENTOS Y OTROS');
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;

interface Finding {
  path: string;
  relPath: string;
  packageFolder: string;     // ej. "Directiva N° 007-2025-OECE-CD - Registro SEACE"
  emitter: string;           // "DGA" | "OECE" | "PERU_COMPRAS"
  guessedType: NormativeDocType;
  matchedRule?: string;
}

function getEmitter(relPath: string): string {
  if (relPath.startsWith('1. DGA')) return 'DGA';
  if (relPath.startsWith('2. OECE')) return 'OECE';
  if (relPath.startsWith('3. PERÚ COMPRAS') || relPath.startsWith('3. PERU COMPRAS'))
    return 'PERU_COMPRAS';
  return 'DESCONOCIDO';
}

function defaultTypeFromPath(relPath: string): NormativeDocType {
  const lower = relPath.toLowerCase();
  if (lower.includes('codigo de etica') || lower.includes('código de ética'))
    return 'codigo_etica';
  if (lower.includes('lineamiento')) return 'lineamiento';
  if (lower.includes('guia de actuaciones') || lower.includes('guía de actuaciones'))
    return 'guia';
  if (lower.includes('resolución directoral') || lower.includes('resolucion directoral'))
    return 'resolucion';
  if (lower.includes('directiva')) return 'directiva';
  return 'directiva'; // fallback razonable para esta carpeta
}

function walkPdfs(dir: string, acc: Finding[] = [], rootDir = ROOT_DIR): Finding[] {
  if (!existsSync(dir)) return acc;
  const entries = readdirSync(dir);
  for (const e of entries) {
    const full = join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkPdfs(full, acc, rootDir);
    } else if (st.isFile() && /\.pdf$/i.test(e)) {
      const relPath = relative(rootDir, full);
      const packageFolder = basename(dirname(full));
      const emitter = getEmitter(relPath);
      const defaultType = defaultTypeFromPath(relPath);
      // Aplicar classifier (puede sobreescribir)
      const classified = classifyByPattern({
        url: relPath.replace(/\\/g, '/'),
        linkText: e,
        defaultType,
      });
      acc.push({
        path: full,
        relPath,
        packageFolder,
        emitter,
        guessedType: classified.type,
        matchedRule: classified.matchedRule,
      });
    }
  }
  return acc;
}

// Selección representativa para --sample
function pickRepresentativeSample(all: Finding[], n: number): Finding[] {
  // Agrupar por tipo + emisor para escoger uno de cada combinación
  const buckets = new Map<string, Finding[]>();
  for (const f of all) {
    const key = `${f.guessedType}__${f.emitter}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(f);
  }
  const picked: Finding[] = [];
  for (const [, group] of buckets) {
    if (picked.length >= n) break;
    // Preferir paquetes con "Directiva.pdf" o que parezcan el principal
    const principal = group.find((g) =>
      /^(directiva|lineamiento|guia|c[oó]digo)\.pdf$/i.test(basename(g.path)),
    );
    picked.push(principal || group[0]);
  }
  return picked.slice(0, n);
}

async function extractPdf(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: true });
  return { text: String(result.text).trim(), pages: pdf.numPages };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const BATCH = 25;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    let attempt = 0;
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
        for (const e of json.embeddings) out.push(e.values);
        break;
      }
      attempt += 1;
      if (attempt >= 5) {
        throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      await sleep(2000 * attempt);
    }
    await sleep(1500);
  }
  return out;
}

function inferNumber(filename: string, packageFolder: string): string {
  const cleanedFn = filename.replace(/\.pdf$/i, '').trim();

  // Para archivos con identificador propio (códigos numéricos largos como
  // 7472010-anexo-..., 6684501-resolucion-..., etc.), usarlo directo.
  const stripped = cleanedFn.replace(/^[\d.\s-]+/, '').trim();
  if (stripped.length > 25) return stripped;

  // En cualquier otro caso (genérico, ambiguo, repetible), combinar
  // packageFolder con el filename para garantizar unicidad bajo el
  // constraint UNIQUE(type, number).
  return `${packageFolder} · ${cleanedFn}`;
}

interface IngestResult {
  ok: boolean;
  finding: Finding;
  reason?: string;
  chunks?: number;
  pages?: number;
}

/**
 * Extrae el "identificador normativo" del nombre de la carpeta-paquete,
 * útil para detectar duplicados contra BD aunque vengan por otro path.
 *
 * Ejemplos:
 *   "Directiva N° 007-2025-OECE-CD - Registro..."  → "007-2025-OECE-CD"
 *   "Directiva Nº 0001-2026-EF54.01 - ..."          → "0001-2026-EF54.01"
 *   "Lineamiento N° 002-2025-OECE-CD - Conducta..."→ "002-2025-OECE-CD"
 *   "Directiva N° 0002-2025-EF54.01"                → "0002-2025-EF54.01"
 */
function extractNormativeId(packageFolder: string): string | null {
  // Patrón general: dígitos-año-emisor[-subcódigo]
  // - 007-2025-OECE-CD
  // - 0001-2026-EF54.01
  // - 000048-2025-jefatura
  const patterns = [
    /(\d{3,6}[-_]?\d{4}[-_](?:oece|osce)[-_]cd)/i,
    /(\d{3,6}[-_]?\d{4}[-_]ef[-_]?5401(?:\.\d+)?)/i,
    /(\d{3,6}[-_]?\d{4}[-_](?:peru[\s_-]?compras|peruompras))/i,
    /(\d{3,6}[-_]?\d{4}[-_]oece(?:[-_]pre)?)/i,
  ];
  const cleaned = packageFolder.normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const re of patterns) {
    const m = cleaned.match(re);
    if (m) return m[1].toLowerCase().replace(/_/g, '-');
  }
  return null;
}

async function processFinding(f: Finding): Promise<IngestResult> {
  const originalPath = f.relPath.replace(/\\/g, '/');

  // 1. Idempotencia exacta: ¿ya está esta misma ruta original ingestada?
  const { data: existing } = await supabase
    .from('normative_documents')
    .select('id')
    .filter('metadata->>original_path', 'eq', originalPath)
    .maybeSingle();
  if (existing) {
    return { ok: true, finding: f, reason: 'ya existe (original_path)' };
  }

  // 2. Deduplicación aproximada por id normativo:
  // si en BD existe ya el MISMO documento normativo (mismo número o título
  // contiene el id), lo saltamos. Esto evita duplicar la Directiva 007-2025
  // si vino por otra fuente previa.
  const normId = extractNormativeId(f.packageFolder);
  if (normId) {
    const { data: dup } = await supabase
      .from('normative_documents')
      .select('id, number, title')
      .or(`number.ilike.%${normId}%,title.ilike.%${normId}%`)
      .eq('type', f.guessedType)
      .limit(1);
    if (dup && dup.length > 0) {
      return {
        ok: true,
        finding: f,
        reason: `ya existe (norm-id: ${normId})`,
      };
    }
  }

  let buffer: Buffer;
  try {
    buffer = readFileSync(f.path);
  } catch (e) {
    return { ok: false, finding: f, reason: `read: ${(e as Error).message}` };
  }
  if (buffer.byteLength < 4096) {
    return { ok: false, finding: f, reason: `PDF muy pequeño (${buffer.byteLength}b)` };
  }

  let text: string;
  let pages: number;
  try {
    const r = await extractPdf(buffer);
    text = r.text;
    pages = r.pages;
  } catch (e) {
    return { ok: false, finding: f, reason: `extract: ${(e as Error).message.slice(0, 120)}` };
  }
  // Sanitizar nulls que rompen Postgres TEXT
  text = text.replace(/ /g, '').replace(/[￾￿]/g, '').trim();
  if (text.length < 400) {
    return {
      ok: false,
      finding: f,
      reason: `texto insuficiente (${text.length}c, posible escaneo sin OCR)`,
    };
  }

  const chunks: Chunk[] = chunkText(text);
  if (chunks.length === 0) {
    return { ok: false, finding: f, reason: 'chunker no produjo chunks' };
  }

  if (DRY_RUN) {
    return { ok: true, finding: f, reason: 'dry-run', chunks: chunks.length, pages };
  }

  // Insertar documento
  const number = inferNumber(basename(f.path), f.packageFolder);
  const { data: inserted, error: insErr } = await supabase
    .from('normative_documents')
    .insert({
      type: f.guessedType,
      number,
      title: f.packageFolder,
      raw_text: text,
      metadata: {
        pages,
        original_path: originalPath,
        emitter: f.emitter,
        package_folder: f.packageFolder,
        norm_id: extractNormativeId(f.packageFolder),
        ingested_by: 'cliente_docs_script',
        classifier_matched: f.matchedRule,
      },
    } as never)
    .select('id')
    .single();
  if (insErr || !inserted) {
    return {
      ok: false,
      finding: f,
      reason: `insert doc: ${insErr?.message?.slice(0, 160)}`,
    };
  }

  // Embeddings
  let embeddings: number[][];
  try {
    embeddings = await embedBatch(chunks.map((c) => c.content));
  } catch (e) {
    await supabase
      .from('normative_documents')
      .delete()
      .eq('id', (inserted as { id: string }).id);
    return {
      ok: false,
      finding: f,
      reason: `embed: ${(e as Error).message.slice(0, 120)}`,
    };
  }

  const rows = chunks.map((c, i) => ({
    document_id: (inserted as { id: string }).id,
    chunk_index: c.index,
    content: c.content,
    embedding: embeddings[i] as never,
    metadata: { source: number, heading: c.heading } as never,
  }));
  const { error: chunkErr } = await supabase
    .from('normative_chunks')
    .insert(rows as never);
  if (chunkErr) {
    return { ok: false, finding: f, reason: `insert chunks: ${chunkErr.message}` };
  }

  return { ok: true, finding: f, chunks: chunks.length, pages };
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Ingesta docs cliente — DIRECTIVAS, LINEAMIENTOS Y OTROS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Modo:    ${DRY_RUN ? 'DRY-RUN (no toca BD)' : 'LIVE'}`);
  console.log(`Sample:  ${SAMPLE > 0 ? `${SAMPLE} docs representativos` : 'TODOS'}`);
  console.log('');

  if (!existsSync(ROOT_DIR)) {
    console.error(`❌ No existe la carpeta: ${ROOT_DIR}`);
    process.exit(1);
  }

  console.log('🔍 Escaneando PDFs...');
  const all = walkPdfs(ROOT_DIR);
  console.log(`   Encontrados: ${all.length} PDFs`);
  console.log('');

  // Resumen de clasificación
  const byType = new Map<NormativeDocType, number>();
  const byEmitter = new Map<string, number>();
  for (const f of all) {
    byType.set(f.guessedType, (byType.get(f.guessedType) ?? 0) + 1);
    byEmitter.set(f.emitter, (byEmitter.get(f.emitter) ?? 0) + 1);
  }
  console.log('📊 Clasificación previa (sin ingesta):');
  console.log('   Por tipo:');
  for (const [t, n] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${String(t).padEnd(20)} ${n}`);
  }
  console.log('   Por emisor:');
  for (const [e, n] of byEmitter.entries()) {
    console.log(`     ${e.padEnd(20)} ${n}`);
  }
  console.log('');

  // Selección de muestra si aplica
  const work = SAMPLE > 0 ? pickRepresentativeSample(all, SAMPLE) : all;
  if (SAMPLE > 0) {
    console.log(`📌 Muestra seleccionada (${work.length} docs):`);
    for (const f of work) {
      console.log(`   • [${f.guessedType}/${f.emitter}] ${basename(f.path)}`);
      console.log(`     ${f.packageFolder}`);
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Procesando...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const results: IngestResult[] = [];
  for (let i = 0; i < work.length; i++) {
    const f = work[i];
    const label = `[${i + 1}/${work.length}] ${basename(f.path).slice(0, 60)}`;
    process.stdout.write(label.padEnd(78) + ' ');
    try {
      const r = await processFinding(f);
      results.push(r);
      if (r.ok) {
        if (r.reason === 'ya existe (original_path)') {
          console.log('SKIP (en BD)');
        } else if (r.reason === 'dry-run') {
          console.log(`OK · dry · ${r.pages}p · ${r.chunks} chunks`);
        } else {
          console.log(`OK · ${r.pages}p · ${r.chunks} chunks · ${f.guessedType}`);
        }
      } else {
        console.log(`FAIL · ${r.reason?.slice(0, 60)}`);
      }
    } catch (e) {
      console.log(`ERROR · ${(e as Error).message.slice(0, 60)}`);
      results.push({ ok: false, finding: f, reason: (e as Error).message });
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Resumen final');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const okCount = results.filter((r) => r.ok && r.reason !== 'ya existe (original_path)').length;
  const skipCount = results.filter((r) => r.reason === 'ya existe (original_path)').length;
  const failCount = results.filter((r) => !r.ok).length;
  const chunksTotal = results.filter((r) => r.ok && r.chunks).reduce((a, r) => a + (r.chunks ?? 0), 0);

  console.log(`Total procesado:     ${results.length}`);
  console.log(`  Insertados:        ${okCount}`);
  console.log(`  Saltados (ya BD):  ${skipCount}`);
  console.log(`  Fallidos:          ${failCount}`);
  console.log(`  Chunks creados:    ${chunksTotal}`);

  if (failCount > 0) {
    console.log('');
    console.log('Fallos:');
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  • ${basename(r.finding.path)}: ${r.reason}`);
    }
  }

  console.log('');
  console.log(DRY_RUN ? '✅ Dry-run completo. Para ingestar real corre sin --dry-run.' : '✅ Ingesta completa.');
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
