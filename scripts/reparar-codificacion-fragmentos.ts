#!/usr/bin/env tsx
/**
 * Repara los documentos guardados con la codificación rota.
 *
 * QUÉ PASÓ
 *
 * Nueve documentos entraron a la biblioteca con el texto estropeado:
 * «dos (2) dÌas h·biles», «ResoluciÛn N∞ 002», «PER⁄ COMPRAS»,
 * «P·gina». El daño es de un solo paso y por tanto reversible: el texto
 * venía en Latin-1 y se leyó como MacRoman. La á (byte 0xE1 en Latin-1)
 * es el punto medio en MacRoman, la í (0xED) es Ì, la ó (0xF3) es Û, y
 * así con las 123 posiciones altas.
 *
 * POR QUÉ IMPORTA
 *
 * No es cosmético. La búsqueda por palabras no encuentra «días hábiles»
 * en un fragmento que dice «dÌas h·biles», y el vector se calculó sobre
 * el texto estropeado. Son documentos que el chat no puede citar aunque
 * respondan a la pregunta: se descubrió al comprobar de dónde salía una
 * cifra que el chat afirmaba y ningún fragmento respaldaba —la cifra era
 * correcta y estaba en la base, ilegible—.
 *
 * QUÉ HACE
 *
 * Recorre los fragmentos con la marca del daño, deshace el paso y
 * comprueba el resultado antes de escribir: solo se guarda si el texto
 * reparado tiene menos símbolos raros y más letras acentuadas que el
 * original. En seco por defecto; escribe con `--aplicar`.
 *
 *   npx tsx scripts/reparar-codificacion-fragmentos.ts
 *   npx tsx scripts/reparar-codificacion-fragmentos.ts --aplicar
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

config({ path: join(process.cwd(), '.env.local'), override: true });

const admin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { persistSession: false } },
);

/**
 * Los nueve glifos que la avería produce a partir de una letra
 * española, y qué letra era.
 *
 * Es una lista corta a propósito. Con la tabla entera de MacRoman
 * —ciento veintitrés posiciones— se reparaban los acentos, sí, pero de
 * paso una raya larga legítima se volvía «Ð» y la comilla de cerrar
 * «Ó». Y quedan fuera las reglas que PARTEN de un carácter español
 * legítimo, porque en un fragmento medio sano convertirían texto bueno
 * en basura: «N° 4» habría acabado como «N¡ 4».
 */
const DESHACER: Record<string, string> = {
  "∞": "°", "∫": "º", "⁄": "Ú", "·": "á", "È": "é", "Ì": "í", "Ò": "ñ",
  "Û": "ó", "˙": "ú",
};

/** La marca del daño: secuencias que solo salen de esta avería. */
const MARCA = /(dÌas|h·biles|ResoluciÛn|selecciÛn|contrataciÛn|P·gina|N∞|PER⁄|N∫|P˙blicas|InformaciÛn)/;

/** Letras que el español usa y la avería destruye. */
const ACENTUADAS = /[áéíóúñÁÉÍÓÚÑ°]/g;
/**
 * Símbolos que la avería introduce y el español no usa.
 *
 * Ojo con lo que se mete aquí: la primera versión incluía la Í y la Ó
 * —que son letras españolas de pleno derecho— y hasta el espacio, así
 * que reparar «ResoluciÛn» aumentaba la cuenta de rarezas y el guardián
 * rechazaba su propia reparación. Solo van los que no pueden aparecer
 * en un texto legal en español.
 */
const RAROS = /[·ÌÛ˙È∞⁄ÒÎÏÔ˘˚˝˛ˇ‰„‚‡ﬁﬂ‹›€◊∏∑∫≈√ƒ∆]/g;

function reparar(texto: string): string {
  let salida = '';
  for (const ch of texto) salida += DESHACER[ch] ?? ch;
  return salida;
}

function cuantos(texto: string, re: RegExp): number {
  return (texto.match(re) ?? []).length;
}

/** Solo se guarda si el texto queda mejor, no distinto. */
function mejora(antes: string, despues: string): boolean {
  if (despues === antes) return false;
  if (despues.includes('�')) return false;
  return (
    cuantos(despues, ACENTUADAS) > cuantos(antes, ACENTUADAS) &&
    cuantos(despues, RAROS) < cuantos(antes, RAROS)
  );
}

interface Fila {
  id: string;
  document_id: string;
  content: string;
}

/**
 * Los fragmentos con la marca del daño, por SQL directo: la misma
 * búsqueda por PostgREST, con el comodín al principio y trescientos mil
 * filas, agota el tiempo de la consulta.
 */
async function fragmentosDaniados(): Promise<string[]> {
  const token = (process.env.SUPABASE_ACCESS_TOKEN ?? '').trim().replace(/[\r\n"']/g, '');
  const ref = (process.env.SUPABASE_PROJECT_REF ?? '').trim().replace(/[\r\n"']/g, '');
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `select id from normative_chunks where content ~ '${MARCA.source.replace(/'/g, "''")}'`,
    }),
  });
  if (!res.ok) throw new Error(`consulta: HTTP ${res.status} ${await res.text()}`);
  return ((await res.json()) as Array<{ id: string }>).map((f) => f.id);
}

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  console.log(aplicar ? '\nESCRIBIENDO\n' : '\nEN SECO — nada se escribe. Añade --aplicar.\n');

  const ids = await fragmentosDaniados();
  console.log(`${ids.length} fragmento(s) con la marca del daño`);

  const data: Fila[] = [];
  for (let k = 0; k < ids.length; k += 100) {
    const { data: trozos, error } = await admin
      .from('normative_chunks')
      .select('id, document_id, content')
      .in('id', ids.slice(k, k + 100));
    if (error) throw new Error(error.message);
    data.push(...((trozos ?? []) as Fila[]));
  }

  const filas = (data ?? []) as Fila[];
  const candidatas = filas.filter((f) => MARCA.test(f.content));
  console.log(`${candidatas.length} fragmento(s) con la marca del daño\n`);

  let reparados = 0;
  let rechazados = 0;
  let primera = true;

  for (const f of candidatas) {
    const nuevo = reparar(f.content);
    if (!mejora(f.content, nuevo)) {
      rechazados++;
      if (process.argv.includes('--porque')) {
        const i = Math.max(0, f.content.search(MARCA) - 60);
        console.log(
          `  descartado ${f.id}: acentos ${cuantos(f.content, ACENTUADAS)}→${cuantos(nuevo, ACENTUADAS)}` +
            ` · raros ${cuantos(f.content, RAROS)}→${cuantos(nuevo, RAROS)}` +
            ` · ¿cambia? ${nuevo !== f.content}`,
        );
        console.log(`     …${f.content.slice(i, i + 110).replace(/\s+/g, ' ')}…`);
      }
      continue;
    }
    if (primera) {
      const i = Math.max(0, f.content.search(MARCA) - 120);
      console.log('MUESTRA');
      console.log('  antes:  …' + f.content.slice(i, i + 240).replace(/\s+/g, ' ') + '…');
      console.log('  después:…' + nuevo.slice(i, i + 240).replace(/\s+/g, ' ') + '…\n');
      primera = false;
    }
    if (aplicar) {
      const { error: e } = await admin
        .from('normative_chunks')
        .update({ content: nuevo })
        .eq('id', f.id);
      if (e) {
        console.log(`  ⚠ ${f.id}: ${e.message}`);
        continue;
      }
    }
    reparados++;
  }

  console.log(`${reparados} fragmento(s) ${aplicar ? 'reparados' : 'reparables'}`);
  if (rechazados > 0) console.log(`${rechazados} descartados por no mejorar`);
  if (aplicar) {
    console.log(
      '\nFalta rehacer los vectores de esos fragmentos: se calcularon sobre el texto estropeado.',
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
