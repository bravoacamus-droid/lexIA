#!/usr/bin/env tsx
/**
 * Retira las resoluciones del Tribunal que están dos veces.
 *
 * El 24/09/2026 se encontraron 25 resoluciones con el mismo número, año
 * y sala guardadas dos veces —casi siempre la misma ficha de gob.pe,
 * ingerida en dos cargas con distinto formato de número («04979-2026-
 * TCP-S3» y «Resolución N° 4979-2026-S3»)—. En la búsqueda salen como
 * dos resultados del mismo documento.
 *
 * Solo se retira una copia si el contenido es el mismo (mismo largo con
 * ±2 % y mismo texto al comienzo): dos resoluciones con el mismo número
 * en SALAS distintas no se tocan, y tampoco un par del mismo número cuyo
 * texto difiere. Se conserva la que tiene el número en el formato de la
 * biblioteca y, a igualdad, la que tiene más fragmentos.
 *
 * Uso:
 *   npx tsx scripts/deduplicar-resoluciones.ts          (simula)
 *   npx tsx scripts/deduplicar-resoluciones.ts --apply
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
loadEnv({ path: join(process.cwd(), '.env.local'), override: true });
import { createClient } from '@supabase/supabase-js';
import { claveDeResolucion } from '../src/lib/scraping/resoluciones';

const APPLY = process.argv.includes('--apply');
const supabase = createClient((process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(), (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(), {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface Fila {
  id: string;
  number: string | null;
  title: string;
}

function mismoContenido(a: string, b: string): boolean {
  const n = (s: string) => s.replace(/\s+/g, ' ').trim();
  const x = n(a);
  const y = n(b);
  if (!x || !y) return false;
  const ratio = Math.min(x.length, y.length) / Math.max(x.length, y.length);
  return ratio > 0.98 && x.slice(200, 1500) === y.slice(200, 1500);
}

async function main() {
  console.log(APPLY ? 'MODO APLICAR\n' : 'SIMULACIÓN — no escribe nada\n');
  const filas: Fila[] = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await supabase.from('normative_documents').select('id, number, title').eq('type', 'resolucion_tce').order('id').range(d, d + 999);
    if (error) throw new Error(error.message);
    filas.push(...((data ?? []) as Fila[]));
    if ((data ?? []).length < 1000) break;
  }
  const grupos = new Map<string, Fila[]>();
  for (const f of filas) {
    const c = claveDeResolucion(`${f.number ?? ''} ${f.title}`);
    if (!c || c.sala === 'S?') continue;
    const k = `${c.numero}-${c.anio}-${c.sala}`;
    grupos.set(k, [...(grupos.get(k) ?? []), f]);
  }
  const repetidos = [...grupos.entries()].filter(([, v]) => v.length > 1);
  console.log(`Resoluciones: ${filas.length} · claves repetidas (mismo número, año y sala): ${repetidos.length}\n`);

  let retiradas = 0;
  let distintas = 0;
  for (const [clave, v] of repetidos) {
    const { data } = await supabase.from('normative_documents').select('id, number, raw_text').in('id', v.map((x) => x.id));
    const docs = (data ?? []) as Array<{ id: string; number: string; raw_text: string }>;
    const conteo = await Promise.all(
      docs.map(async (d) => {
        const { count } = await supabase.from('normative_chunks').select('id', { count: 'exact', head: true }).eq('document_id', d.id);
        return { ...d, fragmentos: count ?? 0 };
      }),
    );
    conteo.sort(
      (a, b) =>
        Number(b.number.startsWith('Resolución N° ')) - Number(a.number.startsWith('Resolución N° ')) || b.fragmentos - a.fragmentos,
    );
    const [queda, ...resto] = conteo;
    for (const r of resto) {
      if (!mismoContenido(queda.raw_text ?? '', r.raw_text ?? '')) {
        distintas++;
        console.log(`  DISTINTO  ${clave}: «${queda.number}» y «${r.number}» tienen texto diferente — no se toca`);
        continue;
      }
      retiradas++;
      console.log(`  ${clave}: queda «${queda.number}» (${queda.fragmentos} frag.) · se retira «${r.number}» (${r.fragmentos} frag.)`);
      if (APPLY) {
        const { error } = await supabase.from('normative_documents').delete().eq('id', r.id);
        if (error) console.log(`    ✗ ${error.message}`);
      }
    }
  }
  console.log(`\nRetiradas: ${retiradas} · pares con texto distinto (no se tocan): ${distintas}`);
  if (!APPLY) console.log('(simulación — ejecuta con --apply)');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
