/**
 * Test de COHERENCIA CRUZADA chat ↔ voz + validación de las FAQ OECE
 * recién ingestadas (26/07/2026).
 *
 * Parte A — FAQ OECE por el pipeline completo del chat: 4 preguntas
 * cuya respuesta oficial está en el documento del OECE; se verifica
 * que el chat responda alineado con la respuesta oficial.
 *
 * Parte B — Coherencia chat ↔ voz: la MISMA pregunta se ejecuta por
 * ambos pipelines (chat: expansión+panorámica+hybrid multi-etapa;
 * voz: searchNormativa+rerank) y se comparan los HECHOS objetivos
 * extraídos de ambas respuestas (números, artículos, porcentajes).
 * Una discrepancia de fondo (ej.: chat dice 8 días y voz dice 10)
 * es un FALLO de coherencia.
 *
 * Uso: npx tsx scripts/test-coherencia-chat-voz.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { embedOne } from '../src/lib/ai/embeddings';
import { chatModel } from '../src/lib/ai/gemini';
import { buildChatSystemPrompt } from '../src/lib/ai/prompts';
import { expandLegalQuery } from '../src/lib/ai/query-expansion';
import {
  isPanoramicQuery,
  extractCentralTopic,
  buildPanoramicFacets,
} from '../src/lib/ai/panoramic-query';
import { searchNormativa, formatResultsForLLM } from '../src/lib/ai/voice-search';
import { buildVoiceSystemPrompt } from '../src/lib/ai/voice-config';
import type { ChatSource } from '../src/lib/supabase/types';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface HybridRow {
  chunk_id: string;
  document_id: string;
  content: string;
  doc_title: string;
  doc_type: string;
  doc_number: string | null;
  similarity: number;
}

async function search(q: string, e: number[], n: number, ft: string | null = null) {
  const { data } = await admin.rpc('hybrid_search', {
    query_text: q,
    query_embedding: e,
    match_count: n,
    filter_type: ft,
    filter_law: null,
  });
  return (data || []) as HybridRow[];
}

/** Pipeline del chat — espejo de /api/chat (igual que test-cesar-qa). */
async function chatPipeline(question: string): Promise<string> {
  const { expanded: expQ, focalQueries } = expandLegalQuery(question);
  const panoramic = isPanoramicQuery(question);
  const topic = panoramic ? extractCentralTopic(question) : '';
  const facets = panoramic ? buildPanoramicFacets(topic) : [];

  const embQueries = [
    question,
    ...(expQ && expQ !== question ? [expQ] : []),
    ...focalQueries,
    ...facets,
  ];
  const embs = await Promise.all(embQueries.map((t) => embedOne(t, 'RETRIEVAL_QUERY')));

  const combined = new Map<string, HybridRow>();
  (await search(question, embs[0], 18)).forEach((c) => combined.set(c.chunk_id, c));
  let idx = 1;
  if (expQ && expQ !== question) {
    (await search(expQ, embs[idx++], 10)).forEach(
      (c) => combined.has(c.chunk_id) || combined.set(c.chunk_id, c),
    );
  }
  for (const focal of focalQueries) {
    (await search(focal, embs[idx++], 3, 'ley')).forEach(
      (c) => combined.has(c.chunk_id) || combined.set(c.chunk_id, c),
    );
  }
  const facetTop: HybridRow[] = [];
  for (const facet of facets) {
    const rows = await search(facet, embs[idx++], 5);
    if (rows.length > 0) facetTop.push(rows[0]);
    rows.forEach((c) => combined.has(c.chunk_id) || combined.set(c.chunk_id, c));
  }

  const finalMax = panoramic ? 25 : 15;
  let chunks = [...combined.values()]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, finalMax);
  if (facetTop.length > 0) {
    const inFinal = new Set(chunks.map((c) => c.chunk_id));
    const missing = [
      ...new Map(
        facetTop.filter((c) => !inFinal.has(c.chunk_id)).map((c) => [c.chunk_id, c]),
      ).values(),
    ];
    if (missing.length > 0) {
      chunks = [...chunks.slice(0, Math.max(chunks.length - missing.length, 0)), ...missing];
    }
  }

  const sources: ChatSource[] = chunks.map((c) => ({
    chunk_id: c.chunk_id,
    doc_id: c.document_id,
    doc_title: c.doc_title,
    doc_type: c.doc_type as never,
    doc_number: c.doc_number,
    snippet: c.content,
  }));
  const systemPrompt = buildChatSystemPrompt(sources, null, [], panoramic ? { topic } : null);
  const result = await generateText({
    model: chatModel,
    system: systemPrompt,
    prompt: question,
    temperature: 0.3,
  });
  return result.text;
}

/** Pipeline de la voz — espejo del tool searchNormativa + turno simulado
 *  (mismo patrón que test-cesar-qa-voz.ts). */
async function vozPipeline(question: string): Promise<string> {
  const rows = await searchNormativa({ query: question, match_count: 5 });
  const toolResult = formatResultsForLLM(rows);
  const systemPrompt = buildVoiceSystemPrompt(null);
  const result = await generateText({
    model: chatModel,
    system: systemPrompt,
    messages: [
      { role: 'user', content: question },
      {
        role: 'assistant',
        content: `[Llamé a search_normativa("${question}")]`,
      },
      {
        role: 'user',
        content: `[RESULTADO DE search_normativa]:\n${toolResult}\n\nAhora responde la pregunta original del usuario con esta información.`,
      },
    ],
    temperature: 0.3,
  });
  return result.text;
}

// ════════════════════════ PARTE A: FAQ OECE por el chat ════════════════════════

interface KeyPoint {
  desc: string;
  patterns: RegExp[];
  critical?: boolean;
}

const FAQ_CASES: Array<{ id: string; question: string; keyPoints: KeyPoint[] }> = [
  {
    id: 'FAQ-1.1-contratos-menores',
    question:
      '¿Las contrataciones por montos iguales o menores a 8 UIT están reguladas por la normativa de contrataciones públicas?',
    keyPoints: [
      { desc: 'Respuesta afirmativa (sí están reguladas)', patterns: [/\bs[íi]\b|se\s+rigen\s+por\s+esta\s+ley|sujetas?\s+a\s+la\s+ley/i], critical: true },
      { desc: 'Contratos menores', patterns: [/contratos?\s+menores/i], critical: true },
      { desc: 'Art. 34 de la Ley (definición)', patterns: [/art[íi]culo\s+34|art\.?\s*34/i], critical: true },
      { desc: '8 UIT', patterns: [/ocho\s+.*UIT|8\s*UIT/i], critical: true },
      { desc: 'No requieren procedimiento de selección', patterns: [/no\s+requieren\s+procedimientos?\s+de\s+selecci[óo]n/i] },
    ],
  },
  {
    id: 'FAQ-2.1-suplente-comite',
    question: '¿El miembro suplente del comité solo actúa cuando el titular está ausente?',
    keyPoints: [
      { desc: 'Responde sobre la actuación del suplente', patterns: [/suplente/i], critical: true },
      { desc: 'Afirmativa / ausencia del titular', patterns: [/ausencia|falta\s+del\s+titular|reemplaz/i], critical: true },
      { desc: 'Menciona comité', patterns: [/comit[ée]/i], critical: true },
    ],
  },
  {
    id: 'FAQ-3.6-proveedor-impedido',
    question: '¿Es posible contratar con un proveedor que se encuentra impedido de contratar con el Estado?',
    keyPoints: [
      { desc: 'Respuesta negativa', patterns: [/\bno\b/i], critical: true },
      { desc: 'Nulidad como consecuencia', patterns: [/nul[oa]|nulidad/i], critical: true },
      { desc: 'Menciona impedimento', patterns: [/impedid|impediment/i], critical: true },
    ],
  },
  {
    id: 'FAQ-3.8-modificar-contrato',
    question: '¿Puede modificarse un contrato y en qué supuestos?',
    keyPoints: [
      { desc: 'Respuesta afirmativa', patterns: [/\bs[íi]\b|puede\s+modificarse|es\s+posible/i], critical: true },
      { desc: 'Cita artículo 63 de la Ley o base normativa de modificaciones', patterns: [/art[íi]culo\s+63|art\.?\s*63|modificaciones?\s+(?:al\s+)?contra/i], critical: true },
      { desc: 'Menciona supuestos (adicionales/ampliación/reducción)', patterns: [/adicional|ampliaci[óo]n|reducci[óo]n/i], critical: true },
    ],
  },
];

// ════════════════════════ PARTE B: coherencia chat ↔ voz ════════════════════════

/** Cada caso define extractores de HECHOS: si ambos canales emiten el
 *  hecho, deben coincidir. `factRegexes` captura valores comparables. */
const COHERENCE_CASES: Array<{
  id: string;
  question: string;
  facts: Array<{ desc: string; extract: RegExp; mustAgree: boolean }>;
}> = [
  {
    id: 'C1-tope-penalidades',
    question: '¿Cuál es el tope máximo de las penalidades que se pueden aplicar a un contratista?',
    facts: [
      { desc: 'Porcentaje tope (esperado 10%)', extract: /(?:diez|10)\s*(?:por\s+ciento|%)/i, mustAgree: true },
    ],
  },
  {
    id: 'C2-contratos-menores-monto',
    question: '¿Hasta qué monto se considera un contrato menor?',
    facts: [
      { desc: 'Umbral en UIT (esperado 8)', extract: /(?:ocho|8)\s*(?:\(8\)\s*)?(?:unidades\s+impositivas|UIT)/i, mustAgree: true },
    ],
  },
  {
    id: 'C3-proveedor-impedido',
    question: '¿Qué pasa si una entidad contrata con un proveedor impedido?',
    facts: [
      { desc: 'Consecuencia: nulidad', extract: /nul[oa]s?|nulidad/i, mustAgree: true },
    ],
  },
];

function score(text: string, keyPoints: KeyPoint[]) {
  let earned = 0;
  let possible = 0;
  const misses: string[] = [];
  for (const kp of keyPoints) {
    const w = kp.critical ? 2 : 1;
    possible += w;
    if (kp.patterns.some((rx) => rx.test(text))) earned += w;
    else misses.push(kp.desc + (kp.critical ? ' ⚠️' : ''));
  }
  return { pct: Math.round((earned / possible) * 100), misses };
}

async function main() {
  console.log('══════════ PARTE A: FAQ OECE por el pipeline del chat ══════════');
  let sumA = 0;
  for (const tc of FAQ_CASES) {
    const text = await chatPipeline(tc.question);
    const { pct, misses } = score(text, tc.keyPoints);
    sumA += pct;
    console.log(`\n▶ ${tc.id}: ${pct}%`);
    if (misses.length) misses.forEach((m) => console.log('   ✗', m));
    console.log('   ↳', text.replace(/\s+/g, ' ').slice(0, 220), '...');
  }
  console.log(`\nPROMEDIO PARTE A: ${Math.round(sumA / FAQ_CASES.length)}%`);

  console.log('\n══════════ PARTE B: coherencia chat ↔ voz ══════════');
  let okB = 0;
  let totB = 0;
  for (const tc of COHERENCE_CASES) {
    console.log(`\n▶ ${tc.id} — ${tc.question}`);
    const [chatText, vozText] = [await chatPipeline(tc.question), await vozPipeline(tc.question)];
    for (const fact of tc.facts) {
      totB++;
      const inChat = fact.extract.test(chatText);
      const inVoz = fact.extract.test(vozText);
      const coherent = inChat && inVoz;
      if (coherent) okB++;
      console.log(
        `   ${coherent ? '✅' : '❌'} ${fact.desc} — chat:${inChat ? 'sí' : 'NO'} voz:${inVoz ? 'sí' : 'NO'}`,
      );
      if (!coherent) {
        console.log('   CHAT →', chatText.replace(/\s+/g, ' ').slice(0, 200));
        console.log('   VOZ  →', vozText.replace(/\s+/g, ' ').slice(0, 200));
      }
    }
  }
  console.log(`\nCOHERENCIA: ${okB}/${totB} hechos coinciden en ambos canales`);
  console.log('\n══════════ RESUMEN ══════════');
  console.log(`Parte A (FAQ OECE en chat): ${Math.round(sumA / FAQ_CASES.length)}%`);
  console.log(`Parte B (coherencia chat↔voz): ${okB}/${totB}`);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
