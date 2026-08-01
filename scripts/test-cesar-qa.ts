/**
 * Test estricto del CHAT contra las 9 preguntas y respuestas modelo
 * que César entregó el 24/07/2026 ("Preguntas y respuestas.docx").
 *
 * Ejecuta el pipeline COMPLETO del chat (mismo flujo que /api/chat):
 *   expansión legal + detección panorámica + embeds paralelos +
 *   hybrid_search multi-etapa + rerank + system prompt + LLM real.
 *
 * Score por pregunta = % de puntos clave verificables presentes en
 * la respuesta. Los puntos clave se extrajeron de las respuestas
 * modelo del documento (números, artículos, conceptos específicos).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { embedOne } from '../src/lib/ai/embeddings';
import { chatModel } from '../src/lib/ai/gemini';
import { buildChatSystemPrompt } from '../src/lib/ai/prompts';
import { expandLegalQuery } from '../src/lib/ai/query-expansion';
import { rewriteToLegalQueries } from '../src/lib/ai/query-rewrite';
import { fetchNeighborChunks, mergeNeighbors } from '../src/lib/ai/neighbor-chunks';
import {
  isPanoramicQuery,
  extractCentralTopic,
  buildPanoramicFacets,
} from '../src/lib/ai/panoramic-query';
import type { ChatSource } from '../src/lib/supabase/types';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface KeyPoint {
  /** Descripción legible del punto. */
  desc: string;
  /** Patrones — basta que UNO matchee para dar el punto. */
  patterns: RegExp[];
  /** true = crítico (peso doble). */
  critical?: boolean;
}

interface TestCase {
  id: string;
  question: string;
  keyPoints: KeyPoint[];
}

const CASES: TestCase[] = [
  {
    id: 'Q1-modalidades',
    question:
      'Quiero me resumas todo respecto a la contratación de las modalidades de la contratación pública eficiente',
    keyPoints: [
      { desc: 'Contratos menores / 8 UIT', patterns: [/contratos?\s+menor/i, /8\s*UIT/i], critical: true },
      { desc: 'Compra por encargo', patterns: [/compra\s+por\s+encargo|encargo\s+a\s+otra\s+entidad/i], critical: true },
      { desc: 'Compra centralizada', patterns: [/compra\s+centralizada/i], critical: true },
      { desc: 'Compra corporativa', patterns: [/compra\s+corporativa/i], critical: true },
      { desc: 'CPI / innovación', patterns: [/compra\s+p[úu]blica\s+de\s+innovaci[óo]n|CPI\b/i], critical: true },
      { desc: 'Acuerdo marco', patterns: [/acuerdos?\s+marco/i], critical: true },
      { desc: 'CPP precomercial', patterns: [/precomercial|CPP\b/i] },
      { desc: 'API asociación innovación', patterns: [/asociaci[óo]n\s+para\s+la\s+innovaci[óo]n|API\b/] },
      { desc: 'Perú Compras', patterns: [/per[úu]\s+compras/i] },
      { desc: 'Catálogos electrónicos', patterns: [/cat[áa]logos?\s+electr[óo]nicos?/i] },
    ],
  },
  {
    id: 'Q2-impedimentos',
    question: 'Quiero que me expliques todo respecto a los impedimentos de contratación',
    keyPoints: [
      { desc: 'Impedimentos de carácter personal (cargo)', patterns: [/car[áa]cter\s+personal|v[íi]nculo.*cargo|por\s+raz[óo]n\s+del\s+cargo|autoridades|funcionarios/i], critical: true },
      { desc: 'Parentesco', patterns: [/parentesco|c[óo]nyuge|conviviente/i], critical: true },
      { desc: 'Personas jurídicas', patterns: [/personas?\s+jur[íi]dicas/i], critical: true },
      { desc: 'Sanciones/condenas', patterns: [/sanci[óo]n|inhabilitaci[óo]n|condena/i], critical: true },
      { desc: '6 meses post-cargo', patterns: [/seis\s*\(?6?\)?\s*meses|6\s+meses/i], critical: true },
      { desc: 'Segundo grado consanguinidad/afinidad', patterns: [/segundo\s+grado|2do\.?\s+grado/i] },
      { desc: '30% capital social', patterns: [/30\s*%|treinta\s+por\s+ciento/i] },
      { desc: 'REDAM/REDERECI', patterns: [/REDAM|REDERECI|deudores\s+alimentarios|reparaciones\s+civiles/i] },
      { desc: 'Presidente/Congresistas alcance nacional', patterns: [/presidente|congresistas|ministros/i] },
    ],
  },
  {
    id: 'Q3-discrecionalidad',
    question:
      'En qué casos el comité (evaluador) debe evaluar las ofertas y determinar una decisión técnicamente de manera discrecional bajo el principio de valor por dinero',
    keyPoints: [
      { desc: 'Negociación cuando oferta supera cuantía/presupuesto', patterns: [/negocia|reducci[óo]n\s+de\s+(?:la\s+)?oferta|supera\s+la\s+cuant[íi]a|exced[ea].*presupuesto/i], critical: true },
      { desc: 'Rechazo ofertas bajo costo', patterns: [/rechaz|sustancialmente\s+(?:por\s+)?debajo|oferta.*(?:baja|temeraria)/i], critical: true },
      { desc: 'Diálogo competitivo', patterns: [/di[áa]logo\s+competitivo/i], critical: true },
      { desc: 'Concurso arquitectónico / jurado', patterns: [/arquitect[óo]nic|jurado/i] },
      { desc: 'No apelable (jurado)', patterns: [/no\s+(?:es\s+)?apelable/i] },
      { desc: 'Composición/estructura de la oferta', patterns: [/composici[óo]n|estructura\s+de\s+costos|descripci[óo]n\s+detallada/i] },
      { desc: 'Valor por dinero como sustento', patterns: [/valor\s+por\s+dinero/i], critical: true },
      { desc: 'Finalidad pública', patterns: [/finalidad\s+p[úu]blica/i] },
    ],
  },
  {
    id: 'Q5-difusion',
    question: 'Que es la difusión de requerimiento',
    keyPoints: [
      { desc: 'Herramienta de consulta al mercado', patterns: [/consulta\s+al\s+mercado/i], critical: true },
      { desc: 'Previa a la convocatoria', patterns: [/previa?\s+a\s+la\s+convocatoria|antes\s+de\s+(?:la\s+)?convoca/i], critical: true },
      { desc: 'Pladicop', patterns: [/pladicop/i], critical: true },
      { desc: 'Plazo 5 días consultas', patterns: [/cinco\s*(?:\(\s*5\s*\))?\s*d[íi]as|5\s+d[íi]as/i], critical: true },
      { desc: 'Plazo 6 días absolución', patterns: [/seis\s*(?:\(\s*6\s*\))?\s*d[íi]as|6\s+d[íi]as/i], critical: true },
      { desc: 'Reunión (3 días)', patterns: [/reuni[óo]n/i] },
      { desc: 'Absolución obligatoria', patterns: [/absuelt[oa]s?\s+(?:de\s+manera\s+)?obligatoria|obligatoriamente/i] },
      { desc: 'Retroalimentación / identificar proveedores', patterns: [/retroalimentaci[óo]n|identificar\s+(?:posibles\s+)?proveedores/i] },
    ],
  },
  {
    id: 'Q6-emergencias',
    question:
      'Quiero que me detalles paso a paso cuando una entidad debe aplicar las contrataciones para la prevención y atención de emergencias y que entidades pueden contratar a través de este mecanismo',
    keyPoints: [
      { desc: 'Contratación directa / no competitiva', patterns: [/contrataci[óo]n\s+directa|no\s+competitiv/i], critical: true },
      { desc: 'Regularización 20 días', patterns: [/veinte\s*(?:\(\s*20\s*\))?\s*d[íi]as|20\s+d[íi]as/i], critical: true },
      { desc: 'Contratos de contingencia', patterns: [/contratos?\s+de\s+contingencia/i], critical: true },
      { desc: 'CMN cuadro multianual', patterns: [/cuadro\s+multianual|CMN\b/i] },
      { desc: 'Acuerdos marco para preparación', patterns: [/acuerdos?\s+marco/i] },
      { desc: 'Pago por disponibilidad/activación', patterns: [/pago\s+por\s+disponibilidad|pago\s+por\s+activaci[óo]n/i] },
      { desc: 'Entidades: gobiernos/ministerios/FFAA', patterns: [/gobiernos?\s+(?:regional|local)|ministerios|fuerzas\s+armadas|municipalidad/i], critical: true },
      { desc: 'Estrictamente necesario', patterns: [/estrictamente\s+(?:lo\s+)?necesario|indispensable/i] },
      { desc: 'Garantía fiel cumplimiento', patterns: [/garant[íi]a\s+de\s+fiel\s+cumplimiento|10\s*%/i] },
    ],
  },
  {
    id: 'Q7-apelacion-ejemplos',
    question:
      'Quiero que me realices ejemplos en caso una empresa interpone un recurso de apelación ante el Tribunal y este señale que no existe conexión lógica entre los hechos expuestos en el recurso y petitorio y el impugnante carezca de interés para obrar o legitimidad procesal',
    keyPoints: [
      { desc: 'Improcedencia', patterns: [/improcedent|improcedencia/i], critical: true },
      { desc: 'Conexión lógica hechos-petitorio', patterns: [/conexi[óo]n\s+l[óo]gica/i], critical: true },
      { desc: 'Interés para obrar', patterns: [/inter[ée]s\s+para\s+obrar/i], critical: true },
      { desc: 'Legitimidad procesal', patterns: [/legitimidad\s+procesal/i], critical: true },
      { desc: 'Ejemplo concreto (caso hipotético)', patterns: [/ejemplo|caso:|supuesto:/i], critical: true },
      { desc: 'Ejecución 50% garantía', patterns: [/50\s*%.*garant[íi]a|garant[íi]a.*50\s*%|ejecuci[óo]n\s+de(?:l)?\s+50/i] },
      { desc: 'Condición de postor/participante', patterns: [/condici[óo]n\s+de\s+postor|participante/i] },
    ],
  },
  {
    id: 'Q8-multa-no-suscribir',
    question:
      'Antes con la norma anterior 30225, en caso un postor no suscribía el contrato, el tribunal le sancionaba con una multa y en caso el proveedor no pagaba dicha multa, era inhabilitado hasta que efectúe el pago. Ahora con la norma actual como es este procedimiento en caso un postor no suscriba el contrato.',
    keyPoints: [
      { desc: 'Multa 3% a 10% de la oferta', patterns: [/3\s*%.*10\s*%|no\s+menor\s+al?\s+3|tres\s+por\s+ciento/i], critical: true },
      { desc: 'Mype tope 8%', patterns: [/8\s*%|ocho\s+por\s+ciento/i] },
      { desc: 'Ejecución coactiva', patterns: [/coactiv/i], critical: true },
      { desc: 'Retención en futuros contratos (hasta 10%)', patterns: [/retenci[óo]n|reten(?:er|drá)/i], critical: true },
      { desc: 'Cláusula compromiso de pago', patterns: [/cl[áa]usula.*compromiso|compromiso\s+de\s+pago/i] },
      { desc: 'Ya NO inhabilitación automática por impago', patterns: [/ya\s+no.*inhabilita|no\s+(?:se\s+)?inhabilita.*(?:autom|impago|falta\s+de\s+pago)|cambi[óo]|diferencia|evoluci[óo]n/i], critical: true },
      { desc: 'Inhabilitación por reincidencia', patterns: [/reinciden|dos\s+o\s+m[áa]s\s+sanciones|acumulad/i] },
      { desc: 'Verificación en Pladicop', patterns: [/pladicop/i] },
    ],
  },
  {
    id: 'Q9-area-usuaria',
    question: 'De acuerdo a la norma de contrataciones, cuales son las funciones y responsabilidades del área usuaria',
    keyPoints: [
      { desc: 'Formula el requerimiento (EETT/TDR)', patterns: [/especificaciones\s+t[ée]cnicas|t[ée]rminos\s+de\s+referencia|requerimiento/i], critical: true },
      { desc: 'CMN programación', patterns: [/cuadro\s+multianual|CMN\b|programaci[óo]n/i], critical: true },
      { desc: 'Gestión de riesgos', patterns: [/gesti[óo]n\s+de\s+riesgos|identificaci[óo]n.*riesgos/i] },
      { desc: 'Coordinación con la DEC', patterns: [/\bDEC\b|dependencia\s+encargada/i], critical: true },
      { desc: 'Conformidad de la prestación', patterns: [/conformidad/i], critical: true },
      { desc: 'Finalidad pública', patterns: [/finalidad\s+p[úu]blica/i] },
      { desc: 'Área técnica estratégica', patterns: [/[áa]rea\s+t[ée]cnica\s+estrat[ée]gica/i] },
    ],
  },
];

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

async function runPipeline(question: string): Promise<{ text: string; nChunks: number; panoramic: boolean }> {
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

  // RESCATE CONDICIONAL de fuente primaria — espejo del route real:
  // solo actúa si el pool no trae suficientes chunks de Ley/Reglamento.
  const esPrim0 = (t: string) => t === 'ley' || t === 'reglamento';
  const necesitaRescate =
    [...combined.values()].filter((c) => esPrim0(c.doc_type)).length < 3;
  const rewrites0 = necesitaRescate ? await rewriteToLegalQueries(question) : [];
  for (const frase of rewrites0) {
    const er = await embedOne(frase, 'RETRIEVAL_QUERY');
    for (const tipo of ['ley', 'reglamento'] as const) {
      (await search(frase, er, 3, tipo)).forEach(
        (c) => combined.has(c.chunk_id) || combined.set(c.chunk_id, c),
      );
    }
  }
  if (necesitaRescate) for (const tipo of ['ley', 'reglamento'] as const) {
    (await search(question, embs[0], 4, tipo)).forEach(
      (c) => combined.has(c.chunk_id) || combined.set(c.chunk_id, c),
    );
  }

  const finalMax = panoramic ? 25 : 15;
  let chunks = [...combined.values()]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, finalMax);

  // Cobertura por faceta (espejo del route real): top-1 de cada faceta
  // debe sobrevivir el corte.
  if (facetTop.length > 0) {
    const inFinal = new Set(chunks.map((c) => c.chunk_id));
    const missing = [...new Map(facetTop.filter((c) => !inFinal.has(c.chunk_id)).map((c) => [c.chunk_id, c])).values()];
    if (missing.length > 0) {
      chunks = [...chunks.slice(0, Math.max(chunks.length - missing.length, 0)), ...missing];
    }
  }

  // Cupo garantizado de fuente primaria (espejo del route)
  {
    const esPrim = (t: string) => t === 'ley' || t === 'reglamento';
    const yaP = chunks.filter((c) => esPrim(c.doc_type)).length;
    if (yaP < 3) {
      const inFinal = new Set(chunks.map((c) => c.chunk_id));
      const cand = [...combined.values()]
        .filter((c) => esPrim(c.doc_type) && !inFinal.has(c.chunk_id))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3 - yaP);
      if (cand.length) chunks = [...chunks.slice(0, chunks.length - cand.length), ...cand];
    }
  }

  // Cosido de fragmentos vecinos (espejo del route)
  {
    const vecinos = await fetchNeighborChunks(admin, chunks as never, {
      topN: 5,
      maxAdd: panoramic ? 3 : 5,
    });
    if (vecinos.length > 0) chunks = mergeNeighbors(chunks as never, vecinos as never) as typeof chunks;
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
  return { text: result.text, nChunks: chunks.length, panoramic };
}

function scoreAnswer(text: string, keyPoints: KeyPoint[]) {
  let earned = 0;
  let possible = 0;
  const misses: string[] = [];
  const hits: string[] = [];
  for (const kp of keyPoints) {
    const weight = kp.critical ? 2 : 1;
    possible += weight;
    const hit = kp.patterns.some((rx) => rx.test(text));
    if (hit) {
      earned += weight;
      hits.push(kp.desc);
    } else {
      misses.push(kp.desc + (kp.critical ? ' ⚠️CRÍTICO' : ''));
    }
  }
  return { pct: Math.round((earned / possible) * 100), hits, misses };
}

async function main() {
  const onlyId = process.argv[2]; // permite correr un caso: npx tsx ... Q1-modalidades
  const results: Array<{ id: string; pct: number; misses: string[]; empty: boolean }> = [];

  for (const tc of CASES) {
    if (onlyId && tc.id !== onlyId) continue;
    console.log('\n' + '═'.repeat(72));
    console.log('▶', tc.id);
    console.log('  ', tc.question.slice(0, 100));
    console.log('═'.repeat(72));
    try {
      // Espejo del cliente real (chat-panel.tsx): ante respuesta vacía
      // (filtro RECITATION intermitente) se reintenta hasta 2 veces.
      let text = '';
      let nChunks = 0;
      let panoramic = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const r = await runPipeline(tc.question);
        text = r.text;
        nChunks = r.nChunks;
        panoramic = r.panoramic;
        if (text && text.length > 0) break;
        console.log(`   ⚠️ respuesta vacía (intento ${attempt}/3, reintentando como el cliente)...`);
      }
      if (!text || text.length === 0) {
        console.log('❌ RESPUESTA VACÍA (content filter?) tras 3 intentos');
        results.push({ id: tc.id, pct: 0, misses: ['RESPUESTA VACÍA'], empty: true });
        continue;
      }
      const { pct, hits, misses } = scoreAnswer(text, tc.keyPoints);
      console.log(`chunks=${nChunks} panorámica=${panoramic} respuesta=${text.length} chars`);
      console.log(`SCORE: ${pct}%  (${hits.length}/${tc.keyPoints.length} puntos)`);
      if (misses.length > 0) {
        console.log('FALTARON:');
        misses.forEach((m) => console.log('  ✗', m));
      }
      console.log('\n--- Primeras 30 líneas de la respuesta ---');
      console.log(text.split('\n').slice(0, 30).join('\n').slice(0, 2500));
      results.push({ id: tc.id, pct, misses, empty: false });
    } catch (e) {
      console.log('❌ ERROR:', (e as Error).message);
      results.push({ id: tc.id, pct: 0, misses: ['ERROR: ' + (e as Error).message], empty: true });
    }
  }

  console.log('\n\n' + '═'.repeat(72));
  console.log(' RESUMEN FINAL');
  console.log('═'.repeat(72));
  let sum = 0;
  for (const r of results) {
    const icon = r.pct >= 80 ? '✅' : r.pct >= 60 ? '🟡' : '❌';
    console.log(`${icon} ${r.id.padEnd(24)} ${String(r.pct).padStart(3)}%`);
    sum += r.pct;
  }
  console.log('─'.repeat(40));
  console.log(`PROMEDIO: ${Math.round(sum / results.length)}%`);
}

main().catch(console.error);
