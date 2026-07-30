#!/usr/bin/env tsx
/**
 * ¿Perdemos precisión en las respuestas al pasar los embeddings a media
 * precisión (halfvec, 2 bytes/dim en vez de 4)?
 *
 * Mide el impacto REAL sobre el corpus de producción sin modificar nada:
 *   1. Implementa el redondeo IEEE-754 binary16 y lo VALIDA contra el
 *      cast `::halfvec` del propio Postgres (si no coincide, aborta).
 *   2. Descarga los 10,940 embeddings reales.
 *   3. Para cada consulta real, calcula el ranking EXACTO con precisión
 *      completa y con media precisión, y compara qué fragmentos habrían
 *      llegado al prompt del chat.
 *
 * Se compara exacto-vs-exacto para aislar el efecto de la precisión: el
 * índice HNSW de producción ya es aproximado por diseño, y su propia
 * pérdida de recall es un factor aparte (y mayor).
 *
 * Uso: npx tsx scripts/test-halfvec-precision.ts
 */
import { config } from 'dotenv';
// override: el entorno de Windows tiene un SUPABASE_ACCESS_TOKEN antiguo
// que shadowea al del archivo (dotenv no pisa process.env por defecto).
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import { embedOne } from '../src/lib/ai/embeddings';

const TOKEN = (process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const PROJECT = process.env.SUPABASE_PROJECT_REF || 'uccschvusivqldaprsfq';
const DIM = 1024;
/** Cuántos fragmentos entran al prompt del chat (finalMaxChunks). */
const K_PROMPT = 25;

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const QUERIES = [
  'Quiero me resumas todo respecto a la contratación de las modalidades de la contratación pública eficiente',
  '¿Qué tipos de impedimentos de contratación existen?',
  '¿Qué es el requerimiento?',
  'Con la ley 32069, si un postor no suscribe el contrato, ¿cómo es el procedimiento de multa?',
  '¿Cuál es el tope máximo de las penalidades que se pueden aplicar a un contratista?',
  '¿Cuáles son los plazos de la difusión del requerimiento?',
  '¿Puede modificarse un contrato y en qué supuestos?',
  '¿Es posible contratar con un proveedor impedido?',
];

// ─────────── IEEE-754 binary16 (lo que hace halfvec por dentro) ───────────
const _buf = new ArrayBuffer(4);
const _f32 = new Float32Array(_buf);
const _u32 = new Uint32Array(_buf);

/** Redondea a media precisión y vuelve a float — round-to-nearest-even. */
function toHalfAndBack(val: number): number {
  _f32[0] = val;
  const x = _u32[0];
  const sign = x & 0x80000000;
  const exp = (x >>> 23) & 0xff;
  let mant = x & 0x7fffff;

  if (exp === 0xff) return val; // inf/NaN
  const e = exp - 127 + 15; // exponente en binary16

  let bits: number;
  if (e >= 0x1f) {
    bits = 0x7c00; // desborda → infinito
  } else if (e <= 0) {
    if (e < -10) {
      bits = 0; // subdesborda → cero
    } else {
      mant |= 0x800000; // bit implícito
      const shift = 14 - e;
      let h = mant >>> shift;
      const rem = mant & ((1 << shift) - 1);
      const half = 1 << (shift - 1);
      if (rem > half || (rem === half && (h & 1) === 1)) h++;
      bits = h;
    }
  } else {
    let h = (e << 10) | (mant >>> 13);
    const rem = mant & 0x1fff;
    if (rem > 0x1000 || (rem === 0x1000 && (h & 1) === 1)) h++;
    bits = h;
  }
  if (sign) bits |= 0x8000; // propagar el signo al patrón binary16

  // binary16 → float
  const s = (bits & 0x8000) << 16;
  const he = (bits >>> 10) & 0x1f;
  const hm = bits & 0x3ff;
  if (he === 0) {
    if (hm === 0) {
      _u32[0] = s;
    } else {
      let sh = -1;
      let m = hm;
      do {
        sh++;
        m <<= 1;
      } while ((m & 0x400) === 0);
      _u32[0] = s | ((127 - 15 - sh) << 23) | ((m & 0x3ff) << 13);
    }
  } else if (he === 0x1f) {
    _u32[0] = s | 0x7f800000 | (hm << 13);
  } else {
    _u32[0] = s | ((he - 15 + 127) << 23) | (hm << 13);
  }
  return _f32[0];
}

async function sql(query: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 150)}`);
  return json as Record<string, unknown>[];
}

/** Comprueba que nuestro redondeo == el cast ::halfvec de Postgres.
 *  Recibe los valores COMO LOS IMPRIME POSTGRES (strings), porque
 *  reformatearlos desde Float32Array alarga los decimales y el gateway
 *  rechaza la consulta. */
async function validarRedondeo(crudos: string[]): Promise<void> {
  const muestra = crudos.map(Number);
  const lit = `[${crudos.join(',')}]`;
  const rows = await sql(
    `select '${lit}'::halfvec(${muestra.length})::vector(${muestra.length})::text as pg`,
  );
  const pgVals = String(rows[0].pg)
    .replace(/[[\]]/g, '')
    .split(',')
    .map(Number);
  const jsVals = muestra.map(toHalfAndBack);
  // Postgres imprime el float con ~7 dígitos significativos, así que la
  // comparación es numérica con tolerancia relativa. Un redondeo MAL
  // implementado se desviaría ~1e-3 relativo (granularidad de binary16),
  // muy por encima de este umbral.
  const TOL = 1e-5;
  let peor = 0;
  for (let i = 0; i < pgVals.length; i++) {
    const rel = Math.abs(pgVals[i] - jsVals[i]) / Math.max(1e-8, Math.abs(pgVals[i]));
    peor = Math.max(peor, rel);
  }
  if (peor > TOL) {
    console.error('Postgres:', pgVals.slice(0, 5));
    console.error('Nuestro :', jsVals.slice(0, 5));
    throw new Error(`El redondeo local NO coincide con halfvec de Postgres (dif rel ${peor.toExponential(2)})`);
  }
  console.log(
    `✅ Redondeo validado contra Postgres: ${muestra.length} valores, desviación relativa máx ${peor.toExponential(1)} (tolerancia ${TOL})`,
  );
}

function parseVec(raw: unknown): Float32Array {
  const s = String(raw);
  const parts = s.slice(1, -1).split(',');
  const out = new Float32Array(parts.length);
  for (let i = 0; i < parts.length; i++) out[i] = parseFloat(parts[i]);
  return out;
}

/** Coseno para vectores ya normalizados o no (calcula norma). */
function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function topK(sims: Float64Array, ids: string[], k: number): string[] {
  const idx = Array.from({ length: sims.length }, (_, i) => i);
  idx.sort((a, b) => sims[b] - sims[a]);
  return idx.slice(0, k).map((i) => ids[i]);
}

function overlap(a: string[], b: string[], k: number): number {
  const setB = new Set(b.slice(0, k));
  return a.slice(0, k).filter((x) => setB.has(x)).length;
}

async function main() {
  if (!TOKEN) {
    throw new Error(
      'Falta SUPABASE_ACCESS_TOKEN (Management API) en .env.local — necesario para validar el redondeo contra Postgres.',
    );
  }

  // 1. Validar el redondeo contra Postgres con valores reales del corpus
  const { data: sampleRow } = await supabase
    .from('normative_chunks')
    .select('embedding')
    .limit(1)
    .single();
  const crudos = String((sampleRow as { embedding: unknown }).embedding)
    .slice(1, -1)
    .split(',')
    .slice(0, 32);
  await validarRedondeo(crudos);

  // 2. Descargar todos los embeddings
  console.log('\nDescargando embeddings del corpus...');
  const ids: string[] = [];
  const vecsFull: Float32Array[] = [];
  const PAGE = 400;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('normative_chunks')
      .select('id, embedding')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data || []) as Array<{ id: string; embedding: unknown }>;
    if (rows.length === 0) break;
    for (const r of rows) {
      ids.push(r.id);
      vecsFull.push(parseVec(r.embedding));
    }
    process.stdout.write(`\r  ${ids.length} fragmentos...`);
    if (rows.length < PAGE) break;
  }
  console.log(`\r  ${ids.length} fragmentos descargados.`);

  // 3. Versión en media precisión
  const vecsHalf = vecsFull.map((v) => {
    const h = new Float32Array(v.length);
    for (let i = 0; i < v.length; i++) h[i] = toHalfAndBack(v[i]);
    return h;
  });

  const stats = { o5: [] as number[], o10: [] as number[], o25: [] as number[], first: 0, maxD: 0 };

  console.log(`\nComparando rankings (corpus completo, cálculo exacto):\n`);
  for (const q of QUERIES) {
    const emb = await embedOne(q, 'RETRIEVAL_QUERY');
    const qFull = Float32Array.from(emb);
    const qHalf = Float32Array.from(emb.map(toHalfAndBack));

    const simFull = new Float64Array(ids.length);
    const simHalf = new Float64Array(ids.length);
    for (let i = 0; i < ids.length; i++) {
      simFull[i] = cosine(vecsFull[i], qFull);
      simHalf[i] = cosine(vecsHalf[i], qHalf);
    }

    const rFull = topK(simFull, ids, K_PROMPT);
    const rHalf = topK(simHalf, ids, K_PROMPT);
    const o5 = overlap(rFull, rHalf, 5);
    const o10 = overlap(rFull, rHalf, 10);
    const o25 = overlap(rFull, rHalf, K_PROMPT);
    const changed = rFull[0] !== rHalf[0];
    let maxD = 0;
    for (let i = 0; i < ids.length; i++) maxD = Math.max(maxD, Math.abs(simFull[i] - simHalf[i]));

    stats.o5.push(o5);
    stats.o10.push(o10);
    stats.o25.push(o25);
    if (changed) stats.first++;
    stats.maxD = Math.max(stats.maxD, maxD);

    console.log(`▶ ${q.slice(0, 60)}...`);
    console.log(
      `   top5 ${o5}/5 · top10 ${o10}/10 · top${K_PROMPT} ${o25}/${K_PROMPT} · #1 ${changed ? '⚠️ CAMBIÓ' : 'igual'} · Δsim máx ${maxD.toExponential(2)}`,
    );
  }

  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  console.log('\n══════════ RESUMEN ══════════');
  console.log(`Consultas:                 ${QUERIES.length}`);
  console.log(`Coincidencia top-5:        ${((avg(stats.o5) / 5) * 100).toFixed(1)}%`);
  console.log(`Coincidencia top-10:       ${((avg(stats.o10) / 10) * 100).toFixed(1)}%`);
  console.log(`Coincidencia top-${K_PROMPT}:       ${((avg(stats.o25) / K_PROMPT) * 100).toFixed(1)}%`);
  console.log(`Consultas con #1 distinto: ${stats.first}/${QUERIES.length}`);
  console.log(`Δ similitud máxima:        ${stats.maxD.toExponential(3)}`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
