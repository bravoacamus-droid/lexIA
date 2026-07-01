/**
 * Diagnóstica el problema de falsos negativos del RAG.
 *
 * Reproduce las queries reales de César donde el sistema dijo
 * "no encuentro" y compara:
 *   - Qué chunks devuelve el hybrid_search (los que el modelo VE)
 *   - Qué chunks del Reglamento/Ley/Directiva contienen la respuesta
 *     esperada (con búsqueda textual directa)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { embedOne } from '../src/lib/ai/embeddings';

config({ path: '.env.local' });

interface Query {
  label: string;
  question: string;
  expected_doc_keyword: string;
  content_keywords: string[];
}

const QUERIES: Query[] = [
  {
    label: 'Plazo difusión requerimiento (César 4:00)',
    question: 'plazo de difusión del requerimiento en licitación pública para bienes',
    expected_doc_keyword: 'Directiva',
    content_keywords: ['plazo', 'difusión'],
  },
  {
    label: 'Análisis cualitativo de riesgos (César 6:59)',
    question: 'cuáles son las cualidades específicas del análisis cualitativo de riesgos',
    expected_doc_keyword: 'Guia-de-actuaciones-preparatorias',
    content_keywords: ['cualitativo', 'probabilidad', 'impacto'],
  },
];

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   DEBUG RETRIEVAL — casos César con "no encuentro"        ');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const q of QUERIES) {
    console.log('\n' + '═'.repeat(70));
    console.log(`❓ ${q.label}`);
    console.log('═'.repeat(70));
    console.log(`Q: ${q.question}\n`);

    // Paso 1 — hybrid_search de producción
    const emb = await embedOne(q.question, 'RETRIEVAL_QUERY');
    const { data: chunks } = await (admin as any).rpc('hybrid_search', {
      query_text: q.question,
      query_embedding: emb,
      match_count: 15,
      filter_type: null,
      filter_law: null,
    });

    const hSearchRows = (chunks || []) as Array<{
      chunk_id: string;
      document_id: string;
      doc_type: string;
      doc_number: string | null;
      similarity: number;
      content: string;
    }>;

    console.log(`📥 hybrid_search: ${hSearchRows.length} chunks`);
    hSearchRows.forEach((c, i) => {
      console.log(
        `   [${i + 1}] ${c.doc_type.padEnd(15)} · ${(c.doc_number || '').slice(0, 45).padEnd(45)} · sim=${c.similarity.toFixed(3)}`,
      );
    });

    // Paso 2 — Buscar chunks del documento esperado
    console.log(`\n🔍 Buscando chunks del documento "${q.expected_doc_keyword}"...`);
    const { data: expectedChunks } = await admin
      .from('normative_chunks')
      .select('id, content, document_id, chunk_index')
      .limit(500);

    if (expectedChunks) {
      // Filtrar chunks cuyo doc_id corresponde a docs con el keyword esperado
      const { data: expectedDocs } = await admin
        .from('normative_documents')
        .select('id, type, number')
        .ilike('number', `%${q.expected_doc_keyword}%`);

      const expectedDocIds = new Set(
        ((expectedDocs || []) as Array<{ id: string }>).map((d) => d.id),
      );
      const expectedDocsMeta = ((expectedDocs || []) as Array<{
        id: string;
        type: string;
        number: string;
      }>);

      // Chunks del documento esperado
      const { data: docChunks } = await admin
        .from('normative_chunks')
        .select('id, content, chunk_index, document_id')
        .in(
          'document_id',
          expectedDocsMeta.length > 0 ? expectedDocsMeta.map((d) => d.id) : ['00000000-0000-0000-0000-000000000000'],
        );

      const allExpectedChunks = ((docChunks || []) as Array<{
        id: string;
        content: string;
        chunk_index: number;
        document_id: string;
      }>);
      console.log(`   Total chunks de "${q.expected_doc_keyword}": ${allExpectedChunks.length}`);

      // Chunks que contienen los keywords de contenido
      const kwMatches = allExpectedChunks.filter((c) =>
        q.content_keywords.every((kw) =>
          c.content.toLowerCase().includes(kw.toLowerCase()),
        ),
      );
      console.log(
        `   Chunks con todas las keywords [${q.content_keywords.join(', ')}]: ${kwMatches.length}`,
      );

      if (kwMatches.length > 0) {
        console.log(`\n   ✅ CHUNKS CORRECTOS (el modelo debería haber visto estos):`);
        kwMatches.slice(0, 3).forEach((c, i) => {
          const doc = expectedDocsMeta.find((d) => d.id === c.document_id);
          console.log(`\n   [chunk_${c.chunk_index}] ${doc?.type} · ${doc?.number}`);
          console.log(
            `   Contenido: "${c.content.slice(0, 400).replace(/\n/g, ' ').trim()}…"`,
          );

          // ¿Este chunk apareció en hybrid_search?
          const wasReturned = hSearchRows.some((r) => r.chunk_id === c.id);
          console.log(`   ¿Devuelto por hybrid_search? ${wasReturned ? '✅ SÍ' : '❌ NO'}`);
        });
      } else {
        console.log(`   ❌ No hay chunks de ese documento que combinen TODAS las keywords.`);
        console.log(`   Verificando keyword por keyword...`);
        for (const kw of q.content_keywords) {
          const matches = allExpectedChunks.filter((c) =>
            c.content.toLowerCase().includes(kw.toLowerCase()),
          );
          console.log(`   · "${kw}": ${matches.length} chunks`);
        }
      }
    }

    // Paso 3 — Diagnóstico
    const returnedDocNumbers = new Set(
      hSearchRows.map((c) => c.doc_number || '').filter(Boolean),
    );
    const expectedInReturned = Array.from(returnedDocNumbers).some((n) =>
      n.toLowerCase().includes(q.expected_doc_keyword.toLowerCase()),
    );

    console.log(`\n📊 DIAGNÓSTICO:`);
    console.log(
      `   Documento esperado "${q.expected_doc_keyword}" en resultados: ${expectedInReturned ? '✅ SÍ' : '❌ NO'}`,
    );
    if (!expectedInReturned) {
      console.log(`   → El hybrid_search NO encontró chunks relevantes del documento correcto.`);
      console.log(`   → Posibles causas:`);
      console.log(`      1. El chunk correcto tiene menor similitud coseno que los devueltos`);
      console.log(`      2. FTS no matchea porque el chunk usa palabras distintas`);
      console.log(`      3. El chunk correcto no está bien ingestado`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
