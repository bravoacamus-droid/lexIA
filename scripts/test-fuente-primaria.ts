#!/usr/bin/env tsx
/**
 * Verifica la REGLA GENERAL de fuente primaria: toda consulta debe
 * llegar al modelo con al menos una norma base (Ley o Reglamento) en
 * el contexto, no solo con fuentes secundarias.
 *
 * Origen (01/08/2026): César preguntó por el plazo de perfeccionamiento
 * del contrato y el chat respondió "no aparece regulado" porque los 18
 * fragmentos recuperados eran pronunciamientos. El arreglo no es para
 * esa pregunta: es una red de seguridad + cupo reservado que se aplica
 * a TODAS las consultas. Este test usa preguntas narrativas de casos
 * DISTINTOS para comprobar que la solución es general.
 *
 * Uso: npx tsx scripts/test-fuente-primaria.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import { embedOne } from '../src/lib/ai/embeddings';
import { expandLegalQuery } from '../src/lib/ai/query-expansion';
import { searchNormativa } from '../src/lib/ai/voice-search';
import { rewriteToLegalQueries } from '../src/lib/ai/query-rewrite';
import { fetchNeighborChunks, mergeNeighbors } from '../src/lib/ai/neighbor-chunks';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface Row {
  chunk_id: string;
  content: string;
  doc_type: string;
  doc_number: string | null;
  similarity: number;
  document_id: string;
}

/** Preguntas narrativas de caso — el estilo que fallaba. Cada una toca
 *  un tema distinto para probar que el arreglo NO es específico. */
const CASOS: Array<{ q: string; espera?: RegExp }> = [
  {
    q: 'si la entidad no tiene listo el contrato dentro de los tres días hábiles de haber subsanado nuestra oferta que acción corresponde realizar a fin de no tener responsabilidad mas adelante dado que los precios están subiendo de precios.',
    espera: /91\.1|91\.2|deja de estar obligado|puede requerir su cumplimiento/i,
  },
  {
    q: 'nos notificaron la buena pro pero la entidad se demora en firmar y ya pasaron dos semanas, qué podemos hacer',
  },
  {
    q: 'el contratista no entregó a tiempo y el área usuaria quiere cobrarle, cómo procedo sin equivocarme',
  },
  {
    q: 'un postor mandó documentos falsos en su oferta y nos dimos cuenta después de la buena pro, qué hacemos',
  },
  {
    q: 'la obra está parada porque no hay pago hace dos meses y el contratista amenaza con dejar todo',
  },
  {
    q: 'queremos ampliar el plazo del servicio porque hubo huelga en la zona, es posible',
  },
];

const esPrimaria = (t: string) => t === 'ley' || t === 'reglamento';

async function search(q: string, e: number[], n: number, ft: string | null) {
  const { data } = await admin.rpc('hybrid_search', {
    query_text: q,
    query_embedding: e,
    match_count: n,
    filter_type: ft,
    filter_law: null,
  });
  return (data || []) as Row[];
}

/** Espejo del pipeline de /api/chat en lo relevante para esta regla. */
async function chatChunks(q: string): Promise<Row[]> {
  const { expanded, focalQueries } = expandLegalQuery(q);
  const emb = await embedOne(q, 'RETRIEVAL_QUERY');
  const combined = new Map<string, Row>();
  (await search(q, emb, 18, null)).forEach((c) => combined.set(c.chunk_id, c));

  if (expanded && expanded !== q) {
    const e2 = await embedOne(expanded, 'RETRIEVAL_QUERY');
    (await search(expanded, e2, 10, null)).forEach(
      (c) => combined.has(c.chunk_id) || combined.set(c.chunk_id, c),
    );
  }
  for (const f of focalQueries) {
    const ef = await embedOne(f, 'RETRIEVAL_QUERY');
    (await search(f, ef, 3, 'ley')).forEach(
      (c) => combined.has(c.chunk_id) || combined.set(c.chunk_id, c),
    );
  }
  // RESCATE CONDICIONAL (espejo del route): solo si falta norma base
  const esPrim0 = (t: string) => t === 'ley' || t === 'reglamento';
  const necesitaRescate =
    [...combined.values()].filter((c) => esPrim0(c.doc_type)).length < 3;
  const rewrites = necesitaRescate ? await rewriteToLegalQueries(q) : [];
  for (const frase of rewrites) {
    const er = await embedOne(frase, 'RETRIEVAL_QUERY');
    for (const tipo of ['ley', 'reglamento'] as const) {
      (await search(frase, er, 3, tipo)).forEach(
        (c) => combined.has(c.chunk_id) || combined.set(c.chunk_id, c),
      );
    }
  }

  if (necesitaRescate) for (const tipo of ['ley', 'reglamento'] as const) {
    (await search(q, emb, 4, tipo)).forEach(
      (c) => combined.has(c.chunk_id) || combined.set(c.chunk_id, c),
    );
  }

  // Corte + cupo reservado de fuente primaria
  let out = [...combined.values()].sort((a, b) => b.similarity - a.similarity).slice(0, 15);
  const RESERVA = 3;
  const yaP = out.filter((c) => esPrimaria(c.doc_type)).length;
  if (yaP < RESERVA) {
    const inFinal = new Set(out.map((c) => c.chunk_id));
    const cand = [...combined.values()]
      .filter((c) => esPrimaria(c.doc_type) && !inFinal.has(c.chunk_id))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, RESERVA - yaP);
    if (cand.length) out = [...out.slice(0, out.length - cand.length), ...cand];
  }
  return out;
}

async function main() {
  let okChat = 0;
  let okVoz = 0;
  let okEspera = 0;
  let totalEspera = 0;

  for (const caso of CASOS) {
    const chunks = await chatChunks(caso.q);
    const nP = chunks.filter((c) => esPrimaria(c.doc_type)).length;
    // OJO: searchNormativa devuelve {type, snippet}, no {doc_type, content}
    const voz = await searchNormativa({ query: caso.q, match_count: 5 });
    const nV = voz.filter((r) => esPrimaria(r.type)).length;
    if (nP > 0) okChat++;
    if (nV > 0) okVoz++;

    let espera = '';
    if (caso.espera) {
      totalEspera++;
      const hit =
        chunks.some((c) => caso.espera!.test(c.content)) ||
        voz.some((r) => caso.espera!.test(r.snippet));
      if (hit) okEspera++;
      espera = hit ? ' · artículo esperado ✅' : ' · artículo esperado ❌';
    }
    console.log(`${nP > 0 ? '✅' : '❌'} chat ${nP} norma(s) | ${nV > 0 ? '✅' : '❌'} voz ${nV}${espera}`);
    console.log(`   "${caso.q.slice(0, 78)}..."`);
    chunks
      .filter((c) => esPrimaria(c.doc_type))
      .forEach((c) => console.log(`      · ${c.doc_type}: ${c.content.slice(0, 85).replace(/\s+/g, ' ')}`));
  }

  console.log('\n══════════ RESUMEN ══════════');
  console.log(`Chat con fuente primaria: ${okChat}/${CASOS.length}`);
  console.log(`Voz  con fuente primaria: ${okVoz}/${CASOS.length}`);
  if (totalEspera) console.log(`Artículo exacto esperado: ${okEspera}/${totalEspera}`);
  if (okChat < CASOS.length || okVoz < CASOS.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
