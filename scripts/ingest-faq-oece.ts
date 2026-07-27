#!/usr/bin/env tsx
/**
 * Ingesta de "Preguntas Frecuentes sobre la Normativa de Contratación
 * Pública" — documento oficial del OECE entregado por César el
 * 26/07/2026 para entrenamiento de pregunta-respuesta del chat.
 *
 * Estrategia de chunking: 1 chunk = 1 pregunta + su respuesta completa
 * (barrido secuencial por numeración N.N. para evitar falsos positivos
 * con citas a numerales de artículos dentro de las respuestas). Esto
 * alinea los embeddings con la forma real en que preguntan los
 * usuarios del chat.
 *
 * Uso: npx tsx scripts/ingest-faq-oece.ts
 * Idempotente: si ya existe (por título), sale sin duplicar.
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';

loadEnv({ path: join(process.cwd(), '.env.local') });

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PDF_PATH = join(process.cwd(), 'Preguntas y respuestas planteadas por el OECE.pdf');

const DOC = {
  type: 'guia',
  number: 'FAQ Normativa OECE',
  title:
    'Preguntas Frecuentes sobre la Normativa de Contratación Pública (OECE) — Ley N° 32069 y su Reglamento',
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

/** Divide el texto en bloques pregunta+respuesta mediante barrido
 *  secuencial: tras encontrar la pregunta N.M, busca N.(M+1) y si no
 *  existe pasa a (N+1).1. Evita confundir citas a numerales de
 *  artículos (ej. "numeral 3.1 del artículo 3") con encabezados. */
function splitByQuestion(raw: string): Array<{ id: string; content: string }> {
  const marks: Array<{ id: string; pos: number }> = [];
  let section = 1;
  let q = 1;
  let cursor = 0;
  let missStreak = 0;
  while (section <= 12) {
    const id = `${section}.${q}.`;
    const pos = raw.indexOf(` ${id} `, cursor);
    if (pos >= 0) {
      marks.push({ id, pos: pos + 1 });
      cursor = pos + id.length;
      q += 1;
      missStreak = 0;
    } else {
      // no hay más preguntas en esta sección → probar la siguiente
      if (q === 1) missStreak += 1;
      if (missStreak >= 2) break; // dos secciones seguidas vacías: fin
      section += 1;
      q = 1;
    }
  }
  const blocks: Array<{ id: string; content: string }> = [];
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].pos : raw.length;
    let content = raw.slice(marks[i].pos, end).trim();
    // Limpiar encabezados de página repetidos
    content = content
      .replace(/Preguntas frecuentes sobre la Normativa de Contratación Pública\s*\d*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    blocks.push({ id: marks[i].id, content });
  }
  return blocks;
}

async function main() {
  const { data: existing } = await supabase
    .from('normative_documents')
    .select('id')
    .eq('type', DOC.type)
    .ilike('title', '%Preguntas Frecuentes sobre la Normativa%')
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

  console.log('2. Partiendo por pregunta (barrido secuencial)...');
  const blocks = splitByQuestion(raw);
  console.log(`   ${blocks.length} preguntas detectadas:`);
  blocks.forEach((b) =>
    console.log(`   ${b.id} (${b.content.length} chars) ${b.content.slice(0, 70)}...`),
  );
  if (blocks.length < 30) throw new Error('Se esperaban ~40 preguntas — revisar el split');
  const tooLong = blocks.filter((b) => b.content.length > 4000);
  if (tooLong.length) {
    console.log(`   ⚠️ ${tooLong.length} bloques >4000 chars (se ingieren igual):`, tooLong.map((b) => b.id).join(', '));
  }

  const chunks = blocks.map((b) => ({
    heading: `Pregunta ${b.id.replace(/\.$/, '')} — FAQ OECE`,
    content: `[FAQ OECE — Pregunta ${b.id.replace(/\.$/, '')}] ${b.content}`,
  }));

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
        source: 'cliente-cesar-26-07-2026',
        original_path: 'Preguntas y respuestas planteadas por el OECE.pdf',
        emisor: 'OECE',
        proposito: 'entrenamiento pregunta-respuesta (solicitud del cliente)',
        chunking: '1 chunk = 1 pregunta+respuesta',
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
    metadata: { heading: c.heading } as never,
  }));
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase
      .from('normative_chunks')
      .insert(rows.slice(i, i + 50) as never);
    if (error) throw new Error(`insert chunks [${i}]: ${error.message}`);
  }
  console.log(`   ✅ ${rows.length} chunks insertados`);
  console.log('\nIngesta completa. El chat ya puede citar las Preguntas Frecuentes del OECE.');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
