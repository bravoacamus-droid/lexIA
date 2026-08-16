/**
 * Test forense de las 2 preguntas exactas de la reunión con César
 * el 30/06/2026 donde la voz respondió mal:
 *   Q1: "Cuáles son los plazos para realizar una difusión de requerimiento"
 *   Q2: "Cuántas veces como mínimo la DEC debe realizar la evaluación
 *        del Cuadro Multianual de Necesidades"
 *
 * Simula la respuesta del CHAT (con buildChatSystemPrompt) y de la
 * VOZ (con VOICE_SYSTEM_PROMPT) usando el mismo hybrid_search para
 * comparar el efecto del prompt sobre la misma data recuperada.
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
  {
    id: 'Q1',
    text: 'Cuáles son los plazos para realizar una difusión de requerimiento',
    truth: 'Art 51.2 Ley 32069: plazo no menor de cinco días hábiles para consultas técnicas.',
  },
  {
    id: 'Q2',
    text: 'Cuántas veces como mínimo la DEC debe realizar la evaluación del Cuadro Multianual de Necesidades',
    truth: 'La regla exacta debe estar en Directiva PAC 0002-2025-EF/54.01 o Lineamientos. Verificar respuesta.',
  },
];

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  for (const q of QUESTIONS) {
    console.log('\n════════════════════════════════════════════════════════════');
    console.log(`  ${q.id}: ${q.text}`);
    console.log('════════════════════════════════════════════════════════════');
    console.log(`Verdad esperada: ${q.truth}\n`);

    // Retrieval común
    const emb = await embedOne(q.text, 'RETRIEVAL_QUERY');
    const { data: chunks } = await (admin as any).rpc('hybrid_search', {
      query_text: q.text,
      query_embedding: emb,
      match_count: 8,
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

    console.log(`📥 Sources devueltos por hybrid_search (${rows.length}):`);
    rows.forEach((r, i) => {
      console.log(
        `  [${i + 1}] ${r.doc_type.padEnd(15)} · ${(r.doc_number || '').slice(0, 45).padEnd(45)} · sim=${r.similarity.toFixed(3)}`,
      );
    });

    const sources: ChatSource[] = rows.map((c) => ({
      chunk_id: c.chunk_id,
      doc_id: c.document_id,
      doc_title: c.doc_title,
      doc_type: c.doc_type,
      doc_number: c.doc_number,
      snippet: c.content,
    }));

    // ─── CHAT ───────────────────────────────────────
    const chatPrompt = buildChatSystemPrompt(sources, null);
    const t0 = Date.now();
    const { text: chatResponse } = await generateText({
      model: chatModel,
      system: chatPrompt,
      prompt: q.text,
      temperature: 0.3,
    });
    console.log(`\n🔵 CHAT (${Date.now() - t0}ms):\n`);
    console.log(chatResponse.split('\n').map((l) => '   ' + l).join('\n'));

    // ─── VOZ ────────────────────────────────────────
    // La voz recibe: VOICE_SYSTEM_PROMPT + formatResultsForLLM del RAG
    const voiceRagResult = formatResultsForLLM(
      rows.map((r) => ({
        type: r.doc_type,
        citation: r.doc_number || r.doc_type,
        title: r.doc_title,
        snippet: r.content,
        similarity: r.similarity,
      })),
    );

    const voiceContext = `${VOICE_SYSTEM_PROMPT}\n\n==== TOOL search_normativa RESULT ====\n${voiceRagResult}\n=====================================`;

    const t1 = Date.now();
    const { text: voiceResponse } = await generateText({
      model: chatModel,
      system: voiceContext,
      prompt: q.text,
      temperature: 0.3,
    });
    console.log(`\n🔴 VOZ (${Date.now() - t1}ms):\n`);
    console.log(voiceResponse.split('\n').map((l) => '   ' + l).join('\n'));

    // ─── Comparación ────────────────────────────────
    console.log(`\n📊 Comparación de longitud:`);
    console.log(`   CHAT: ${chatResponse.length} chars, ${chatResponse.split(/\s+/).length} palabras`);
    console.log(`   VOZ:  ${voiceResponse.length} chars, ${voiceResponse.split(/\s+/).length} palabras`);
  }

  console.log('\n════════════════════════════════════════════════════════════');
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
