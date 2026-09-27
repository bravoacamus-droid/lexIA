#!/usr/bin/env tsx
/**
 * Las reglas del generador que salieron de las respuestas de César
 * (documento 10, 27/09/2026).
 *
 * `npx tsx scripts/pruebas/reglas-respuestas-cesar.ts`
 *
 * - Prestación sin contrato: los elementos del enriquecimiento sin causa
 *   (artículo 1954 del Código Civil) y no las reglas del pago contractual.
 * - Régimen anterior: el articulado de la Ley N.° 32069 no llega al
 *   documento («el modelo… no debe considerar el marco legal»).
 */
import { MATRIZ, condicionesAplicables, requisitosAplicables } from '../../src/lib/ejecucion/matriz';
import { sinArticuladoVigente } from '../../src/lib/ejecucion/regimen';
import { CODIGO_CIVIL } from '../../src/lib/ejecucion/enriquecimiento';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: unknown) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`);
  if (!ok) fallos++;
}
const ctx = (origen: string, perfil = 'dec') =>
  ({ perfil, tipo: 'servicios', sistemaEntrega: null, supervisado: null, regimen: 'ley_32069', respuestas: { origen_obligacion: origen } }) as never;
const ids = (xs: Array<{ id: string }>) => xs.map((x) => x.id);

console.log('\nPrestación sin contrato: enriquecimiento sin causa');
const sin = ids(condicionesAplicables('reconocimiento_pago', ctx('De una prestación sin contrato o fuera de él')));
comprobar('evalúa los cuatro elementos y la subsidiariedad', ['enriquecimiento', 'nexo', 'sin_causa', 'buena_fe', 'otra_accion'].every((x) => sin.includes(x)), sin);
comprobar('no evalúa conformidad, plazo de pago ni intereses (el defecto)', !sin.some((x) => ['conformidad', 'plazo_pago', 'intereses'].includes(x)), sin);
const con = ids(condicionesAplicables('reconocimiento_pago', ctx('De un contrato, con conformidad')));
comprobar('con contrato, siguen las reglas del pago', ['conformidad', 'plazo_pago', 'intereses'].every((x) => con.includes(x)) && !con.includes('enriquecimiento'), con);
const req = ids(requisitosAplicables('reconocimiento_pago', ctx('De una prestación sin contrato o fuera de él')));
comprobar('pide la prueba de que la Entidad recibió y aprovechó la prestación', req.includes('aprovechamiento') && req.includes('acredita_hecho'), req);
const organo = MATRIZ.reconocimiento_pago.organo(ctx('De una prestación sin contrato o fuera de él'));
comprobar('el órgano no es la AGA por el 67.4: lo dicen las normas internas', /normas de gesti[óo]n interna/i.test(organo.organo) && !/67\.4/.test(organo.base), organo);
comprobar('el Código Civil va literal (1954 y 1955)', /Artículo 1954\.- Aquel que se enriquece indebidamente/.test(CODIGO_CIVIL) && /Artículo 1955\./.test(CODIGO_CIVIL));

console.log('\nRégimen anterior: sin el articulado de la Ley N.° 32069');
const casos: Array<[string, RegExp]> = [
  ['La Entidad se pronuncia en diez días hábiles (numeral 142.5 del artículo 142 del Reglamento)', /\(\[precisar artículo del régimen anterior\]\)/],
  ['literal a) del numeral 200.1 del artículo 200 del Reglamento', /^\[precisar artículo del régimen anterior\]$/],
  ['conforme al numeral 68.1 de la Ley, notificada por la Pladicop', /conforme al \[precisar artículo del régimen anterior\], notificada por el SEACE/],
  ['numerales 64.2 y 64.3 del artículo 64 de la Ley', /^\[precisar artículo del régimen anterior\]$/],
  ['Reglamento de la Ley N.° 32069, aprobado por Decreto Supremo N.° 009-2025-EF', /^reglamento aplicable al contrato$/],
];
for (const [t, esperado] of casos) comprobar(`«${t.slice(0, 55)}…»`, esperado.test(sinArticuladoVigente(t)), sinArticuladoVigente(t));
comprobar('no toca un texto sin citas', sinArticuladoVigente('La Entidad verifica la causal.') === 'La Entidad verifica la causal.');

console.log(fallos ? `\n❌ ${fallos} fallo(s)\n` : '\n✅ Todo en orden\n');
process.exit(fallos ? 1 : 0);
