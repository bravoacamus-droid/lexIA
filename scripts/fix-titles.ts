#!/usr/bin/env tsx
/**
 * Normaliza títulos de normative_documents que vienen como slug feo
 * (ej "8184143-pronunciamiento-n-309-2026-oece-dsat") al formato legible
 * usado por los procesadores: "Pronunciamiento N° 309-2026/OECE-DSAT".
 *
 * Solo toca filas cuyo title todavía parece ser el slug del filename
 * (no afecta documentos con título normalizado).
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TYPE_LABEL: Record<string, string> = {
  ley: 'Ley',
  reglamento: 'Reglamento',
  directiva: 'Directiva',
  opinion: 'Opinión',
  pronunciamiento: 'Pronunciamiento',
  resolucion_tce: 'Resolución TCE',
};

function normalize(type: string, slug: string): { title: string; number: string } | null {
  // Patrones típicos:
  //   8184143-pronunciamiento-n-309-2026-oece-dsat
  //   6699758-2914-2025-tce-s1
  //   8159643-opinion-n-d000048-2026-oece-dtn
  //   6682412-007-2025-oece-cd
  const lower = slug.toLowerCase();

  // Pronunciamiento N° XXX-YYYY/OECE-DSAT
  let m = lower.match(/pronunciamiento[-_]n[-_]?(\d+)[-_](\d{4})[-_]oece[-_]dsat/);
  if (m) {
    const n = `${m[1]}-${m[2]}/OECE-DSAT`;
    return { title: `Pronunciamiento N° ${n}`, number: n };
  }

  // Opinión N° DXXXXXX-YYYY/OECE-DTN (o sin D)
  m = lower.match(/opinion[-_]n[-_]?(d?\d+)[-_](\d{4})[-_]oece[-_]dtn/);
  if (m) {
    const numeral = m[1].toUpperCase();
    const n = `${numeral}-${m[2]}/OECE-DTN`;
    return { title: `Opinión N° ${n}`, number: n };
  }

  // Resolución TCE: 6699758-2914-2025-tce-s1
  m = lower.match(/[-_](\d{1,5})[-_](\d{4})[-_]tc[ep][-_]s(\d+)/);
  if (m && type === 'resolucion_tce') {
    const n = `${m[1]}-${m[2]}-TCE-S${m[3]}`;
    return { title: `Resolución N° ${n}`, number: n };
  }

  // Directiva: 6682412-007-2025-oece-cd
  m = lower.match(/[-_](\d{3})[-_](\d{4})[-_]oece[-_]cd/);
  if (m && type === 'directiva') {
    const n = `N° ${m[1]}-${m[2]}-OECE-CD`;
    return { title: `Directiva ${n}`, number: n };
  }

  // Fallback: deja como está
  return null;
}

async function main() {
  console.log('Normalizando títulos...\n');
  const { data: docs } = await supabase
    .from('normative_documents')
    .select('id, type, title, number')
    .order('type');

  const list = (docs || []) as Array<{
    id: string;
    type: string;
    title: string;
    number: string;
  }>;

  let updated = 0;
  let skipped = 0;
  for (const d of list) {
    const looksLikeSlug = d.title === d.number || /^\d+[-_].*[-_]/.test(d.title);
    if (!looksLikeSlug) {
      skipped += 1;
      continue;
    }
    const norm = normalize(d.type, d.title);
    if (!norm) {
      skipped += 1;
      continue;
    }
    const { error } = await supabase
      .from('normative_documents')
      .update({ title: norm.title, number: norm.number } as never)
      .eq('id', d.id);
    if (error) {
      console.log(`  ✗ ${d.title}: ${error.message}`);
    } else {
      console.log(`  ↻ ${d.title.padEnd(60)} → ${norm.title}`);
      updated += 1;
    }
  }
  console.log(`\nResumen: ${updated} actualizados · ${skipped} sin cambios.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
