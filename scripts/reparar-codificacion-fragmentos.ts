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
 * Qué carácter produce MacRoman para cada byte alto, cuando difiere de
 * lo que produciría Latin-1. Deshacer el daño es leer la clave y
 * escribir el valor.
 *
 * Solo están las que devuelven un carácter propio del español: con la
 * tabla entera, una raya larga legítima se convertía en «Ð». Cuando el
 * cambio no es inequívocamente una reparación, no se toca.
 */
const DESHACER: Record<string, string> = {
  "°": "¡", "™": "ª", "∞": "°", "∫": "º", "ø": "¿", "¡": "Á", "…": "É",
  "Õ": "Í", "—": "Ñ", "”": "Ó", "⁄": "Ú", "‹": "Ü", "·": "á", "È": "é",
  "Ì": "í", "Ò": "ñ", "Û": "ó", "˙": "ú", "¸": "ü",
};

/** Los nueve documentos que entraron con el texto estropeado. */
const DOCUMENTOS = [
  'Directiva N° 001-2025-PERÚ COMPRAS - Lista de Fichas Técnicas',
  'Directiva N° 002-2025-PERÚ COMPRAS - Compras por Encargo',
  'Directiva N° 003-2025-PERÚ COMPRAS - Gestión del Proceso de Homologación de Requerimientos',
  'Directiva N° 004-2025-PERÚ COMPRAS - Directiva para la Gestión de la Compra Corporativa Obligatoria',
  'Resolución N° 2293-2025-S5 (Tribunal de Contrataciones)',
  'Resolución N° 4691-2025-S4 (Tribunal de Contrataciones)',
  'Resolución N° 4709-2025-S1 (Tribunal de Contrataciones)',
  'Resolución N° 4957-2025-S2 (Tribunal de Contrataciones)',
  'Resolución N° 593-2026-S5 (Tribunal de Contrataciones)',
];

/** La marca del daño: secuencias que solo salen de esta avería. */
const MARCA = /(dÌas|h·biles|ResoluciÛn|selecciÛn|contrataciÛn|P·gina|N∞|PER⁄)/;

/** Letras que el español usa y la avería destruye. */
const ACENTUADAS = /[áéíóúñÁÉÍÓÚÑ°]/g;
/** Símbolos que la avería introduce y el español no usa. */
const RAROS = /[·Ì Û˙È∞⁄ÒÍÎÏÓÔ˘˚˝˛ˇ‰„‚‡ﬁﬂ‹›€◊∏∑∫≈√ƒ∆]/g;

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

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  console.log(aplicar ? '\nESCRIBIENDO\n' : '\nEN SECO — nada se escribe. Añade --aplicar.\n');

  // Los documentos dañados se localizan una vez; buscar el comodín
  // sobre los trescientos mil fragmentos agota el tiempo de la consulta.
  const { data: docs, error: eDocs } = await admin
    .from('normative_documents')
    .select('id, title')
    .in('title', DOCUMENTOS);
  if (eDocs) throw new Error(eDocs.message);
  const ids = (docs ?? []).map((d) => (d as { id: string }).id);
  console.log(`${ids.length} documento(s) con la codificación rota`);

  const data: Fila[] = [];
  for (const id of ids) {
    const { data: trozos, error } = await admin
      .from('normative_chunks')
      .select('id, document_id, content')
      .eq('document_id', id);
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
