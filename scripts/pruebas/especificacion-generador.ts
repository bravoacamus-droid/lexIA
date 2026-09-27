#!/usr/bin/env tsx
/**
 * La especificación del generador que César mandó el 27/09/2026: ruta de
 * continuación, lista de evidencia por obtener y documento solicitado
 * frente a recomendado. Lo que no depende del modelo.
 *
 * `npx tsx scripts/pruebas/especificacion-generador.ts`
 */
import { plazoDelSiguientePaso, rutaEnTexto, siguientePaso } from '../../src/lib/ejecucion/continuacion';
import { evidenciaPorObtener, SI_NO_EXISTE } from '../../src/lib/ejecucion/evidencia';
import { documentoRecomendado } from '../../src/lib/ejecucion/matriz';

import type { AnalisisDeActuacion } from '../../src/lib/ejecucion/tipos';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: unknown) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`);
  if (!ok) fallos++;
}


const analisis = (parcial: Partial<AnalisisDeActuacion>) =>
  ({
    actuacion: 'ampliacion_plazo',
    cadena: [
      { perfil: 'contratista', documento: 'Solicitud de ampliación', hecho: true },
      { perfil: 'area_usuaria', documento: 'Informe técnico sobre la ampliación' },
      { perfil: 'dec', documento: 'Informe de la DEC sobre la ampliación' },
      { perfil: 'asesoria_juridica', documento: 'Informe legal', condicion: 'Si la ampliación es controvertida' },
      { perfil: 'aga', documento: 'Resolución que se pronuncia sobre la ampliación' },
    ],
    calculos: [],
    requisitos: [],
    figura: { nombre: 'Ampliación de plazo', corresponde: true, razon: '' },
    ...parcial,
  }) as unknown as AnalisisDeActuacion;

console.log('\nRuta de continuación');
const a1 = analisis({});
const r = siguientePaso(a1, 'area_usuaria');
comprobar('después del Área Usuaria sigue la DEC', r.siguiente?.perfil === 'dec', r.siguiente);
comprobar('y después, Jurídica y la AGA', r.despues.map((p) => p.perfil).join(',') === 'asesoria_juridica,aga', r.despues);
comprobar('lo que ya está en el expediente no se vuelve a proponer', siguientePaso(a1, 'dec').siguiente?.perfil === 'asesoria_juridica');
comprobar('el Titular ocupa el lugar de la AGA', siguientePaso(a1, 'titular').siguiente === null);
comprobar('sin cálculo no hay plazo (no se inventa un vencimiento)', plazoDelSiguientePaso(a1) === null);
const a2 = analisis({
  calculos: [{ concepto: 'Plazo de la Entidad para pronunciarse', resultado: 'Vence el 12 de octubre de 2026', detalle: 'Desde la solicitud…', base: 'numeral 142.5' }],
});
comprobar('con cálculo, el plazo es el del cálculo', plazoDelSiguientePaso(a2)?.resultado === 'Vence el 12 de octubre de 2026');
const texto = rutaEnTexto(a2, 'area_usuaria', (p) => p.toUpperCase());
comprobar('la ficha dice responsable, insumo, después y plazo', texto.length === 4 && /DEC/.test(texto[0]) && /formalmente emitido/.test(texto[1]) && /Vence el 12 de octubre/.test(texto[3]), texto);
comprobar('si la figura no corresponde, no propone seguir su cadena', /no corresponde/.test(rutaEnTexto(analisis({ figura: { nombre: 'x', corresponde: false, razon: '' } }), 'area_usuaria', (p) => p)[0]));
comprobar('sin cálculo, la ficha dice que no se fija el plazo', /no se fija sin la fecha/.test(rutaEnTexto(a1, 'area_usuaria', (p) => p).at(-1) ?? ''));

console.log('\nLista de evidencia por obtener');
const a3 = analisis({
  actuacion: 'adicional',
  requisitos: [
    { id: 'informe_area_usuaria', texto: 'Informe técnico del Área Usuaria', nivel: 1, estado: 'falta', porQue: 'La autoridad no decide sin él.' },
    { id: 'contrato', texto: 'Contrato', nivel: 1, estado: 'acreditado', porQue: '…' },
    { id: 'presupuesto', texto: 'Certificación presupuestal', nivel: 1, estado: 'declarado', porQue: 'Sin crédito no se aprueba.' },
  ] as never,
});
const ev = evidenciaPorObtener(a3);
comprobar('solo lo que falta o está declarado', ev.length === 2 && !ev.some((e) => e.que === 'Contrato'), ev.map((e) => e.que));
comprobar('dice quién lo emite', ev.find((e) => /Área Usuaria/.test(e.que))?.quien.includes('Área Usuaria') === true, ev);
comprobar('marca lo que hoy solo está declarado', ev.some((e) => e.soloDeclarada));
comprobar('regla de no fabricar documentos con fecha pasada', /no se elabora hoy con fecha pasada/.test(SI_NO_EXISTE));

console.log('\nDocumento solicitado');
const ctx = { perfil: 'dec' as const, tipo: null, sistemaEntrega: null, supervisado: null, regimen: 'ley_32069' as const, respuestas: {} };
comprobar('la DEC que pide un adicional pide su informe', documentoRecomendado('dec', 'adicional', ctx).titulo === 'Informe de la DEC sobre la prestación adicional');

console.log(fallos ? `\n❌ ${fallos} fallo(s)\n` : '\n✅ Todo en orden\n');
process.exit(fallos ? 1 : 0);
