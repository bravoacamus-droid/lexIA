#!/usr/bin/env tsx
/**
 * Congela el resultado ACTUAL del buscador para poder comparar después
 * de convertir los vectores a halfvec.
 *
 * Guarda, por consulta, los identificadores de los fragmentos devueltos y
 * su orden. Sin esta foto previa, "no se nota diferencia" sería una
 * impresión y no una medición.
 *
 * Salida: data/halfvec-linea-base.json
 *
 * Uso: npx tsx scripts/halfvec-linea-base.ts
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const GEMINI_KEY = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();

/** Consultas repartidas por etapa, tipo de fuente y vocabulario. */
export const CONSULTAS = [
  'plazo para perfeccionar el contrato',
  'ampliacion de plazo contractual',
  'penalidad por mora en la ejecucion',
  'multa por incumplimiento del contratista',
  'sancion de inhabilitacion al proveedor',
  'impugnacion de la buena pro',
  'requisitos de calificacion del postor',
  'nulidad del procedimiento de seleccion',
  'impedimentos para contratar con el Estado',
  'garantia de fiel cumplimiento',
  'adelanto directo en obras',
  'resolucion del contrato por incumplimiento',
  'liquidacion del contrato de obra',
  'subsanacion de ofertas',
  'contratacion directa por desabastecimiento',
  'consorcio y responsabilidad solidaria',
  'junta de resolucion de disputas',
  'valor referencial y valor estimado',
  'homologacion de requerimientos',
  'catalogo electronico de acuerdos marco',
];

export async function embed(texto: string): Promise<number[]> {
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
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  return ((await res.json()) as { embedding: { values: number[] } }).embedding.values;
}

interface Foto {
  consulta: string;
  embedding: number[];
  chunks: string[];
  tipos: string[];
  ms: number;
}

async function main() {
  const fotos: Foto[] = [];
  for (const consulta of CONSULTAS) {
    const embedding = await embed(consulta);
    // Se descarta la primera medición: arranque de conexión.
    await supabase.rpc('hybrid_search', {
      query_text: consulta, query_embedding: embedding, match_count: 15,
      filter_type: null, filter_law: null,
    });
    const t0 = Date.now();
    const { data, error } = await supabase.rpc('hybrid_search', {
      query_text: consulta, query_embedding: embedding, match_count: 15,
      filter_type: null, filter_law: null,
    });
    const ms = Date.now() - t0;
    if (error) throw new Error(`${consulta}: ${error.message}`);
    const filas = (data || []) as Array<{ chunk_id: string; doc_type: string }>;
    fotos.push({
      consulta,
      embedding,
      chunks: filas.map((f) => f.chunk_id),
      tipos: filas.map((f) => f.doc_type),
      ms,
    });
    console.log(`  ${String(ms).padStart(5)} ms · ${filas.length} fragmentos · ${consulta}`);
    await new Promise((r) => setTimeout(r, 600));
  }

  const ruta = join(process.cwd(), 'data', 'halfvec-linea-base.json');
  writeFileSync(ruta, JSON.stringify(fotos, null, 2));
  const medias = fotos.map((f) => f.ms).sort((a, b) => a - b);
  console.log(`\nmediana ${medias[Math.floor(medias.length / 2)]} ms · guardado en ${ruta}`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
