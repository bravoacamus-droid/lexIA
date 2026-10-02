#!/usr/bin/env tsx
/**
 * Vuelve a trocear las normas cuyos fragmentos arrastran constancias de
 * firma digital, ya sin ellas, y recalcula sus vectores.
 *
 * Por qué: el artículo 21 de la Directiva N° 0007-2025-EF/54.01 compartía
 * fragmento con la constancia del MEF y la de Firma Perú, y el chat no
 * lo recuperaba (César, 01/10/2026). El troceador ya las quita
 * (`lib/normativa/constancias.ts`); esto arregla lo que se ingirió antes.
 *
 * Orden por documento: los fragmentos nuevos se insertan ANTES de borrar
 * los viejos, para que el documento no quede sin búsqueda.
 *
 * Uso:
 *   npx tsx scripts/limpiar-constancias.ts            (simulación)
 *   npx tsx scripts/limpiar-constancias.ts --aplicar
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { chunkText } from '../src/lib/ingestion/chunker';
import { tieneConstancias } from '../src/lib/normativa/constancias';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
const MODELO = 'gemini-embedding-001';
const DIMENSION = 1024;
const APLICAR = process.argv.includes('--aplicar');
const POR_TANDA = 8;

/** Rastro de una constancia, aunque el troceado la haya cortado por la mitad. */
const rastro = (t: string) =>
  tieneConstancias(t) || /copia aut[ée]ntica imprimible|firmaperu\.gob\.pe/i.test(t);

/** Las normas; la casuística (resoluciones, pronunciamientos, opiniones) es otro volumen y otro arreglo. */
const TIPOS = [
  'ley', 'reglamento', 'directiva', 'lineamiento', 'codigo_etica', 'manual_seace', 'guia', 'resolucion',
  'bases_estandar', 'nota_tecnica', 'directiva_entidad', 'tupa', 'preguntas_frecuentes',
];

async function vectorizar(textos: string[]): Promise<number[][]> {
  const salida: number[][] = [];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:batchEmbedContents?key=${GEMINI_KEY}`;
  for (let i = 0; i < textos.length; i += 25) {
    const tanda = textos.slice(i, i + 25);
    for (let intento = 1; ; intento++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: tanda.map((text) => ({
            model: `models/${MODELO}`,
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: DIMENSION,
          })),
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { embeddings: Array<{ values: number[] }> };
        salida.push(...json.embeddings.map((e) => e.values));
        break;
      }
      if (intento >= 4) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
      await new Promise((r) => setTimeout(r, 3000 * intento));
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return salida;
}

async function main() {
  const { data: docs, error } = await supabase
    .from('normative_documents')
    .select('id, type, title, number, raw_text')
    .in('type', TIPOS);
  if (error) throw new Error(error.message);

  let tocados = 0;
  let viejosTotal = 0;
  let nuevosTotal = 0;
  for (const d of (docs ?? []) as Array<{ id: string; type: string; title: string; number: string | null; raw_text: string | null }>) {
    const { data: actuales } = await supabase
      .from('normative_chunks')
      .select('id, content, metadata, chunk_index')
      .eq('document_id', d.id)
      .order('chunk_index');
    const viejos = (actuales ?? []) as Array<{ id: string; content: string; metadata: { source?: string } | null }>;
    if (!viejos.some((c) => rastro(c.content))) continue;
    if (!d.raw_text || d.raw_text.length < 200) {
      console.log(`  ? ${d.type} ${d.title.slice(0, 60)} — sin texto completo, se deja`);
      continue;
    }
    const nuevos = chunkText(d.raw_text);
    const sucios = nuevos.filter((c) => rastro(c.content)).length;
    console.log(
      `■ ${d.type.padEnd(12)} ${(d.title + (d.number ? ` · ${d.number}` : '')).slice(0, 80)}\n` +
        `    ${viejos.length} fragmentos (${viejos.filter((c) => rastro(c.content)).length} con constancia) → ${nuevos.length} (${sucios} con constancia)`,
    );
    tocados++;
    viejosTotal += viejos.length;
    nuevosTotal += nuevos.length;
    if (!APLICAR) continue;

    const fuente = viejos.find((c) => c.metadata?.source)?.metadata?.source ?? null;
    const vectores = await vectorizar(nuevos.map((c) => c.content));
    const filas = nuevos.map((c, i) => ({
      document_id: d.id,
      chunk_index: c.index,
      content: c.content,
      embedding: vectores[i] as never,
      metadata: { source: fuente, heading: c.heading } as never,
    }));
    const insertados: string[] = [];
    let fallo: string | null = null;
    for (let i = 0; i < filas.length; i += POR_TANDA) {
      const { data: ins, error: e } = await supabase
        .from('normative_chunks')
        .insert(filas.slice(i, i + POR_TANDA) as never)
        .select('id');
      if (e) {
        fallo = e.message;
        break;
      }
      insertados.push(...((ins ?? []) as Array<{ id: string }>).map((x) => x.id));
    }
    if (fallo) {
      // Se deshace lo insertado y quedan los viejos: mejor sucio que vacío.
      for (let i = 0; i < insertados.length; i += 100) {
        await supabase.from('normative_chunks').delete().in('id', insertados.slice(i, i + 100));
      }
      console.log(`    ✗ no se pudo insertar: ${fallo.slice(0, 120)}`);
      continue;
    }
    const ids = viejos.map((c) => c.id);
    for (let i = 0; i < ids.length; i += 100) {
      await supabase.from('normative_chunks').delete().in('id', ids.slice(i, i + 100));
    }
    console.log(`    ✓ ${insertados.length} fragmentos nuevos`);
  }
  console.log(`\n${tocados} documentos · ${viejosTotal} fragmentos → ${nuevosTotal}${APLICAR ? '' : ' (simulación)'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
