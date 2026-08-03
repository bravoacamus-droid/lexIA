#!/usr/bin/env tsx
/**
 * REPARA la fecha de las resoluciones del Tribunal ya ingeridas cuyo año
 * no coincide con el de su numeración.
 *
 * ORIGEN DEL PROBLEMA: la fecha se tomaba de la ficha de gob.pe con la
 * primera coincidencia de "N de mes de AAAA" en el HTML, que a veces es
 * una fecha citada (la del acto impugnado, la convocatoria) y no la de
 * publicación. Así, la "Resolución N° 2931-2026-S3" quedó fechada el
 * 03/07/2023. Eran el 6% de las resoluciones y rompían el agrupado por
 * año de la biblioteca (César, 03/08/2026).
 *
 * CÓMO SE REPARA: la fecha correcta está en el propio documento, en la
 * firma ("Lima, 24 de julio de 2026"). El texto ya está en la columna
 * raw_text, así que NO hay que volver a descargar ni gastar embeddings.
 * Se recorre el texto de atrás hacia adelante —la firma va al final— y
 * se exige que el año coincida con el de la numeración.
 *
 * El script de ingesta ya toma esta misma fecha como fuente preferente,
 * así que lo que entre desde ahora nace correcto.
 *
 * Uso:
 *   npx tsx scripts/reparar-fechas-resoluciones.ts           (simulación)
 *   npx tsx scripts/reparar-fechas-resoluciones.ts --apply
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

const APPLY = process.argv.includes('--apply');

const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', setiembre: '09', septiembre: '09', octubre: '10',
  noviembre: '11', diciembre: '12',
};

function fechaDeExpedicion(texto: string, anioEsperado: string): string | null {
  const re =
    /(?:Lima|Arequipa|Trujillo|Cusco|Piura)\s*,?\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de(?:l)?\s+(\d{4})/gi;
  const hallazgos = [...texto.matchAll(re)];
  for (let i = hallazgos.length - 1; i >= 0; i--) {
    const [, dia, mesTxt, anio] = hallazgos[i];
    const mes = MESES[mesTxt.toLowerCase()];
    if (!mes || anio !== anioEsperado) continue;
    const d = Number(dia);
    if (d < 1 || d > 31) continue;
    return `${anio}-${mes}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

interface Fila {
  id: string;
  number: string;
  date: string | null;
  raw_text: string | null;
  metadata: Record<string, unknown> | null;
}

async function main() {
  console.log(APPLY ? 'MODO APLICAR\n' : 'SIMULACIÓN — no escribe nada\n');

  const aReparar: Array<{ fila: Fila; nueva: string }> = [];
  let revisadas = 0;
  let sinFirma = 0;

  for (let desde = 0; ; desde += 500) {
    const { data, error } = await supabase
      .from('normative_documents')
      .select('id, number, date, raw_text, metadata')
      .eq('type', 'resolucion_tce')
      .range(desde, desde + 499);
    if (error) throw new Error(error.message);
    const filas = (data || []) as Fila[];
    for (const f of filas) {
      revisadas++;
      const anio = (f.metadata as { anio?: string } | null)?.anio;
      if (!anio || !f.date || !f.raw_text) continue;
      if (f.date.slice(0, 4) === anio) continue; // ya coherente
      const nueva = fechaDeExpedicion(f.raw_text, anio);
      if (nueva) aReparar.push({ fila: f, nueva });
      else sinFirma++;
    }
    if (filas.length < 500) break;
  }

  console.log(`Revisadas         ${revisadas}`);
  console.log(`Con fecha errónea ${aReparar.length + sinFirma}`);
  console.log(`  · recuperables  ${aReparar.length}`);
  console.log(`  · sin firma     ${sinFirma}  (se dejan como están)\n`);

  aReparar.slice(0, 12).forEach(({ fila, nueva }) =>
    console.log(`  ${fila.number.slice(0, 28).padEnd(28)} ${fila.date} → ${nueva}`),
  );
  if (aReparar.length > 12) console.log(`  … y ${aReparar.length - 12} más`);

  if (!APPLY) {
    console.log('\n(simulación — ejecuta con --apply)');
    return;
  }

  let hechas = 0;
  for (const { fila, nueva } of aReparar) {
    const { error } = await supabase
      .from('normative_documents')
      .update({
        date: nueva,
        metadata: { ...(fila.metadata || {}), fecha_origen: 'firma del documento' },
      } as never)
      .eq('id', fila.id);
    if (error) {
      console.error(`  ❌ ${fila.number}: ${error.message}`);
      continue;
    }
    hechas++;
    if (hechas % 50 === 0) console.log(`  ${hechas}/${aReparar.length}`);
  }
  console.log(`\n✅ ${hechas} fechas corregidas`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
