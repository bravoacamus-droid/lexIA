#!/usr/bin/env tsx
/**
 * El actualizador de la biblioteca: lo que no depende de la red.
 *
 * `npx tsx scripts/pruebas/actualizador.ts`
 *
 * Que una resolución se identifique igual venga de donde venga, que cada
 * tipo de documento se guarde con los datos que la biblioteca usa para
 * ordenar y filtrar (como la carga manual), y que el clasificador no
 * confunda una resolución del Tribunal con una directoral.
 */
import { classifyByPattern } from '../../src/lib/scraping/classifier';
import { claveDeResolucion, fechaDeExpedicion, numeroDeResolucion } from '../../src/lib/scraping/resoluciones';
import { correlativoDe, entidadDe, fechaDeTexto, normalizarDocumento, regimenDe } from '../../src/lib/scraping/normalizar';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: unknown) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`);
  if (!ok) fallos++;
}

console.log('\nLa clave de una resolución, venga de donde venga');
const desdeFicha = claveDeResolucion('https://www.gob.pe/institucion/oece/normas-legales/8203722-05191-2026-tcp-s6');
comprobar('de la URL de la ficha (con ceros)', desdeFicha?.numero === '5191' && desdeFicha.anio === 2026 && desdeFicha.sala === 'S6', desdeFicha);
const desdeTitulo = claveDeResolucion('Resolución N.° 08010-2026-TCP-S1');
comprobar('del título', desdeTitulo?.numero === '8010' && desdeTitulo.sala === 'S1', desdeTitulo);
comprobar('del número de la carga manual', claveDeResolucion('Resolución N° 8493-2026-S2')?.sala === 'S2');
comprobar('de la URL del PDF', claveDeResolucion('https://cdn.www.gob.pe/x/8559206-resolucion-n-8472-2026-tcp-s6.pdf')?.numero === '8472');
comprobar('del régimen anterior (TCE)', claveDeResolucion('Resolución N.° 2914-2025-TCE-S1')?.numero === '2914');
comprobar('todas dan el mismo número normalizado', numeroDeResolucion(desdeTitulo!) === 'Resolución N° 8010-2026-S1');
comprobar(
  'la fecha de expedición es la última del año de la numeración',
  fechaDeExpedicion('Visto el 3 de enero de 2025… Lima, 12 de agosto de 2026', 2026) === '2026-08-12',
);

console.log('\nCada tipo, con los datos de la carga manual');
const resol = normalizarDocumento({
  tipo: 'resolucion_tce',
  tituloFicha: 'Resolución N.° 8797-2026-TCP-S1',
  fechaFicha: '2026-09-22',
  url: 'https://cdn.www.gob.pe/x.pdf',
  fichaUrl: 'https://www.gob.pe/institucion/oece/normas-legales/8638398-8797-2026-tcp-s1',
  texto: 'Texto de la resolución. Lima, 19 de setiembre de 2026.',
});
comprobar('resolución: número y título de la biblioteca', resol.number === 'Resolución N° 8797-2026-S1' && resol.title === 'Resolución N° 8797-2026-S1 (Tribunal de Contrataciones)', resol);
comprobar('resolución: la fecha es la de la firma, no la de publicación', resol.date === '2026-09-19', resol.date);
comprobar('resolución: año, correlativo, sala y entidad', resol.metadata.anio === '2026' && resol.metadata.correlativo === '8797' && resol.metadata.sala === 'S1' && resol.metadata.entidad === 'OECE');
comprobar('resolución: régimen', resol.applicable_law.join() === 'ley_32069');

const opinion = normalizarDocumento({ tipo: 'opinion', tituloFicha: 'Opinión N° D000084-2026-OECE-DTN', fechaFicha: '2026-08-05', url: 'x', texto: '' });
comprobar('opinión: el título oficial es número y título', opinion.number === 'Opinión N° D000084-2026-OECE-DTN' && opinion.title === opinion.number);
comprobar('opinión: correlativo 0084, año 2026, OECE, fecha de la ficha', opinion.metadata.correlativo === '0084' && opinion.metadata.anio === '2026' && opinion.metadata.entidad === 'OECE' && opinion.date === '2026-08-05', opinion);

const osce = normalizarDocumento({ tipo: 'pronunciamiento', tituloFicha: 'Pronunciamiento N° 404-2023OSCE-DGR', fechaFicha: '2023-05-10', url: 'x', texto: '' });
comprobar('pronunciamiento de 2023: OSCE aunque falte el separador', osce.metadata.entidad === 'OSCE' && osce.applicable_law.join() === 'ley_30225', osce);

const directiva = normalizarDocumento({ tipo: 'directiva', tituloFicha: 'Directiva N.° 001-2026-OECE-CD', fechaFicha: null, url: 'x', texto: 'Lima, 5 de febrero de 2026' });
comprobar('directiva: correlativo con «N.°»', directiva.metadata.correlativo === '0001', directiva.metadata);
comprobar('directiva sin fecha en la ficha: la del texto si es del año del número', directiva.date === '2026-02-05', directiva.date);
comprobar('directiva DGA por su código EF/54.01', entidadDe('Directiva N° 0001-2026-EF/54.01', '2026-01-10') === 'DGA');
comprobar('correlativo de «Pronunciamiento Nº 531-2026/OECE-DSAT»', correlativoDe('Pronunciamiento Nº 531-2026/OECE-DSAT') === '0531');

console.log('\nRégimen y fechas');
comprobar('21/04/2025 → Ley N.° 30225; 22/04/2025 → Ley N.° 32069', regimenDe('2025-04-21').join() === 'ley_30225' && regimenDe('2025-04-22').join() === 'ley_32069');
comprobar('«22 de setiembre de 2026» → 2026-09-22', fechaDeTexto('<p>22 de setiembre de 2026</p>') === '2026-09-22');
comprobar('«1 de septiembre de 2026» → 2026-09-01', fechaDeTexto('1 de septiembre de 2026') === '2026-09-01');

console.log('\nEl clasificador');
const casos: Array<[string, string, string, string]> = [
  ['https://cdn.www.gob.pe/x/8559206-resolucion-n-8472-2026-tcp-s6.pdf', 'Resolución N.° 8472-2026-TCP-S6', 'resolucion_tce', 'resolucion_tce'],
  ['https://www.gob.pe/institucion/oece/normas-legales/8638398-8797-2026-tcp-s1', 'Resolución N.° 8797-2026-TCP-S1', 'resolucion_tce', 'resolucion_tce'],
  ['https://cdn.www.gob.pe/x/123-resolucion-directoral-n-001-2026-ef-54-01.pdf', 'Resolución Directoral N° 001-2026-EF/54.01', 'directiva', 'resolucion'],
  ['https://cdn.www.gob.pe/x/acuerdo-de-sala-plena-n-003-2025-tcp.pdf', 'Acuerdo de Sala Plena N.° 003-2025/TCP', 'resolucion_tce', 'acuerdo_sala_plena'],
  ['https://cdn.www.gob.pe/x/opinion-d084-2026-oece-dtn.pdf', 'Opinión N° D000084-2026-OECE-DTN', 'opinion', 'opinion'],
  ['https://cdn.www.gob.pe/x/pronunciamiento-n-532-2026-oece-dsat.pdf', 'Pronunciamiento Nº 532-2026/OECE-DSAT', 'pronunciamiento', 'pronunciamiento'],
  ['https://cdn.www.gob.pe/x/6850994-directiva-n-010-2025-oece-cd.pdf', 'Directiva N.° 010-2025-OECE-CD', 'directiva', 'directiva'],
];
for (const [url, texto, def, esperado] of casos) {
  const r = classifyByPattern({ url, linkText: texto, defaultType: def as never });
  comprobar(`${texto} → ${esperado}`, r.type === esperado, r);
}

console.log(fallos ? `\n❌ ${fallos} problema(s).` : '\n✅ El actualizador guarda todo como la carga manual.');
process.exit(fallos ? 1 : 0);
