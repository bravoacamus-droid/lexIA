#!/usr/bin/env tsx
/**
 * Normaliza títulos feos de docs scrapeados al formato jurídico estándar:
 *   "8184143-pronunciamiento-n-309-2026-oece-dsat"
 *   →  "Pronunciamiento N° 309-2026/OECE-DSAT"
 *
 * Se aplica solo a docs cuyo title === number (caso del fallback al slug).
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local') });
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TYPE_LABEL: Record<string, string> = {
  opinion: 'Opinión',
  pronunciamiento: 'Pronunciamiento',
  resolucion_tce: 'Resolución',
  directiva: 'Directiva',
  ley: 'Ley',
  reglamento: 'Reglamento',
};

/**
 * Convierte un slug tipo "8184143-pronunciamiento-n-309-2026-oece-dsat"
 * a "Pronunciamiento N° 309-2026/OECE-DSAT"
 */
function prettify(slug: string, type: string): { title: string; number: string } {
  // Quitar el prefijo numérico de Rails (e.g. "8184143-")
  let s = slug.replace(/^\d+-/, '');

  // Quitar el tipo del slug (e.g. "pronunciamiento-")
  const typeWord = type === 'resolucion_tce' ? 'resolucion' : type;
  s = s.replace(new RegExp(`^${typeWord}-`, 'i'), '');

  // Reemplazar "-n-" por "-" (era "n-309" -> "309")
  s = s.replace(/^n-/, '');

  // Extraer el número formal: "309-2026-oece-dsat" o "d000034-2026-oece-dtn"
  // Patrón: número-año-organismo
  const parts = s.split('-');
  if (parts.length >= 2) {
    // Caso típico: ["309", "2026", "oece", "dsat"] o ["2918", "2025", "tce", "s1"]
    const num = parts[0].toUpperCase();
    const year = parts[1];
    const suffix = parts.slice(2).map((p) => p.toUpperCase()).join('-');

    const formattedNumber = suffix
      ? `N° ${num}-${year}/${suffix}`
      : `N° ${num}-${year}`;

    const label = TYPE_LABEL[type] || type;
    return {
      title: `${label} ${formattedNumber}`,
      number: `${label} ${formattedNumber}`,
    };
  }

  // Fallback: devuelve slug tal cual con primera letra mayúscula
  const label = TYPE_LABEL[type] || type;
  return { title: `${label} ${s}`, number: `${label} ${s}` };
}

async function main() {
  console.log('Buscando documentos con títulos feos...\n');

  const { data: docs, error } = await supabase
    .from('normative_documents')
    .select('id, type, title, number, metadata');

  if (error) {
    console.error('Error consultando:', error.message);
    process.exit(1);
  }

  const ugly = (docs || []).filter((d: { title: string; number: string }) => {
    // Un título "feo" es un slug: comienza con prefijo numérico Rails y contiene "-"
    return /^\d+-[a-z0-9-]+$/.test(d.title) || /^\d+-[a-z0-9-]+$/.test(d.number);
  });

  console.log(`Encontrados ${ugly.length} documentos con títulos feos.\n`);

  let updated = 0;
  for (const doc of ugly as Array<{
    id: string;
    type: string;
    title: string;
    number: string;
    metadata: Record<string, unknown> | null;
  }>) {
    // Usar el slug original guardado en metadata.ingested_from si existe, sino el title actual
    const sourceSlug =
      (doc.metadata?.ingested_from as string)?.replace(/\.pdf$/i, '') || doc.title;

    const { title, number } = prettify(sourceSlug, doc.type);

    process.stdout.write(`  ${doc.title.padEnd(50)} → ${title.padEnd(40)} `);

    const { error: upErr } = await supabase
      .from('normative_documents')
      .update({ title, number })
      .eq('id', doc.id);

    if (upErr) {
      console.log(`FAIL: ${upErr.message}`);
    } else {
      console.log('OK');
      updated += 1;
    }
  }

  console.log(`\n${updated} documentos actualizados.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
