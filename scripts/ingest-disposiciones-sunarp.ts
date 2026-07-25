#!/usr/bin/env tsx
/**
 * Ingesta de las "Disposiciones que regulan los Contratos Menores en la
 * SUNARP" — fuente entregada por César el 24/07/2026 con el mensaje
 * "REMITO OTRAS FUENTES PARA ENTRENAMIENTO DE PREGUNTA Y RESPUESTA".
 *
 * Se ingesta a la biblioteca normativa como type='directiva' para que
 * el chat y la voz puedan responder preguntas sobre contratos menores
 * de la SUNARP (ej: "¿con cuánta anticipación debe presentarse un
 * requerimiento?" → numeral 8.2: 10 días calendario).
 *
 * NOTA: el memorándum 00299 y el TDR de transmisión de datos NO se
 * ingieren — son documentos de un expediente específico, no normativa.
 * Su valor de entrenamiento quedó capturado en el generador (formato
 * FORMATO_DOCUMENTO_ADMINISTRATIVO + test E2E test-generator-cesar.ts).
 *
 * Uso: npx tsx scripts/ingest-disposiciones-sunarp.ts
 * Idempotente: si ya existe (por título), sale sin duplicar.
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';
import { chunkText } from '../src/lib/ingestion/chunker';

loadEnv({ path: join(process.cwd(), '.env.local') });

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PDF_PATH = join(
  process.cwd(),
  'fuente - devolución de requerimiento',
  'TEXTO FINAL DISPOSICIONES CONTRATOS MENORES - AL 07MAYO2025-MODIF OA (VF)[F] (1).pdf',
);

const DOC = {
  type: 'directiva',
  number: 'Disposiciones Contratos Menores SUNARP',
  title:
    'Disposiciones que regulan los Contratos Menores en la Superintendencia Nacional de los Registros Públicos – SUNARP',
  applicable_law: ['ley_32069'],
};

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;

async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const BATCH = 25;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
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
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { embeddings: Array<{ values: number[] }> };
    for (const e of json.embeddings) out.push(e.values);
    await new Promise((r) => setTimeout(r, 1200));
  }
  return out;
}

async function main() {
  // Idempotencia
  const { data: existing } = await supabase
    .from('normative_documents')
    .select('id')
    .eq('type', DOC.type)
    .ilike('title', '%Contratos Menores%SUNARP%')
    .maybeSingle();
  if (existing) {
    console.log('⏭️  Ya existe en BD — no se duplica. id:', (existing as { id: string }).id);
    return;
  }

  console.log('1. Extrayendo texto del PDF...');
  const buf = readFileSync(PDF_PATH);
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  const raw = String(text).trim();
  console.log(`   ${pdf.numPages} páginas, ${raw.length} chars`);

  console.log('2. Chunking...');
  const chunks = chunkText(raw);
  console.log(`   ${chunks.length} chunks`);

  console.log('3. Embeddings...');
  const embeddings = await embedBatch(chunks.map((c) => c.content));
  console.log(`   ${embeddings.length} embeddings generados`);

  console.log('4. Insertando documento...');
  const { data: doc, error: docErr } = await supabase
    .from('normative_documents')
    .insert({
      type: DOC.type,
      number: DOC.number,
      title: DOC.title,
      raw_text: raw,
      applicable_law: DOC.applicable_law,
      metadata: {
        source: 'cliente-cesar-24-07-2026',
        original_path: 'fuente - devolución de requerimiento/TEXTO FINAL DISPOSICIONES CONTRATOS MENORES',
        norma_interna_de: 'SUNARP',
        proposito: 'entrenamiento pregunta-respuesta (solicitud del cliente)',
      } as never,
    } as never)
    .select('id')
    .single();
  if (docErr || !doc) throw new Error('insert doc: ' + docErr?.message);
  const docId = (doc as { id: string }).id;
  console.log('   doc id:', docId);

  console.log('5. Insertando chunks...');
  const rows = chunks.map((c, i) => ({
    document_id: docId,
    chunk_index: i,
    content: c.content,
    embedding: JSON.stringify(embeddings[i]),
    metadata: { heading: c.heading || null } as never,
  }));
  // Insertar en lotes de 50
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase
      .from('normative_chunks')
      .insert(rows.slice(i, i + 50) as never);
    if (error) throw new Error(`insert chunks [${i}]: ${error.message}`);
  }
  console.log(`   ✅ ${rows.length} chunks insertados`);
  console.log('\nIngesta completa. El chat y la voz ya pueden citar las Disposiciones de Contratos Menores SUNARP.');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
