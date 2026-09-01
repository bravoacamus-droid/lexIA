#!/usr/bin/env tsx
/**
 * Rehace el vector de los fragmentos cuyo texto se reparó.
 *
 * POR QUÉ
 *
 * `reparar-codificacion-fragmentos.ts` arregla el texto, y con él la
 * búsqueda por palabras —que es exacta y depende de las letras—. El
 * vector, en cambio, se calculó sobre el texto estropeado: «dÌas
 * h·biles» y «días hábiles» no caen en el mismo sitio. Mientras no se
 * rehaga, esos documentos siguen sin aparecer en la búsqueda semántica
 * aunque ya se lean bien.
 *
 * Se le pasan los documentos por su título, o `--todos-los-reparados`
 * para los nueve de la avería de agosto de 2026.
 *
 *   npx tsx scripts/rehacer-vectores-reparados.ts --todos-los-reparados
 *   npx tsx scripts/rehacer-vectores-reparados.ts --documento "Directiva N° 002…"
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { embed } from '../src/lib/ai/embeddings';

config({ path: join(process.cwd(), '.env.local'), override: true });

const admin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { persistSession: false } },
);

/** Los documentos que se repararon el 31/08/2026. */
const REPARADOS = [
  'Directiva N° 001-2025-PERÚ COMPRAS - Lista de Fichas Técnicas',
  'Directiva N° 002-2025-PERÚ COMPRAS - Compras por Encargo',
  'Directiva N° 003-2025-PERÚ COMPRAS - Gestión del Proceso de Homologación de Requerimientos',
  'Directiva N° 004-2025-PERÚ COMPRAS - Directiva para la Gestión de la Compra Corporativa Obligatoria',
  'Resolución N° 2293-2025-S5 (Tribunal de Contrataciones)',
  'Resolución N° 2757-2025-S3 (Tribunal de Contrataciones)',
  'Resolución N° 4691-2025-S4 (Tribunal de Contrataciones)',
  'Resolución N° 4709-2025-S1 (Tribunal de Contrataciones)',
  'Resolución N° 4957-2025-S2 (Tribunal de Contrataciones)',
  'Resolución N° 593-2026-S5 (Tribunal de Contrataciones)',
];

interface Fila {
  id: string;
  content: string;
}

async function main() {
  const i = process.argv.indexOf('--documento');
  const titulos = i >= 0 ? [process.argv[i + 1]] : REPARADOS;

  const { data: docs, error: eDocs } = await admin
    .from('normative_documents')
    .select('id, title')
    .in('title', titulos);
  if (eDocs) throw new Error(eDocs.message);

  const documentos = (docs ?? []) as Array<{ id: string; title: string }>;
  console.log(`\n${documentos.length} documento(s)\n`);

  let hechos = 0;
  for (const d of documentos) {
    const { data, error } = await admin
      .from('normative_chunks')
      .select('id, content')
      .eq('document_id', d.id)
      .order('chunk_index');
    if (error) throw new Error(error.message);

    const filas = (data ?? []) as Fila[];
    if (filas.length === 0) continue;

    // De cien en cien, que es lo que admite la API por llamada.
    for (let k = 0; k < filas.length; k += 100) {
      const tanda = filas.slice(k, k + 100);
      const vectores = await embed(
        tanda.map((f) => f.content),
        'RETRIEVAL_DOCUMENT',
      );
      for (let n = 0; n < tanda.length; n++) {
        const { error: e } = await admin
          .from('normative_chunks')
          .update({ embedding: vectores[n] })
          .eq('id', tanda[n].id);
        if (e) {
          console.log(`  ⚠ ${tanda[n].id}: ${e.message}`);
          continue;
        }
        hechos++;
      }
    }
    console.log(`  ✓ ${filas.length.toString().padStart(3)} · ${d.title.slice(0, 78)}`);
  }

  console.log(`\n${hechos} vector(es) rehechos.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
