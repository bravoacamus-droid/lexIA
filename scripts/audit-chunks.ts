/**
 * Auditoría profunda del corpus:
 *  1. Detecta si los artículos de la Ley 32069 y su Reglamento están
 *     partidos entre múltiples chunks (bug crítico como el Art 51.2 que
 *     quedaba truncado)
 *  2. Detecta chunks que mezclan contenido de artículos no relacionados
 *  3. Reporta artículos completamente ausentes del corpus
 *  4. Detecta chunks con basura OCR (números pegados, encabezados)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: '.env.local', override: true });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface Chunk {
  chunk_index: number;
  content: string;
  document_id: string;
  length: number;
}

interface DocIndex {
  id: string;
  type: string;
  number: string;
  chunks: Chunk[];
}

/**
 * Extrae todas las menciones de "Artículo N" (incluye numerales) de un
 * chunk. Devuelve set de números encontrados.
 */
function extractArticleMentions(text: string): string[] {
  const rx = /Art[íi]culo\s+(\d+(?:\.\d+)?)\b/gi;
  const found = new Set<string>();
  let m;
  while ((m = rx.exec(text)) !== null) {
    found.add(m[1]);
  }
  return Array.from(found);
}

/**
 * Detecta si un chunk INICIA con la definición de un artículo. Un
 * chunk bien formado debería iniciar con "Artículo N" o continuar
 * texto natural. Si un chunk empieza mid-sentence Y otro chunk anterior
 * termina mid-sentence, sospechamos truncación de artículo.
 */
function detectsArticleBoundaries(chunk: Chunk): {
  startsWithArticle: boolean;
  endsAbruptly: boolean;
  containsArticle: string[];
} {
  const content = chunk.content.trim();
  const first120 = content.slice(0, 120);
  const last120 = content.slice(-120);

  return {
    startsWithArticle: /^(?:"|"|«)?\s*Art[íi]culo\s+\d+/.test(first120),
    // Termina abruptly si no termina con . ! ? ; " ) o si termina mid-frase
    endsAbruptly: !/[.!?;"»)\]]\s*$/.test(last120) &&
      !/CAPÍTULO|TÍTULO|Artículo\s+\d+/.test(last120.slice(-40)),
    containsArticle: extractArticleMentions(content),
  };
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  AUDITORÍA PROFUNDA DEL CORPUS NORMATIVO                   ');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Cargar Ley 32069 completa
  const { data: docs } = await admin
    .from('normative_documents')
    .select('id, type, number')
    .in('type', ['ley', 'reglamento'])
    .ilike('number', '%32069%');

  if (!docs || docs.length === 0) {
    console.log('No se encontraron docs');
    return;
  }

  for (const doc of docs as Array<{ id: string; type: string; number: string }>) {
    console.log(`\n📖 ${doc.type} · ${doc.number}`);
    console.log('─'.repeat(70));

    const { data: chunks } = await admin
      .from('normative_chunks')
      .select('chunk_index, content, document_id')
      .eq('document_id', doc.id)
      .order('chunk_index');

    if (!chunks) continue;
    const cs = chunks.map((c: any) => ({
      chunk_index: c.chunk_index,
      content: c.content,
      document_id: c.document_id,
      length: c.content.length,
    })) as Chunk[];

    console.log(`   Total chunks: ${cs.length}`);
    console.log(`   Longitud avg: ${Math.round(cs.reduce((a, c) => a + c.length, 0) / cs.length)}`);

    // Detectar problemas
    let endsAbruptly = 0;
    let mixedArticles = 0; // chunks con múltiples artículos no consecutivos
    let noArticles = 0;
    const abruptChunks: number[] = [];

    for (const chunk of cs) {
      const analysis = detectsArticleBoundaries(chunk);
      if (analysis.endsAbruptly) {
        endsAbruptly++;
        abruptChunks.push(chunk.chunk_index);
      }
      if (analysis.containsArticle.length > 2) {
        // Ver si los números son consecutivos
        const nums = analysis.containsArticle
          .map((s) => parseInt(s.split('.')[0]))
          .filter((n) => !isNaN(n))
          .sort((a, b) => a - b);
        if (nums.length >= 2 && nums[nums.length - 1] - nums[0] > 3) {
          mixedArticles++;
        }
      }
      if (analysis.containsArticle.length === 0 && chunk.length > 500) {
        noArticles++;
      }
    }

    console.log(`\n   🔍 Anomalías detectadas:`);
    console.log(`     Chunks que terminan abruptamente:  ${endsAbruptly} (${((endsAbruptly / cs.length) * 100).toFixed(1)}%)`);
    console.log(`     Chunks con artículos NO consecutivos: ${mixedArticles}`);
    console.log(`     Chunks grandes sin mencionar artículos: ${noArticles}`);

    if (abruptChunks.length > 0 && abruptChunks.length < 15) {
      console.log(`\n   Chunks con corte abrupto:`);
      for (const idx of abruptChunks.slice(0, 8)) {
        const c = cs.find((x) => x.chunk_index === idx)!;
        console.log(`     [${idx}] termina: "…${c.content.slice(-80).replace(/\n/g, ' ')}"`);
      }
    }

    // Detectar artículos ausentes (0 al 200 esperados)
    const foundArticles = new Set<number>();
    for (const chunk of cs) {
      const mentions = extractArticleMentions(chunk.content);
      for (const m of mentions) {
        const n = parseInt(m.split('.')[0]);
        if (n > 0 && n < 250) foundArticles.add(n);
      }
    }
    console.log(`\n   Artículos únicos mencionados: ${foundArticles.size}`);

    // Buscar rangos ausentes
    const sorted = Array.from(foundArticles).sort((a, b) => a - b);
    const gaps: string[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap > 3) {
        gaps.push(`${sorted[i - 1] + 1}-${sorted[i] - 1}`);
      }
    }
    if (gaps.length > 0) {
      console.log(`   Posibles rangos AUSENTES: ${gaps.slice(0, 8).join(', ')}`);
    }
  }

  // Ahora chunks super mezclados (con contenido de secciones lejanas)
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  CHUNKS PROBLEMÁTICOS ESPECÍFICOS                          ');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Chunk 113 de Ley 32069 — el que analizamos antes
  const { data: doc32069 } = await admin
    .from('normative_documents')
    .select('id')
    .ilike('number', '%32069%DS%')
    .single();

  if (doc32069) {
    const { data: chunk113 } = await admin
      .from('normative_chunks')
      .select('content')
      .eq('document_id', (doc32069 as { id: string }).id)
      .eq('chunk_index', 113)
      .maybeSingle();

    if (chunk113) {
      const c = (chunk113 as { content: string }).content;
      console.log(`\n🔬 Análisis del chunk 113 (Ley 32069):`);
      console.log(`   Longitud: ${c.length} chars`);
      const arts = extractArticleMentions(c);
      console.log(`   Artículos mencionados: ${arts.join(', ')}`);
      console.log(`   Termina en: "…${c.slice(-100).replace(/\n/g, ' ')}"`);

      // ¿Hay dos temas distintos en el chunk?
      const has50 = c.includes('50.2') || c.includes('50.3');
      const has51 = c.includes('51.1') || c.includes('51.2') || c.includes('51.3');
      const hasAgrupamiento = c.includes('paquete') || c.includes('items') || c.includes('agrupamiento');
      console.log(`   Contiene 50.2/50.3: ${has50}`);
      console.log(`   Contiene 51.1/51.2/51.3: ${has51}`);
      console.log(`   Contiene agrupamiento: ${hasAgrupamiento}`);

      if (has50 && has51 && hasAgrupamiento) {
        console.log(`   ⚠️ CHUNK MIXTO: contiene Art 50, Art 51 y contenido de agrupamiento`);
      }
    }
  }
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
