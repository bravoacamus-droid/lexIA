#!/usr/bin/env tsx
/**
 * Deja cada resolución con el número que dice SU PDF.
 *
 * César, documento 14 (16/10/2026), sobre las dudas que dejó la
 * corrección de siglas (scripts/corregir-siglas-resoluciones.ts): «Se
 * debe considerar lo establecido en la RESOLUCIÓN PDF». Tres casos:
 *
 *  1. Sigla contradictoria dentro del PDF: el encabezado de la resolución
 *     dice TCE y el membrete de las páginas, TCP (la ficha de gob.pe
 *     también TCP). Manda el encabezado: es el número que la resolución
 *     se da a sí misma.
 *  2. La ficha de gob.pe trae el PDF de OTRA resolución y esa otra no
 *     está en la biblioteca: se renumera con el número del PDF.
 *  3. La ficha trae el PDF de otra resolución que SÍ está en la
 *     biblioteca: es un duplicado. Si el contenido coincide, se oculta
 *     (oculto = true: sale de la biblioteca, el buscador y el chat, y se
 *     puede revertir) y se anota por qué en metadata.
 *
 * Uso:
 *   npx tsx scripts/numero-segun-el-pdf.ts            (simula)
 *   npx tsx scripts/numero-segun-el-pdf.ts --aplicar  (escribe)
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

config({ path: join(process.cwd(), '.env.local'), override: true });
const APLICAR = process.argv.includes('--aplicar');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const informe = JSON.parse(readFileSync(join(process.cwd(), 'data', 'siglas-resoluciones.informe.json'), 'utf8')) as {
  dudosas: Array<{ number: string; motivo: string }>;
  numeroDistinto: Array<{ number: string; encabezado: string }>;
};

interface Doc {
  id: string;
  number: string;
  title: string;
  metadata: Record<string, unknown> | null;
  oculto: boolean;
}

const plano = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function doc(number: string): Promise<Doc | null> {
  const { data } = await sb.from('normative_documents').select('id, number, title, metadata, oculto').eq('number', number);
  return ((data ?? [])[0] as Doc | undefined) ?? null;
}

/** Las palabras de los primeros fragmentos, para comparar contenidos. */
async function huella(id: string): Promise<Set<string>> {
  const { data } = await sb.from('normative_chunks').select('content').eq('document_id', id).order('chunk_index').limit(4);
  return new Set(plano(((data ?? []) as Array<{ content: string }>).map((c) => c.content).join(' ')).split(' ').filter((w) => w.length > 3));
}

function parecido(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  return [...a].filter((w) => b.has(w)).length / Math.min(a.size, b.size);
}

async function renumerar(d: Doc, nuevo: string, motivo: string) {
  const viejo = d.number.replace(/^Resolución N° /, '');
  const titulo = d.title.replace(viejo, nuevo.replace(/^Resolución N° /, ''));
  // correlativo_num es una columna generada a partir del número.
  console.log(`  RENUMERA ${d.number} → ${nuevo} (${motivo})`);
  if (!APLICAR) return;
  const { error } = await sb
    .from('normative_documents')
    .update({
      number: nuevo,
      title: titulo,
      metadata: { ...(d.metadata ?? {}), numero_anterior: d.number, numero_corregido_por: motivo },
    })
    .eq('id', d.id);
  if (error) throw new Error(JSON.stringify(error));
}

void (async () => {
  console.log(APLICAR ? 'MODO APLICAR\n' : 'SIMULACIÓN (usa --aplicar)\n');

  console.log('1. Sigla contradictoria dentro del PDF: manda el encabezado');
  // Las que además traen el PDF de otra resolución se tratan abajo.
  const cruzadas = new Set(informe.numeroDistinto.map((x) => x.number));
  for (const x of informe.dudosas.filter((d) => /encabezado dice TCE/.test(d.motivo) && !cruzadas.has(d.number))) {
    const d = await doc(x.number);
    if (!d) continue;
    const nuevo = d.number.replace('-TCP-', '-TCE-');
    if (nuevo === d.number) continue;
    if (await doc(nuevo)) {
      console.log(`  CHOCA ${d.number}: ya existe ${nuevo}, no se toca`);
      continue;
    }
    await renumerar(d, nuevo, 'encabezado de la resolución (PDF)');
  }

  console.log('\n2 y 3. El PDF es de otra resolución');
  let renumeradas = 0;
  let ocultas = 0;
  for (const x of informe.numeroDistinto) {
    const d = await doc(x.number);
    if (!d || d.oculto) continue;
    const delPdf = `Resolución N° ${x.encabezado.replace(/^0+/, '')}`;
    const existente = await doc(delPdf);
    if (!existente) {
      await renumerar(d, delPdf, 'número del PDF');
      renumeradas++;
      continue;
    }
    const p = parecido(await huella(d.id), await huella(existente.id));
    if (p < 0.8) {
      console.log(`  REVISAR ${d.number}: su PDF dice ${delPdf}, que ya existe, pero el contenido se parece solo ${Math.round(p * 100)} %`);
      continue;
    }
    console.log(`  OCULTA ${d.number}: su PDF es ${delPdf}, ya en la biblioteca (contenido ${Math.round(p * 100)} % igual)`);
    ocultas++;
    if (!APLICAR) continue;
    const { error } = await sb
      .from('normative_documents')
      .update({
        oculto: true,
        metadata: { ...(d.metadata ?? {}), oculto_porque: `la ficha de gob.pe trae el PDF de la ${delPdf}, que ya está en la biblioteca`, duplicado_de: existente.id },
      })
      .eq('id', d.id);
    if (error) throw new Error(JSON.stringify(error));
  }
  console.log(`\nRenumeradas por el PDF: ${renumeradas} · ocultas por duplicadas: ${ocultas}`);
})();
