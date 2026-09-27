#!/usr/bin/env tsx
/**
 * La forma de los documentos frente a los modelos que César mandó el
 * 27/09/2026 (expedientes reales de la Zona Registral N.° XIV). Lo que no
 * depende del modelo: el rótulo, la numeración, las citas, los cuadros,
 * la resolución, el memorándum, el acta del contrato menor y la letra de
 * cada unidad en el Word.
 *
 * `npx tsx scripts/pruebas/modelos-de-cesar.ts`
 */
import JSZip from 'jszip';
import { documentoADocx, documentoEnMarkdown } from '../../src/lib/ejecucion/documento';
import { piezasDelApartado, piezasDelDocumento } from '../../src/lib/ejecucion/plantillas';
import { documentoRecomendado, type Contexto } from '../../src/lib/ejecucion/matriz';
import { apartadosDe } from '../../src/lib/ejecucion/redaccion';
import { determinarRegimen, esContratoMenor } from '../../src/lib/ejecucion/regimen';
import { siguientePregunta } from '../../src/lib/ejecucion/preguntas';
import { formatoDelChat, piezasDelChat } from '../../src/lib/documentos/forma-del-chat';
import type { Perfil } from '../../src/lib/ejecucion/catalogo';
import type { BorradorDeDocumento, Ficha } from '../../src/lib/ejecucion/tipos';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: unknown) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle !== undefined ? ` — ${typeof detalle === 'string' ? detalle.slice(0, 1500) : JSON.stringify(detalle)}` : ''}`);
  if (!ok) fallos++;
}

const ficha: Ficha = {
  entidad: { valor: 'Zona Registral N.° XIV' },
  contratista: { valor: 'MULTISERVICIOS KATERIN E.I.R.L.' },
  numero_contrato: { valor: 'Contrato N.° 004-2025-SUNARP-Sede Ayacucho' },
  objeto: { valor: 'Adquisición de uniforme institucional verano e invierno 2026' },
};

const borrador = (parcial: Partial<BorradorDeDocumento>): BorradorDeDocumento => ({
  generadoEn: '2026-09-27T15:00:00Z',
  version: 1,
  nivel: 'revision_final',
  tipo: 'informe_dec',
  titulo: 'Informe de la DEC sobre la reducción de prestaciones',
  asunto: 'Sustento técnico previo a la aprobación de la reducción de prestaciones',
  referencias: ['Memorándum N.° 00929-2026-UA', 'Contrato N.° 004-2025-SUNARP-Sede Ayacucho'],
  secciones: [],
  pendientes: [],
  ...parcial,
});

const md = (b: BorradorDeDocumento, perfil: Perfil = 'dec') => documentoEnMarkdown({ borrador: b, perfil, ficha, anio: 2026 });

async function xmlDelWord(b: BorradorDeDocumento, perfil: Perfil): Promise<string> {
  const buf = await documentoADocx({ borrador: b, perfil, ficha, anio: 2026 });
  const zip = await JSZip.loadAsync(buf);
  return (await zip.file('word/document.xml')?.async('string')) ?? '';
}

(async () => {
  console.log('\nInforme de la DEC');
  const dec = borrador({
    actuacion: 'reduccion',
    apertura: 'Tengo el agrado de dirigirme a usted para remitir el informe técnico que sustenta la reducción de prestaciones.',
    secciones: [
      { titulo: 'ANTECEDENTES', parrafos: ['El 8 de setiembre de 2025, la Entidad suscribió el **Contrato N.° 004-2025**.', '1.2 Mediante Memorándum N.° 00929-2026 se requirió la reducción.'] },
      { titulo: 'BASE LEGAL', parrafos: ['- Ley N.° 32069, Ley General de Contrataciones Públicas.', '- Decreto Supremo N.° 009-2025-EF.'] },
      {
        titulo: 'ANÁLISIS',
        parrafos: [
          'El Contrato N.° 004-2025 fue perfeccionado bajo la vigencia de la Ley N.° 32069.',
          '## Ejecución y posibles modificaciones contractuales',
          '> «109.1. La entidad contratante puede ordenar la reducción de prestaciones (…)».',
          '## Respecto al cumplimiento del primer supuesto – Límite máximo',
          '| Concepto | Dato |\n|---|---|\n| Monto del contrato original | S/ 40,000.00 |\n| Reducción | S/ 2,400.00 |',
          'En consecuencia, se cumple el primer supuesto.',
        ],
      },
      { titulo: 'CONCLUSIÓN', parrafos: ['En consecuencia, corresponde autorizar la reducción.'] },
    ],
  });
  const t = md(dec);
  comprobar('sin «DE:» ni «FECHA:»', !/\*\*DE:\*\*/.test(t) && !/\*\*FECHA:\*\*/.test(t), t);
  comprobar('lugar y fecha arriba, antes del número', t.indexOf('[Ciudad], [día] de [mes] de 2026') < t.indexOf('INFORME N°'), t);
  comprobar('PARA, ASUNTO y REFERENCIA con literales', /\*\*PARA:\*\*/.test(t) && /\*\*ASUNTO:\*\*/.test(t) && /\*\*a\)\*\* Memorándum/.test(t) && /\*\*b\)\*\* Contrato/.test(t), t);
  comprobar('la raya bajo el rótulo', /\n---\n/.test(t), t);
  comprobar('la frase de cortesía del modelo', t.includes('Tengo el agrado de dirigirme a usted para remitir'), t);
  comprobar('párrafos numerados 1.1 y 1.2 (quita el numeral que puso el modelo)', /\n1\.1 El 8 de setiembre/.test(t) && /\n1\.2 Mediante Memorándum/.test(t) && !/1\.2 1\.2/.test(t), t);
  comprobar('el análisis numera 3.1 y 3.2, sin contar subtítulos, citas ni cuadros', /\n3\.1 El Contrato/.test(t) && /\n3\.2 En consecuencia/.test(t), t);
  comprobar('el subtítulo va sin número', /### Respecto al cumplimiento del primer supuesto/.test(t), t);
  comprobar('la cita va como cita', /> \*«109\.1\./.test(t), t);
  comprobar('el cuadro va como cuadro', /\| Monto del contrato original \| S\/ 40,000\.00 \|/.test(t), t);
  comprobar('la base legal va con guiones, sin numerar', /- Ley N\.° 32069/.test(t) && !/2\.1 - Ley/.test(t), t);
  comprobar('cierra con «Es todo cuanto informo…»', t.includes('Es todo cuanto informo para su conocimiento y fines correspondientes.'), t);
  const xml = await xmlDelWord(dec, 'dec');
  comprobar('el Word del informe de la DEC va en Verdana', xml.includes('w:ascii="Verdana"'));
  comprobar('las citas, en Times New Roman', xml.includes('w:ascii="Times New Roman"'));
  comprobar('la cabecera del cuadro, en azul oscuro', xml.includes('0E2841'));
  comprobar('la raya es un borde inferior de párrafo', /<w:pBdr><w:bottom/.test(xml));

  console.log('\nInforme legal');
  const legal = borrador({
    tipo: 'informe_legal',
    remiteProyecto: 'resolución',
    secciones: [
      { titulo: 'BASE LEGAL', parrafos: ['- Ley N.° 32069.'] },
      { titulo: 'ANTECEDENTES', parrafos: ['Mediante Informe N.° 00441-2026 la DEC sustentó la reducción.'] },
    ],
  });
  const l = md(legal, 'asesoria_juridica');
  comprobar('rótulo A, no PARA', /\*\*A:\*\*/.test(l) && !/\*\*PARA:\*\*/.test(l), l);
  comprobar('títulos con dos puntos', /I\. BASE LEGAL:/.test(l) && /II\. ANTECEDENTES:/.test(l), l);
  comprobar('los párrafos del informe legal no se numeran', !/\n2\.1 /.test(l), l);
  comprobar('la nota que remite el proyecto', /\*\*NOTA:\*\* Se remite el proyecto de resolución/.test(l), l);
  const pl = piezasDelDocumento({ borrador: legal, perfil: 'asesoria_juridica', ficha, anio: 2026 });
  comprobar('los títulos van subrayados', pl.some((p) => p.clase === 'titulo' && p.subrayado));
  comprobar('el Word del informe legal va en Arial', (await xmlDelWord(legal, 'asesoria_juridica')).includes('w:ascii="Arial"'));

  console.log('\nMemorándum del área usuaria');
  const memo = borrador({
    tipo: 'memorandum',
    actuacion: 'otra_modificacion',
    secciones: [
      { titulo: 'Justificación de la necesidad y finalidad pública', parrafos: ['La ampliación del ancho de banda permitirá atender a los usuarios.'] },
      { titulo: 'IDENTIFICACIÓN DEL CONTRATO A MODIFICAR', parrafos: ['**Contrato N.° 006-2024-SUNARP**.'] },
    ],
  });
  const m = md(memo, 'area_usuaria');
  comprobar('se titula MEMORÁNDUM', m.includes('**MEMORÁNDUM N° [●]-2026-[SIGLAS]**'), m);
  comprobar('puntos «1.» con dos puntos y en tipo oración', /1\. Justificación de la necesidad y finalidad pública:/.test(m) && /2\. Identificación del contrato a modificar:/.test(m), m);
  comprobar('cierra con «Sin otro en particular, quedo de usted.»', m.includes('Sin otro en particular, quedo de usted.'), m);
  comprobar('los seis puntos de otras modificaciones', apartadosDe('memorandum', 'otra_modificacion').length === 6);

  console.log('\nResolución');
  const res = borrador({
    tipo: 'resolucion',
    vistos: ['el Informe N.° 00441-2026', 'el Informe N.° 153-2026-UAJ'],
    considerandos: ['Que, de acuerdo con el artículo 72 del Reglamento de Organización y Funciones…;'],
    visto: 'Con el visto de la Oficina de Asesoría Jurídica',
    atribuciones: 'En uso de las atribuciones conferidas por la Resolución Jefatural N.° [●]',
    resuelve: ['**APROBAR** la reducción de prestaciones.', '**NOTIFICAR** al contratista.'],
    epigrafes: ['Aprobación de reducción de la prestación', 'NOTIFICACIÓN'],
  });
  const r = md(res, 'aga');
  comprobar('fecha a la derecha con «.-»', r.includes('[Ciudad], [día] de [mes] de 2026.-'), r);
  comprobar('«Con el visto de…;» y «En uso de las atribuciones…;»', /Con el visto de la Oficina de Asesoría Jurídica;/.test(r) && /En uso de las atribuciones conferidas por .*;/.test(r), r);
  comprobar('ARTÍCULO con epígrafe en mayúsculas', /\*\*ARTÍCULO 1\.- APROBACIÓN DE REDUCCIÓN DE LA PRESTACIÓN\.\*\* \*\*APROBAR\*\*/.test(r), r);
  comprobar('cierre «Regístrese, comuníquese y publíquese.»', r.includes('Regístrese, comuníquese y publíquese.'), r);
  const pr = piezasDelDocumento({ borrador: res, perfil: 'aga', ficha, anio: 2026 });
  comprobar('los «Que, …» con sangría de primera línea', pr.some((p) => p.clase === 'parrafo' && p.sangriaPrimera && p.texto.startsWith('Que,')));

  console.log('\nActa de modificación del contrato menor');
  const acta = borrador({
    tipo: 'acta',
    actuacion: 'reduccion',
    secciones: [
      { titulo: 'Antecedentes', parrafos: ['El 8 de setiembre de 2025 se suscribió el contrato.', 'Mediante Informe N.° 00765-2025 se sustentó la reducción.'] },
      { titulo: 'Sustento Normativo', parrafos: ['- Ley N.° 32069.'] },
      { titulo: 'Objeto de la Modificación', parrafos: ['Reducir un paquete de uniforme.'] },
    ],
  });
  const a = md(acta, 'aga');
  comprobar('título «ACTA DE MODIFICACIÓN AL CONTRATO…» y el tipo', a.includes('# ACTA DE MODIFICACIÓN AL CONTRATO N.° 004-2025-SUNARP-SEDE AYACUCHO') && a.includes('# REDUCCIÓN DE PRESTACIONES'), a);
  comprobar('apertura sin hora, «reunidos los representantes de las partes:»', /reunidos los representantes de las partes:/.test(a) && !/siendo las/.test(a), a);
  comprobar('las partes con su término definido', a.includes('«LA ENTIDAD»') && a.includes('«EL CONTRATISTA»'), a);
  comprobar('«EXPONEN:»', a.includes('**EXPONEN:**'), a);
  comprobar('solo los antecedentes van en 1.1, 1.2', /\n1\.1 El 8 de setiembre/.test(a) && /\n1\.2 Mediante Informe/.test(a) && !/\n3\.1 /.test(a), a);
  comprobar('sin «ACUERDOS»', !/ACUERDOS/.test(a), a);
  const pa = piezasDelDocumento({ borrador: acta, perfil: 'aga', ficha, anio: 2026 });
  const firmas = pa.find((p) => p.clase === 'firmas');
  comprobar('firman LA ENTIDAD y EL CONTRATISTA, dos columnas', firmas?.clase === 'firmas' && firmas.personas.length === 2);
  const xa = await xmlDelWord(acta, 'aga');
  comprobar('el Word del acta va en tamaño carta', xa.includes('w:w="12240"'));

  console.log('\nQué documento corresponde');
  const c = (parcial: Partial<Contexto>): Contexto => ({ perfil: 'aga', tipo: 'bienes', sistemaEntrega: null, supervisado: null, regimen: 'ley_32069', respuestas: {}, ...parcial });
  comprobar('el área usuaria pide el adicional por memorándum', documentoRecomendado('area_usuaria', 'adicional', c({ perfil: 'area_usuaria' })).tipo === 'memorandum');
  comprobar('y la ampliación de plazo la informa', documentoRecomendado('area_usuaria', 'ampliacion_plazo', c({ perfil: 'area_usuaria' })).tipo === 'informe_tecnico');
  comprobar('contrato menor: la reducción es un acta', documentoRecomendado('aga', 'reduccion', c({ contratoMenor: true })).tipo === 'acta');
  comprobar('contrato menor: la ampliación de plazo, también', documentoRecomendado('aga', 'ampliacion_plazo', c({ contratoMenor: true })).tipo === 'acta');
  comprobar('sin contrato menor, la reducción es una resolución', documentoRecomendado('aga', 'reduccion', c({})).tipo === 'resolucion');
  comprobar('«contrato menor» en el procedimiento', esContratoMenor({ procedimiento: { valor: 'Contrato menor' } }));
  comprobar('«contratos menores» en el pedido', esContratoMenor({}, ['modificación de contratos menores en SUNARP']));
  comprobar('un concurso público no lo es', !esContratoMenor({ procedimiento: { valor: 'Concurso Público N.° 007-2026' } }));

  // Prueba en producción (27/09): a un contrato menor se le preguntaba la
  // fecha de convocatoria, que no tiene.
  const rm = determinarRegimen({ fecha_suscripcion: { valor: '2026-02-27' } }, { contratoMenor: true });
  comprobar('contrato menor suscrito con la Ley N.° 32069 vigente: régimen resuelto, sin convocatoria', rm.clave === 'ley_32069', rm);
  comprobar('un contrato que no es menor sigue dependiendo de la convocatoria', determinarRegimen({ fecha_suscripcion: { valor: '2026-02-27' } }).clave === 'por_determinar');
  // Y el monto de la reducción: si no llegó como dato del documento, se
  // pregunta, aunque la lectura haya visto un monto de «reducción».
  const prRed = siguientePregunta({
    actuacion: 'reduccion',
    perfil: 'aga',
    tipo: 'bienes',
    regimen: 'ley_32069',
    ficha: {},
    respuestas: { delegacion: 'No' },
    clases: new Set(['delegacion']),
    hechoIdentificado: true,
    hechoAcreditado: true,
    montos: [{ concepto: 'monto de la reducción', monto: 720 }],
    hayFechaSolicitud: false,
  });
  comprobar('el monto de la reducción se pregunta si no llegó con su cita', prRed?.id === 'monto_reduccion', prRed);

  console.log('\nApartados según la actuación');
  comprobar('penalidad: antecedentes, análisis y conclusión', apartadosDe('informe_dec', 'penalidad').join('|') === 'ANTECEDENTES|ANÁLISIS|CONCLUSIÓN');
  comprobar('ampliación de plazo: sin base legal', !apartadosDe('informe_dec', 'ampliacion_plazo').includes('BASE LEGAL'));
  comprobar('informe legal: la base legal primero', apartadosDe('informe_legal', 'adicional')[0] === 'BASE LEGAL');
  comprobar('singular: CONCLUSIÓN y RECOMENDACIÓN', apartadosDe('informe_dec', 'adicional').includes('CONCLUSIÓN') && apartadosDe('informe_dec', 'adicional').includes('RECOMENDACIÓN'));

  console.log('\nPárrafos');
  const pz = piezasDelApartado(['**Cálculo de la penalidad**', 'Texto.', 'a) Uno.', 'b) Dos.'], '2');
  comprobar('un renglón entero en negrita es subtítulo', pz[0].clase === 'titulo' && pz[0].texto === 'Cálculo de la penalidad', pz);
  comprobar('una oración en negrita que termina en punto no lo es', piezasDelApartado(['**El contrato se perfeccionó.**'], '1')[0].clase === 'parrafo');
  comprobar('los literales se juntan en una lista', pz.filter((p) => p.clase === 'lista').length === 1, pz);

  console.log('\nResolución: los vistos que ya traen «;»');
  const rv = md(borrador({ tipo: 'resolucion', vistos: ['La Carta N.° 027-2026;', 'El Contrato N.° 015-2026;'], resuelve: ['**APROBAR** x.'] }), 'aga');
  comprobar('sin «;;»', !rv.includes(';;') && rv.includes('La Carta N.° 027-2026; El Contrato N.° 015-2026; y,'), rv);

  console.log('\nGenerador libre: la forma del informe');
  const chat = piezasDelChat(
    '[Ciudad], 5 de octubre de 2026\n\n**INFORME N° [●]-2026-UA/ABA**\n**PARA:** **Juan Pérez** — Jefe de Administración\n**ASUNTO:** Cálculo de penalidad\n**REFERENCIA:**\na) Acta de conformidad N° 21-2026\nb) Contrato N.° 004-2025\n\nTengo el agrado de dirigirme a usted.\n\n## I. ANTECEDENTES\n1.1 El contrato.',
    'dec',
  );
  const rotulos = chat.filter((p) => p.clase === 'rotulo');
  comprobar('PARA, ASUNTO y REFERENCIA como rótulo', rotulos.map((p) => (p.clase === 'rotulo' ? p.etiqueta : '')).join('|') === 'PARA|ASUNTO|REFERENCIA', chat);
  const ref = rotulos[2];
  comprobar('los literales de la referencia dentro del rótulo', ref?.clase === 'rotulo' && ref.lineas.length === 2 && ref.lineas[0].startsWith('**a)**'), ref);
  comprobar('la raya después del rótulo', chat[chat.indexOf(ref) + 1]?.clase === 'raya', chat);
  comprobar('el informe de la DEC del chat va en Verdana', formatoDelChat('dec', '').fuente === 'Verdana');

  console.log('\nGenerador libre: el escrito de apelación');
  const esc = piezasDelChat(
    '**Expediente N.° :**\n**Escrito N.° :** 001-2026\n**Sumilla :** Interpongo recurso de apelación\n\n**SEÑOR PRESIDENTE DEL TRIBUNAL DE CONTRATACIONES PÚBLICAS**\n\nLa empresa **ARAXA S.A.C.**, con RUC N.° 20600000001, debidamente representada por su Gerente General, a usted respetuosamente digo:\n\n## I. NOMENCLATURA DEL PROCEDIMIENTO DE SELECCIÓN\n| ENTIDAD CONTRATANTE | Municipalidad Provincial de El Collao |\n|---|---|\n| TIPO DE PROCEDIMIENTO | Concurso Público Abreviado N.° 002-2026 |\n| CUANTÍA | S/ 150,000.00 |',
    'postor',
  );
  const re = esc.filter((p) => p.clase === 'rotulo');
  comprobar('Expediente, Escrito y Sumilla como rótulo corrido a la derecha', re.length === 3 && re.every((p) => p.clase === 'rotulo' && p.desplazado), esc);
  comprobar('el recurrente, corrido a la derecha', esc.some((p) => p.clase === 'parrafo' && p.desplazado && /respetuosamente digo:$/.test(p.texto)), esc);
  const nom = esc.find((p) => p.clase === 'cuadro');
  comprobar('la nomenclatura en un cuadro con la etiqueta sobre gris', nom?.clase === 'cuadro' && nom.filas.length === 3 && nom.filas[0][0].gris === true, esc);
  const esc2 = piezasDelChat(
    '| DATOS DEL PROCEDIMIENTO | DETALLE |\n| :--- | :--- |\n| **ENTIDAD CONTRATANTE** | Municipalidad |\n| **TIPO Y NÚMERO DE PROCEDIMIENTO** | CPA N.° 002-2026 |\n| **OBJETO DE LA CONTRATACIÓN** | Servicio |\n| **CUANTÍA DEL PROCEDIMIENTO** | S/ 99,234.00 |',
    'postor',
  );
  const nom2 = esc2.find((p) => p.clase === 'cuadro');
  comprobar(
    'no se pierde ninguna fila del cuadro (el caso real del chat: «TIPO Y NÚMERO…» y cabecera «DATOS DEL PROCEDIMIENTO»)',
    nom2?.clase === 'cuadro' && nom2.filas.length === 4 && nom2.filas[1][0].texto.startsWith('TIPO Y NÚMERO'),
    esc2,
  );
  // Lo que devolvió el chat en producción (27/09): título arriba y el
  // rótulo en mayúsculas.
  const esc3 = piezasDelChat(
    '# RECURSO DE APELACIÓN CONTRA LA EVALUACIÓN DE OFERTAS\n\n**EXPEDIENTE N.° :** [COMPLETAR]  \n**ESCRITO N.° :** 001-2026  \n**SUMILLA :** Interpongo recurso de apelación.\n\n---\n\n**SEÑORES DE LA MUNICIPALIDAD**',
    'postor',
  );
  comprobar('el escrito no lleva el título que el modelo pone arriba', esc3[0]?.clase === 'rotulo', esc3);
  comprobar('el rótulo en mayúsculas también se reconoce', esc3.filter((p) => p.clase === 'rotulo').length === 3, esc3);
  comprobar(
    'otro perfil conserva su título',
    piezasDelChat('# INFORME N° 1\n\n**PARA:** x', 'dec')[0]?.clase === 'titulo',
  );
  comprobar('el escrito va en Tw Cen MT 12', formatoDelChat('postor', '').fuente === 'Tw Cen MT' && formatoDelChat('postor', '').tamano === 24);
  comprobar('el acta de la AGA, en tamaño carta', formatoDelChat('aga', '# ACTA DE MODIFICACIÓN AL CONTRATO N.° 1').pagina.ancho === 12240);

  console.log(fallos ? `\n❌ ${fallos} problema(s).` : '\n✅ Todo en orden\n');
  process.exit(fallos ? 1 : 0);
})();
