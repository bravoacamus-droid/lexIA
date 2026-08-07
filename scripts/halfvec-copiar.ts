#!/usr/bin/env tsx
/**
 * Copia los vectores a la tabla lateral en media precisión (halfvec),
 * llamando al procedimiento por tramos hasta terminar.
 *
 * El procedimiento confirma cada lote, así que si la llamada se corta
 * por tiempo lo copiado se conserva y la siguiente retoma donde quedó.
 * Sin cadena de conexión directa solo tenemos la API de gestión, que
 * corta las sentencias largas: de ahí este ir y venir.
 *
 * Vigila además la salud del buscador: la copia alimenta un índice HNSW
 * y es pesada en disco, justo el recurso escaso. Si el buscador se
 * degrada, pausa en vez de seguir apretando.
 *
 * Uso: npx tsx scripts/halfvec-copiar.ts
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const TOKEN = (process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const PROJECT = (process.env.SUPABASE_PROJECT_REF || 'uccschvusivqldaprsfq').trim();

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sql(query: string): Promise<unknown[]> {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t.slice(0, 200));
  return t ? (JSON.parse(t) as unknown[]) : [];
}

async function copiados(): Promise<number> {
  const r = (await sql('select count(*)::int as n from normative_chunks_h;')) as Array<{ n: number }>;
  return r[0].n;
}

/** Mediana de tres, igual que el guardián de la ingesta. */
async function medirBuscador(): Promise<number> {
  const { data: consultas } = await supabase
    .from('busquedas_calentamiento')
    .select('texto, embedding')
    .limit(1);
  const c = ((consultas || []) as Array<{ texto: string; embedding: string }>)[0];
  if (!c) return 0;
  const emb = JSON.parse(c.embedding) as number[];
  const muestras: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const { error } = await supabase.rpc('hybrid_search', {
      query_text: c.texto, query_embedding: emb, match_count: 15,
      filter_type: null, filter_law: null,
    });
    if (error) return -1;
    muestras.push(Date.now() - t0);
    await sleep(200);
  }
  return muestras.sort((a, b) => a - b)[1];
}

async function main() {
  const total = ((await sql('select count(*)::int as n from normative_chunks;')) as Array<{ n: number }>)[0].n;
  let hechos = await copiados();
  console.log(`Total de fragmentos: ${total} · ya copiados: ${hechos}\n`);

  const t0 = Date.now();
  let vueltas = 0;

  while (hechos < total) {
    vueltas++;
    try {
      await sql('call public.copiar_halfvec(5000);');
    } catch (e) {
      // Corte por tiempo: lo confirmado se conserva, se reintenta.
      const msg = (e as Error).message;
      if (!/timeout|canceling/i.test(msg)) throw e;
    }

    const antes = hechos;
    hechos = await copiados();
    const seg = (Date.now() - t0) / 1000;
    const ritmo = (hechos - 0) / seg;
    const faltan = ritmo > 0 ? (total - hechos) / ritmo / 60 : 0;
    console.log(
      `  ${hechos}/${total} (${((hechos / total) * 100).toFixed(1)}%) · ` +
        `+${hechos - antes} en esta vuelta · faltan ~${faltan.toFixed(0)} min`,
    );

    if (hechos === antes) {
      console.error('  ⚠️ no avanzó en esta vuelta — se detiene para revisar');
      break;
    }

    // Cada tres vueltas, revisar que el buscador siga sano.
    if (vueltas % 3 === 0) {
      const ms = await medirBuscador();
      const icono = ms < 0 ? '🔴' : ms > 3000 ? '🔴' : ms > 1800 ? '🟡' : '🟢';
      console.log(`     ${icono} buscador: ${ms < 0 ? 'error' : `${ms} ms`}`);
      if (ms < 0 || ms > 3000) {
        console.log('     pausa de 2 min para que el disco respire');
        await sleep(120_000);
      }
    }
    await sleep(1000);
  }

  console.log(`\n✅ ${hechos}/${total} copiados en ${((Date.now() - t0) / 60000).toFixed(1)} min`);

  const tam = (await sql(`
    select pg_size_pretty(pg_total_relation_size('normative_chunks_h')) as tabla,
           pg_size_pretty(pg_relation_size('normative_chunks_h_embedding_idx')) as indice,
           pg_size_pretty(pg_relation_size('normative_chunks_embedding_idx')) as indice_viejo;`)) as Array<
    Record<string, string>
  >;
  console.log(`   tabla nueva ${tam[0].tabla} · índice nuevo ${tam[0].indice} · índice viejo ${tam[0].indice_viejo}`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
