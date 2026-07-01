/**
 * Prueba de la mejora T1 con la pregunta EXACTA que Cesar uso en la
 * llamada del 30/06/2026 para comparar con LEXTA:
 *   "que cosas no esta permitido segun la norma hacer un requerimiento"
 *
 * Esperado: respuesta desglosada con sub-headings para cada prohibicion
 * (direccionamiento, exigencias desproporcionadas, modificacion,
 * fraccionamiento) — estilo LEXTA que Cesar mostro.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { chatModel } from '../src/lib/ai/gemini';
import { buildChatSystemPrompt } from '../src/lib/ai/prompts';
import { embedOne } from '../src/lib/ai/embeddings';
import type { ChatSource, NormativeDocType } from '../src/lib/supabase/types';

config({ path: '.env.local' });

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const question = 'que cosas no esta permitido segun la norma hacer un requerimiento';

  const emb = await embedOne(question, 'RETRIEVAL_QUERY');
  const { data: chunks } = await (admin as any).rpc('hybrid_search', {
    query_text: question,
    query_embedding: emb,
    match_count: 10,
    filter_type: null,
    filter_law: null,
  });

  const sources: ChatSource[] = ((chunks || []) as any[]).map((c) => ({
    chunk_id: c.chunk_id,
    doc_id: c.document_id,
    doc_title: c.doc_title,
    doc_type: c.doc_type as NormativeDocType,
    doc_number: c.doc_number,
    snippet: c.content,
  }));

  const systemPrompt = buildChatSystemPrompt(sources, 'entity');

  const { text } = await generateText({
    model: chatModel,
    system: systemPrompt,
    prompt: question,
    temperature: 0.2,
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`PREGUNTA: "${question}"`);
  console.log(`\nSources RAG:`);
  sources.slice(0, 5).forEach((s, i) => {
    console.log(`  [${i + 1}] ${s.doc_type} · ${(s.doc_number || '').slice(0, 45)}`);
  });
  console.log(`\nRESPUESTA (${text.length} chars, ${text.split(/\s+/).length} palabras):\n`);
  console.log(text);
  console.log('\n═══════════════════════════════════════════════════════════');

  // Contar sub-headings
  const h2Count = (text.match(/^## /gm) || []).length;
  const h3Count = (text.match(/^### /gm) || []).length;
  const strongCount = (text.match(/\*\*/g) || []).length / 2;
  console.log(`\nEstructura de la respuesta:`);
  console.log(`  H2 (## Marco / Analisis / Conclusion): ${h2Count}`);
  console.log(`  H3 (### 1., 2., 3., etc.): ${h3Count}`);
  console.log(`  Bold (**termino**): ${Math.round(strongCount)}`);
}

main().catch(console.error);
