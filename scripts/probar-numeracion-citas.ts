#!/usr/bin/env tsx
/**
 * El [3] del texto y el [3] del enlace tienen que ser el mismo documento.
 *
 * POR QUÉ EXISTE
 *
 * Al ordenar las fuentes por jerarquía (22/08/2026) el contexto pasó a ir
 * ordenado —la norma primero— pero la whitelist se seguía numerando por
 * orden de llegada. El modelo cita según lo que lee en el contexto y la
 * pantalla resuelve cada cita por posición contra las fuentes que envía
 * la ruta (`message.tsx`), así que una respuesta correcta enlazaba a la
 * resolución equivocada. No se ve en ninguna prueba de recuperación: el
 * documento citado está, solo que el número señala a otro.
 *
 * Aquí se comprueba lo único que importa: que las tres numeraciones
 * —whitelist, contexto y fuentes enviadas— coinciden documento a
 * documento. No hace falta ni modelo ni base.
 *
 * Uso: npx tsx scripts/probar-numeracion-citas.ts
 */
import { buildChatSystemPrompt } from '../src/lib/ai/prompts';
import type { ChatSource } from '../src/lib/supabase/types';

let fallos = 0;
const comprobar = (que: string, ok: boolean, detalle?: string) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
};

/** Fuentes a propósito desordenadas: la norma llega la última. */
const fuente = (n: number, tipo: string, numero: string): ChatSource => ({
  chunk_id: `c${n}`,
  doc_id: `d${n}`,
  doc_title: `Documento ${numero}`,
  doc_type: tipo as ChatSource['doc_type'],
  doc_number: numero,
  snippet: `Texto del fragmento ${n} de ${numero}.`,
});

const FUENTES: ChatSource[] = [
  fuente(1, 'opinion', 'Opinión N° 098-2023/DTN'),
  fuente(2, 'pronunciamiento', 'Pronunciamiento N° 134-2026/OECE-DSAT'),
  fuente(3, 'guia', 'Preguntas Frecuentes'),
  fuente(4, 'resolucion_tce', 'Resolución N° 4377-2025-S3'),
  fuente(5, 'reglamento', 'Reglamento de la Ley N° 32069'),
  fuente(6, 'opinion', 'Opinión N° 037-2024/DTN'),
  fuente(7, 'ley', 'Ley N° 32069'),
];

console.log('── Las tres numeraciones son la misma ──');

// Lo que la ruta manda al cliente, que es contra lo que se resuelven los
// enlaces por posición.
// Va tal cual llega: desde que se quitó el reordenamiento del contexto
// la coincidencia es por construcción, y esta prueba está para que siga
// siéndolo.
const enviadas = FUENTES;
const prompt = buildChatSystemPrompt(FUENTES, null, [], null);

/** Las líneas "[N] …" de la whitelist, que van antes del contexto. */
// Solo el bloque de la whitelist: el prompt base trae ejemplos con
// corchetes que no son fuentes.
const trozoWhitelist = prompt.slice(
  prompt.indexOf('(whitelist):'),
  prompt.indexOf('REGLA — uso correcto'),
);
const numeradasWhitelist = [...trozoWhitelist.matchAll(/\[(\d+)\]\s+(.+)/g)].map((m) => ({
  n: Number(m[1]),
  texto: m[2],
}));

/** Las cabeceras del contexto: "[N] CAPA x · … — documento". */
const trozoContexto = prompt.slice(prompt.indexOf('CONTEXTO NORMATIVO RECUPERADO'));
const numeradasContexto = [...trozoContexto.matchAll(/\[(\d+)\] CAPA \d · [^—]+— (.+)/g)].map((m) => ({
  n: Number(m[1]),
  texto: m[2],
}));

comprobar(
  `la whitelist lista las ${FUENTES.length} fuentes`,
  numeradasWhitelist.length === FUENTES.length,
  `listó ${numeradasWhitelist.length}`,
);
comprobar(
  `el contexto trae las ${FUENTES.length} fuentes`,
  numeradasContexto.length === FUENTES.length,
  `trajo ${numeradasContexto.length}`,
);

for (let i = 0; i < enviadas.length; i++) {
  const n = i + 1;
  const esperado = enviadas[i].doc_number ?? '';
  const enWhitelist = numeradasWhitelist.find((x) => x.n === n)?.texto ?? '';
  const enContexto = numeradasContexto.find((x) => x.n === n)?.texto ?? '';
  comprobar(
    `[${n}] es "${esperado}" en la whitelist, en el contexto y en el enlace`,
    enWhitelist.includes(esperado) && enContexto.includes(esperado),
    `whitelist="${enWhitelist.slice(0, 45)}" contexto="${enContexto.slice(0, 45)}"`,
  );
}

console.log(
  fallos === 0
    ? '\n✅ La cita que se lee y el enlace que se pulsa son el mismo documento.'
    : `\n❌ ${fallos} problema(s) de numeración.`,
);
process.exit(fallos === 0 ? 0 : 1);
