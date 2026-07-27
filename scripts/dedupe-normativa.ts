#!/usr/bin/env tsx
/**
 * Deduplicación de documentos normativos.
 *
 * Detectado el 26/07/2026 durante los tests de coherencia: 25 opiniones
 * OECE están TRIPLICADAS (3 corridas de ingesta en junio con formatos
 * de número distintos: "D000040-2026/OECE-DTN", "Opinión N° D000040-...",
 * "8066010-opinion-n-d000040-..."). Efecto: los chunks duplicados
 * acaparan el pool del hybrid_search (15 de 18 slots en la Q8 de César)
 * y expulsan a los chunks de la Ley/Reglamento → respuestas degradadas.
 *
 * Estrategia:
 *  - Agrupar por clave normalizada (tipo + identificador extraído).
 *  - Conservar 1 copia por grupo: la de número más legible
 *    ("Opinión N° ..." > "D000.../OECE-DTN" > slug), a igualdad la más
 *    reciente.
 *  - Borrar chunks y luego documentos de las demás copias.
 *
 * Uso:
 *   npx tsx scripts/dedupe-normativa.ts           (dry-run, no borra)
 *   npx tsx scripts/dedupe-normativa.ts --apply   (ejecuta el borrado)
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local') });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const APPLY = process.argv.includes('--apply');

interface Doc {
  id: string;
  type: string;
  number: string;
  title: string;
  ingested_at: string;
}

/** Clave normalizada por documento para detectar duplicados. */
function dedupeKey(d: Doc): string | null {
  const s = `${d.number} ${d.title}`.replace(/\s+/g, ' ');
  if (d.type === 'opinion') {
    const m = s.match(/D\s*0*(\d{1,6})\s*-\s*(\d{4})/i);
    if (m) return `opinion:D${m[1]}-${m[2]}`;
  }
  if (d.type === 'pronunciamiento') {
    const m = s.match(/0*(\d{1,5})\s*-\s*(\d{4})/);
    if (m) return `pronunciamiento:${m[1]}-${m[2]}`;
  }
  // Resoluciones y demás tipos: NO deduplicar automáticamente.
  // Verificado 26/07/2026: resoluciones distintas comparten número de
  // serie (ej. res. 55-2025 aprueba la Directiva 012 y otra res.
  // 55-2025-PRE aprueba la Directiva 007) — todo falso positivo.
  return null;
}

/** Menor score = mejor candidato a conservar. */
function keeperScore(d: Doc): number {
  let score = 0;
  if (/^\d{6,}-/.test(d.number)) score += 2; // slug numérico feo
  if (!/N[°º.]/.test(d.number)) score += 1; // sin formato "N°"
  return score;
}

async function main() {
  const { data, error } = await supabase
    .from('normative_documents')
    .select('id,type,number,title,ingested_at');
  if (error) throw new Error(error.message);
  const docs = (data || []) as Doc[];
  console.log(`Documentos totales: ${docs.length}`);

  const groups = new Map<string, Doc[]>();
  for (const d of docs) {
    const k = dedupeKey(d);
    if (!k) continue;
    const arr = groups.get(k) || [];
    arr.push(d);
    groups.set(k, arr);
  }

  const dupGroups = [...groups.entries()].filter(([, v]) => v.length > 1);
  console.log(`Grupos duplicados: ${dupGroups.length}\n`);

  let toDelete: Doc[] = [];
  for (const [key, group] of dupGroups) {
    const sorted = [...group].sort(
      (a, b) =>
        keeperScore(a) - keeperScore(b) ||
        new Date(b.ingested_at).getTime() - new Date(a.ingested_at).getTime(),
    );
    const keeper = sorted[0];
    const losers = sorted.slice(1);
    toDelete = toDelete.concat(losers);
    console.log(`■ ${key} (×${group.length})`);
    console.log(`   ✅ CONSERVAR: ${keeper.number.slice(0, 60)}`);
    losers.forEach((l) => console.log(`   🗑️  borrar:    ${l.number.slice(0, 60)}`));
  }

  console.log(`\nTotal a borrar: ${toDelete.length} documentos`);
  if (!APPLY) {
    console.log('\n(dry-run — ejecuta con --apply para borrar)');
    return;
  }

  console.log('\nBorrando...');
  let chunksDeleted = 0;
  for (const d of toDelete) {
    const { count } = await supabase
      .from('normative_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', d.id);
    const { error: e1 } = await supabase
      .from('normative_chunks')
      .delete()
      .eq('document_id', d.id);
    if (e1) throw new Error(`chunks de ${d.number}: ${e1.message}`);
    const { error: e2 } = await supabase
      .from('normative_documents')
      .delete()
      .eq('id', d.id);
    if (e2) throw new Error(`doc ${d.number}: ${e2.message}`);
    chunksDeleted += count || 0;
    console.log(`   🗑️ ${d.number.slice(0, 55)} (${count} chunks)`);
  }
  console.log(`\n✅ Borrados ${toDelete.length} documentos y ${chunksDeleted} chunks duplicados.`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
