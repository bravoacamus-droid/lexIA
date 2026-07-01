/**
 * Verifica la similitud coseno REAL entre la query de César y todos
 * los chunks de la Directiva 007-2025-OECE-CD (que sabemos contiene
 * la respuesta pero no aparece en top-15 del hybrid_search).
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { embedOne } from '../src/lib/ai/embeddings';

config({ path: '.env.local' });

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const query = 'plazo de difusión del requerimiento en licitación pública para bienes';
  const emb = (await embedOne(query, 'RETRIEVAL_QUERY')) as unknown as number[];

  const { data: dd } = await admin
    .from('normative_documents')
    .select('id')
    .ilike('number', '%007-2025-OECE-CD%')
    .maybeSingle();
  if (!dd) {
    console.log('Documento no encontrado');
    return;
  }
  const docId = (dd as { id: string }).id;

  const { data: chunks } = await admin
    .from('normative_chunks')
    .select('chunk_index, content, embedding')
    .eq('document_id', docId);

  if (!chunks) {
    console.log('Sin chunks');
    return;
  }

  const results = (chunks as Array<{
    chunk_index: number;
    content: string;
    embedding: unknown;
  }>)
    .map((c) => {
      const b =
        typeof c.embedding === 'string'
          ? (JSON.parse(c.embedding) as number[])
          : (c.embedding as number[]);
      let dot = 0,
        na = 0,
        nb = 0;
      for (let i = 0; i < emb.length; i++) {
        dot += emb[i] * b[i];
        na += emb[i] * emb[i];
        nb += b[i] * b[i];
      }
      const sim = dot / (Math.sqrt(na) * Math.sqrt(nb));
      return {
        chunk_index: c.chunk_index,
        sim,
        clen: c.content.length,
        snippet: c.content.slice(0, 150).replace(/\n/g, ' '),
      };
    })
    .sort((a, b) => b.sim - a.sim);

  console.log('\n📊 Similitud de TODOS los chunks de Directiva 007-2025-OECE-CD');
  console.log(`Query: "${query}"`);
  console.log(`Total chunks: ${results.length}\n`);

  console.log('TOP-5 más similares:');
  results.slice(0, 5).forEach((r) => {
    const bar = '█'.repeat(Math.round(r.sim * 40));
    console.log(`  [c_${String(r.chunk_index).padStart(3)}] sim=${r.sim.toFixed(3)} ${bar}`);
    console.log(`    "${r.snippet}…"`);
  });

  console.log('\nComparativa con los chunks que SÍ menciona plazos:');
  const withPlazo = results.filter((r) =>
    r.snippet.toLowerCase().includes('plazo'),
  );
  withPlazo.slice(0, 5).forEach((r) => {
    const bar = '█'.repeat(Math.round(r.sim * 40));
    console.log(`  [c_${String(r.chunk_index).padStart(3)}] sim=${r.sim.toFixed(3)} ${bar}`);
    console.log(`    "${r.snippet}…"`);
  });

  // Ahora compara contra la Ley 32069 que SÍ salió en top del hybrid_search
  console.log('\n\n📊 Comparativa: Top 5 de Ley 32069 vs mismo query:');
  const { data: leyDoc } = await admin
    .from('normative_documents')
    .select('id')
    .ilike('number', '%32069%DS%')
    .limit(1)
    .maybeSingle();
  if (leyDoc) {
    const leyDocId = (leyDoc as { id: string }).id;
    const { data: leyChunks } = await admin
      .from('normative_chunks')
      .select('chunk_index, content, embedding')
      .eq('document_id', leyDocId);
    const leySims = (leyChunks || [])
      .map((c: any) => {
        const b =
          typeof c.embedding === 'string' ? JSON.parse(c.embedding) : c.embedding;
        let dot = 0,
          na = 0,
          nb = 0;
        for (let i = 0; i < emb.length; i++) {
          dot += emb[i] * b[i];
          na += emb[i] * emb[i];
          nb += b[i] * b[i];
        }
        return {
          idx: c.chunk_index,
          sim: dot / (Math.sqrt(na) * Math.sqrt(nb)),
          snippet: c.content.slice(0, 150).replace(/\n/g, ' '),
        };
      })
      .sort((a: any, b: any) => b.sim - a.sim)
      .slice(0, 5);

    leySims.forEach((r: any) => {
      const bar = '█'.repeat(Math.round(r.sim * 40));
      console.log(`  [c_${String(r.idx).padStart(3)}] sim=${r.sim.toFixed(3)} ${bar}`);
      console.log(`    "${r.snippet}…"`);
    });
  }
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
