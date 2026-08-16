/**
 * Ingesta de las Bases Estándar como fuente para el RAG.
 *
 * César en la llamada del 30/06/2026 dijo textualmente:
 *   "hay que cargarle las bases estándar como fuente últimas... es
 *    bastante fundamental tener como fuente ellos, porque en esas
 *    bases están algunos criterios, están aclarando considerando o
 *    advirtiendo cómo debe ser."
 *
 * Este script:
 *   1. Lee los 19 .docx de BASES ESTÁNDAR - DGA en el proyecto
 *   2. Extrae el texto con mammoth (idem Observaciones.docx)
 *   3. Inserta en normative_documents con type='bases_estandar'
 *   4. Genera chunks + embeddings con el mismo pipeline
 *   5. Genera resumen IA con el mismo generador
 *
 * Uso:
 *   pnpm exec tsx scripts/ingest-bases-estandar.ts
 *   pnpm exec tsx scripts/ingest-bases-estandar.ts --dry-run  (solo lista)
 */

import { config } from 'dotenv';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import mammoth from 'mammoth';
import { createClient } from '@supabase/supabase-js';
import { embedOne } from '../src/lib/ai/embeddings';
import { generateDocumentSummary } from '../src/lib/ai/document-summary';

config({ path: '.env.local', override: true });

const DRY_RUN = process.argv.includes('--dry-run');
const BASES_DIR = 'BASES ESTÁNDAR/BASES ESTÁNDAR - DGA';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * Extrae del filename un título legible.
 * "7614342-1-bases-estandar-licitacion-publica-para-bienes.docx"
 * → "Bases Estándar Licitación Pública para Bienes"
 */
function titleFromFilename(filename: string): string {
  return filename
    .replace(/^\d+-/, '')
    .replace(/^\d+-/, '')
    .replace(/-/g, ' ')
    .replace(/\.docx$/i, '')
    .replace(/\(\d+\)/g, '')
    .split(' ')
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
    .replace(/estandar/gi, 'Estándar')
    .replace(/publico/gi, 'Público')
    .replace(/publica/gi, 'Pública')
    .replace(/electronica/gi, 'Electrónica')
    .replace(/consultoria/gi, 'Consultoría')
    .replace(/licitacion/gi, 'Licitación')
    .replace(/comparacion/gi, 'Comparación')
    .replace(/seleccion/gi, 'Selección')
    .replace(/contratacion/gi, 'Contratación')
    .replace(/arquitectonicos/gi, 'Arquitectónicos')
    .replace(/urbanisticos/gi, 'Urbanísticos')
    .trim();
}

/**
 * Chunker semántico simple: divide por párrafos hasta ~2500 chars/chunk
 * con overlap de 200 chars para preservar contexto.
 */
function chunkText(text: string, targetSize = 2500, overlap = 200): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let current = '';

  for (const p of paragraphs) {
    if ((current + '\n\n' + p).length > targetSize && current.length > 500) {
      chunks.push(current.trim());
      // overlap: incluir últimos 200 chars del chunk anterior
      const overlap_text = current.slice(-overlap);
      current = overlap_text + '\n\n' + p;
    } else {
      current = current ? current + '\n\n' + p : p;
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  INGESTA DE BASES ESTÁNDAR                                  ');
  console.log('═══════════════════════════════════════════════════════════\n');

  const files = readdirSync(BASES_DIR).filter((f) => f.endsWith('.docx'));
  console.log(`📂 Encontrados ${files.length} archivos .docx en ${BASES_DIR}\n`);

  if (DRY_RUN) {
    for (const f of files) {
      console.log(`  · ${f} → "${titleFromFilename(f)}"`);
    }
    console.log('\n(dry-run — no se ingesta nada)');
    return;
  }

  let totalDocs = 0;
  let totalChunks = 0;
  let failed = 0;
  const startedAt = Date.now();

  for (const filename of files) {
    const filePath = join(BASES_DIR, filename);
    const title = titleFromFilename(filename);
    const number = title;
    const short = title.slice(0, 60);

    console.log(`\n📄 ${short}`);

    try {
      // 1. Extraer texto con mammoth
      const buffer = readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      const rawText = result.value.trim();
      console.log(`   Texto extraído: ${rawText.length.toLocaleString()} chars`);

      if (rawText.length < 500) {
        console.log(`   ⚠ Texto muy corto, saltando`);
        failed++;
        continue;
      }

      // 2. Verificar si ya existe (evitar duplicados por título exacto)
      const { data: existing } = await admin
        .from('normative_documents')
        .select('id')
        .eq('type', 'bases_estandar')
        .eq('title', title)
        .maybeSingle();

      if (existing) {
        console.log(`   ⏭ Ya existe con este título, saltando`);
        continue;
      }

      // 3. Insertar documento
      const { data: docInsert, error: docErr } = await admin
        .from('normative_documents')
        .insert({
          type: 'bases_estandar',
          number: number,
          title: title,
          summary: null,
          date: '2025-04-24', // Fecha de vigencia Ley 32069
          source_url: null,
          pdf_storage_path: null,
          raw_text: rawText,
          metadata: { source_file: filename, origin: 'DGA' },
        } as never)
        .select('id')
        .single();

      if (docErr || !docInsert) {
        console.log(`   ✗ Error insertando doc: ${docErr?.message}`);
        failed++;
        continue;
      }

      const docId = (docInsert as { id: string }).id;
      totalDocs++;

      // 4. Chunkear
      const chunks = chunkText(rawText, 2500, 200);
      console.log(`   Chunks generados: ${chunks.length}`);

      // 5. Embedding + insert por chunk
      let inserted = 0;
      for (let i = 0; i < chunks.length; i++) {
        try {
          const emb = await embedOne(chunks[i], 'RETRIEVAL_DOCUMENT');
          const { error: chunkErr } = await admin.from('normative_chunks').insert({
            document_id: docId,
            chunk_index: i,
            content: chunks[i],
            embedding: emb,
            metadata: {},
          } as never);
          if (chunkErr) {
            console.log(`     chunk ${i} error: ${chunkErr.message}`);
          } else {
            inserted++;
          }
        } catch (e) {
          console.log(`     chunk ${i} embed error: ${(e as Error).message}`);
        }
      }
      totalChunks += inserted;
      console.log(`   ✓ ${inserted}/${chunks.length} chunks insertados`);

      // 6. Generar resumen IA
      try {
        const summaryResult = await generateDocumentSummary({
          type: 'bases_estandar',
          number: number,
          title: title,
          raw_text: rawText,
        });

        if (summaryResult.summary) {
          await admin
            .from('normative_documents')
            .update({
              ai_summary: summaryResult.summary,
              ai_summary_generated_at: new Date().toISOString(),
              ai_summary_model: summaryResult.model,
            } as never)
            .eq('id', docId);
          console.log(`   ✓ Resumen IA generado`);
        }
      } catch (e) {
        console.log(`   ✗ Error resumen: ${(e as Error).message}`);
      }
    } catch (e) {
      console.log(`   ✗ Error procesando: ${(e as Error).message}`);
      failed++;
    }
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`✅ Ingesta completa`);
  console.log(`   Docs insertados:   ${totalDocs}/${files.length}`);
  console.log(`   Chunks insertados: ${totalChunks}`);
  console.log(`   Fallidos:          ${failed}`);
  console.log(`   Tiempo:            ${elapsed}s`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
