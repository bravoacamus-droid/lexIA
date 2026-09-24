#!/usr/bin/env tsx
/**
 * La versión mejorada del requerimiento: lo que no depende del modelo.
 *
 * `npx tsx scripts/pruebas/version-mejorada.ts`
 *
 * Ubicar un pasaje con comillas y espacios distintos, compararlo palabra
 * a palabra, marcarlo con control de cambios en un Word cuyos párrafos
 * vienen partidos en varios runs —negritas en medio—, y comprobar que,
 * aceptando todos los cambios, queda exactamente el texto propuesto. Lo
 * que no se puede marcar con seguridad tiene que quedar sin marcar y con
 * su motivo.
 *
 * Para verlo en Word: `scripts/word-revisiones.ps1 -Archivo tmp/prueba-mejora.docx`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import JSZip from 'jszip';
import { piezasADocx, FORMATO_DOCUMENTO } from '../../src/lib/documentos/word';
import { comparar, ubicar, ubicarCita } from '../../src/lib/evaluacion/mejora/texto';
import { aplicarControlDeCambios, textoDelWord } from '../../src/lib/evaluacion/mejora/control-de-cambios';
import { piezasDelCuadro } from '../../src/lib/evaluacion/mejora/cuadro';
import { numerarHallazgos } from '../../src/lib/evaluacion/mejora/orden';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: string) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
}

void (async () => {
  console.log('\nUbicar');
  const doc = 'El contrato se rige por la modalidad de “suma alzada”,  conforme al Reglamento.';
  comprobar('con comillas y espacios distintos', ubicar(doc, 'modalidad de "suma alzada", conforme') !== null);
  comprobar('sin distinguir mayúsculas', ubicar(doc, 'EL CONTRATO SE RIGE') !== null);
  comprobar('lo que no está, no se encuentra', ubicar(doc, 'modalidad de precios unitarios') === null);
  comprobar(
    'la cita del auditor con «…» se encuentra por su trozo largo',
    ubicarCita(doc, 'El contrato se rige por la modalidad… conforme al Reglamento') !== null,
  );

  console.log('\nComparar');
  const ops = comparar(
    'de conformidad con el artículo 130 del Reglamento',
    'conforme al artículo [precisar el artículo] del Reglamento',
  );
  const insertado = ops.filter((o) => o.tipo === 'inserta').map((o) => o.texto).join('|');
  comprobar('el hueco entra entero, sin partir', insertado.includes('[precisar el artículo]'), insertado);
  comprobar(
    'y lo común se queda',
    ops.some((o) => o.tipo === 'igual' && o.texto.includes('artículo')) &&
      ops.some((o) => o.tipo === 'igual' && o.texto.includes('del Reglamento')),
  );
  comprobar('comillas distintas no son un cambio', comparar('la “obra”', 'la "obra"').every((o) => o.tipo === 'igual'));

  console.log('\nControl de cambios en el Word');
  const original = await piezasADocx(
    [
      { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: 'TÉRMINOS DE REFERENCIA' },
      { clase: 'parrafo', texto: 'El contrato se rige por la modalidad de pago de **suma alzada**, de conformidad con el artículo 130 del Reglamento.' },
      { clase: 'parrafo', texto: 'El NOC deberá ser de propiedad del postor.' },
      { clase: 'parrafo', texto: 'La penalidad se aplica por cada día de atraso.' },
      { clase: 'parrafo', texto: 'La penalidad se aplica por cada día de atraso.' },
      { clase: 'parrafo', texto: 'Primer párrafo de un pasaje.' },
      { clase: 'parrafo', texto: 'Segundo párrafo del mismo pasaje.' },
    ],
    FORMATO_DOCUMENTO,
  );
  const cambios = [
    {
      id: 'varios-runs',
      textoOriginal: 'modalidad de pago de suma alzada, de conformidad con el artículo 130 del Reglamento.',
      textoMejorado: 'modalidad de pago a suma alzada, conforme al artículo [precisar el artículo] del Reglamento.',
      comentario: 'Observación N.° 1: prueba\nCon dos líneas.',
    },
    {
      id: 'simple',
      textoOriginal: 'El NOC deberá ser de propiedad del postor.',
      textoMejorado: 'El NOC podrá ser propio, arrendado o provisto por un tercero.',
      comentario: 'Observación N.° 2',
    },
    {
      id: 'repetido',
      textoOriginal: 'La penalidad se aplica por cada día de atraso.',
      textoMejorado: 'La penalidad por mora se aplica por cada día de atraso.',
      comentario: 'No debe aplicarse',
    },
    {
      id: 'dos-parrafos',
      textoOriginal: 'Primer párrafo de un pasaje. Segundo párrafo del mismo pasaje.',
      textoMejorado: 'Un solo párrafo.',
      comentario: 'No debe aplicarse',
    },
  ];
  const r = await aplicarControlDeCambios(original, cambios, { fecha: new Date('2026-09-23T12:00:00Z') });
  comprobar('se marcan los dos que se pueden', r.aplicados.join(',') === 'varios-runs,simple', r.aplicados.join(','));
  const motivo = (id: string) => r.noAplicados.find((n) => n.id === id)?.motivo ?? '';
  comprobar('el repetido no se toca y dice por qué', /aparece 2 veces/.test(motivo('repetido')), motivo('repetido'));
  comprobar('el que cruza dos párrafos tampoco', /más de un párrafo/.test(motivo('dos-parrafos')), motivo('dos-parrafos'));

  const zip = await JSZip.loadAsync(r.buffer);
  const xml = await zip.file('word/document.xml')!.async('string');
  const comentarios = (await zip.file('word/comments.xml')?.async('string')) ?? '';
  comprobar('lleva marcas de borrado e inserción', /<w:del\b/.test(xml) && /<w:ins\b/.test(xml));
  comprobar('lo borrado va como delText', /<w:delText[^>]*>[^<]*130/.test(xml));
  comprobar('un comentario por cambio marcado', (comentarios.match(/<w:comment\b/g) ?? []).length === 2);
  comprobar(
    'y el documento sabe dónde están los comentarios',
    /comments\.xml/.test((await zip.file('word/_rels/document.xml.rels')!.async('string')) ?? '') &&
      /\/word\/comments\.xml/.test(await zip.file('[Content_Types].xml')!.async('string')),
  );
  // El XML guarda la «í» como entidad: se busca el principio del hueco.
  comprobar('el hueco va en rojo', /<w:color w:val="EE0000"\/>[\s\S]{0,200}\[precisar el art/.test(xml));
  comprobar('la negrita de «suma alzada» se conserva', /<w:b\/>[\s\S]{0,300}suma alzada/.test(xml));

  // Aceptar todo = leer sin lo borrado y con lo insertado.
  const aceptado = await textoDelWord(r.buffer);
  comprobar(
    'aceptando los cambios queda el texto propuesto',
    aceptado.includes('modalidad de pago a suma alzada, conforme al artículo [precisar el artículo] del Reglamento.') &&
      aceptado.includes('El NOC podrá ser propio, arrendado o provisto por un tercero.'),
    aceptado,
  );
  comprobar('y nada del texto sustituido', !aceptado.includes('130') && !aceptado.includes('de propiedad del postor'));
  comprobar(
    'lo demás, intacto',
    (aceptado.match(/La penalidad se aplica por cada día de atraso\./g) ?? []).length === 2 &&
      aceptado.includes('Primer párrafo de un pasaje.'),
  );

  console.log('\nNumeración y cuadro');
  const hallazgos = [
    { id: 'b', severidad: 'medio', titulo: 'Medio', ubicacion: '', extracto_literal: '', descripcion: '', recomendacion: '', categoria: 'otro' },
    { id: 'a', severidad: 'critico', titulo: 'Crítico', ubicacion: '', extracto_literal: '', descripcion: '', recomendacion: '', categoria: 'otro' },
    { id: 'c', severidad: 'alto', titulo: 'Alto', ubicacion: '', extracto_literal: '', descripcion: '', recomendacion: '', categoria: 'otro' },
  ];
  comprobar('de los críticos a los bajos', numerarHallazgos(hallazgos).map((x) => x.hallazgo.id).join('') === 'acb');
  const piezas = piezasDelCuadro({
    objeto: 'Servicio de prueba',
    documento: 'prueba.docx',
    fecha: new Date('2026-09-23T12:00:00Z'),
    origen: 'docx',
    hallazgos,
    mejoras: [
      { hallazgoId: 'a', veredicto: 'descartar', motivo: 'Las bases estándar lo exigen.', textoOriginal: '', textoMejorado: '', anclado: false, avisos: [], incluir: false },
      { hallazgoId: 'c', veredicto: 'aplicar', motivo: 'Por el numeral 44.6 del Reglamento.', textoOriginal: 'X', textoMejorado: 'Y', anclado: true, avisos: [], incluir: true },
      { hallazgoId: 'b', veredicto: 'decide_area', motivo: 'Lo decide el área.', textoOriginal: 'Z', textoMejorado: '[precisar]', decisionPendiente: 'El plazo.', anclado: true, avisos: [], incluir: true },
    ],
  });
  const titulos = piezas.filter((p) => p.clase === 'titulo' && !('rol' in p && p.rol)).map((p) => (p as { texto: string }).texto);
  comprobar(
    'los tres apartados, en su orden',
    titulos.join(' / ') === 'CAMBIOS QUE SE PROPONEN / DECISIONES QUE CORRESPONDEN AL ÁREA USUARIA / OBSERVACIONES QUE NO PROCEDEN',
    titulos.join(' / '),
  );
  comprobar('apaisado desde la primera hoja', piezas[0].clase === 'seccion');

  mkdirSync('tmp', { recursive: true });
  writeFileSync('tmp/prueba-mejora.docx', r.buffer);
  console.log(fallos ? `\n❌ ${fallos} problema(s).` : '\n✅ La versión mejorada marca lo que debe, y solo eso.');
  process.exit(fallos ? 1 : 0);
})();
