import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { chatModel } from '../src/lib/ai/gemini';
import { VOICE_SYSTEM_PROMPT } from '../src/lib/ai/voice-config';
import { embedOne } from '../src/lib/ai/embeddings';
import { formatResultsForLLM } from '../src/lib/ai/voice-search';
config({ path: '.env.local' });

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const q = 'Cuáles son los plazos exactos para la difusión del requerimiento';
  const emb = await embedOne(q, 'RETRIEVAL_QUERY');
  const { data: chunks } = await (admin as any).rpc('hybrid_search', {
    query_text: q,
    query_embedding: emb,
    match_count: 10,
    filter_type: null,
    filter_law: null,
  });

  const rows = (chunks || []).slice(0, 8);

  // Print chunk 1 (should be chunk 113)
  console.log('CHUNK #1 devuelto:');
  console.log('doc:', rows[0].doc_number);
  console.log('sim:', rows[0].similarity);
  console.log('content:', rows[0].content.slice(0, 500));
  console.log('\n...\n');
  console.log('content (final):', rows[0].content.slice(-300));

  const voiceRag = formatResultsForLLM(
    rows.map((r: any) => ({
      type: r.doc_type,
      citation: r.doc_number || r.doc_type,
      title: r.doc_title,
      snippet: r.content.slice(0, 1200),
      similarity: r.similarity,
    })),
  );

  console.log('\n═══════════════ RAG que recibe la voz ═══════════════');
  console.log(voiceRag.slice(0, 2000));
  console.log('...\n');

  const { text } = await generateText({
    model: chatModel,
    system: `${VOICE_SYSTEM_PROMPT}\n\n==== TOOL search_normativa RESULT ====\n${voiceRag}`,
    prompt: q,
    temperature: 0.2,
  });

  console.log('\n═══════════════ RESPUESTA DE LA VOZ ═══════════════');
  console.log(text);
}

main().catch(console.error);
