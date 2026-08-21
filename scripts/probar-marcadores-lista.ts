#!/usr/bin/env tsx
/**
 * Viñetas, literales o números en los apartados de lista.
 *
 * POR QUÉ EXISTE
 *
 * César (19/08/2026): "los objetivos específicos deben permitir
 * realizar en viñetas, literales (a, b, c…)" y lo mismo para las
 * actividades. El formato no impone una forma, así que la elige cada
 * entidad, y esa elección viaja al documento.
 *
 * Lo que hay que comprobar es lo que se rompe sin que se note: que la
 * marca la ponga el documento y no el texto —si el usuario escribe
 * "a) Garantizar…" y además se elige literal, saldría "a) a)
 * Garantizar…"—, que pasada la z siga habiendo letras, y que un
 * requerimiento guardado antes de esto siga saliendo con viñetas.
 *
 * Uso: npx tsx scripts/probar-marcadores-lista.ts
 */
import {
  ensamblarRequerimiento,
  marcaDeLista,
  normalizarRespuestas,
  respuestasVacias,
  type MarcadorLista,
  type RespuestasRequerimiento,
} from '../src/lib/generadores/ensamblador';
import { obtenerPlantilla } from '../src/lib/generadores/plantillas';
import { markdownToDocxBuffer } from '../src/lib/docx-from-markdown';

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

const plantilla = obtenerPlantilla('ps-servicios-general');
if (!plantilla) throw new Error('no está la plantilla ps-servicios-general');

const OBJETIVOS = [
  'Garantizar el procesamiento oportuno y seguro del efectivo.',
  'Asegurar el cumplimiento de los términos de referencia.',
  'Reducir el riesgo operativo en el manejo de valores.',
];

function documento(marcador?: MarcadorLista) {
  const r: RespuestasRequerimiento = {
    ...respuestasVacias(),
    campos: { denominacion: 'Servicio de procesamiento de efectivo' },
    redacciones: { objetivos_especificos: OBJETIVOS.join('\n') },
    marcadores: marcador ? { objetivos_especificos: marcador } : {},
  };
  return ensamblarRequerimiento(plantilla!, r, {}).markdown;
}

// ── 1. Las tres formas ────────────────────────────────────────────────
console.log('── Cómo sale cada marca ──');
const conVineta = documento('vineta');
comprobar('viñeta: "- Garantizar…"', conVineta.includes(`- ${OBJETIVOS[0]}`));

const conLiteral = documento('literal');
comprobar('literal: "a) Garantizar…"', conLiteral.includes(`a) ${OBJETIVOS[0]}`));
comprobar('literal: el segundo es la b)', conLiteral.includes(`b) ${OBJETIVOS[1]}`));
comprobar('literal: y el tercero la c)', conLiteral.includes(`c) ${OBJETIVOS[2]}`));

const conNumero = documento('numero');
comprobar('número: "1. Garantizar…"', conNumero.includes(`1. ${OBJETIVOS[0]}`));
comprobar('número: el segundo es el 2.', conNumero.includes(`2. ${OBJETIVOS[1]}`));

// ── 2. Lo de antes sigue igual ────────────────────────────────────────
console.log('\n── Sin elegir nada ──');
comprobar('sin marcador, viñetas como siempre', documento().includes(`- ${OBJETIVOS[0]}`));
const viejo = normalizarRespuestas({ redacciones: { objetivos_especificos: 'Uno\nDos' } });
comprobar(
  'un requerimiento guardado antes de esto se abre sin marcadores',
  Object.keys(viejo.marcadores).length === 0,
);
comprobar(
  'y sale con viñetas',
  ensamblarRequerimiento(plantilla, viejo, {}).markdown.includes('- Uno'),
);

// ── 3. La marca la pone el documento, no el texto ─────────────────────
console.log('\n── El usuario ya escribió una marca ──');
for (const [caso, escrito] of [
  ['viñetas a mano', '- Uno\n- Dos'],
  ['literales a mano', 'a) Uno\nb) Dos'],
  ['números a mano', '1. Uno\n2. Dos'],
] as const) {
  const r: RespuestasRequerimiento = {
    ...respuestasVacias(),
    campos: { denominacion: 'X' },
    redacciones: { objetivos_especificos: escrito },
    marcadores: { objetivos_especificos: 'literal' },
  };
  const md = ensamblarRequerimiento(plantilla, r, {}).markdown;
  comprobar(`${caso}: no se duplica la marca`, md.includes('a) Uno') && md.includes('b) Dos'));
  comprobar(`${caso}: no queda rastro de la que escribió`, !/a\)\s*(?:-|\d+\.|a\))/.test(md));
}

// ── 4. Pasada la z ────────────────────────────────────────────────────
console.log('\n── Listas largas ──');
comprobar('el elemento 26 es la z)', marcaDeLista('literal', 25) === 'z)');
comprobar('el 27 es la aa)', marcaDeLista('literal', 26) === 'aa)');
comprobar('el 28 es la ab)', marcaDeLista('literal', 27) === 'ab)');
comprobar('el 53 es la ba)', marcaDeLista('literal', 52) === 'ba)');
comprobar('nunca se queda sin letras', marcaDeLista('literal', 200).endsWith(')'));

const treinta = Array.from({ length: 30 }, (_, i) => `Actividad ${i + 1}.`);
const largo = ensamblarRequerimiento(
  plantilla,
  {
    ...respuestasVacias(),
    campos: { denominacion: 'X' },
    condiciones: { tiene_actividades: true },
    redacciones: { actividades: treinta.join('\n') },
    marcadores: { actividades: 'literal' },
  },
  {},
).markdown;
comprobar('una lista de treinta llega entera', treinta.every((t) => largo.includes(t)));
comprobar('y la última va marcada', largo.includes('ad) Actividad 30.'));

// ── 5. El Word ────────────────────────────────────────────────────────
console.log('\n── El Word ──');
void (async () => {
  for (const m of ['vineta', 'literal', 'numero'] as const) {
    try {
      const buffer = await markdownToDocxBuffer(documento(m), { title: 'Requerimiento' });
      comprobar(`se exporta con ${m}`, buffer.length > 5000);
    } catch (e) {
      comprobar(`la exportación con ${m} falló: ${(e as Error).message}`, false);
    }
  }

  console.log(
    fallos === 0
      ? '\n✅ Viñetas, literales y números, y la marca la pone el documento.'
      : `\n❌ ${fallos} problema(s).`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})();
