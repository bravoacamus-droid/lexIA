#!/usr/bin/env tsx
/**
 * RE-TROCEADO de documentos ya ingeridos con el chunker corregido.
 *
 * Contexto (01/08/2026): el separador de oraciones trataba "364.6. "
 * como fin de oración porque termina en punto y espacio, así que el
 * corte caía JUSTO DESPUÉS del numeral y su contenido (tablas de
 * multas, plazos, requisitos) quedaba en el fragmento siguiente. Medido
 * sobre el texto íntegro de la Ley 32069 + Reglamento: 147 de 492
 * fragmentos (29.9%) terminaban en un numeral huérfano. Con el chunker
 * corregido: 2 de 517 (0.4%).
 *
 * Seguridad verificada antes de escribir esto:
 *   - No hay claves foráneas hacia normative_chunks.
 *   - user_annotations referencia document_id + offsets del texto, no
 *     fragmentos: los subrayados del usuario NO se pierden.
 *   - chat_messages.sources guarda el snippet denormalizado y la UI usa
 *     chunk_id solo como clave de React: las citas de conversaciones
 *     antiguas se siguen viendo.
 *
 * Orden de operaciones por documento: se generan y embeben TODOS los
 * fragmentos nuevos ANTES de borrar los viejos, para que la ventana en
 * que el documento no es consultable dure segundos, no minutos.
 *
 * Uso:
 *   npx tsx scripts/rechunk-documentos.ts              (simulación)
 *   npx tsx scripts/rechunk-documentos.ts --apply      (ejecuta)
 *   npx tsx scripts/rechunk-documentos.ts --apply --id=<uuid>
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { chunkText } from '../src/lib/ingestion/chunker';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;

const APPLY = process.argv.includes('--apply');
const ONLY_ID = process.argv.find((a) => a.startsWith('--id='))?.slice(5);
/** Umbral: solo se re-trocea si el documento mejora al menos esto. */
const MIN_MEJORA = 5;

const NUMERAL_HUERFANO = /\b\d{1,3}(?:\.\d{1,2}){1,3}\.?\s*$/;

interface Doc {
  id: string;
  type: string;
  number: string | null;
  title: string;
  raw_text: string | null;
}

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
    process.stdout.write(`\r    embeddings ${Math.min(i + BATCH, texts.length)}/${texts.length}`);
    await new Promise((r) => setTimeout(r, 1200));
  }
  process.stdout.write('\n');
  return out;
}

async function main() {
  const { data, error } = await supabase
    .from('normative_documents')
    .select('id, type, number, title, raw_text');
  if (error) throw new Error(error.message);
  let docs = (data || []) as Doc[];
  if (ONLY_ID) docs = docs.filter((d) => d.id === ONLY_ID);

  const candidatos: Array<{
    doc: Doc;
    actuales: number;
    huerfanosActuales: number;
    nuevos: number;
    huerfanosNuevos: number;
  }> = [];

  console.log(`Analizando ${docs.length} documentos...\n`);
  for (const d of docs) {
    if (!d.raw_text || d.raw_text.length < 2000) continue;

    const { data: existentes } = await supabase
      .from('normative_chunks')
      .select('content')
      .eq('document_id', d.id);
    const actuales = (existentes || []) as Array<{ content: string }>;
    if (actuales.length === 0) continue;

    const huerfanosActuales = actuales.filter((c) =>
      NUMERAL_HUERFANO.test(c.content),
    ).length;
    const pctActual = (huerfanosActuales / actuales.length) * 100;
    if (pctActual < MIN_MEJORA) continue;

    const nuevos = chunkText(d.raw_text);
    const huerfanosNuevos = nuevos.filter((c) => NUMERAL_HUERFANO.test(c.content)).length;
    const pctNuevo = (huerfanosNuevos / nuevos.length) * 100;
    if (pctActual - pctNuevo < MIN_MEJORA) continue;

    candidatos.push({
      doc: d,
      actuales: actuales.length,
      huerfanosActuales,
      nuevos: nuevos.length,
      huerfanosNuevos,
    });
    console.log(`■ ${d.type} — ${(d.number || d.title).slice(0, 55)}`);
    console.log(
      `   ahora: ${actuales.length} fragmentos, ${huerfanosActuales} huérfanos (${pctActual.toFixed(1)}%)`,
    );
    console.log(
      `   nuevo: ${nuevos.length} fragmentos, ${huerfanosNuevos} huérfanos (${pctNuevo.toFixed(1)}%)`,
    );
  }

  const totalNuevos = candidatos.reduce((a, c) => a + c.nuevos, 0);
  console.log(`\nDocumentos a re-trocear: ${candidatos.length}`);
  console.log(`Fragmentos a re-embeber: ${totalNuevos}`);
  console.log(
    `Huérfanos que se eliminan: ${candidatos.reduce((a, c) => a + c.huerfanosActuales - c.huerfanosNuevos, 0)}`,
  );

  if (!APPLY) {
    console.log('\n(simulación — ejecuta con --apply para aplicar)');
    return;
  }

  for (const c of candidatos) {
    console.log(`\n▶ ${(c.doc.number || c.doc.title).slice(0, 55)}`);
    const nuevos = chunkText(c.doc.raw_text as string);

    // 1. Embeber TODO antes de tocar la base.
    const embeddings = await embedBatch(nuevos.map((n) => n.content));
    if (embeddings.length !== nuevos.length) {
      throw new Error(`embeddings incompletos: ${embeddings.length}/${nuevos.length}`);
    }

    // 2. Reemplazo: borrar los viejos e insertar los nuevos.
    const { error: delErr } = await supabase
      .from('normative_chunks')
      .delete()
      .eq('document_id', c.doc.id);
    if (delErr) throw new Error(`borrado: ${delErr.message}`);

    const filas = nuevos.map((n, i) => ({
      document_id: c.doc.id,
      chunk_index: i,
      content: n.content,
      embedding: JSON.stringify(embeddings[i]),
      metadata: { heading: n.heading || null } as never,
    }));
    for (let i = 0; i < filas.length; i += 50) {
      const { error: insErr } = await supabase
        .from('normative_chunks')
        .insert(filas.slice(i, i + 50) as never);
      if (insErr) throw new Error(`inserción [${i}]: ${insErr.message}`);
    }
    console.log(`   ✅ ${c.actuales} → ${filas.length} fragmentos`);
  }

  console.log('\n✅ Re-troceado completo.');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
