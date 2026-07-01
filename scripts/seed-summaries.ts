/**
 * Pre-genera resúmenes IA para todos los documentos normativos que
 * aún no tienen uno.
 *
 * Uso:
 *   pnpm exec tsx scripts/seed-summaries.ts             # todos los pendientes
 *   pnpm exec tsx scripts/seed-summaries.ts --limit=20  # solo 20
 *   pnpm exec tsx scripts/seed-summaries.ts --type=pronunciamiento
 *   pnpm exec tsx scripts/seed-summaries.ts --force     # regenera existentes
 *
 * Diseño:
 *   - Lectura desde normative_documents con admin client (bypass RLS).
 *   - Concurrencia controlada (CONCURRENCY = 4) para no reventar
 *     rate limit de Gemini ni saturar la BD.
 *   - Retry con backoff exponencial en caso de fallo transitorio.
 *   - Persiste directamente (no vía API) para evitar overhead HTTP.
 *   - Reporta progreso cada 10 docs procesados + resumen al final.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateDocumentSummary } from '../src/lib/ai/document-summary';

config({ path: '.env.local' });

const CONCURRENCY = 4;
const MAX_RETRIES = 2;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    limit: parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0', 10),
    type: args.find((a) => a.startsWith('--type='))?.split('=')[1] || null,
    force: args.includes('--force'),
  };
}

interface DocRow {
  id: string;
  type: string;
  number: string | null;
  title: string;
  raw_text: string | null;
}

interface Result {
  id: string;
  ok: boolean;
  reason?: string;
  latencyMs?: number;
  tokensIn?: number;
  tokensOut?: number;
}

async function generateWithRetry(
  doc: DocRow,
  attempt = 0,
): Promise<{
  summary: Awaited<ReturnType<typeof generateDocumentSummary>>['summary'];
  model: string;
  latencyMs: number;
  tokens: { in: number; out: number };
}> {
  try {
    return await generateDocumentSummary({
      type: doc.type,
      number: doc.number,
      title: doc.title,
      raw_text: doc.raw_text || '',
    });
  } catch (e) {
    if (attempt < MAX_RETRIES) {
      const wait = Math.pow(2, attempt) * 2000;
      await new Promise((r) => setTimeout(r, wait));
      return generateWithRetry(doc, attempt + 1);
    }
    throw e;
  }
}

async function main() {
  const args = parseArgs();

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let q = admin
    .from('normative_documents')
    .select('id, type, number, title, raw_text');

  if (!args.force) q = q.is('ai_summary', null);
  if (args.type) q = q.eq('type', args.type);
  if (args.limit > 0) q = q.limit(args.limit);

  const { data, error } = await q;
  if (error) {
    console.error('[seed-summaries] Error consultando:', error.message);
    process.exit(1);
  }

  const docs = (data || []) as DocRow[];
  const pending = docs.filter((d) => d.raw_text && d.raw_text.length >= 100);
  const skipped = docs.length - pending.length;

  console.log(`\n📚 Documentos a procesar: ${pending.length}`);
  if (skipped > 0) console.log(`⏭  Saltados (sin raw_text): ${skipped}`);
  console.log(`🚀 Concurrencia: ${CONCURRENCY}`);
  console.log(`🔁 Force regenerate: ${args.force}\n`);

  if (pending.length === 0) {
    console.log('✅ No hay documentos pendientes. Todos tienen resumen.');
    return;
  }

  const startedAt = Date.now();
  const results: Result[] = [];
  let processed = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  async function processOne(doc: DocRow): Promise<Result> {
    try {
      const result = await generateWithRetry(doc);
      if (!result.summary) {
        return { id: doc.id, ok: false, reason: 'parse_failed' };
      }
      const { error: updErr } = await admin
        .from('normative_documents')
        .update({
          ai_summary: result.summary,
          ai_summary_generated_at: new Date().toISOString(),
          ai_summary_model: result.model,
        } as never)
        .eq('id', doc.id);
      if (updErr) return { id: doc.id, ok: false, reason: updErr.message };
      totalTokensIn += result.tokens.in;
      totalTokensOut += result.tokens.out;
      return {
        id: doc.id,
        ok: true,
        latencyMs: result.latencyMs,
        tokensIn: result.tokens.in,
        tokensOut: result.tokens.out,
      };
    } catch (e) {
      return { id: doc.id, ok: false, reason: (e as Error).message };
    }
  }

  // Ejecución con concurrencia controlada estilo worker pool
  const queue = [...pending];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const doc = queue.shift();
          if (!doc) break;
          const r = await processOne(doc);
          results.push(r);
          processed++;
          if (processed % 10 === 0) {
            const elapsed = (Date.now() - startedAt) / 1000;
            const rate = processed / elapsed;
            const eta = (pending.length - processed) / rate;
            console.log(
              `  [${processed}/${pending.length}] ${r.ok ? '✓' : '✗'} ${doc.type} ${(doc.number || '').slice(0, 40)}` +
                ` · ${rate.toFixed(2)}/s · ETA ${Math.round(eta)}s`,
            );
          }
        }
      })(),
    );
  }
  await Promise.all(workers);

  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const elapsed = (Date.now() - startedAt) / 1000;

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ Exitosos:  ${ok}/${pending.length}`);
  console.log(`✗ Fallidos:  ${failed.length}`);
  console.log(`⏱  Tiempo:    ${elapsed.toFixed(1)}s`);
  console.log(`📊 Tokens:    ${totalTokensIn.toLocaleString()} in / ${totalTokensOut.toLocaleString()} out`);
  // gemini-flash-lite: $0.10/M in, $0.40/M out (aproximado)
  const costUsd = (totalTokensIn / 1_000_000) * 0.1 + (totalTokensOut / 1_000_000) * 0.4;
  console.log(`💵 Costo est: $${costUsd.toFixed(4)} USD`);

  if (failed.length > 0) {
    console.log('\n✗ Fallidos:');
    failed.slice(0, 10).forEach((f) => console.log(`   - ${f.id}: ${f.reason}`));
    if (failed.length > 10) console.log(`   ... y ${failed.length - 10} más`);
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
