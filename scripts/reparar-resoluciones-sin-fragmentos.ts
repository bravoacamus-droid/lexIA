#!/usr/bin/env tsx
/**
 * REPARA las resoluciones que quedaron en la biblioteca SIN FRAGMENTOS.
 *
 * ORIGEN: al ingerir, primero se inserta el documento y después sus
 * fragmentos por lotes. Si un lote se pasaba del statement_timeout —cosa
 * frecuente porque las escrituras compiten con el índice vectorial— la
 * excepción abortaba el documento a medio hacer. Quedaba visible en la
 * lista y en los contadores, pero INVISIBLE para el chat, que solo busca
 * sobre fragmentos. Y como el archivo de estado ya lo daba por
 * procesado, nadie lo iba a reintentar.
 *
 * La ingesta ya no deja documentos así: reintenta los lotes y, si aun
 * así fallan, borra el documento para que quede reintentable. Este
 * script arregla los que quedaron de antes.
 *
 * CÓMO: el texto está en raw_text, así que NO hay que volver a descargar
 * de gob.pe. Solo se vuelve a trocear y vectorizar.
 *
 * Uso:
 *   npx tsx scripts/reparar-resoluciones-sin-fragmentos.ts          (simula)
 *   npx tsx scripts/reparar-resoluciones-sin-fragmentos.ts --apply
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;
  for (let i = 0; i < texts.length; i += 25) {
    const slice = texts.slice(i, i + 25);
    let intento = 0;
    for (;;) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: slice.map((text) => ({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text: text.slice(0, 8000) }] },
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
      if (++intento > 4) throw new Error(`Gemini ${res.status} tras 4 intentos`);
      await sleep(3000 * intento);
    }
    await sleep(1100);
  }
  return out;
}

interface Doc { id: string; number: string; raw_text: string | null }

async function main() {
  console.log(APPLY ? 'MODO APLICAR\n' : 'SIMULACIÓN — no escribe nada\n');

  // Documentos sin ningún fragmento. Se pagina y se cruza en memoria
  // porque PostgREST no ofrece un "not exists" directo.
  const conFragmentos = new Set<string>();
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from('normative_chunks')
      .select('document_id')
      .range(desde, desde + 999);
    if (error) throw new Error(error.message);
    const filas = (data || []) as Array<{ document_id: string }>;
    filas.forEach((f) => conFragmentos.add(f.document_id));
    if (filas.length < 1000) break;
  }

  const huerfanos: Doc[] = [];
  for (let desde = 0; ; desde += 500) {
    const { data, error } = await supabase
      .from('normative_documents')
      .select('id, number, raw_text')
      .range(desde, desde + 499);
    if (error) throw new Error(error.message);
    const filas = (data || []) as Doc[];
    for (const f of filas) if (!conFragmentos.has(f.id)) huerfanos.push(f);
    if (filas.length < 500) break;
  }

  const conTexto = huerfanos.filter((d) => (d.raw_text || '').length > 400);
  const sinTexto = huerfanos.length - conTexto.length;

  console.log(`Documentos sin fragmentos: ${huerfanos.length}`);
  console.log(`  · con texto recuperable  ${conTexto.length}`);
  console.log(`  · sin texto utilizable   ${sinTexto}  (se borran para reintentar)\n`);
  conTexto.slice(0, 10).forEach((d) =>
    console.log(`  ${String(d.number).slice(0, 34).padEnd(34)} ${(d.raw_text || '').length} chars`),
  );
  if (conTexto.length > 10) console.log(`  … y ${conTexto.length - 10} más`);

  if (!APPLY) {
    console.log('\n(simulación — ejecuta con --apply)');
    return;
  }

  let hechos = 0;
  let fallos = 0;
  for (const d of conTexto) {
    try {
      const chunks = chunkText(d.raw_text as string);
      const embeddings = await embedBatch(chunks.map((c) => c.content));
      const filas = chunks.map((c, i) => ({
        document_id: d.id,
        chunk_index: i,
        content: c.content,
        embedding: JSON.stringify(embeddings[i]),
        metadata: { heading: c.heading || null } as never,
      }));
      for (let k = 0; k < filas.length; k += 50) {
        const lote = filas.slice(k, k + 50) as never;
        let intento = 0;
        for (;;) {
          const { error } = await supabase.from('normative_chunks').insert(lote);
          if (!error) break;
          if (++intento > 3) throw new Error(error.message);
          await sleep(2000 * intento);
        }
      }
      hechos++;
      console.log(`  ✅ ${d.number.slice(0, 34).padEnd(34)} ${filas.length} fragmentos`);
    } catch (e) {
      fallos++;
      console.log(`  ❌ ${d.number.slice(0, 34).padEnd(34)} ${(e as Error).message.slice(0, 50)}`);
    }
  }

  // Los que no tienen texto aprovechable no sirven de nada en la
  // biblioteca: se borran para que la ingesta pueda reintentarlos.
  for (const d of huerfanos.filter((x) => (x.raw_text || '').length <= 400)) {
    await supabase.from('normative_documents').delete().eq('id', d.id);
  }

  console.log(`\n✅ ${hechos} reparados · ${fallos} fallidos · ${sinTexto} borrados`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
