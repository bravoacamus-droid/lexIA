#!/usr/bin/env tsx
/**
 * Revisión con IA de una tabla llena a mano.
 *
 * POR QUÉ EXISTE
 *
 * César (19/08/2026): "en todos los casos como este que se llena de
 * manera manual debe haber la opción de la IA para mejorar su redacción
 * y/o verificar su cumplimiento". Las tablas —plazos de las accesorias,
 * entregables, penalidades— se llenaban a mano y nadie las miraba, y son
 * justo donde viven los plazos y las cifras.
 *
 * Lo que hay que comprobar no es que responda, sino que NO haga daño:
 *
 *   · Que no cambie un dato. Si mejora la redacción de un plazo y de
 *     paso convierte 1095 días en 3 años, ha decidido por el área
 *     usuaria.
 *   · Que la tabla propuesta tenga exactamente la misma forma. Una fila
 *     de más o una columna de menos, aplicada, mueve los datos de sitio
 *     y pone un plazo donde iba un lugar.
 *   · Que una celda vacía se señale, no se rellene.
 *
 * Uso: npx tsx scripts/probar-revision-tabla.ts
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { obtenerPlantilla } from '../src/lib/generadores/plantillas';
import {
  promptTablaSistema,
  promptTablaUsuario,
  depurarRevisionTabla,
} from '../src/lib/generadores/revisor-tabla';
import { parseJsonLoose } from '../src/lib/ai/json-suelto';
import type { BloqueTabla, Seccion } from '../src/lib/generadores/plantilla-tipos';

config({ path: join(process.cwd(), '.env.local'), override: true });

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
const modelo = google(process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash');

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

// ── 1. El filtro, sin modelo ──────────────────────────────────────────
console.log('── El filtro de lo que devuelve el modelo ──');
const ORIGINAL = [
  ['Mantenimiento', '1095', 'A partir del inicio de la ejecución'],
  ['Soporte técnico', '1095', 'A partir del inicio de la ejecución'],
];

comprobar(
  'una tabla con menos filas se descarta entera',
  depurarRevisionTabla({ filas: [ORIGINAL[0]] }, ORIGINAL).filas === null,
);
comprobar(
  'una tabla con otra cantidad de columnas se descarta',
  depurarRevisionTabla({ filas: [['a', 'b'], ['c', 'd']] }, ORIGINAL).filas === null,
);
comprobar(
  'si no cambia nada, no se ofrece aplicar',
  depurarRevisionTabla({ filas: ORIGINAL }, ORIGINAL).filas === null,
);
comprobar(
  'una tabla de la misma forma y con cambios sí se ofrece',
  depurarRevisionTabla(
    { filas: [['Mantenimiento preventivo', '1095', 'Desde el inicio'], ORIGINAL[1]] },
    ORIGINAL,
  ).filas !== null,
);
comprobar(
  'una observación sin detalle se descarta',
  depurarRevisionTabla({ observaciones: [{ fila: 1, detalle: 'ok' }] }, ORIGINAL).observaciones
    .length === 0,
);
comprobar(
  'una fila fuera de rango pasa a ser observación de la tabla',
  depurarRevisionTabla(
    { observaciones: [{ fila: 99, tipo: 'norma', detalle: 'Algo que decir sobre la tabla.' }] },
    ORIGINAL,
  ).observaciones[0].fila === 0,
);
comprobar(
  'un tipo inventado se normaliza',
  depurarRevisionTabla(
    { observaciones: [{ fila: 1, tipo: 'urgente', detalle: 'Algo que decir de la fila.' }] },
    ORIGINAL,
  ).observaciones[0].tipo === 'redaccion',
);

// ── 2. Contra el modelo ───────────────────────────────────────────────
const plantilla = obtenerPlantilla('ps-servicios-general');
if (!plantilla) throw new Error('no está la plantilla ps-servicios-general');

function buscarTabla(ss: Seccion[], id: string): BloqueTabla | null {
  for (const s of ss) {
    for (const b of s.bloques) if (b.clase === 'tabla' && b.id === id) return b;
    const h = buscarTabla(s.subsecciones ?? [], id);
    if (h) return h;
  }
  return null;
}
const tabla = buscarTabla(plantilla.secciones, 'plazo_accesorias');
if (!tabla) throw new Error('no está la tabla plazo_accesorias');

/**
 * Tabla con defectos plantados: una celda vacía, una redacción coja y
 * un plazo que no cuadra con los otros dos.
 */
const FILAS = [
  ['Mantenimiento', '1095', 'A partir del inicio de la ejecucion'],
  ['Soporte tecnico', '1095', ''],
  ['Capacitación', '1', 'a partir del dia siguiente'],
];

void (async () => {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('Falta GOOGLE_GENERATIVE_AI_API_KEY');
    process.exit(1);
  }

  console.log('\n── Revisión con el modelo ──');
  const res = await generateText({
    model: modelo,
    system: promptTablaSistema(plantilla, tabla),
    prompt: promptTablaUsuario({
      denominacion: 'Servicio de procesamiento de efectivo y monedas',
      bloque: tabla,
      filas: FILAS,
      sustento: '',
    }),
    temperature: 0.2,
  });

  const revision = depurarRevisionTabla(parseJsonLoose(res.text ?? ''), FILAS);
  for (const o of revision.observaciones) {
    console.log(`   [${o.tipo}] fila ${o.fila}: ${o.detalle}`);
  }
  if (revision.filas) {
    console.log('\n   Propuesta:');
    for (const f of revision.filas) console.log(`     ${f.join(' | ')}`);
  }

  console.log('\n── Qué encontró ──');
  comprobar('devuelve alguna observación', revision.observaciones.length > 0);
  comprobar(
    'señala la celda vacía del inicio del cómputo',
    revision.observaciones.some((o) => o.fila === 2 || /vac|falta|inicio del cómputo/i.test(o.detalle)),
  );

  console.log('\n── Qué NO hizo ──');
  if (revision.filas) {
    comprobar('la propuesta tiene las mismas filas', revision.filas.length === FILAS.length);
    comprobar(
      'y las mismas columnas',
      revision.filas.every((f, i) => f.length === FILAS[i].length),
    );
    // Los plazos son decisiones del área usuaria: tienen que seguir ahí.
    const plazos = revision.filas.map((f) => f[1]);
    comprobar('no cambia el plazo de 1095 de la primera fila', /1095/.test(plazos[0]));
    comprobar('ni el de la segunda', /1095/.test(plazos[1]));
    comprobar('ni el 1 de la capacitación', /\b1\b/.test(plazos[2]));
    comprobar(
      'no rellena la celda que estaba vacía',
      revision.filas[1][2].trim() === '' ||
        revision.observaciones.some((o) => o.tipo === 'falta'),
    );
  } else {
    console.log('   (esta vez no propuso reescritura; solo observaciones)');
  }

  console.log(
    fallos === 0
      ? '\n✅ Revisa la tabla, señala lo que falta y no toca los datos.'
      : `\n❌ ${fallos} problema(s).`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})();
