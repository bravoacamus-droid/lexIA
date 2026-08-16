/**
 * Regenera los resúmenes de los tipos que ahora tienen preguntas
 * específicas (opinion, pronunciamiento, resolucion_tce, directiva).
 *
 * Los otros tipos siguen usando las preguntas genéricas — no requieren
 * regeneración; el frontend hace fallback automático a v1 vía
 * normalizeSummaryQuestions.
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import { generateDocumentSummary } from '../src/lib/ai/document-summary';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TARGET_TYPES = ['opinion', 'pronunciamiento', 'resolucion_tce', 'directiva'];

async function main() {
  const { data: docs } = await admin
    .from('normative_documents')
    .select('id, type, number, title, raw_text')
    .in('type', TARGET_TYPES)
    .not('ai_summary', 'is', null); // ya tienen summary v1, regeneramos

  const rows = (docs || []) as Array<{
    id: string;
    type: string;
    number: string | null;
    title: string;
    raw_text: string | null;
  }>;

  console.log(`Docs a regenerar (v1 → v2): ${rows.length}`);
  const byType = new Map<string, number>();
  for (const d of rows) byType.set(d.type, (byType.get(d.type) || 0) + 1);
  for (const [t, n] of byType) console.log(`  ${t}: ${n}`);
  console.log();

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i++) {
    const doc = rows[i];
    if (!doc.raw_text) {
      failed++;
      continue;
    }
    try {
      const res = await generateDocumentSummary({
        type: doc.type,
        number: doc.number,
        title: doc.title,
        raw_text: doc.raw_text,
      });
      if (!res.summary) {
        console.log(`  [${i + 1}/${rows.length}] ❌ ${doc.type} ${doc.number}: sin JSON válido`);
        failed++;
        continue;
      }
      await admin
        .from('normative_documents')
        .update({
          ai_summary: res.summary,
          ai_summary_generated_at: new Date().toISOString(),
          ai_summary_model: res.model,
        })
        .eq('id', doc.id);
      ok++;
      if (ok % 20 === 0 || ok === rows.length) {
        console.log(`  [${i + 1}/${rows.length}] ${ok} OK · ${failed} failed`);
      }
    } catch (e) {
      failed++;
      console.log(`  [${i + 1}/${rows.length}] ❌ ${(e as Error).message}`);
    }
  }

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  OK: ${ok}`);
  console.log(`  Failed: ${failed}`);
  console.log(`═══════════════════════════════════════════`);
}

main().catch(console.error);
