#!/usr/bin/env tsx
/**
 * Ingesta de normas sueltas a partir de su URL oficial.
 *
 * Los documentos que entregó el cliente llegaron como PDF en carpetas,
 * sin enlace de origen. Cuando César detecta que falta una norma, la
 * señala con su URL de gob.pe —lo hizo el 23/09/2026 con la Directiva
 * N° 0007-2025-EF/54.01 y con una modificatoria de los lineamientos de
 * Perú Compras—. Este script cierra ese hueco: descarga el PDF, extrae
 * el texto, lo trocea, lo vectoriza y lo guarda **con su `source_url`**,
 * que es lo que hace aparecer el botón «Fuente» en el visor.
 *
 * El manifiesto va en `scripts/normas-pendientes.json`, para que añadir
 * una norma sea editar datos y no código.
 *
 * Uso:
 *   npx tsx scripts/ingest-desde-url.ts --dry-run   # solo comprobar
 *   npx tsx scripts/ingest-desde-url.ts             # ingestar
 *
 * Idempotente: si ya hay un documento con esa `source_url`, se omite.
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';

import { chunkText, type Chunk } from '../src/lib/ingestion/chunker';
import type { NormativeDocType } from '../src/lib/scraping/classifier';

loadEnv({ path: join(process.cwd(), '.env.local') });

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/[\r\n"']/g, '');
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/[\r\n"']/g, '');
const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim().replace(/[\r\n"']/g, '');

if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_KEY) {
  console.error('Faltan credenciales en .env.local');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;   // el que espera la columna `embedding` de normative_chunks
const UA = 'Mozilla/5.0 (compatible; A-LexIA-Bot/1.0; +https://lexia.pe/bot)';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

/** Una norma pendiente de ingestar. */
interface NormaPendiente {
  /** El PDF en gob.pe. */
  url: string;
  /** La página oficial de la norma; si falta, se usa `url`. */
  fuente?: string;
  tipo: NormativeDocType;
  /** El acto al que pertenece: agrupa las piezas en la biblioteca. */
  acto: string;
  /** Qué pieza es dentro del acto («Texto de la norma», «Modificatoria…»). */
  pieza: string;
  entidad: string;
  /** AAAA-MM-DD. */
  fecha?: string;
  nota?: string;
}

function dormir(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function extraerPdf(buffer: Buffer): Promise<{ texto: string; paginas: number }> {
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(data);
  const r = await extractText(pdf, { mergePages: true });
  return { texto: String(r.text).trim(), paginas: pdf.numPages };
}

async function vectorizar(textos: string[]): Promise<number[][]> {
  const salida: number[][] = [];
  const LOTE = 25;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;
  for (let i = 0; i < textos.length; i += LOTE) {
    const trozo = textos.slice(i, i + LOTE);
    let intento = 0;
    for (;;) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: trozo.map((text) => ({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: EMBEDDING_DIM,
          })),
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { embeddings: Array<{ values: number[] }> };
        for (const e of json.embeddings) salida.push(e.values);
        break;
      }
      intento += 1;
      if (intento >= 5) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
      await dormir(2000 * intento);
    }
    await dormir(1500);
  }
  return salida;
}

async function ingestar(n: NormaPendiente): Promise<string> {
  const fuente = n.fuente || n.url;

  const { data: ya } = await supabase
    .from('normative_documents')
    .select('id')
    .eq('source_url', fuente)
    .eq('number', n.pieza)
    .maybeSingle();
  if (ya) return 'ya estaba';

  const res = await fetch(n.url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return `no se pudo descargar (HTTP ${res.status})`;
  const buffer = Buffer.from(await res.arrayBuffer());

  const { texto: crudo, paginas } = await extraerPdf(buffer);
  // Los nulos y los reemplazos rompen el TEXT de Postgres.
  const texto = crudo.replace(/\u0000/g, '').replace(/[￾￿]/g, '').trim();
  if (texto.length < 400) return `texto insuficiente (${texto.length} c · ¿escaneo sin OCR?)`;

  const trozos: Chunk[] = chunkText(texto);
  if (trozos.length === 0) return 'el troceador no produjo nada';

  if (DRY_RUN) return `simulación · ${paginas} pág · ${trozos.length} trozos`;

  const { data: doc, error: errDoc } = await supabase
    .from('normative_documents')
    .insert({
      type: n.tipo,
      number: n.pieza,
      title: n.acto,
      date: n.fecha ?? null,
      source_url: fuente,
      raw_text: texto,
      metadata: {
        pages: paginas,
        emitter: n.entidad,
        entidad: n.entidad,
        package_folder: n.acto,
        pdf_url: n.url,
        ingested_by: 'ingest_desde_url',
        nota: n.nota ?? null,
      },
    } as never)
    .select('id')
    .single();
  if (errDoc || !doc) return `no se pudo guardar: ${errDoc?.message?.slice(0, 140)}`;

  let vectores: number[][];
  try {
    vectores = await vectorizar(trozos.map((t) => t.content));
  } catch (e) {
    await supabase.from('normative_documents').delete().eq('id', (doc as { id: string }).id);
    return `no se pudo vectorizar: ${(e as Error).message.slice(0, 140)}`;
  }

  const filas = trozos.map((t, i) => ({
    document_id: (doc as { id: string }).id,
    chunk_index: t.index,
    content: t.content,
    embedding: vectores[i] as never,
    metadata: { source: n.pieza, heading: t.heading } as never,
  }));
  const { error: errTrozos } = await supabase
    .from('normative_chunks')
    .insert(filas as never);
  if (errTrozos) return `no se pudieron guardar los trozos: ${errTrozos.message.slice(0, 140)}`;

  return `ingestada · ${paginas} pág · ${trozos.length} trozos`;
}

async function main() {
  const manifiesto = JSON.parse(
    readFileSync(join(process.cwd(), 'scripts', 'normas-pendientes.json'), 'utf8'),
  ) as NormaPendiente[];

  console.log(`${manifiesto.length} norma(s) en el manifiesto${DRY_RUN ? ' · simulación' : ''}\n`);
  for (const n of manifiesto) {
    process.stdout.write(`· ${n.acto.slice(0, 52).padEnd(52)} ${n.pieza.slice(0, 28).padEnd(28)} `);
    try {
      console.log(await ingestar(n));
    } catch (e) {
      console.log(`FALLÓ: ${(e as Error).message.slice(0, 140)}`);
    }
  }
}

void main();
