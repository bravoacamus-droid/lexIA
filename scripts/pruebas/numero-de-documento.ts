#!/usr/bin/env tsx
/**
 * El reconocimiento de un número de documento en el buscador.
 *
 * `npx tsx scripts/pruebas/numero-de-documento.ts`
 *
 * César, documento 13 (10/10/2026): «al poner enter solo el número y año
 * de la resolución no ubica la norma consultada». Todas estas formas de
 * escribir la misma resolución deben reconocerse como su número.
 */
import { reconocerNumeroDeDocumento as reconocer } from '../../src/lib/busqueda/numero-de-documento';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: unknown) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`);
  if (!ok) fallos++;
}

console.log('\nLa 9056-2026-TCP-S3, escrita de todas las maneras');
for (const q of ['9056-2026', '09056-2026', '9056-2026-S3', '9056-2026-TCP-S3', 'Resolución 9056-2026', 'N° 09056-2026-TCP-S3', 'Resolución Nº 09056-2026-TCP- S3']) {
  const r = reconocer(q);
  comprobar(`«${q}»`, r?.correlativo === 9056 && r.anio === 2026 && r.soloNumero, r);
}
comprobar('la sala y la sigla se leen', reconocer('N° 09056-2026-TCP-S3')?.sala === 'S3' && reconocer('N° 09056-2026-TCP-S3')?.sigla === 'TCP');
comprobar('«Resolución» sugiere el tipo', reconocer('Resolución 9056-2026')?.tipos.includes('resolucion_tce') === true);

console.log('\nOpiniones y pronunciamientos');
const op = reconocer('D000054-2026');
comprobar('«D000054-2026» es el 54 de 2026', op?.correlativo === 54 && op.anio === 2026 && op.soloNumero, op);
const op2 = reconocer('Opinión N° D000054-2026-OECE-DTN');
comprobar('«Opinión N° D000054-2026-OECE-DTN»', op2?.correlativo === 54 && op2.tipos.includes('opinion') && op2.sufijos.includes('DTN') && op2.soloNumero, op2);
const pr = reconocer('Pronunciamiento 566-2026/OECE-DSAT');
comprobar('«Pronunciamiento 566-2026/OECE-DSAT»', pr?.correlativo === 566 && pr.tipos.includes('pronunciamiento') && pr.soloNumero, pr);
comprobar('«566-2026»', reconocer('566-2026')?.correlativo === 566);

console.log('\nLo que no es solo un número');
comprobar('número con palabras: se reconoce, pero no es solo el número', reconocer('resolución 9056-2026 penalidad')?.soloNumero === false);
comprobar('una pregunta sin número no se toca', reconocer('subsanación de ofertas') === null);
comprobar('«Ley 32069» no tiene año: no es un número de este tipo', reconocer('Ley 32069') === null);
comprobar('el correlativo cero no existe', reconocer('0-2026') === null);

console.log(fallos === 0 ? '\n✅ El buscador reconoce el número.' : `\n❌ ${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
