#!/usr/bin/env tsx
/**
 * Llena las consultas de calentamiento con su vector ya calculado.
 *
 * Postgres no puede llamar a Gemini, así que la tarea programada
 * `calentar-cache` (migración 0041) necesita los vectores precalculados.
 * Este script los genera y los guarda.
 *
 * Las consultas se eligieron para que entre todas recorran el camino
 * común de cualquier búsqueda: los puntos de entrada del grafo HNSW, el
 * índice de texto de la normativa y la tabla de documentos. No pretenden
 * cubrir todas las preguntas posibles —eso es imposible—, sino que la
 * primera pregunta de un usuario no encuentre la caché vacía.
 *
 * Correr de nuevo si cambia el modelo de embeddings o sus dimensiones.
 *
 * Uso: npx tsx scripts/preparar-cache-caliente.ts
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();

/** Temas frecuentes y bien repartidos por el corpus. */
const CONSULTAS = [
  'plazo para perfeccionar el contrato',
  'penalidad por mora en la ejecucion',
  'recurso de apelacion ante el Tribunal',
  'requisitos de calificacion del postor',
  'ampliacion de plazo contractual',
];

async function embed(texto: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: texto }] },
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: 1024,
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 150)}`);
  return ((await res.json()) as { embedding: { values: number[] } }).embedding.values;
}

async function main() {
  for (const texto of CONSULTAS) {
    const v = await embed(texto);
    const { error } = await supabase
      .from('busquedas_calentamiento')
      .upsert({ texto, embedding: JSON.stringify(v) } as never, { onConflict: 'texto' });
    if (error) throw new Error(`${texto}: ${error.message}`);
    console.log(`  ✅ ${texto}`);
    await new Promise((r) => setTimeout(r, 800));
  }

  const { count } = await supabase
    .from('busquedas_calentamiento')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  console.log(`\n${count} consultas listas para la tarea de calentamiento.`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
