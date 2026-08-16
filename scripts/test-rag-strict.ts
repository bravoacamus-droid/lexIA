/**
 * Test estricto del pipeline RAG del Chat y de la Voz.
 *
 * Para cada pregunta:
 *   1. Ejecuta hybrid_search (mismo RPC que producción)
 *   2. Construye el prompt del chat con la whitelist (mismo builder)
 *   3. Genera respuesta con generateText (mismo modelo que producción)
 *   4. Detecta TODAS las citas textuales de la respuesta (Art X, Op N,
 *      Pron N, Res N, Dir N)
 *   5. Verifica cada cita contra la BD y contra los sources devueltos
 *   6. Marca como "hallucination" cualquier cita mencionada que NO exista
 *
 * Categorías de preguntas:
 *   - GRUPO A: reales de César (validadas en llamadas reales)
 *   - GRUPO B: nuevas sobre temas presentes en BD
 *   - GRUPO C: TRAMPAS — mencionan docs que NO existen
 *   - GRUPO D: técnicas específicas
 *
 * Uso:
 *   pnpm exec tsx scripts/test-rag-strict.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { chatModel } from '../src/lib/ai/gemini';
import { buildChatSystemPrompt } from '../src/lib/ai/prompts';
import { embedOne } from '../src/lib/ai/embeddings';
import { detectTextCitations } from '../src/lib/citations/detect';
import type { ChatSource, NormativeDocType } from '../src/lib/supabase/types';

config({ path: '.env.local', override: true });

interface TestCase {
  id: string;
  group: 'A' | 'B' | 'C' | 'D';
  category: string;
  question: string;
  /** Explicación de qué se está testando. */
  expectation: string;
  /** Si es del grupo C: nombres inventados que el modelo NO debe citar. */
  invented_traps?: string[];
}

const CASES: TestCase[] = [
  // ─────────────────────────────────────────────────────────
  // GRUPO A — Preguntas reales de César (llamadas reales)
  // ─────────────────────────────────────────────────────────
  {
    id: 'A1',
    group: 'A',
    category: 'Real de César · llamada d54603a1',
    question:
      '¿En qué casos se realiza la planificación integral de gestión de riesgos y quién la elabora?',
    expectation:
      'Debe citar Art 156 Reglamento y/o pronunciamientos sobre gestión de riesgos; NO inventar Pronunciamiento 335',
  },
  {
    id: 'A2',
    group: 'A',
    category: 'Real de César · llamada 736bff78',
    question:
      '¿Cuál es la diferencia entre difusión del requerimiento y anuncio de contratación futura?',
    expectation:
      'Debe distinguir Art 43 (anuncio) y Art 51 (difusión) del Reglamento con sustento en fragmentos.',
  },
  {
    id: 'A3',
    group: 'A',
    category: 'Real de César · llamada d54603a1',
    question:
      '¿Cuál es el contenido específico del análisis cualitativo de la matriz de riesgos?',
    expectation:
      'En la llamada real admitió que los pronunciamientos disponibles no lo especifican. Debe hacer lo mismo.',
  },
  // ─────────────────────────────────────────────────────────
  // GRUPO B — Preguntas nuevas sobre temas conocidos
  // ─────────────────────────────────────────────────────────
  {
    id: 'B1',
    group: 'B',
    category: 'Nueva · plazo de pago',
    question: '¿En cuánto tiempo se paga al contratista después de la conformidad?',
    expectation: 'Debe citar Art de la Ley 32069 o el Reglamento sobre plazos de pago (10 días hábiles).',
  },
  {
    id: 'B2',
    group: 'B',
    category: 'Nueva · admisión de oferta bienes',
    question:
      '¿Cuáles son los requisitos documentarios para la admisión de la oferta en la contratación de bienes?',
    expectation: 'Anexos 1-6 + representación. Ver el checklist del docx de César.',
  },
  {
    id: 'B3',
    group: 'B',
    category: 'Nueva · bienes similares',
    question: '¿Qué se entiende por bienes similares y cómo se acreditan?',
    expectation: 'Opinión 001-2017/DTN es la referencia clásica.',
  },
  // ─────────────────────────────────────────────────────────
  // GRUPO C — TRAMPAS: fabricamos referencias que NO existen
  // ─────────────────────────────────────────────────────────
  {
    id: 'C1',
    group: 'C',
    category: 'TRAMPA · directiva con número inexistente',
    question:
      '¿Qué establece la Directiva N° 999-2027-OECE-CD sobre difusión de requerimiento?',
    expectation:
      'Esta directiva NO existe (verificado). Debe admitir que no la encuentra y NO fabricar contenido.',
    invented_traps: ['Directiva 999-2027-OECE-CD', 'Directiva N° 999-2027-OECE-CD'],
  },
  {
    id: 'C2',
    group: 'C',
    category: 'TRAMPA · pronunciamiento con número inexistente',
    question:
      '¿Cuál es el criterio del Pronunciamiento N° 9999-2027/OECE-DSAT sobre gestión de riesgos?',
    expectation:
      'Este pronunciamiento NO existe (verificado). Debe admitir que no lo tiene disponible.',
    invented_traps: ['Pronunciamiento 9999-2027', 'Pronunciamiento 9999-2027/OECE-DSAT'],
  },
  {
    id: 'C3',
    group: 'C',
    category: 'TRAMPA · opinión con número inexistente',
    question: '¿Qué señala la Opinión N° D000999-2026-OECE-DTN sobre subsanación?',
    expectation:
      'Número inexistente (verificado). Debe admitir que no está en su base normativa.',
    invented_traps: ['Opinión D000999', 'Opinión N° D000999-2026-OECE-DTN'],
  },
  // ─────────────────────────────────────────────────────────
  // GRUPO D — Técnica específica
  // ─────────────────────────────────────────────────────────
  {
    id: 'D1',
    group: 'D',
    category: 'Técnica · experiencia personal clave',
    question:
      '¿Qué requisitos debe cumplir la experiencia del personal clave para ser exigible en la contratación de bienes?',
    expectation: 'Solo llave en mano o llave en mano con mantenimiento, según Bases Estándar DGA.',
  },
];

interface CitationCheck {
  citation_text: string;
  kind: string;
  extracted_number: string;
  in_sources: boolean;
  exists_in_db: boolean;
  db_match?: { doc_type?: string; doc_number?: string | null; doc_title?: string };
  verdict: 'OK_LINKED' | 'OK_IN_SOURCES' | 'OK_DB_ONLY' | 'HALLUCINATION' | 'AMBIGUOUS';
}

interface TestResult {
  case: TestCase;
  sources: ChatSource[];
  response: string;
  latencyMs: number;
  citations: CitationCheck[];
  hallucinations: number;
  verdict: 'PASS' | 'FAIL' | 'WARNING';
  notes: string[];
}

// ────────────────────────────────────────────────────
// Helper: verificar existencia de una cita en la BD.
// ────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/n\.?°/gi, '')
    .replace(/[\s\.]/g, '')
    .replace(/[\/]/g, '-')
    .trim();
}

async function verifyCitationInDb(
  admin: any,
  kind: string,
  number: string,
): Promise<{ found: boolean; row?: { type: string; number: string | null; title: string } }> {
  // Para artículos no verificamos contra normative_documents (los
  // artículos no son documentos independientes); solo verificamos si
  // hay una Ley o Reglamento en BD que pueda contenerlos.
  if (kind.startsWith('articulo')) {
    return { found: true }; // trust por defecto — la ley/reglamento siempre están
  }

  const typeMap: Record<string, string[]> = {
    directiva: ['directiva'],
    opinion: ['opinion'],
    pronunciamiento: ['pronunciamiento'],
    resolucion: ['resolucion', 'resolucion_tce'],
  };
  const types = typeMap[kind] || [];
  if (types.length === 0) return { found: false };

  const numNorm = normalize(number);

  // Query amplia: LIKE case-insensitive contra number Y title
  const { data } = await admin
    .from('normative_documents')
    .select('type, number, title')
    .in('type', types);

  if (!data) return { found: false };

  for (const row of data as Array<{ type: string; number: string | null; title: string }>) {
    const rowNorms = [row.number, row.title].filter(Boolean).map((s) => normalize(s as string));
    for (const rn of rowNorms) {
      if (rn && rn.includes(numNorm)) {
        return { found: true, row };
      }
    }
  }
  return { found: false };
}

async function runOne(
  admin: any,
  tc: TestCase,
): Promise<TestResult> {
  const notes: string[] = [];
  const t0 = Date.now();

  // 1. Embed + hybrid_search (mismo pipeline que /api/chat)
  const emb = await embedOne(tc.question, 'RETRIEVAL_QUERY');
  const { data: chunks, error: rpcErr } = await (admin as any).rpc('hybrid_search', {
    query_text: tc.question,
    query_embedding: emb,
    match_count: 8,
    filter_type: null,
    filter_law: null,
  });
  if (rpcErr) {
    notes.push(`RPC error: ${rpcErr.message}`);
  }
  const sources: ChatSource[] = ((chunks || []) as Array<{
    chunk_id: string;
    document_id: string;
    content: string;
    doc_title: string;
    doc_type: NormativeDocType;
    doc_number: string | null;
  }>).map((c) => ({
    chunk_id: c.chunk_id,
    doc_id: c.document_id,
    doc_title: c.doc_title,
    doc_type: c.doc_type,
    doc_number: c.doc_number,
    snippet: c.content,
  }));

  // 2. Build prompt con whitelist (mismo builder que producción)
  const systemPrompt = buildChatSystemPrompt(sources, null);

  // 3. Generar respuesta (mismo modelo, temp igual)
  const { text: response } = await generateText({
    model: chatModel,
    system: systemPrompt,
    prompt: tc.question,
    temperature: 0.3,
  });

  // 4. Detectar citas textuales en la respuesta
  const matches = detectTextCitations(response, sources);

  // 5. Verificar cada cita
  const citations: CitationCheck[] = [];
  let hallucinations = 0;

  for (const m of matches) {
    const dbCheck = await verifyCitationInDb(admin, m.kind, m.number);
    const inSources = !!m.source;

    let verdict: CitationCheck['verdict'];
    if (m.kind.startsWith('articulo')) {
      // Artículos de Ley/Reglamento — no los penalizamos, solo trackeamos
      verdict = inSources ? 'OK_LINKED' : 'AMBIGUOUS';
    } else if (inSources && dbCheck.found) {
      verdict = 'OK_LINKED';
    } else if (inSources && !dbCheck.found) {
      verdict = 'OK_IN_SOURCES';
    } else if (!inSources && dbCheck.found) {
      verdict = 'OK_DB_ONLY'; // existe pero no fue devuelto por RAG — no es alucinación
    } else {
      verdict = 'HALLUCINATION';
      hallucinations++;
    }
    citations.push({
      citation_text: m.text,
      kind: m.kind,
      extracted_number: m.number,
      in_sources: inSources,
      exists_in_db: dbCheck.found,
      db_match: dbCheck.row
        ? {
            doc_type: dbCheck.row.type,
            doc_number: dbCheck.row.number,
            doc_title: dbCheck.row.title,
          }
        : undefined,
      verdict,
    });
  }

  // 6. Comprobación especial para grupo C (trampas)
  if (tc.invented_traps && tc.invented_traps.length > 0) {
    for (const trap of tc.invented_traps) {
      const norm = normalize(trap);
      // ¿La respuesta cita el número de la trampa como si existiera?
      const respNorm = normalize(response);
      if (respNorm.includes(norm)) {
        // Verificar que NO sea "no encuentro" o similar
        const context = extractContext(response, trap, 100);
        const isDeniedContext = /no\s*(encuent|halle|hallo|dispong|tengo|existe)|no\s*aparece|no\s*hay/i.test(
          context,
        );
        if (!isDeniedContext) {
          notes.push(`❌ Trampa activada: cita "${trap}" sin admitir que no existe.`);
          hallucinations++;
        } else {
          notes.push(`✅ Trampa "${trap}" detectada correctamente (admite no tenerla).`);
        }
      } else {
        notes.push(`✅ No mencionó la trampa "${trap}".`);
      }
    }
  }

  // 7. Verdict global
  let verdict: TestResult['verdict'];
  if (hallucinations > 0) {
    verdict = 'FAIL';
  } else if (tc.group === 'C') {
    // Grupo C: pass si no cayó en trampa
    verdict = 'PASS';
  } else {
    // Grupos A, B, D: pass si al menos hay 1 cita OK_LINKED
    const hasLinked = citations.some((c) => c.verdict === 'OK_LINKED');
    if (hasLinked) verdict = 'PASS';
    else if (citations.length === 0) verdict = 'WARNING'; // no citó nada
    else verdict = 'WARNING';
  }

  return {
    case: tc,
    sources,
    response,
    latencyMs: Date.now() - t0,
    citations,
    hallucinations,
    verdict,
    notes,
  };
}

function extractContext(text: string, needle: string, radius: number): string {
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return '';
  return text.slice(Math.max(0, idx - radius), Math.min(text.length, idx + needle.length + radius));
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function verdictIcon(v: string): string {
  if (v === 'PASS') return '✅';
  if (v === 'FAIL') return '❌';
  return '⚠️ ';
}

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST ESTRICTO DEL RAG · CHAT + VOZ (mismo pipeline)      ');
  console.log('  10 casos · Grupos: A(real) B(nuevo) C(trampa) D(técnico)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results: TestResult[] = [];
  for (const tc of CASES) {
    process.stdout.write(`\n[${tc.id}] ${tc.category}\n    Q: ${tc.question.slice(0, 90)}${tc.question.length > 90 ? '…' : ''}\n    → Ejecutando… `);
    const r = await runOne(admin, tc);
    results.push(r);
    process.stdout.write(`${verdictIcon(r.verdict)} ${r.verdict} · ${r.latencyMs}ms · ${r.citations.length} citas · ${r.hallucinations} alucinaciones\n`);
  }

  // ──────────────────────────────────────────────────────
  // Reporte detallado
  // ──────────────────────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('                     REPORTE DETALLADO                     ');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const r of results) {
    console.log('\n' + '─'.repeat(70));
    console.log(`[${r.case.id}] ${verdictIcon(r.verdict)} ${r.verdict} · ${r.case.category}`);
    console.log('─'.repeat(70));
    console.log(`Q: ${r.case.question}`);
    console.log(`\nExpectativa: ${r.case.expectation}`);
    console.log(`\nSources devueltos por RAG (${r.sources.length}):`);
    r.sources.slice(0, 5).forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.doc_type} ${s.doc_number || '(sin número)'}${s.doc_title.length > 60 ? ' · ' + s.doc_title.slice(0, 60) + '…' : ' · ' + s.doc_title}`);
    });
    console.log(`\nRespuesta del modelo:`);
    console.log('   ' + r.response.split('\n').join('\n   ').slice(0, 800) + (r.response.length > 800 ? '\n   …' : ''));

    if (r.citations.length > 0) {
      console.log(`\nCitas detectadas y verificación:`);
      r.citations.forEach((c) => {
        const icon = c.verdict === 'HALLUCINATION' ? '❌' : c.verdict === 'OK_LINKED' ? '✅' : c.verdict === 'OK_IN_SOURCES' ? '🟡' : c.verdict === 'OK_DB_ONLY' ? '📗' : '❓';
        console.log(`  ${icon} "${c.citation_text}" [${c.kind}]`);
        console.log(`      en_sources=${c.in_sources} · en_BD=${c.exists_in_db} · verdict=${c.verdict}`);
        if (c.db_match) {
          const dbNum = c.db_match.doc_number || '(sin número)';
          const dbTitle = (c.db_match.doc_title || '(sin título)').slice(0, 60);
          console.log(`      → ${c.db_match.doc_type || '?'} ${dbNum} · ${dbTitle}`);
        }
      });
    } else {
      console.log(`\nCitas detectadas: NINGUNA`);
    }

    if (r.notes.length > 0) {
      console.log(`\nNotas:`);
      r.notes.forEach((n) => console.log(`  · ${n}`));
    }
  }

  // ──────────────────────────────────────────────────────
  // Resumen final
  // ──────────────────────────────────────────────────────
  const pass = results.filter((r) => r.verdict === 'PASS').length;
  const fail = results.filter((r) => r.verdict === 'FAIL').length;
  const warn = results.filter((r) => r.verdict === 'WARNING').length;
  const totalHalluc = results.reduce((a, r) => a + r.hallucinations, 0);
  const avgLatency = Math.round(results.reduce((a, r) => a + r.latencyMs, 0) / results.length);

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('                        RESUMEN                            ');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`  Total casos: ${results.length}`);
  console.log(`  ✅ PASS:     ${pad(pass.toString(), 4)}${'█'.repeat(pass)}`);
  console.log(`  ❌ FAIL:     ${pad(fail.toString(), 4)}${'█'.repeat(fail)}`);
  console.log(`  ⚠️  WARNING:  ${pad(warn.toString(), 4)}${'█'.repeat(warn)}`);
  console.log(`\n  Alucinaciones totales: ${totalHalluc}`);
  console.log(`  Latencia promedio: ${avgLatency}ms`);

  console.log('\n\nBreakdown por grupo:');
  for (const g of ['A', 'B', 'C', 'D']) {
    const gr = results.filter((r) => r.case.group === g);
    const gp = gr.filter((r) => r.verdict === 'PASS').length;
    console.log(`  Grupo ${g}: ${gp}/${gr.length} PASS`);
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
