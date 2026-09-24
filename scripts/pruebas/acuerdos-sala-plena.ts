#!/usr/bin/env tsx
/**
 * Los acuerdos de Sala Plena en la biblioteca: lo que hace falta para
 * que entren limpios y se lean bien.
 *
 * `npx tsx scripts/pruebas/acuerdos-sala-plena.ts`
 *
 * Los textos de prueba son recortes de los PDF reales que publica
 * gob.pe (23/09/2026):
 *
 *   · el 001-2024/TCE sale en una página de El Peruano con una
 *     designación de la OEFA delante;
 *   · el 007-2021/TCE, con la firma de Editora Perú al pie de cada
 *     página —la primera vez se perdió todo lo que venía después— y
 *     con la capa de texto mal codificada;
 *   · el 03-2017/TCE, con el código de despacho escrito con punto;
 *   · el 003-2025/TCP, en la separata «Precedentes vinculantes».
 */
import { recortarDeElPeruano } from '../../src/lib/ingestion/el-peruano';
import { textoIlegible } from '../../src/lib/ingestion/legibilidad';
import { formatForDisplay } from '../../src/lib/normativa/format-raw';
import { classifyByPattern } from '../../src/lib/scraping/classifier';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: string) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
}

const SALA = /sala\s+plena/i;

console.log('\nRecorte de El Peruano');
{
  const pagina =
    '46 NORMAS LEGALES Miércoles 20 de marzo de 2024 El Peruano/ el Informe N° 00068-2024-OEFA/OAD-URH ' +
    'Artículo 1°.- Designar a la señora Yanet De Jesús Dios Benites en el puesto de confianza del OEFA. ' +
    'JUAN EDGARDO NARCISO CHÁVEZ Presidente del Consejo Directivo 2272073-1 ORGANISMO SUPERVISOR DE LAS ' +
    'CONTRATACIONES DEL ESTADO Eligen Presidenta del Tribunal ACUERDO DE SALA PLENA N° 001-2024/TCE ' +
    'En Sesión de Sala Plena N° 01-2024/TCE los Vocales acordaron elegir a la Vocal Paola Saavedra ' +
    'Alburqueque. CAROLA PATRICIA CUCAT VILCHEZ Secretaria del Tribunal 2272080-1 SUPERINTENDENCIA ' +
    'DEL MERCADO DE VALORES Autorizan el funcionamiento de Andean Crown.';
  const r = recortarDeElPeruano(pagina, SALA);
  comprobar('deja fuera la norma de delante', !/OEFA|Yanet/.test(r), r.slice(0, 80));
  comprobar('y la de detrás', !/SUPERINTENDENCIA|Andean/.test(r), r.slice(-80));
  comprobar('conserva el acuerdo entero', /^ORGANISMO SUPERVISOR/.test(r) && /Secretaria del Tribunal$/.test(r), r);
}
{
  const pagina =
    'Artículo 12°.- Notificación del IPD 2361381-1 ORGANISMO SUPERVISOR DE LAS CONTRATACIONES DEL ESTADO ' +
    'ACUERDO DE SALA PLENA N° 007-2021/TCE primera página del acuerdo Firmado por: Editora Peru Fecha: ' +
    '27/10/2021 00:17 30 NORMAS LEGALES Miércoles 27 de octubre de 2021 El Peruano / segunda página del ' +
    'acuerdo con el III. ACUERDO final. Secretaria del Tribunal 2005353-1 SUPERINTENDENCIA';
  const r = recortarDeElPeruano(pagina, SALA);
  comprobar('la firma de Editora Perú al pie de una página no se come las siguientes', /segunda página del acuerdo/.test(r), r);
  comprobar('ni queda el sello', !/Firmado por|Editora/.test(r), r);
  comprobar('ni las cabeceras de página', !/NORMAS LEGALES/.test(r), r);
}
{
  const pegada =
    'bunal ha identificado 57NORMAS LEGALESMiércoles 10 de noviembre de 2021El Peruano / la existencia de criterios';
  comprobar(
    'la cabecera pegada sin espacios también sale',
    !/NORMAS LEGALES/.test(recortarDeElPeruano(`${pegada} Sala Plena`, SALA)),
  );
}
{
  const pagina =
    'Portal Institucional del OEFA (www.oefa.gob.pe) 1530999.1 ACUERDO DE SALA PLENA N° 03-2017/TCE ' +
    'texto del acuerdo 1531000-1 otra norma';
  const r = recortarDeElPeruano(`El Peruano NORMAS LEGALES ${pagina}`, SALA);
  comprobar('el código de despacho con punto también corta', !/OEFA/.test(r) && /texto del acuerdo$/.test(r), r);
}
{
  const separata =
    'Año XXXIV / Nº 1275 Domingo 15 de junio de 2025 PRECEDENTES VINCULANTES (Constitucionales, Judiciales y ' +
    'Administrativos) “AÑO DE LA RECUPERACIÓN” FUNDADO EL 22 DE OCTUBRE DE 1825 POR EL LIBERTADOR SIMÓN BOLÍVAR ' +
    'TRIBUNAL DE CONTRATACIONES PÚBLICAS ACUERDO DE SALA PLENA Nº 03-2025/TCP I. ANTECEDENTES texto ' +
    '4 El Peruano Jueves 22 de mayo de 2025 PRECEDENTES VINCULANTES (Constitucionales, Judiciales y Administrativos) ' +
    'más texto. MARLON LUIS ARANA ORELLANA J-2409194-1 Visitas guiadas www.editoraperu.com.pe';
  const r = recortarDeElPeruano(separata, SALA);
  comprobar('la separata pierde su portada', /^TRIBUNAL DE CONTRATACIONES/.test(r), r.slice(0, 60));
  comprobar('su cabecera de página', !/PRECEDENTES VINCULANTES/.test(r), r);
  comprobar('y la publicidad del final, con la letra del código', /ARANA ORELLANA$/.test(r), r.slice(-60));
}
{
  const propio = 'ACUERDO DE SALA PLENA N° 004-2021/TCE Página 1 de 6 Tribunal de Contrataciones del Estado …';
  comprobar('un PDF propio del Tribunal no se toca', recortarDeElPeruano(propio, SALA) === propio);
}

console.log('\nLegibilidad');
comprobar(
  'los acentos leídos con la tabla de Mac se detectan',
  textoIlegible('la determinaciÛn de la entidad p˙blica, cu·l es la sede, la informaciÛn contenida, la contrataciÛn'),
);
comprobar(
  'y la fuente sin tabla, con sus U+0003',
  textoIlegible('FRQWUDWDFLyQ\u0003'.repeat(25)),
);
comprobar('un texto normal pasa', !textoIlegible('La determinación de la entidad pública contratante, según el artículo 11.'));

console.log('\nÍndice del visor');
{
  const texto =
    'ACUERDO DE SALA PLENA N° 003-2025/TCP I. ANTECEDENTES 1. De conformidad con la Ley. II. ANÁLISIS ' +
    'Sobre la firma escaneada. III. ACUERDO Por las consideraciones expuestas, la Sala Plena acuerda. ' +
    'Secretaria Técnica del Tribunal VOTO EN DISCORDIA DE LOS VOCALES STEVEN FLORES I. ANÁLISIS 1. El literal g).';
  const titulos = formatForDisplay(texto)
    .split('\n')
    .filter((l) => /^#{1,3} /.test(l))
    .map((l) => l.replace(/^#+ /, '').trim());
  comprobar('«III. ACUERDO» es un título', titulos.includes('III. ACUERDO'), titulos.join(' · '));
  comprobar('y el voto en discordia también', titulos.includes('VOTO EN DISCORDIA'), titulos.join(' · '));
  comprobar(
    'pero no cada «ACUERDO DE SALA PLENA» en mayúsculas',
    !titulos.some((t) => /^ACUERDO DE SALA PLENA/.test(t)),
    titulos.join(' · '),
  );
}

console.log('\nClasificador del rastreador');
comprobar(
  'un PDF de acuerdo de Sala Plena es acuerdo, no resolución',
  classifyByPattern({
    url: 'https://cdn.www.gob.pe/uploads/document/file/8233478/6876808-acuerdo-de-sala-plena-n-03-2025-tcp.pdf',
    defaultType: 'resolucion',
  }).type === 'acuerdo_sala_plena',
);
comprobar(
  'por el texto del enlace también',
  classifyByPattern({ url: 'https://www.gob.pe/x', linkText: 'Acuerdo de Sala Plena N.° 002-2025/TCP', defaultType: 'resolucion' })
    .type === 'acuerdo_sala_plena',
);
comprobar(
  'y una resolución del Tribunal sigue siéndolo',
  classifyByPattern({ url: 'https://www.gob.pe/institucion/oece/normas-legales/8634636-8777-2026-tcp-s2', defaultType: 'resolucion' })
    .type === 'resolucion_tce',
);

console.log(fallos ? `\n❌ ${fallos} problema(s).` : '\n✅ Los acuerdos de Sala Plena entran limpios y se leen con su estructura.');
process.exit(fallos ? 1 : 0);
