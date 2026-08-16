/**
 * Test exhaustivo de 10 preguntas variadas (3 etapas del ciclo de
 * contratación) para detectar si los errores de la voz se replican
 * en múltiples temas o son casos aislados.
 *
 * Para cada pregunta:
 *   - Ejecuta hybrid_search
 *   - Genera respuesta con el prompt del CHAT y con el prompt de la VOZ
 *   - Detecta si la respuesta admite ignorancia ("no encuentro")
 *   - Reporta longitud, artículos citados, alucinaciones potenciales
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { chatModel } from '../src/lib/ai/gemini';
import { buildChatSystemPrompt } from '../src/lib/ai/prompts';
import { VOICE_SYSTEM_PROMPT } from '../src/lib/ai/voice-config';
import { embedOne } from '../src/lib/ai/embeddings';
import { formatResultsForLLM } from '../src/lib/ai/voice-search';
import type { ChatSource, NormativeDocType } from '../src/lib/supabase/types';

config({ path: '.env.local', override: true });

const QUESTIONS = [
  // ─── PREPARATORIAS ───
  { id: 'P1', tema: 'Difusión requerimiento', q: 'Cuáles son los plazos exactos para la difusión del requerimiento' },
  { id: 'P2', tema: 'CMN', q: 'Cuándo debe registrarse el Cuadro Multianual de Necesidades' },
  { id: 'P3', tema: 'TDR direccionamiento', q: 'Qué se considera direccionamiento en los términos de referencia' },
  // ─── SELECCIÓN ───
  { id: 'S1', tema: 'Subsanación oferta', q: 'Qué documentos de la oferta pueden subsanarse y cuál es el plazo' },
  { id: 'S2', tema: 'Apelación tribunal', q: 'Cuál es el plazo y el monto de la garantía para apelar ante el Tribunal' },
  { id: 'S3', tema: 'Bienes similares', q: 'Cómo se define y acredita la experiencia en bienes similares' },
  { id: 'S4', tema: 'Personal clave', q: 'Cuándo procede exigir experiencia del personal clave en la contratación de bienes' },
  // ─── EJECUCIÓN ───
  { id: 'E1', tema: 'Ampliación plazo obras', q: 'Cuáles son las causales para solicitar ampliación de plazo en obras' },
  { id: 'E2', tema: 'Pago contratista', q: 'En qué plazo se paga al contratista tras la conformidad' },
  { id: 'E3', tema: 'Adicional obra', q: 'Cuál es el porcentaje máximo de adicional en obras y su procedimiento' },
];

interface Result {
  id: string;
  tema: string;
  chat: {
    length: number;
    admitedIgnorance: boolean;
    citedArticles: string[];
    firstLines: string;
  };
  voice: {
    length: number;
    admitedIgnorance: boolean;
    citedArticles: string[];
    firstLines: string;
  };
  consistent: boolean;
}

const IGNORANCE_MARKERS = [
  'no tengo información',
  'no encuentro',
  'no está',
  'no aparece',
  'no se detallan',
  'no dispongo',
  'no cuenta',
  'no consta',
];

function admitsIgnorance(text: string): boolean {
  const lower = text.toLowerCase();
  return IGNORANCE_MARKERS.some((m) => lower.includes(m));
}

function extractCitedArticles(text: string): string[] {
  const rx = /Art[íi]culo\s+(\d+(?:\.\d+)?)/gi;
  const found = new Set<string>();
  let m;
  while ((m = rx.exec(text)) !== null) {
    found.add(m[1]);
  }
  return Array.from(found).slice(0, 5);
}

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const results: Result[] = [];

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST EXHAUSTIVO · 10 preguntas de las 3 etapas         ');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const q of QUESTIONS) {
    process.stdout.write(`[${q.id}] ${q.tema}… `);

    // Retrieval
    const emb = await embedOne(q.q, 'RETRIEVAL_QUERY');
    const { data: chunks } = await (admin as any).rpc('hybrid_search', {
      query_text: q.q,
      query_embedding: emb,
      match_count: 10,
      filter_type: null,
      filter_law: null,
    });
    const rows = (chunks || []) as Array<{
      chunk_id: string;
      document_id: string;
      content: string;
      doc_title: string;
      doc_type: NormativeDocType;
      doc_number: string | null;
      similarity: number;
    }>;

    const sources: ChatSource[] = rows.map((c) => ({
      chunk_id: c.chunk_id,
      doc_id: c.document_id,
      doc_title: c.doc_title,
      doc_type: c.doc_type,
      doc_number: c.doc_number,
      snippet: c.content,
    }));

    // CHAT
    const chatPrompt = buildChatSystemPrompt(sources, null);
    const { text: chatText } = await generateText({
      model: chatModel,
      system: chatPrompt,
      prompt: q.q,
      temperature: 0.2,
    });

    // VOZ
    const voiceRag = formatResultsForLLM(
      rows.map((r) => ({
        type: r.doc_type,
        citation: r.doc_number || r.doc_type,
        title: r.doc_title,
        snippet: r.content,
        similarity: r.similarity,
      })),
    );
    const { text: voiceText } = await generateText({
      model: chatModel,
      system: `${VOICE_SYSTEM_PROMPT}\n\n==== TOOL search_normativa RESULT ====\n${voiceRag}`,
      prompt: q.q,
      temperature: 0.2,
    });

    const r: Result = {
      id: q.id,
      tema: q.tema,
      chat: {
        length: chatText.length,
        admitedIgnorance: admitsIgnorance(chatText),
        citedArticles: extractCitedArticles(chatText),
        firstLines: chatText.slice(0, 200).replace(/\n/g, ' '),
      },
      voice: {
        length: voiceText.length,
        admitedIgnorance: admitsIgnorance(voiceText),
        citedArticles: extractCitedArticles(voiceText),
        firstLines: voiceText.slice(0, 200).replace(/\n/g, ' '),
      },
      consistent: false,
    };
    r.consistent = r.chat.admitedIgnorance === r.voice.admitedIgnorance;
    results.push(r);
    process.stdout.write(
      `chat=${r.chat.length}ch/${r.chat.admitedIgnorance ? '❌' : '✓'} voz=${r.voice.length}ch/${r.voice.admitedIgnorance ? '❌' : '✓'} ${r.consistent ? '' : '⚠️'}\n`,
    );
  }

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  REPORTE COMPARATIVO CHAT vs VOZ                          ');
  console.log('═══════════════════════════════════════════════════════════\n');

  const table = results.map((r) => ({
    id: r.id,
    tema: r.tema.slice(0, 25).padEnd(25),
    chat_len: r.chat.length,
    chat_admit: r.chat.admitedIgnorance ? 'SI' : 'NO',
    voice_len: r.voice.length,
    voice_admit: r.voice.admitedIgnorance ? 'SI' : 'NO',
    disp: r.consistent ? '' : 'DISPARIDAD',
  }));

  console.log(
    'ID   Tema                      Chat_chars Chat_admite  Voz_chars  Voz_admite  Disparidad',
  );
  console.log('─'.repeat(96));
  for (const t of table) {
    console.log(
      `${t.id}   ${t.tema} ${String(t.chat_len).padStart(9)} ${t.chat_admit.padEnd(11)} ${String(t.voice_len).padStart(9)} ${t.voice_admit.padEnd(11)} ${t.disp}`,
    );
  }

  const chatAdmits = results.filter((r) => r.chat.admitedIgnorance).length;
  const voiceAdmits = results.filter((r) => r.voice.admitedIgnorance).length;
  const disparities = results.filter((r) => !r.consistent).length;

  console.log('\nRESUMEN:');
  console.log(`  Chat admite ignorancia: ${chatAdmits}/10`);
  console.log(`  Voz admite ignorancia:  ${voiceAdmits}/10`);
  console.log(`  Disparidad chat/voz:    ${disparities}/10`);
  console.log(
    `  Chat promedio longitud: ${Math.round(results.reduce((a, r) => a + r.chat.length, 0) / results.length)}`,
  );
  console.log(
    `  Voz promedio longitud:  ${Math.round(results.reduce((a, r) => a + r.voice.length, 0) / results.length)}`,
  );

  // Detalles de disparidades
  if (disparities > 0) {
    console.log('\n\nDISPARIDADES DETECTADAS:');
    for (const r of results.filter((r) => !r.consistent)) {
      console.log(
        `\n[${r.id}] ${r.tema}\n  Chat: ${r.chat.firstLines.slice(0, 150)}…\n  Voz:  ${r.voice.firstLines.slice(0, 150)}…`,
      );
    }
  }
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
