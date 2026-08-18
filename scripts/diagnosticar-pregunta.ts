#!/usr/bin/env tsx
/**
 * Muestra QUÉ recupera el chat para una pregunta concreta, sin llamar al
 * modelo.
 *
 * Cuando César reporta que una respuesta salió incompleta hay tres
 * causas posibles y se arreglan de forma distinta:
 *
 *   1. La fuente no está cargada en la biblioteca → hay que ingerirla.
 *   2. Está cargada pero la recuperación no la trae → hay que tocar la
 *      expansión de consulta, las facetas o el ranking.
 *   3. Llega al modelo y el modelo no la usa → hay que tocar el prompt.
 *
 * Sin este dato se acaba cambiando el prompt cuando el problema era el
 * corpus, o al revés. Aquí se ve el reparto por documento y se puede
 * comprobar si un texto concreto llegó al pool.
 *
 * Uso:
 *   npx tsx scripts/diagnosticar-pregunta.ts "¿cuáles son los requisitos…?"
 *   npx tsx scripts/diagnosticar-pregunta.ts "…" --esperado "Directiva,TUPA"
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { embedOne } from '../src/lib/ai/embeddings';
import { expandLegalQuery, tipoDeFoco } from '../src/lib/ai/query-expansion';
import {
  isPanoramicQuery,
  extractCentralTopic,
  buildPanoramicFacets,
} from '../src/lib/ai/panoramic-query';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const admin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
);

interface Fila {
  chunk_id: string;
  content: string;
  doc_type: string;
  doc_title: string;
  doc_number: string | null;
}

async function buscar(
  q: string,
  e: number[],
  n: number,
  tipo: string | null = null,
): Promise<Fila[]> {
  const { data, error } = await admin.rpc('hybrid_search', {
    query_text: q,
    query_embedding: e,
    match_count: n,
    filter_type: tipo,
    filter_law: null,
  });
  if (error) console.error(`   (búsqueda falló: ${error.message})`);
  return (data || []) as Fila[];
}

async function main() {
  const args = process.argv.slice(2);
  const iEsp = args.indexOf('--esperado');
  const esperados =
    iEsp >= 0 ? args[iEsp + 1].split(',').map((s) => s.trim().toLowerCase()) : [];
  const pregunta = (iEsp >= 0 ? args.slice(0, iEsp) : args).join(' ');
  if (!pregunta) {
    console.error('Uso: npx tsx scripts/diagnosticar-pregunta.ts "pregunta"');
    process.exit(1);
  }

  console.log(`Pregunta: ${pregunta}\n`);

  const { expanded, focalQueries } = expandLegalQuery(pregunta);
  const panoramica = isPanoramicQuery(pregunta);
  const tema = panoramica ? extractCentralTopic(pregunta) : '';
  const facetas = panoramica ? buildPanoramicFacets(tema) : [];

  console.log('── Cómo interpreta la consulta ──');
  console.log(`   panorámica            ${panoramica ? 'sí' : 'no'}`);
  if (panoramica) console.log(`   tema central          "${tema}"`);
  console.log(`   expansión             ${expanded ? `"${expanded.slice(0, 90)}"` : '(ninguna)'}`);
  console.log(`   consultas focales     ${focalQueries.length}`);
  for (const f of focalQueries) console.log(`      · ${f}`);
  console.log(`   facetas               ${facetas.length}`);
  for (const f of facetas) console.log(`      · ${f}`);

  // Se replica el reparto del chat: la consulta original y la expandida
  // con más cupo, y cada faceta con menos.
  const consultas: Array<[string, number, string | null]> = [[pregunta, 15, null]];
  if (expanded) consultas.push([expanded, 10, null]);
  // Las focales van filtradas por tipo, igual que en el chat.
  for (const f of focalQueries) {
    const t = tipoDeFoco(f);
    consultas.push([f, t === 'ley' ? 3 : 6, t]);
  }
  for (const f of facetas) consultas.push([f, 8, null]);

  const porChunk = new Map<string, Fila>();
  for (const [q, n, t] of consultas) {
    const e = await embedOne(q, 'RETRIEVAL_QUERY').catch(() => null);
    if (!e) continue;
    for (const f of await buscar(q, e as number[], n, t)) porChunk.set(f.chunk_id, f);
  }

  const filas = [...porChunk.values()];
  console.log(`\n── Qué llega al modelo: ${filas.length} fragmentos únicos ──`);

  const porDoc = new Map<string, { n: number; tipo: string; chars: number }>();
  for (const f of filas) {
    const clave = f.doc_number || f.doc_title;
    const prev = porDoc.get(clave) ?? { n: 0, tipo: f.doc_type, chars: 0 };
    porDoc.set(clave, { n: prev.n + 1, tipo: f.doc_type, chars: prev.chars + f.content.length });
  }
  const orden = [...porDoc.entries()].sort((a, b) => b[1].n - a[1].n);
  for (const [doc, d] of orden) {
    console.log(`   ${String(d.n).padStart(3)} frag · ${d.tipo.padEnd(16)} ${doc.slice(0, 78)}`);
  }

  if (esperados.length) {
    console.log('\n── Documentos que se esperaban ──');
    for (const esp of esperados) {
      const encontrado = orden.some(([doc, d]) =>
        (doc + ' ' + d.tipo).toLowerCase().includes(esp),
      );
      console.log(`   ${encontrado ? '✅' : '❌'} ${esp}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
