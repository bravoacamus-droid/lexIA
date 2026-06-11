#!/usr/bin/env tsx
/**
 * Siembra `scraping_sources` con URLs públicas oficiales de:
 *   - Directivas vigentes (OECE/OSCE)
 *   - Pronunciamientos del OECE
 *   - Opiniones DTN del OSCE
 *   - Resoluciones del Tribunal de Contrataciones del Estado
 *
 * Estas URLs son listados oficiales accesibles sin autenticación.
 * Si alguna falla con HTTP 403, hay que ajustar el UA o usar otra URL.
 *
 * Idempotente: UPSERT por (url).
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

interface Seed {
  url: string;
  doc_type: string;
  label: string;
  link_selector?: string;
  link_filter_regex?: string;
  cadence_days?: number;
  notes?: string;
}

// Notas: las URLs son las páginas índice/listado donde se enumera la jurisprudencia.
// El bot resuelve los hrefs absolutos y filtra por regex (típicamente .pdf$).
const SEEDS: Seed[] = [
  {
    label: 'OECE — Pronunciamientos',
    url: 'https://www.gob.pe/institucion/osce/colecciones/16001-pronunciamientos',
    doc_type: 'pronunciamiento',
    link_selector: 'a[href*=".pdf"], a[href*="/informes-publicaciones/"]',
    link_filter_regex: '\\.pdf$',
    cadence_days: 7,
    notes:
      'Página índice oficial de pronunciamientos del OECE. El bot descarga los PDFs enlazados.',
  },
  {
    label: 'OECE — Opiniones DTN',
    url: 'https://www.gob.pe/institucion/osce/colecciones/16002-opiniones',
    doc_type: 'opinion',
    link_selector: 'a[href*=".pdf"], a[href*="/informes-publicaciones/"]',
    link_filter_regex: '\\.pdf$',
    cadence_days: 7,
    notes: 'Opiniones de la DTN. Misma estructura que pronunciamientos.',
  },
  {
    label: 'OECE — Directivas vigentes',
    url: 'https://www.gob.pe/institucion/osce/colecciones/16004-directivas',
    doc_type: 'directiva',
    link_selector: 'a[href*=".pdf"]',
    link_filter_regex: '\\.pdf$',
    cadence_days: 30,
    notes:
      'Directivas vigentes del OECE. Cambian con menor frecuencia (cadence 30 días).',
  },
  {
    label: 'Tribunal de Contrataciones del Estado — Resoluciones',
    url: 'https://www.gob.pe/institucion/osce/colecciones/16005-resoluciones',
    doc_type: 'resolucion_tce',
    link_selector: 'a[href*=".pdf"]',
    link_filter_regex: '\\.pdf$',
    cadence_days: 7,
    notes:
      'Resoluciones del Tribunal de Contrataciones del Estado. Volumen alto, conviene mantenerlo en cadencia semanal.',
  },
];

async function main() {
  console.log('Sembrando scraping_sources...\n');
  for (const s of SEEDS) {
    // UPSERT manual por url (no hay unique constraint, lo hacemos a mano)
    const { data: existing } = await supabase
      .from('scraping_sources')
      .select('id')
      .eq('url', s.url)
      .maybeSingle();

    const payload = {
      url: s.url,
      doc_type: s.doc_type,
      label: s.label,
      link_selector: s.link_selector || 'a[href]',
      link_filter_regex: s.link_filter_regex || null,
      cadence_days: s.cadence_days ?? 7,
      notes: s.notes || null,
      active: true,
    } as never;

    if (existing) {
      const { error } = await supabase
        .from('scraping_sources')
        .update(payload)
        .eq('id', (existing as { id: string }).id);
      if (error) {
        console.log(`  ✗ ${s.label}: ${error.message}`);
      } else {
        console.log(`  ↻ ${s.label}  (UPDATE)`);
      }
    } else {
      const { error } = await supabase.from('scraping_sources').insert(payload);
      if (error) {
        console.log(`  ✗ ${s.label}: ${error.message}`);
      } else {
        console.log(`  ✓ ${s.label}  (INSERT)`);
      }
    }
  }
  console.log('\nListo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
