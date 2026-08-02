#!/usr/bin/env tsx
/**
 * AUDITORÍA DEL ORDEN DE LA BIBLIOTECA — una sección a la vez.
 *
 * Reproduce el ordenamiento exacto del endpoint (/api/search en modo
 * browse) para CADA tipo de documento y verifica que se cumpla la regla
 * acordada con César: año descendente y, dentro de cada año, correlativo
 * ascendente. Reporta además la cobertura de los campos que hacen
 * posible ese orden (año y correlativo).
 *
 * Uso: npx tsx scripts/auditar-orden-biblioteca.ts
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface Row {
  id: string;
  type: string;
  title: string;
  date: string | null;
  metadata: { anio?: string; correlativo?: string; entidad?: string } | null;
}

async function main() {
  const { data: tipos } = await supabase.from('normative_documents').select('type');
  const universo = [...new Set(((tipos || []) as Array<{ type: string }>).map((t) => t.type))].sort();

  let problemas = 0;
  for (const tipo of universo) {
    // MISMO orden que el endpoint
    const { data } = await supabase
      .from('normative_documents')
      .select('id, type, title, date, metadata')
      .eq('type', tipo)
      .order('metadata->>anio', { ascending: false, nullsFirst: false })
      .order('metadata->>correlativo', { ascending: true, nullsFirst: false })
      .order('date', { ascending: false, nullsFirst: false });
    const docs = (data || []) as Row[];
    if (docs.length === 0) continue;

    const sinAnio = docs.filter((d) => !d.metadata?.anio).length;
    const sinCorr = docs.filter((d) => !d.metadata?.correlativo).length;

    // Verificar la regla: año no creciente; dentro del año, correlativo no decreciente
    const fallos: string[] = [];
    for (let i = 1; i < docs.length; i++) {
      const a = docs[i - 1];
      const b = docs[i];
      const anioA = a.metadata?.anio;
      const anioB = b.metadata?.anio;
      if (anioA && anioB) {
        if (Number(anioB) > Number(anioA)) {
          fallos.push(`año sube: ${anioA} → ${anioB} (${b.title.slice(0, 34)})`);
          continue;
        }
        if (anioA === anioB) {
          const cA = a.metadata?.correlativo;
          const cB = b.metadata?.correlativo;
          if (cA && cB && cB < cA) {
            fallos.push(`correlativo baja en ${anioA}: ${cA} → ${cB}`);
          }
        }
      }
    }

    const anios = [...new Set(docs.map((d) => d.metadata?.anio).filter(Boolean))].sort().reverse();
    const estado = fallos.length === 0 ? '✅' : '❌';
    if (fallos.length > 0) problemas++;
    console.log(
      `${estado} ${tipo.padEnd(16)} ${String(docs.length).padStart(3)} docs | años: ${anios.join(', ') || '—'} | sin año: ${sinAnio} | sin correlativo: ${sinCorr}`,
    );
    fallos.slice(0, 3).forEach((f) => console.log(`      ⚠️ ${f}`));
    // Muestra los 3 primeros para inspección visual
    docs.slice(0, 3).forEach((d) =>
      console.log(
        `      ${d.metadata?.anio || '----'} ${d.metadata?.correlativo || '----'}  ${d.title.slice(0, 52)}`,
      ),
    );
  }

  console.log(
    `\n${problemas === 0 ? '✅ Todas las secciones respetan el orden' : `❌ ${problemas} secciones con orden incorrecto`}`,
  );
  if (problemas > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
