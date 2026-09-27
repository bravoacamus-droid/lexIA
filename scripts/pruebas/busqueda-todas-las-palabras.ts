#!/usr/bin/env tsx
/**
 * La búsqueda por chips: lo que no depende de la base.
 *
 * `npx tsx scripts/pruebas/busqueda-todas-las-palabras.ts`
 *
 * Qué variantes de cada palabra se buscan (tildes, singular y plural,
 * nunca raíces) y cómo se saca la línea de «de qué trata» de una
 * resolución del Tribunal. Los casos salen de la observación de César del
 * 27/09/2026 y de lo que falló probándola.
 */
import { bajadaDeResolucion, variantesDeTermino } from '../../src/lib/busqueda/todas-las-palabras';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: unknown) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`);
  if (!ok) fallos++;
}
const formas = (t: string) => variantesDeTermino(t).split('|');

console.log('\nVariantes de cada palabra');
comprobar('«subsanación» se busca también sin tilde', formas('subsanación').includes('subsanacion'));
comprobar('«subsanación» encuentra el plural', formas('subsanación').includes('subsanaciones'));
comprobar('«apelacion» escrita sin tilde busca también con tilde', formas('apelacion').includes('apelación'));
comprobar('«penalidad» no incluye «penales» (el error de las raíces)', !formas('penalidad').includes('penales'), formas('penalidad'));
comprobar('«mora» no incluye «more»', !formas('mora').includes('more'), formas('mora'));
comprobar('«garantías» busca el singular', formas('garantías').includes('garantía') && formas('garantías').includes('garantia'));
comprobar('una frase no se pluraliza', variantesDeTermino('anexo n° 3') === 'anexo n° 3', variantesDeTermino('anexo n° 3'));
comprobar('las mayúsculas no importan', formas('Falta').includes('falta'));
comprobar('un «|» escrito por el usuario no parte el término', !variantesDeTermino('falta|mora').includes('|mora'), variantesDeTermino('falta|mora'));

console.log('\nLa bajada de una resolución');
const r8849 =
  'Tribunal de Contrataciones Públicas Resolución Nº 08849-2026-TCP-S2 Sumilla: “Es necesario…”. Lima, 24 de septiembre de 2026 VISTO en sesión del 24 de septiembre de 2026 de la Segunda Sala del Tribunal de Contrataciones Públicas el Expediente N° 6620/2026.TCP, sobre el recurso de apelación interpuesto por el postor CONSORCIO SUPERVISOR VIAL CHINCHERO, en el marco del Concurso Público de Consultoría N° 17-2025-GRTC-1; y, atendiendo a los siguientes: I. ANTECEDENTES';
const b = bajadaDeResolucion(r8849);
comprobar('empieza por «Recurso de apelación»', !!b && b.startsWith('Recurso de apelación interpuesto por el postor CONSORCIO SUPERVISOR VIAL CHINCHERO'), b);
comprobar('termina antes de «; y, atendiendo»', !!b && !b.includes('atendiendo'), b);
const sancion =
  'Lima, 3 de julio de 2026 VISTO en sesión del 3 de julio de 2026, de la Cuarta Sala del Tribunal de Contrataciones Públicas, el Expediente N° 1234/2025.TCE, sobre el procedimiento administrativo sancionador iniciado contra la empresa ABC S.A.C., por su presunta responsabilidad; y, atendiendo a lo siguiente:';
comprobar('sirve para un procedimiento sancionador', bajadaDeResolucion(sancion)?.startsWith('Procedimiento administrativo sancionador iniciado contra la empresa ABC') === true, bajadaDeResolucion(sancion));
comprobar('sin «VISTO» no inventa nada', bajadaDeResolucion('Opinión N° D000054-2026-OECE-DTN. Asunto: plazos.') === null);
const larga = `VISTO el Expediente, sobre el recurso de apelación interpuesto por ${'la empresa CONSTRUCTORA '.repeat(40)}; y, atendiendo`;
const bl = bajadaDeResolucion(larga);
comprobar('una bajada larga se corta con puntos suspensivos', !!bl && bl.length <= 421 && bl.endsWith('…'), bl?.length);

console.log(fallos ? `\n❌ ${fallos} fallo(s)\n` : '\n✅ Todo en orden\n');
process.exit(fallos ? 1 : 0);
