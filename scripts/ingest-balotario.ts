/**
 * Ingesta del balotario OECE en la tabla training_qa_pairs.
 *
 * Prerequisito: haber aplicado la migración 0030_training_qa_pairs.sql
 * en el SQL Editor de Supabase.
 *
 * Flujo:
 *   1. Lee scripts/balotario-parsed.json (generado por parse-balotario-v2.ts)
 *   2. Genera embedding de CADA PREGUNTA con Voyage (RETRIEVAL_DOCUMENT)
 *      — no de la respuesta, porque el retriever matchea "pregunta del usuario"
 *      con "pregunta del balotario" para inferir la respuesta correcta.
 *   3. Inserta en training_qa_pairs con upsert por (source + question_num + page).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { embedOne } from '../src/lib/ai/embeddings';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface QA {
  num: number;
  section: string;
  question: string;
  options: Record<'a' | 'b' | 'c' | 'd', string>;
  correctLetter: 'a' | 'b' | 'c' | 'd';
  correctText: string;
  page: number;
}

async function main() {
  const path = 'scripts/balotario-parsed.json';
  if (!fs.existsSync(path)) {
    console.error(
      `❌ ${path} no existe. Ejecuta primero: pnpm tsx scripts/parse-balotario-v2.ts`,
    );
    process.exit(1);
  }
  const qaList = JSON.parse(fs.readFileSync(path, 'utf-8')) as QA[];
  console.log(`Cargados ${qaList.length} Q&A del balotario parseado.`);

  // Filtrar solo los que tienen respuesta detectada (correctText no vacío)
  const valid = qaList.filter((qa) => qa.correctText && qa.correctText.length > 0);
  const skipped = qaList.length - valid.length;
  console.log(`Válidos para ingesta: ${valid.length} (${skipped} sin respuesta detectada, se omiten)`);

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < valid.length; i++) {
    const qa = valid[i];
    try {
      // Embedding de la pregunta
      const emb = await embedOne(qa.question, 'RETRIEVAL_DOCUMENT');

      // Upsert por (source, question_num, page) — evita duplicados al re-correr
      const { error } = await admin
        .from('training_qa_pairs')
        .upsert(
          {
            source: 'balotario_oece_certificacion',
            section: qa.section,
            question_num: qa.num,
            page: qa.page,
            question: qa.question,
            option_a: qa.options.a || null,
            option_b: qa.options.b || null,
            option_c: qa.options.c || null,
            option_d: qa.options.d || null,
            correct_letter: qa.correctLetter,
            correct_text: qa.correctText,
            embedding: emb as unknown as number[],
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: 'source,question_num,page', ignoreDuplicates: false } as never,
        );
      if (error) {
        // Si no existe unique constraint, hacemos upsert manual
        if (error.message.includes('no unique') || error.message.includes('ON CONFLICT')) {
          const { error: insErr } = await admin
            .from('training_qa_pairs')
            .insert({
              source: 'balotario_oece_certificacion',
              section: qa.section,
              question_num: qa.num,
              page: qa.page,
              question: qa.question,
              option_a: qa.options.a || null,
              option_b: qa.options.b || null,
              option_c: qa.options.c || null,
              option_d: qa.options.d || null,
              correct_letter: qa.correctLetter,
              correct_text: qa.correctText,
              embedding: emb as unknown as number[],
            } as never);
          if (insErr) throw insErr;
        } else {
          throw error;
        }
      }
      ok++;
      if (ok % 20 === 0 || ok === valid.length) {
        console.log(`  ${ok}/${valid.length} ingeridos…`);
      }
    } catch (e) {
      failed++;
      console.error(`  ❌ Q${qa.num} pág ${qa.page}: ${(e as Error).message}`);
    }
  }

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  Ingeridos OK: ${ok}`);
  console.log(`  Fallidos: ${failed}`);
  console.log(`  Sin respuesta (omitidos): ${skipped}`);
  console.log(`═══════════════════════════════════════════`);
}

main().catch(console.error);
