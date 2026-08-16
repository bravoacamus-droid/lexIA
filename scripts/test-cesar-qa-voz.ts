/**
 * Test de la VOZ contra las mismas preguntas de César.
 *
 * La llamada usa Gemini Live API (WebSocket + audio), imposible de
 * automatizar aquí. PERO el 90% de la calidad depende de dos piezas
 * que SÍ podemos testear con exactitud:
 *   1. searchNormativa() — el tool que el modelo llama (mismo RAG).
 *   2. El system prompt de voz (buildVoiceSystemInstruction) + el
 *      resultado del tool → simulamos el turno con generateText.
 *
 * Si estas dos piezas responden bien, la llamada real responde bien
 * (la única diferencia es el TTS).
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { generateText } from 'ai';
import { chatModel } from '../src/lib/ai/gemini';
import { searchNormativa, formatResultsForLLM } from '../src/lib/ai/voice-search';
import { buildVoiceSystemPrompt } from '../src/lib/ai/voice-config';

interface KeyPoint {
  desc: string;
  patterns: RegExp[];
  critical?: boolean;
}

const CASES: Array<{ id: string; question: string; keyPoints: KeyPoint[] }> = [
  {
    id: 'V1-modalidades',
    question: '¿Cuáles son las modalidades de contratación pública eficiente?',
    keyPoints: [
      { desc: 'Contratos menores', patterns: [/contratos?\s+menor/i], critical: true },
      { desc: 'Compra centralizada', patterns: [/centralizada/i], critical: true },
      { desc: 'Compra corporativa', patterns: [/corporativa/i], critical: true },
      { desc: 'Encargo', patterns: [/encargo/i] },
      { desc: 'Acuerdo marco', patterns: [/acuerdo\s+marco/i], critical: true },
      { desc: 'Innovación', patterns: [/innovaci[óo]n/i] },
    ],
  },
  {
    id: 'V2-impedimentos',
    question: '¿Qué tipos de impedimentos de contratación existen?',
    keyPoints: [
      { desc: 'Por cargo/personal', patterns: [/cargo|personal|funcionario/i], critical: true },
      { desc: 'Parentesco', patterns: [/parentesco|c[óo]nyuge/i], critical: true },
      { desc: 'Personas jurídicas', patterns: [/personas?\s+jur[íi]dicas/i], critical: true },
      { desc: 'Sanciones', patterns: [/sanci[óo]n|inhabilita/i], critical: true },
      { desc: '6 meses', patterns: [/seis\s+meses|6\s+meses/i] },
    ],
  },
  {
    id: 'V5-difusion',
    question: '¿Qué es la difusión del requerimiento y cuáles son sus plazos?',
    keyPoints: [
      { desc: 'Consulta al mercado', patterns: [/consulta\s+al\s+mercado/i], critical: true },
      { desc: 'Pladicop', patterns: [/pladicop/i], critical: true },
      { desc: '5 días consultas', patterns: [/cinco\s+d[íi]as|5\s+d[íi]as/i], critical: true },
      { desc: '6 días absolución', patterns: [/seis\s+d[íi]as|6\s+d[íi]as/i], critical: true },
      { desc: 'Previa a convocatoria', patterns: [/previa|antes\s+de/i] },
    ],
  },
  {
    id: 'V8-multa',
    question:
      'Con la ley 32069, si un postor no suscribe el contrato, ¿cómo es el procedimiento de multa y qué pasa si no la paga?',
    keyPoints: [
      { desc: 'Multa 3-10%', patterns: [/3\s*%|tres\s+por\s+ciento/i], critical: true },
      { desc: 'Ejecución coactiva', patterns: [/coactiv/i], critical: true },
      { desc: 'Retención en nuevos contratos', patterns: [/retenci[óo]n|retener/i], critical: true },
      { desc: 'No inhabilitación automática', patterns: [/ya\s+no|no\s+(?:se\s+)?inhabilita\s+autom|cambi/i] },
    ],
  },
];

async function main() {
  const results: Array<{ id: string; pct: number; misses: string[] }> = [];

  for (const tc of CASES) {
    console.log('\n' + '═'.repeat(70));
    console.log('▶', tc.id, '—', tc.question);
    console.log('═'.repeat(70));

    // 1. El tool searchNormativa (lo que el modelo Live llamaría)
    const searchResults = await searchNormativa({
      query: tc.question,
      match_count: 5,
    });
    console.log(`Tool search: ${searchResults.length} resultados`);
    searchResults.slice(0, 3).forEach((r, i) =>
      console.log(`  [${i + 1}] ${r.citation.slice(0, 60)} (sim=${r.similarity.toFixed(3)})`),
    );

    const toolResponse = formatResultsForLLM(searchResults);

    // 2. Simular el turno de voz: system de voz + tool response + pregunta
    const systemInstruction = buildVoiceSystemPrompt(null);
    const result = await generateText({
      model: chatModel,
      system: systemInstruction,
      messages: [
        { role: 'user', content: tc.question },
        {
          role: 'assistant',
          content: `[Llamé a search_normativa("${tc.question}")]`,
        },
        {
          role: 'user',
          content: `[RESULTADO DE search_normativa]:\n${toolResponse}\n\nAhora responde la pregunta original del usuario con esta información.`,
        },
      ],
      temperature: 0.3,
    });
    const text = result.text;
    if (!text) {
      console.log('❌ RESPUESTA VACÍA');
      results.push({ id: tc.id, pct: 0, misses: ['VACÍA'] });
      continue;
    }

    let earned = 0;
    let possible = 0;
    const misses: string[] = [];
    for (const kp of tc.keyPoints) {
      const w = kp.critical ? 2 : 1;
      possible += w;
      if (kp.patterns.some((rx) => rx.test(text))) earned += w;
      else misses.push(kp.desc + (kp.critical ? ' ⚠️' : ''));
    }
    const pct = Math.round((earned / possible) * 100);
    console.log(`SCORE: ${pct}% | respuesta ${text.length} chars`);
    if (misses.length) misses.forEach((m) => console.log('  ✗', m));
    console.log('--- Respuesta (500 chars) ---');
    console.log(text.slice(0, 500));
    results.push({ id: tc.id, pct, misses });
  }

  console.log('\n' + '═'.repeat(70));
  console.log(' RESUMEN VOZ');
  console.log('═'.repeat(70));
  let sum = 0;
  for (const r of results) {
    const icon = r.pct >= 80 ? '✅' : r.pct >= 60 ? '🟡' : '❌';
    console.log(`${icon} ${r.id.padEnd(20)} ${String(r.pct).padStart(3)}%`);
    sum += r.pct;
  }
  console.log(`PROMEDIO: ${Math.round(sum / results.length)}%`);
}

main().catch(console.error);
