#!/usr/bin/env tsx
/**
 * El generador de documentos de ejecución contractual: lo que no depende
 * del modelo.
 *
 * `npx tsx scripts/pruebas/generador-ejecucion.ts`
 *
 * Régimen por fecha de convocatoria, días hábiles con feriados, los
 * límites y fórmulas de la norma, la ficha maestra y sus
 * contradicciones, la suficiencia con sus techos, la pregunta decisiva,
 * la verificación de citas, la composición del diagnóstico y la
 * auditoría del documento.
 */
import { writeFileSync } from 'node:fs';
import { determinarRegimen, esDiaHabil, sumarDiasHabiles } from '../../src/lib/ejecucion/regimen';
import { aNumero, calcular, factorF, limiteDeAdicionales, plazoDeApercibimiento } from '../../src/lib/ejecucion/calculos';
import { reconstruirFicha, soloElNumero } from '../../src/lib/ejecucion/ficha';
import { calcularSuficiencia, evaluarRequisitos } from '../../src/lib/ejecucion/suficiencia';
import { MATRIZ, requisitosAplicables, type Contexto } from '../../src/lib/ejecucion/matriz';
import { siguientePregunta, tipoDesdeTexto } from '../../src/lib/ejecucion/preguntas';
import { depurarLectura } from '../../src/lib/ejecucion/lectura';
import { componerAnalisis, prepararCaso } from '../../src/lib/ejecucion/diagnostico';
import { auditoriaDeterminista, fechasDe, montosDe } from '../../src/lib/ejecucion/auditoria';
import { depurarBorrador, limpiarTexto } from '../../src/lib/ejecucion/redaccion';
import { documentoADocx, documentoEnMarkdown, fichaADocx, piezasDeParrafos } from '../../src/lib/ejecucion/documento';
import { extraerArticulo } from '../../src/lib/ejecucion/sustento';
import { tituloDelExpediente } from '../../src/lib/ejecucion/titulo';
import { ORDEN_ACTUACIONES, PERFILES_POR_ROL, type Perfil } from '../../src/lib/ejecucion/catalogo';
import type { DocumentoDelExpediente, LecturaDeDocumento } from '../../src/lib/ejecucion/tipos';
import { CONTRATO_SERVICIOS, SOLICITUD_AMPLIACION } from './ejecucion-casos';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: unknown) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`);
  if (!ok) fallos++;
}

function doc(nombre: string, texto: string, lectura: Partial<LecturaDeDocumento>, extra: Partial<DocumentoDelExpediente> = {}): DocumentoDelExpediente {
  return {
    id: nombre,
    nombre,
    ruta: null,
    origen: 'cargado',
    estado: 'original',
    carpeta: 1,
    clase: lectura.clase ?? 'otro',
    lectura: 'leido',
    error: null,
    texto,
    paginas: 1,
    datos: lectura,
    generacion: null,
    formalizacion: null,
    actuacion_id: null,
    version_de: null,
    created_at: '2026-09-01T00:00:00Z',
    ...extra,
  };
}

const CONTRATO = doc('Contrato 015-2026.pdf', CONTRATO_SERVICIOS, {
  clase: 'contrato',
  fecha: '2026-02-10',
  ficha: [
    { campo: 'numero_contrato', valor: '015-2026-MDVE/GAF', cita: 'CONTRATO N.° 015-2026-MDVE/GAF' },
    { campo: 'entidad', valor: 'Municipalidad Distrital de Villa Esperanza', cita: 'MUNICIPALIDAD DISTRITAL DE VILLA ESPERANZA' },
    { campo: 'contratista', valor: 'Servicios Generales Andinos S.A.C.', cita: 'SERVICIOS GENERALES ANDINOS S.A.C.' },
    { campo: 'ruc_contratista', valor: '20601234567', cita: 'RUC N.° 20601234567' },
    { campo: 'objeto', valor: 'servicio de limpieza y desinfección de locales municipales', cita: 'servicio de limpieza' },
    { campo: 'tipo_contratacion', valor: 'Servicios', cita: 'contratación del servicio' },
    { campo: 'fecha_convocatoria', valor: '2026-01-05', cita: 'Con fecha 5 de enero de 2026 se convocó' },
    { campo: 'plazo_dias', valor: '180', cita: 'ciento ochenta (180) días calendario' },
    { campo: 'monto_original', valor: 'S/ 480,000.00', cita: 'S/ 480,000.00' },
  ],
  montos: [{ concepto: 'monto contractual', monto: 480000, cita: 'S/ 480,000.00' }],
  contiene: [],
});
const SOLICITUD = doc('Carta 027-2026.pdf', SOLICITUD_AMPLIACION, {
  clase: 'solicitud_contratista',
  fecha: '2026-06-15',
  ficha: [{ campo: 'numero_contrato', valor: 'Contrato N.° 015-2026-MDVE/GAF', cita: 'Contrato N.° 015-2026-MDVE/GAF' }],
  montos: [],
  contiene: [],
});

void (async () => {
  console.log('\nRégimen');
  comprobar('convocado el 05/01/2026 → Ley N.° 32069', determinarRegimen({ fecha_convocatoria: { valor: '2026-01-05' } }).clave === 'ley_32069');
  comprobar('convocado el 21/04/2025 → Ley N.° 30225', determinarRegimen({ fecha_convocatoria: { valor: '2025-04-21' } }).clave === 'ley_30225');
  comprobar('convocado el 22/04/2025 → Ley N.° 32069', determinarRegimen({ fecha_convocatoria: { valor: '22/04/2025' } }).clave === 'ley_32069');
  comprobar('suscrito en 2024 sin convocatoria → régimen anterior', determinarRegimen({ fecha_suscripcion: { valor: '2024-04-15' } }).clave === 'ley_30225');
  comprobar('suscrito en 2025 sin convocatoria → por determinar', determinarRegimen({ fecha_suscripcion: { valor: '2025-06-01' } }).clave === 'por_determinar');

  console.log('\nDías hábiles');
  comprobar('el 28 de julio no es hábil', !esDiaHabil('2026-07-28'));
  comprobar('el Viernes Santo de 2026 (3 de abril) no es hábil', !esDiaHabil('2026-04-03'));
  comprobar('el 6 de agosto de 2026 no es hábil', !esDiaHabil('2026-08-06'));
  comprobar('un sábado no es hábil', !esDiaHabil('2026-06-13'));
  comprobar('10 días hábiles desde el 04/06/2026 → 18/06/2026', sumarDiasHabiles('2026-06-04', 10) === '2026-06-18', sumarDiasHabiles('2026-06-04', 10));
  comprobar('12 días hábiles desde el 15/06/2026 salta el 29/06 → 02/07/2026', sumarDiasHabiles('2026-06-15', 12) === '2026-07-02', sumarDiasHabiles('2026-06-15', 12));

  console.log('\nLímites y fórmulas de la norma');
  comprobar('adicional de servicios al 20 % → AGA', limiteDeAdicionales('servicios', null, 20).organo.startsWith('Autoridad'));
  comprobar('adicional de servicios al 26 % → excede', limiteDeAdicionales('servicios', null, 26).excede);
  comprobar('adicional de obra al 14 % → AGA', limiteDeAdicionales('obra', 'Solo construcción', 14).organo.startsWith('Autoridad'));
  comprobar('adicional de obra al 22 % → Titular', limiteDeAdicionales('obra', 'Solo construcción', 22).organo.startsWith('Titular de la Entidad') && !limiteDeAdicionales('obra', null, 22).organo.includes('Contraloría'));
  comprobar('adicional de obra al 35 % → Titular con la Contraloría', limiteDeAdicionales('obra', null, 35).organo.includes('Contraloría'));
  comprobar('adicional de obra al 51 % → excede', limiteDeAdicionales('obra', null, 51).excede);
  comprobar('diseño y construcción al 30 % → Titular', limiteDeAdicionales('obra', 'Diseño y construcción', 30).organo.startsWith('Titular'));
  comprobar('F: bienes 0.40; obra de 90 días 0.25; obra de 200 días 0.15; consultoría de 90 días 0.25', factorF('bienes', 90) === 0.4 && factorF('obra', 90) === 0.25 && factorF('obra', 200) === 0.15 && factorF('consultoria_obra', 90) === 0.25);
  const ap = plazoDeApercibimiento('servicios', 180);
  comprobar('apercibimiento de un servicio de 180 días: entre 18 y 27 días', ap.minimo === 18 && ap.maximo === 27, ap);
  comprobar('apercibimiento de 25 días: 3 días', plazoDeApercibimiento('bienes', 25).fijo === 3);
  comprobar('apercibimiento de obra de 90 días: 15 días', plazoDeApercibimiento('obra', 90).fijo === 15);
  comprobar('montos: «S/ 1\'410,000.00» → 1410000', aNumero("S/ 1'410,000.00") === 1410000);
  comprobar('montos: «1.410.000» → 1410000', aNumero('1.410.000') === 1410000);
  comprobar('montos: «240000» → 240000', aNumero('240000') === 240000);

  const penal = calcular({
    actuacion: 'penalidad',
    tipo: 'servicios',
    sistemaEntrega: null,
    ficha: { monto_original: { valor: 'S/ 480,000.00' }, plazo_dias: { valor: '180' } },
    respuestas: { entregable: 'Todo el contrato', dias_atraso: '10' },
    hoy: '2026-09-23',
  });
  // 0.10 × 480000 / (0.40 × 180) = 666.67 diarios; 10 días = 6,666.70
  comprobar('penalidad: 0.10 × 480 000 / (0.40 × 180) = S/ 666.67 diarios', penal[0]?.detalle.includes('S/ 666.67'), penal[0]?.detalle);
  comprobar('penalidad de 10 días = S/ 6,666.70', penal[0]?.resultado.startsWith('S/ 6,666.70'), penal[0]?.resultado);

  const ampl = calcular({
    actuacion: 'ampliacion_plazo',
    tipo: 'servicios',
    sistemaEntrega: null,
    ficha: {},
    respuestas: { fecha_fin_hecho: '2026-06-04' },
    fechaSolicitud: '2026-06-15',
    hoy: '2026-09-23',
  });
  comprobar('ampliación pedida el 15/06 por un hecho que terminó el 04/06: a tiempo', ampl.some((c) => c.concepto === 'Oportunidad de la solicitud' && !c.impide));
  comprobar('sin pronunciamiento al 23/09: vencido', ampl.some((c) => c.concepto === 'Plazo de la Entidad para pronunciarse' && c.resultado.startsWith('Vencido')));
  comprobar('el aviso de días hábiles no va en el detalle del cálculo', ampl.every((c) => !c.detalle.includes('verifícalo')));
  const tarde = calcular({ actuacion: 'ampliacion_plazo', tipo: 'servicios', sistemaEntrega: null, ficha: {}, respuestas: { fecha_fin_hecho: '2026-05-01' }, fechaSolicitud: '2026-06-15', hoy: '2026-09-23' });
  comprobar('pedida seis semanas después: extemporánea e impide', tarde.some((c) => c.concepto === 'Oportunidad de la solicitud' && c.impide));
  const deOficio = calcular({ actuacion: 'ampliacion_plazo', tipo: 'servicios', sistemaEntrega: null, ficha: {}, respuestas: { origen: 'Identificada por la Entidad' }, hoy: '2026-09-23' });
  comprobar('una ampliación identificada por la Entidad no se otorga de oficio', deOficio.some((c) => c.impide));

  console.log('\nFicha maestra');
  comprobar('«Contrato N.° 015-2026-MDVE/GAF» → «015-2026-MDVE/GAF»', soloElNumero('Contrato N.° 015-2026-MDVE/GAF') === '015-2026-MDVE/GAF');
  comprobar('«Contrato de Ejecución de Obra N.° 010-2025-MDH/GM» → «010-2025-MDH/GM»', soloElNumero('Contrato de Ejecución de Obra N.° 010-2025-MDH/GM') === '010-2025-MDH/GM');
  const { ficha, contradicciones } = reconstruirFicha([CONTRATO, SOLICITUD], {});
  comprobar('el contrato manda sobre la carta', ficha.numero_contrato?.documento === 'Contrato 015-2026.pdf');
  comprobar('el mismo número con otro rótulo no es contradicción', contradicciones.length === 0, contradicciones);
  const otroMonto = doc('Informe.pdf', 'monto S/ 500,000.00', { clase: 'informe_area_usuaria', ficha: [{ campo: 'monto_original', valor: 'S/ 500,000.00', cita: 'S/ 500,000.00' }] });
  comprobar('un monto original distinto sí es contradicción', reconstruirFicha([CONTRATO, otroMonto], {}).contradicciones.some((c) => c.campo === 'monto_original'));
  const corregida = reconstruirFicha([CONTRATO], { plazo_dias: { valor: '200', delUsuario: true } }).ficha;
  comprobar('lo corregido por el usuario manda y queda marcado como suyo', corregida.plazo_dias?.valor === '200' && corregida.plazo_dias.delUsuario === true);
  comprobar('lo que genera LexIA no es fuente de la ficha', !reconstruirFicha([{ ...otroMonto, origen: 'lexia' }], {}).ficha.monto_original);
  comprobar('título del expediente con el contrato', tituloDelExpediente('Nuevo expediente — 23/09/2026', ficha)?.startsWith('Contrato 015-2026-MDVE/GAF — Servicio de limpieza') === true);
  comprobar('un título que el usuario puso no se toca', tituloDelExpediente('Caso limpieza', ficha) === null);

  console.log('\nMatriz: la solicitud es condicional, no masiva');
  const ctx = (perfil: Perfil, tipo: Contexto['tipo'], extra: Partial<Contexto> = {}): Contexto => ({ perfil, tipo, sistemaEntrega: null, supervisado: null, regimen: 'ley_32069', respuestas: {}, ...extra });
  const ids = (a: Parameters<typeof requisitosAplicables>[0], c: Contexto) => requisitosAplicables(a, c).map((r) => r.id);
  comprobar('reducción de servicios: no pide cuaderno ni supervisor', !ids('reduccion', ctx('dec', 'servicios')).some((x) => x === 'cuaderno' || x === 'informe_supervisor'));
  comprobar('ampliación de obra: pide cuaderno, supervisor y programa', ['cuaderno', 'informe_supervisor', 'cronograma'].every((x) => ids('ampliacion_plazo', ctx('dec', 'obra')).includes(x)));
  comprobar('el Área Usuaria no se pide a sí misma su informe', !ids('ampliacion_plazo', ctx('area_usuaria', 'servicios')).includes('informe_area_usuaria'));
  comprobar('el contratista no se pide su propia solicitud', !ids('ampliacion_plazo', ctx('contratista', 'servicios')).includes('solicitud'));
  comprobar('la delegación se pide solo si se declaró', !ids('adicional', ctx('aga', 'bienes')).includes('delegacion') && ids('adicional', ctx('aga', 'bienes', { respuestas: { delegacion: 'Sí' } })).includes('delegacion'));
  comprobar('complementario en obra: la figura no corresponde', MATRIZ.complementario.noCorresponde?.(ctx('dec', 'obra'))?.alternativa === 'adicional');
  comprobar('liquidación de bienes: no corresponde', MATRIZ.liquidacion.noCorresponde?.(ctx('dec', 'bienes')) !== null);
  comprobar('todas las actuaciones tienen matriz', ORDEN_ACTUACIONES.every((a) => MATRIZ[a]));
  comprobar('la entidad ve 7 perfiles, el proveedor 2, el consultor 8', PERFILES_POR_ROL.entity.length === 7 && PERFILES_POR_ROL.provider.join() === 'contratista,supervisor' && PERFILES_POR_ROL.consultant.length === 8);

  console.log('\nSuficiencia');
  const reqs = evaluarRequisitos(requisitosAplicables('ampliacion_plazo', ctx('aga', 'servicios')), ctx('aga', 'servicios'), [CONTRATO, SOLICITUD], ficha, {});
  const suf = calcularSuficiencia(reqs, 'amarillo');
  comprobar('AGA sin el informe del Área Usuaria: techo de 39 % y semáforo rojo', suf.porcentaje <= 39 && suf.semaforo === 'rojo', suf);
  comprobar('con menos del 40 % solo hay diagnóstico', suf.niveles.join() === 'diagnostico');
  const conInforme = evaluarRequisitos(
    requisitosAplicables('ampliacion_plazo', ctx('aga', 'servicios')),
    ctx('aga', 'servicios'),
    [CONTRATO, SOLICITUD, doc('Informe AU.pdf', 'x', { clase: 'informe_area_usuaria' }), doc('TDR.pdf', 'x', { clase: 'tdr' }), doc('Informe DEC.pdf', 'x', { clase: 'informe_dec' })],
    ficha,
    { acredita_hecho: { estado: 'acreditado', documento: 'Memorando.pdf' } },
  );
  const suf2 = calcularSuficiencia(conInforme, 'verde');
  comprobar('con todo lo esencial, ≥ 90 % y revisión final', suf2.porcentaje >= 90 && suf2.niveles.includes('revision_final'), suf2);
  comprobar('pero si no procede, no hay revisión final', !calcularSuficiencia(conInforme, 'rojo').niveles.includes('revision_final'));
  const borradorAU = doc('Informe técnico (v1)', '', { clase: 'informe_area_usuaria' }, { origen: 'lexia', estado: 'generado' });
  const conBorrador = evaluarRequisitos(requisitosAplicables('ampliacion_plazo', ctx('dec', 'servicios')), ctx('dec', 'servicios'), [CONTRATO, SOLICITUD, borradorAU], ficha, {});
  const au = conBorrador.find((r) => r.id === 'informe_area_usuaria');
  comprobar('el borrador de LexIA del Área Usuaria no acredita: pide la versión oficial', au?.estado === 'falta' && /versión oficialmente emitida/.test(au.declaracion ?? ''), au);

  console.log('\nLa pregunta decisiva');
  const estado = {
    actuacion: 'ampliacion_plazo' as const,
    perfil: 'dec' as Perfil,
    tipo: null,
    regimen: 'ley_32069' as const,
    ficha: {},
    respuestas: {} as Record<string, string>,
    clases: new Set<string>(),
    hechoIdentificado: false,
    hechoAcreditado: false,
    montos: [],
    hayFechaSolicitud: false,
  };
  comprobar('primero, el tipo de contrato', siguientePregunta(estado)?.id === 'tipo_contratacion');
  comprobar('después, quién originó la ampliación', siguientePregunta({ ...estado, tipo: 'servicios' })?.id === 'origen');
  comprobar('si ya está la solicitud, no se pregunta el origen', siguientePregunta({ ...estado, tipo: 'servicios', clases: new Set(['solicitud_contratista']) })?.id === 'hecho');
  comprobar('si el hecho se conoce, se pregunta si hay prueba', siguientePregunta({ ...estado, tipo: 'servicios', clases: new Set(['solicitud_contratista']), hechoIdentificado: true })?.id === 'evidencia');
  comprobar('respondido «No», no se vuelve a pedir', siguientePregunta({ ...estado, tipo: 'servicios', clases: new Set(['solicitud_contratista']), hechoIdentificado: true, respuestas: { evidencia: 'No' } }) === null);
  comprobar('régimen por determinar → fecha de convocatoria', siguientePregunta({ ...estado, tipo: 'servicios', regimen: 'por_determinar' })?.id === 'fecha_convocatoria');
  comprobar('«Adquisición de bienes para la obra…» es bienes', tipoDesdeTexto('Adquisición de bienes para la obra de la I.E.') === 'bienes');
  comprobar('«Ejecución de obras» es obra y «Consultoría de obras» consultoría', tipoDesdeTexto('Ejecución de obras') === 'obra' && tipoDesdeTexto('Consultoría de obras') === 'consultoria_obra');

  console.log('\nLectura: lo que no está en el documento se descarta');
  const lectura = depurarLectura(
    {
      clase: 'contrato',
      titulo: 'Contrato',
      fecha: '10/02/2026',
      ficha: [
        { campo: 'plazo_dias', valor: '180', cita: 'ciento ochenta (180) días calendario' },
        { campo: 'monto_original', valor: 'S/ 999,999.00', cita: 'por un monto de novecientos noventa y nueve mil' },
        { campo: 'fecha_inicio', valor: 'pronto', cita: 'se computa desde el 11 de febrero de 2026' },
      ],
      hechos: [{ hecho: 'Se convocó', fecha: '2026-01-05', cita: 'Con fecha 5 de enero de 2026 se convocó' }],
      montos: [{ concepto: 'monto', monto: 480000, cita: 'S/ 480,000.00 (cuatrocientos ochenta mil' }],
      contiene: ['contrato', 'bases', 'inventada'],
    },
    CONTRATO_SERVICIOS,
  );
  comprobar('el dato con cita real se queda', lectura.ficha.some((f) => f.campo === 'plazo_dias'));
  comprobar('el dato con cita inventada se va', !lectura.ficha.some((f) => f.campo === 'monto_original'));
  comprobar('una fecha que no es fecha se va', !lectura.ficha.some((f) => f.campo === 'fecha_inicio'));
  comprobar('la fecha del documento se normaliza', lectura.fecha === '2026-02-10');
  comprobar('«contiene» sin su propia clase ni clases inventadas', lectura.contiene.join() === 'bases');
  comprobar('se cuentan las citas descartadas', (lectura.descartadas ?? 0) >= 1);

  console.log('\nDiagnóstico: el código manda sobre el modelo');
  const caso = prepararCaso({
    perfil: 'dec',
    actuacion: 'ampliacion_plazo',
    actuacionPedida: 'ampliacion_plazo',
    pedido: 'El contratista pide ampliación por el cierre de locales.',
    documentos: [CONTRATO, SOLICITUD],
    fichaUsuario: {},
    respuestas: [{ preguntaId: 'fecha_fin_hecho', pregunta: '¿Fin del hecho?', respuesta: '2026-06-04', fecha: '' }],
    hoy: '2026-09-23',
  });
  const a = componerAnalisis(
    caso,
    {
      entendimiento: 'Caso de prueba.',
      figura: { nombre: 'Ampliación de plazo', corresponde: true, razon: 'Es una ampliación.' },
      hecho_generador: 'Cierre de locales',
      condiciones: [
        { id: 'no_imputable', estado: 'cumple', sustento: 'Lo dice la carta.', evidencia: [{ documento: 'Carta 027-2026.pdf', cita: 'una cita que no está en ningún lado del documento' }] },
        { id: 'causal', estado: 'cumple', sustento: 'Invoca el literal b).', evidencia: [{ documento: 'Carta 027-2026.pdf', cita: 'Se trata de una paralización no imputable al contratista' }] },
        { id: 'oportunidad', estado: 'no_cumple', sustento: 'El modelo se equivocó.', evidencia: [] },
      ],
      hechos: [
        { hecho: 'La Entidad cerró el Palacio Municipal', fecha: '2026-05-20', estado: 'acreditado', documento: 'Carta 027-2026.pdf', cita: 'LA ENTIDAD dispuso el cierre del Palacio Municipal y del Centro Cultural' },
        { hecho: 'El contratista presentó la solicitud de ampliación', fecha: '2026-06-15', estado: 'acreditado', documento: 'Carta 027-2026.pdf', cita: 'para solicitar una ampliación del plazo contractual de dieciséis (16) días calendario' },
      ],
      procedencia: { semaforo: 'verde', razon: 'Procede.' },
    },
    '[REGLAMENTO — artículo 142] Artículo 142. Ampliación del plazo contractual en bienes y servicios 142.3 ...',
  );
  const cond = (id: string) => a.condiciones.find((x) => x.id === id);
  comprobar('«cumple» con una cita que no existe → no acreditado', cond('no_imputable')?.estado === 'no_acreditado', cond('no_imputable'));
  comprobar('«cumple» con cita real se mantiene', cond('causal')?.estado === 'cumple');
  comprobar('la oportunidad la decide el cálculo, no el modelo', cond('oportunidad')?.estado === 'cumple' && cond('oportunidad')?.calculada === true, cond('oportunidad'));
  comprobar('lo que alega la carta del contratista queda como declarado', a.hechos.find((h) => /cerró/.test(h.hecho))?.estado === 'declarado', a.hechos);
  comprobar('que presentó la carta sí queda acreditado', a.hechos.find((h) => /presentó/.test(h.hecho))?.estado === 'acreditado');
  comprobar('con condiciones sin acreditar, el verde baja a amarillo', a.procedencia.semaforo === 'amarillo', a.procedencia);
  comprobar('la aprobación ficta no vuelve rojo el semáforo', a.procedencia.semaforo !== 'rojo');
  comprobar('la advertencia de días hábiles va a la ficha, una vez', a.advertencias.filter((x) => x.includes('días no laborables')).length === 1);
  comprobar('la DEC recibe la advertencia de que falta el informe del Área Usuaria', /Área Usuaria/.test(a.documento.advertencia ?? ''), a.documento);
  comprobar('el órgano competente es la AGA', a.competencia.organo === 'Autoridad de la gestión administrativa');

  const sinFecha = prepararCaso({
    perfil: 'dec',
    actuacion: 'ampliacion_plazo',
    actuacionPedida: 'ampliacion_plazo',
    pedido: 'Evaluar la ampliación.',
    documentos: [CONTRATO, SOLICITUD],
    fichaUsuario: {},
    respuestas: [{ preguntaId: 'evidencia', pregunta: '¿Prueba?', respuesta: 'No', fecha: '' }],
    hoy: '2026-09-23',
  });
  const base = { hecho_generador: 'Cierre de locales', procedencia: { semaforo: 'amarillo' } };
  const conDato = componerAnalisis(sinFecha, { ...base, datos: [{ id: 'fecha_fin_hecho', valor: '2026-06-04', documento: 'Carta 027-2026.pdf', cita: 'El hecho generador culminó el 4 de junio de 2026' }] }, '');
  comprobar('la fecha que dice la carta no se pregunta', conDato.pregunta?.id !== 'fecha_fin_hecho', conDato.pregunta);
  comprobar('y con ella se calcula la oportunidad', conDato.calculos.some((x) => x.concepto === 'Oportunidad de la solicitud'));
  comprobar('queda a la vista de dónde salió', conDato.datosDeLosDocumentos?.[0]?.documento === 'Carta 027-2026.pdf');
  const datoFalso = componerAnalisis(sinFecha, { ...base, datos: [{ id: 'fecha_fin_hecho', valor: '2026-06-04', documento: 'Carta 027-2026.pdf', cita: 'una fecha que la carta nunca dijo en ninguna parte' }] }, '');
  comprobar('con una cita inventada, el dato no se usa y se pregunta', datoFalso.pregunta?.id === 'fecha_fin_hecho', datoFalso.pregunta);

  const casoObra = prepararCaso({
    perfil: 'dec',
    actuacion: 'complementario',
    actuacionPedida: 'complementario',
    pedido: 'Contrato complementario de obra',
    documentos: [],
    fichaUsuario: { tipo_contratacion: { valor: 'Ejecución de obras', delUsuario: true }, fecha_convocatoria: { valor: '2026-01-05', delUsuario: true } },
    respuestas: [],
    hoy: '2026-09-23',
  });
  const aObra = componerAnalisis(casoObra, { procedencia: { semaforo: 'verde' } }, '');
  comprobar('complementario de obra: semáforo negro y alternativa', aObra.procedencia.semaforo === 'negro' && aObra.figura.alternativa === 'adicional', aObra.figura);

  console.log('\nAuditoría del documento');
  comprobar('fechas largas y cortas', fechasDe('el 4 de junio de 2026 y el 15/06/2026').map((f) => f.iso).join() === '2026-06-04,2026-06-15');
  comprobar('montos en soles', montosDe("S/ 480,000.00 y S/ 1'410,000.00.").map((m) => m.n).join() === '480000,1410000');
  const texto = `El Contrato N.° 015-2026-MDVE/GAF, suscrito con SERVICIOS GENERALES ANDINOS S.A.C. con RUC N.° 20601234567, por S/ 480,000.00. La solicitud del 15 de junio de 2026. Plazo vencido el 2 de julio de 2026.
También el Contrato N.° 099-2026-MDVE/GAF, el RUC 20999999999, S/ 12,345.00 y el 30 de febrero de 2025, al 37 %. Según el numeral 142.3 del artículo 142 del Reglamento y el artículo 999 del Reglamento.`;
  const h = await auditoriaDeterminista({
    texto,
    analisis: a,
    ficha,
    documentos: [CONTRATO, SOLICITUD],
    respuestas: [],
    pedido: '',
    perfil: 'dec',
    hoy: '2026-09-23',
    buscarEnBiblioteca: async () => true,
  });
  const tiene = (re: RegExp) => h.some((x) => re.test(x.texto));
  comprobar('marca el contrato que no es del expediente', tiene(/099-2026/));
  comprobar('no marca el contrato del expediente', !tiene(/«N\.° 015-2026/));
  comprobar('marca el RUC ajeno', tiene(/20999999999/));
  comprobar('marca el monto sin respaldo y no el del contrato', tiene(/12,345\.00/) && !tiene(/480,000\.00/));
  comprobar('marca la fecha sin respaldo y no las del caso ni las calculadas', tiene(/febrero de 2025/) && !tiene(/15 de junio/) && !tiene(/2 de julio/));
  comprobar('advierte el porcentaje sin origen', h.some((x) => x.tipo === 'economia' && x.gravedad === 'advertencia' && /37/.test(x.texto)));
  comprobar('marca el artículo que no estaba en el sustento', tiene(/999/));
  const hEspacios = await auditoriaDeterminista({
    texto: 'El Contrato N.° 0115-2024-GRA-SEDE CENTRAL-OAPF se suscribió.',
    analisis: a,
    ficha: { numero_contrato: { valor: '0115-2024-GRA-SEDE CENTRAL-OAPF' } },
    documentos: [],
    respuestas: [],
    pedido: '',
    perfil: 'contratista',
    hoy: '2026-09-23',
    buscarEnBiblioteca: async () => true,
  });
  comprobar('un número de contrato con espacios no es un error', !hEspacios.some((x) => x.tipo === 'identificacion' && x.gravedad === 'error'), hEspacios);
  const hAnterior = await auditoriaDeterminista({
    texto: 'Conforme al Reglamento de la Ley N.° 32069, aprobado por Decreto Supremo N.° 009-2025-EF.',
    analisis: { ...a, regimen: { clave: 'ley_30225', texto: 'TUO', base: '' } },
    ficha,
    documentos: [],
    respuestas: [],
    pedido: '',
    perfil: 'dec',
    hoy: '2026-09-23',
  });
  comprobar('régimen anterior: aplicar el Reglamento nuevo es un error', hAnterior.some((x) => x.tipo === 'normativa' && x.gravedad === 'error'));
  const hComp = await auditoriaDeterminista({
    texto: 'Resolución.',
    analisis: { ...a, competencia: { organo: 'Titular de la Entidad', base: 'numeral 64.3', verificar: '' } },
    ficha,
    documentos: [],
    respuestas: [],
    pedido: '',
    perfil: 'aga',
    hoy: '2026-09-23',
  });
  comprobar('la AGA no puede firmar lo que es del Titular', hComp.some((x) => x.tipo === 'competencia' && x.gravedad === 'error'));

  console.log('\nEl documento');
  comprobar('limpia las etiquetas internas y la sigla mal desarrollada', limpiarTexto('a) [cumple] La causal. La Dirección de Ejecución Contractual informa.') === 'a) La causal. La Dependencia encargada de las contrataciones informa.');
  const borrador = depurarBorrador(
    {
      asunto: 'Evaluación de la solicitud de ampliación de plazo',
      referencias: ['Carta N.° 027-2026-SGA/GG'],
      secciones: [
        { titulo: 'I. ANTECEDENTES', parrafos: ['Con fecha 15 de junio de 2026 el contratista solicitó [declarado] la ampliación.'] },
        { titulo: 'ANÁLISIS', parrafos: ['El análisis.', 'a) Uno.\nb) Dos.'] },
        { titulo: 'Vacía', parrafos: [] },
      ],
      vistos: ['El Informe N.° [●]'],
      considerandos: ['Que, ...'],
      resuelve: ['Artículo 1.- APROBAR la ampliación.', 'NOTIFICAR.'],
      pendientes: ['Número del informe'],
    },
    { tipo: 'resolucion', titulo: 'Resolución que se pronuncia sobre la ampliación de plazo', nivel: 'borrador_condicionado', version: 1 },
  );
  comprobar('quita los numerales que el modelo pone a los títulos', borrador.secciones[0].titulo === 'ANTECEDENTES');
  comprobar('descarta las secciones vacías', borrador.secciones.length === 2);
  comprobar('quita «Artículo N.-» del resuelve (lo pone el sistema)', borrador.resuelve?.[0] === 'APROBAR la ampliación.');
  const lista = piezasDeParrafos(['Intro.', 'a) Uno.', 'b) Dos.', 'c) Tres.', 'Cierre.']);
  const listas = lista.filter((x) => x.clase === 'lista') as Array<{ elementos: string[] }>;
  comprobar('los literales sueltos del modelo se juntan en una sola lista', listas.length === 1 && listas[0].elementos.length === 3, lista);
  const datos = { borrador, perfil: 'aga' as Perfil, ficha, anio: 2026 };
  const md = documentoEnMarkdown(datos);
  comprobar('la resolución lleva VISTOS, CONSIDERANDO y SE RESUELVE', /VISTOS:/.test(md) && /CONSIDERANDO:/.test(md) && /SE RESUELVE:/.test(md) && /Artículo 2\.-/.test(md));
  comprobar('el borrador condicionado lleva su nota', /BORRADOR CONDICIONADO/.test(md));
  const docx = await documentoADocx(datos);
  comprobar('el Word se compone', docx.length > 5000);
  writeFileSync('tmp/prueba-resolucion.docx', docx);
  const informeContratista = documentoEnMarkdown({ ...datos, perfil: 'contratista', borrador: { ...borrador, tipo: 'informe_diagnostico' } });
  comprobar('el documento del contratista lo firma el contratista, no la Entidad', /Servicios Generales Andinos S\.A\.C\.\**\s*$/.test(informeContratista.trim()), informeContratista.trim().slice(-160));
  const carta = await documentoADocx({ ...datos, perfil: 'contratista', borrador: { ...borrador, tipo: 'carta' } });
  writeFileSync('tmp/prueba-carta.docx', carta);
  comprobar('la carta se compone', carta.length > 5000);
  const fichaDocx = await fichaADocx({ titulo: borrador.titulo, perfil: 'dec', analisis: a, documentos: [CONTRATO, SOLICITUD], borrador, auditoria: { generadoEn: '', version: 1, hallazgos: h, bloquea: true }, ficha });
  writeFileSync('tmp/prueba-ficha.docx', fichaDocx);
  comprobar('la ficha de control se compone', fichaDocx.length > 5000);

  console.log('\nSustento');
  const falso = 'Índice Artículo 142. Ampliación ... Artículo 143. Mejoras ... texto Artículo 142. Ampliación del plazo contractual en bienes y servicios 142.1. La autoridad 105 InicioNORMAS LEGALES ACTUALIZADAS Reglamento de la Ley General de Contrataciones Públicas Reglamento de la Ley General de Contrataciones Públicas puede autorizar. Artículo 143. Modificación';
  const art = extraerArticulo(falso, 142);
  comprobar('toma el artículo del cuerpo, no del índice', art?.includes('142.1') === true, art);
  comprobar('quita la cabecera de página de Editora Perú', !art?.includes('InicioNORMAS'), art);

  console.log(fallos ? `\n❌ ${fallos} problema(s).` : '\n✅ El generador de ejecución contractual pasa todas las comprobaciones.');
  process.exit(fallos ? 1 : 0);
})();
