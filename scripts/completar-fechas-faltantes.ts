#!/usr/bin/env tsx
/**
 * COMPLETA LAS FECHAS FALTANTES sin descargar nada.
 *
 * Pregunta de César (01/08/2026): "¿no hay forma de obtener la fecha de
 * esos documentos?". Sí, por dos vías que no requieren consultar la web:
 *
 * 1. HERENCIA ENTRE PARTES DEL MISMO ACTO — la mayoría de los documentos
 *    sin fecha son anexos, modificaciones o resoluciones aprobatorias que
 *    comparten título con otra pieza que SÍ tiene fecha. Un anexo se
 *    emite con su resolución, así que hereda su fecha. Se marca en
 *    metadata.fecha_heredada para poder distinguirla de una leída del
 *    propio documento.
 *
 * 2. NOMBRE DEL ARCHIVO ORIGINAL — algunos PDFs traen la fecha de versión
 *    en el nombre ("...AL 07MAYO2025-MODIF OA (VF).pdf"). Se busca en la
 *    carpeta de origen cuando metadata.original_path apunta a ella.
 *
 * Uso:
 *   npx tsx scripts/completar-fechas-faltantes.ts            (simulación)
 *   npx tsx scripts/completar-fechas-faltantes.ts --apply
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const APPLY = process.argv.includes('--apply');

const MESES_TXT: Record<string, number> = {
  ENE: 1, ENERO: 1, FEB: 2, FEBRERO: 2, MAR: 3, MARZO: 3, ABR: 4, ABRIL: 4,
  MAY: 5, MAYO: 5, JUN: 6, JUNIO: 6, JUL: 7, JULIO: 7, AGO: 8, AGOSTO: 8,
  SET: 9, SEP: 9, SETIEMBRE: 9, SEPTIEMBRE: 9, OCT: 10, OCTUBRE: 10,
  NOV: 11, NOVIEMBRE: 11, DIC: 12, DICIEMBRE: 12,
};

interface Doc {
  id: string;
  type: string;
  title: string;
  date: string | null;
  metadata: Record<string, unknown> | null;
}

const clave = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();

/** "AL 07MAYO2025" dentro de un nombre de archivo → 2025-05-07. */
function fechaDeNombre(nombre: string): string | null {
  const m = nombre.toUpperCase().match(/(\d{1,2})\s*([A-ZÉ]{3,10})\.?\s*(20\d{2})/);
  if (!m) return null;
  const mes = MESES_TXT[m[2]];
  const dia = Number(m[1]);
  if (!mes || dia < 1 || dia > 31) return null;
  return `${m[3]}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

async function main() {
  const { data, error } = await supabase
    .from('normative_documents')
    .select('id, type, title, date, metadata');
  if (error) throw new Error(error.message);
  const docs = (data || []) as Doc[];
  const sinFecha = docs.filter((d) => !d.date);
  console.log(`Documentos sin fecha: ${sinFecha.length}\n`);

  const porTitulo = new Map<string, Doc[]>();
  for (const d of docs) {
    const k = clave(d.title);
    porTitulo.set(k, [...(porTitulo.get(k) || []), d]);
  }

  const plan: Array<{ doc: Doc; fecha: string; via: string }> = [];

  for (const d of sinFecha) {
    // 1) heredar de una parte hermana del mismo acto
    const hermanos = (porTitulo.get(clave(d.title)) || []).filter(
      (x) => x.id !== d.id && x.date,
    );
    if (hermanos.length > 0) {
      // la más temprana: la del acto original, no la de sus modificaciones
      const fecha = hermanos
        .map((h) => h.date as string)
        .sort()[0];
      plan.push({ doc: d, fecha, via: 'hereda de otra parte del mismo acto' });
      continue;
    }

    // 2) nombre del archivo original
    const orig = String(d.metadata?.original_path || '');
    const carpeta = orig.includes('/') ? orig.split('/')[0] : null;
    if (carpeta && existsSync(join(process.cwd(), carpeta))) {
      const archivos = readdirSync(join(process.cwd(), carpeta));
      const base = (orig.split('/').pop() || '').slice(0, 28).toUpperCase();
      const match = archivos.find((a) => a.toUpperCase().startsWith(base.slice(0, 20)));
      const f = match ? fechaDeNombre(match) : null;
      if (f) {
        plan.push({ doc: d, fecha: f, via: `nombre del archivo: ${match}` });
        continue;
      }
    }

    console.log(`  ❌ ${d.type.padEnd(12)} ${d.title.slice(0, 52)} — sin vía disponible`);
  }

  console.log(`\nSe pueden completar: ${plan.length} de ${sinFecha.length}\n`);
  plan.forEach((p) =>
    console.log(`  ✅ ${p.fecha}  ${p.doc.title.slice(0, 46).padEnd(46)} (${p.via.slice(0, 46)})`),
  );

  if (!APPLY) {
    console.log('\n(simulación — ejecuta con --apply)');
    return;
  }

  for (const p of plan) {
    const { error: e } = await supabase
      .from('normative_documents')
      .update({
        date: p.fecha,
        metadata: {
          ...(p.doc.metadata || {}),
          anio: p.fecha.slice(0, 4),
          fecha_heredada: p.via.startsWith('hereda') ? true : undefined,
          fecha_origen: p.via,
        },
      } as never)
      .eq('id', p.doc.id);
    if (e) console.error(`  ⚠️ ${p.doc.title.slice(0, 40)}: ${e.message}`);
  }
  console.log(`\n✅ ${plan.length} fechas completadas.`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
