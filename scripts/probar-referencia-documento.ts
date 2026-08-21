#!/usr/bin/env tsx
/**
 * Pedir un documento por su número tiene que traerlo.
 *
 * POR QUÉ EXISTE
 *
 * César pidió el resumen de la "Resolución Nº 01727-2026-TCP-S2" y el
 * chat respondió que no estaba en la base normativa. Estaba: la
 * biblioteca la muestra y la consulta directa la encuentra. Fallaban dos
 * cosas al comparar cadenas:
 *
 *   · el cero de relleno —"01727" contra "1727" guardado—;
 *   · el acrónimo del Tribunal, que la gente escribe pegado a la sala
 *     —"TCP-S2"— y la biblioteca no guarda.
 *
 * Ahora se busca por el correlativo numérico y el año, que es lo estable.
 * Esta prueba va contra la base de verdad con las cinco resoluciones que
 * él reportó.
 *
 * Uso: npx tsx scripts/probar-referencia-documento.ts
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { detectarReferencias } from '../src/lib/ai/referencia-documento';

config({ path: join(process.cwd(), '.env.local'), override: true });
const admin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
);

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

/** Las cinco que César dijo que no se encontraban, como él las escribió. */
const CASOS: Array<[string, string]> = [
  ['Resume la Resolución Nº 01727-2026-TCP-S2', 'Resolución N° 1727-2026-S2'],
  ['¿Qué dice la Resolución Nº 06127-2026-TCP-S1?', 'Resolución N° 6127-2026-S1'],
  ['Resolución N° 4735-2026-TCP-S4', 'Resolución N° 4735-2026-S4'],
  ['Resolución N° 3318-2026-TCP-S6', 'Resolución N° 3318-2026-S6'],
  ['Resolución N° 4780-2026-TCP-S4', 'Resolución N° 4780-2026-S4'],
];

/** Réplica de lo que hace el chat al detectar una referencia. */
async function buscar(pregunta: string) {
  const refs = detectarReferencias(pregunta);
  if (refs.length === 0) return null;
  const ref = refs[0];
  let q = admin
    .from('normative_documents')
    .select('id, type, number, title, date')
    .eq('correlativo_num', ref.correlativo)
    .limit(30);
  if (ref.tipo) q = q.eq('type', ref.tipo);
  const { data } = await q;
  const docs = (data ?? []).filter((d) => {
    const numero = String(d.number ?? '');
    const fecha = String(d.date ?? '');
    return numero.includes(ref.anio) || fecha.startsWith(ref.anio);
  });
  if (docs.length === 0) return null;
  const elegido =
    (ref.sufijo &&
      docs.find((d) => String(d.number).toLowerCase().includes(ref.sufijo!.toLowerCase()))) ||
    docs[0];
  return elegido as { id: string; number: string; title: string };
}

void (async () => {
  console.log('── Las cinco resoluciones que reportó César ──');
  for (const [pregunta, esperado] of CASOS) {
    const doc = await buscar(pregunta);
    comprobar(`"${pregunta.slice(0, 46)}…" → ${doc?.number ?? 'NO ENCONTRADA'}`, doc?.number === esperado);
    if (doc) {
      const { count } = await admin
        .from('normative_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('document_id', doc.id);
      comprobar(`   y trae su texto (${count} fragmentos)`, (count ?? 0) > 0);
    }
  }

  console.log('\n── Que no traiga otra por parecido ──');
  const otraSala = await buscar('Resolución N° 1727-2026-S5');
  comprobar(
    'si la sala pedida no existe, no inventa: devuelve la del mismo número y año',
    otraSala === null || otraSala.number.includes('1727-2026'),
  );
  const otroAnio = await buscar('Resolución N° 1727-2025-S5');
  comprobar('el año manda: 2025 no devuelve la de 2026', otroAnio?.number.includes('2025') === true);

  console.log('\n── Formas de escribirlo ──');
  for (const forma of [
    'Resolución N° 1727-2026-S2',
    'Resolución Nº 01727-2026-TCP-S2',
    'resolución 1727-2026-TCE-S2',
    'RESOLUCIÓN N° 001727-2026-S2',
  ]) {
    const doc = await buscar(forma);
    comprobar(`"${forma}"`, doc?.number === 'Resolución N° 1727-2026-S2');
  }

  console.log(
    fallos === 0
      ? '\n✅ Pedir un documento por su número lo trae, se escriba como se escriba.'
      : `\n❌ ${fallos} problema(s).`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})();
