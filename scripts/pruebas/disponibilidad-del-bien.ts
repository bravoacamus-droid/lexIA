#!/usr/bin/env tsx
/**
 * Documento 15 de César (17/10/2026): exigir la disponibilidad o el stock
 * del bien objeto de la contratación como requisito de calificación (o de
 * admisión) está prohibido; la habilitación sectorial, no.
 *
 *   npx tsx scripts/pruebas/disponibilidad-del-bien.ts          (sin red)
 *   npx tsx scripts/pruebas/disponibilidad-del-bien.ts real     (Kimbiri)
 *
 * Sin red: casos positivos y negativos del detector, el reemplazo de lo
 * que dijo el modelo sobre el mismo requisito y la elección de a qué
 * bases aplica.
 *
 * «real»: las Bases Integradas de la LPA N° 005-2026-MDK/OC-2 (Kimbiri,
 * material de afirmado), bajadas del almacenamiento —las páginas
 * escaneadas salen de la transcripción guardada en la evaluación
 * c3d39b1c, sin transcribir nada—: el control de la evaluación de bases
 * con su literal, página, norma y precedentes de la biblioteca, y el de la
 * evaluación del requerimiento sobre su Capítulo III (una llamada al
 * modelo, la de la biblioteca).
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import { disponibilidadDelBien, TEMA_DISPONIBILIDAD } from '../../src/lib/evaluacion/bases/disponibilidad-del-bien';
import { contrataUnBien, sinLoQueCubrenLosControles } from '../../src/lib/evaluacion/bases/evaluar';
import { esBien } from '../../src/lib/evaluacion/auditoria-tdr';
import type { HallazgoBases } from '../../src/lib/evaluacion/bases/tipos';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: unknown) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`);
  if (!ok) fallos++;
}

/** Las bases de Kimbiri, tal como quedan tras aplanarlas (págs. 34-35). */
const KIMBIRI =
  '6. CONDICIONES DE CALIDAD 6.4 Procedencia, disponibilidad y trazabilidad - Sin perjuicio de la acreditación presentada en el numeral 7.1, antes de la primera entrega el contratista deberá confirmar la fuente de procedencia del material y acreditar que la autorización y/o título habilitante correspondiente se mantiene vigente. Cuando la fuente pertenezca a un tercero, deberá mantenerse vigente el documento que acredite la disponibilidad del material y el vínculo con el titular u operador autorizado. ' +
  '7. REQUISITOS DE CALIFICACIÓN 7.1 Requisitos de calificación obligatorios A. Capacidad legal Requisitos: Habilitación para la explotación y/o aprovechamiento de la cantera de donde provendrá el material, conforme a la normativa sectorial aplicable; asimismo, se deberá acreditar la disponibilidad del material para la ejecución de la prestación. Acreditación: La autorización, resolución y/o título habilitante vigente, emitido por la autoridad competente, correspondiente para la explotación y/o aprovechamiento de la cantera o fuente de procedencia del material. La disponibilidad del material se acreditará mediante documento que demuestre la propiedad, posesión u otro título jurídicamente válido que permita disponer del material durante la ejecución contractual. Cuando la autorización y/o título habilitante se encuentre a nombre de un tercero, el postor deberá acreditar adicionalmente el vínculo jurídico mediante contrato, convenio, compromiso de suministro, autorización del titular u otro documento jurídicamente válido que garantice la disponibilidad del material durante la ejecución contractual. No será suficiente, por sí sola, una declaración jurada unilateral del postor respecto de su condición de distribuidor. ' +
  'B. Experiencia del postor en la especialidad Requisitos: El postor debe acreditar un monto facturado acumulado equivalente a S/ 354,750.00 (Trecientos cincuenta y cuatro mil setecientos cincuenta con 00/100 soles), por la venta de bienes iguales o similares al objeto de la convocatoria.';

void (async () => {
  console.log('\nPositivos');
  {
    const r = disponibilidadDelBien(KIMBIRI);
    comprobar('Kimbiri: una sola observación (requisito + su acreditación)', r.length === 1, r.map((x) => x.frase.slice(0, 60)));
    const d = r[0];
    comprobar('…en requisitos de calificación, «Capacidad legal», numeral 7.1, literal A.', d?.donde === 'calificacion' && d.requisito === 'Capacidad legal' && d.numeral === '7.1' && d.literal === 'A.', d && [d.donde, d.requisito, d.numeral, d.literal]);
    comprobar('…la frase es literal y empieza en «Habilitación»', !!d && KIMBIRI.includes(d.frase) && d.frase.startsWith('Habilitación para la explotación'), d?.frase);
    // César (17/10/2026): la del tercero titular de la cantera se mantiene,
    // «a fin de dar pluralidad de postores».
    comprobar('…suprime la oración de la acreditación de la disponibilidad', d?.acreditacion.length === 1 && /propiedad, posesión/.test(d.acreditacion[0]), d?.acreditacion);
    comprobar('…y conserva la de la habilitación de un tercero', d?.seConserva.length === 1 && /a nombre de un tercero/.test(d.seConserva[0]), d?.seConserva);
    comprobar(
      '…y la redacción propuesta conserva la habilitación de la cantera',
      d?.propuesta === 'Habilitación para la explotación y/o aprovechamiento de la cantera de donde provendrá el material, conforme a la normativa sectorial aplicable.',
      d?.propuesta,
    );
    comprobar('el 6.4 (obligación del contratista en la ejecución) no se dispara', !r.some((x) => x.frase.includes('primera entrega') || x.acreditacion.some((a) => a.includes('operador autorizado'))));
  }
  {
    const t =
      '2.2.1 Documentación de presentación obligatoria 2.2.1.1 Documentos para la admisión de la oferta a) Declaración jurada de datos del postor. (Anexo Nº 1) b) Pacto de integridad (Anexo N° 2) h) Declaración jurada de disponibilidad de stock de los productos ofertados para la primera entrega. 2.2.1.2 Documentos para acreditar los requisitos de calificación Incorporar en la oferta los documentos que acreditan los “Requisitos de Calificación” que se detallan en el numeral 3.5.';
    const r = disponibilidadDelBien(t);
    comprobar('admisión: declaración jurada de disponibilidad de stock, literal h)', r.length === 1 && r[0].donde === 'admision' && r[0].literal === 'h)' && r[0].numeral === '2.2.1.1', r);
    comprobar('…se suprime la oración entera', r[0]?.propuesta === null, r[0]?.propuesta);
  }
  {
    const t =
      '3.5 REQUISITOS DE CALIFICACIÓN 3.5.1 REQUISITOS DE CALIFICACIÓN OBLIGATORIOS A. CAPACIDAD LEGAL Requisitos: Autorización sanitaria de establecimiento vigente. El postor debe contar con stock suficiente de los bienes ofertados, lo que acreditará con declaración jurada. Acreditación: Copia de la autorización sanitaria. B. EXPERIENCIA DEL POSTOR EN LA ESPECIALIDAD Requisitos: …';
    const r = disponibilidadDelBien(t);
    comprobar('estándar en mayúsculas: «contar con stock suficiente», 3.5.1, A., Capacidad legal', r.length === 1 && r[0].numeral === '3.5.1' && r[0].literal === 'A.' && r[0].requisito === 'Capacidad legal' && /stock/.test(r[0].expresion), r);
  }
  {
    const t =
      '3.6 REQUISITOS DE CALIFICACIÓN A. CAPACIDAD LEGAL Requisitos: Autorización vigente para actividades de explotación, debiendo acreditar la disponibilidad de la cantera mediante propiedad, posesión o promesa de compraventa de materiales. Acreditación: copia simple.';
    const r = disponibilidadDelBien(t);
    comprobar('«disponibilidad de la cantera» mediante propiedad o promesa de compraventa', r.length === 1 && /cantera/.test(r[0].expresion), r);
    comprobar('…redacción propuesta: queda la autorización', r[0]?.propuesta === 'Autorización vigente para actividades de explotación.', r[0]?.propuesta);
  }

  console.log('\nNegativos');
  const negativos: Array<[string, string]> = [
    [
      'disponibilidad del equipamiento estratégico',
      '3.5.2 REQUISITOS DE CALIFICACIÓN ADICIONALES C.3 EQUIPAMIENTO ESTRATÉGICO Requisitos: Dos volquetes de 15 m3. Acreditación: Copia simple de los documentos que sustenten la propiedad, la posesión, el compromiso de compraventa o alquiler, u otro documento que acredite la disponibilidad del equipamiento estratégico requerido para la ejecución del contrato.',
    ],
    [
      'disponibilidad de los equipos y vehículos (con «materiales» detrás)',
      '3.5 REQUISITOS DE CALIFICACIÓN C. EQUIPAMIENTO ESTRATÉGICO Requisitos: acreditar la disponibilidad de los equipos y vehículos para el transporte del material.',
    ],
    [
      'disponibilidad del personal clave',
      '3.5 REQUISITOS DE CALIFICACIÓN C.1 EXPERIENCIA DEL PERSONAL CLAVE Requisitos: El postor debe garantizar la disponibilidad del personal clave durante la ejecución.',
    ],
    [
      'disponibilidad presupuestal',
      '3.5 REQUISITOS DE CALIFICACIÓN A. CAPACIDAD LEGAL Requisitos: Registro sanitario. La Entidad cuenta con disponibilidad presupuestal para la contratación.',
    ],
    [
      'factor «Disponibilidad de servicios y repuestos»',
      'CAPÍTULO IV EVALUACIÓN 4.2 FACTORES DE EVALUACIÓN G. DISPONIBILIDAD DE SERVICIOS Y REPUESTOS Se evaluará en función a la cobertura de concesionarios y/o talleres con capacidad de suministro de repuestos y stock.',
    ],
    [
      'contrato de contingencia (pago por disponibilidad)',
      '3.5 REQUISITOS DE CALIFICACIÓN A. CAPACIDAD LEGAL Requisitos: habilitación. En caso de usar el pago por disponibilidad, el contratista debe mantener la rotación, stock o capacidad de respuesta de los bienes.',
    ],
    [
      'mención de los requisitos a mitad de frase (no es un rótulo)',
      'Incorporar en la oferta los documentos que acreditan los “Requisitos de Calificación” que se detallan en el numeral 3.5. 5. OBLIGACIONES DEL CONTRATISTA El contratista deberá garantizar la disponibilidad del material durante la ejecución.',
    ],
    [
      'documentos para perfeccionar el contrato (bloque cerrado por 2.3)',
      '2.2.1.1 Documentos para la admisión de la oferta a) Declaración jurada de datos del postor. 2.3. Requisitos para perfeccionar el contrato a) Garantía de fiel cumplimiento. h) Carta de compromiso de stock del producto.',
    ],
    [
      'stock de repuestos',
      '3.5 REQUISITOS DE CALIFICACIÓN A. CAPACIDAD LEGAL Requisitos: autorización. El postor debe contar con stock de repuestos para el mantenimiento.',
    ],
    [
      'disponibilidad del bien en las especificaciones (antes de los requisitos)',
      '5. ESPECIFICACIONES TÉCNICAS 5.1 Entrega El contratista asegura la disponibilidad de los bienes en el almacén de la Entidad. 6. REQUISITOS DE CALIFICACIÓN A. Capacidad legal Requisitos: Registro sanitario.',
    ],
  ];
  for (const [que, t] of negativos) {
    const r = disponibilidadDelBien(t);
    comprobar(`no se dispara: ${que}`, r.length === 0, r.map((x) => x.frase));
  }

  console.log('\nEl control reemplaza lo que dijo el modelo sobre el mismo requisito');
  {
    const r = disponibilidadDelBien(KIMBIRI);
    // Lo que dijo la revisión del Capítulo III el 17/10/2026: mezclaba la
    // habilitación de la cantera (que sí puede pedirse) con la disponibilidad.
    const delModelo = {
      id: 'capítulo-iii-2',
      titulo: 'Exigencia no prevista de habilitación de cantera y disponibilidad del material dentro del requisito de Capacidad Legal',
      enLasBases:
        'Habilitación para la explotación y/o aprovechamiento de la cantera de donde provendrá el material, conforme a la normativa sectorial aplicable; asimismo, se deberá acreditar la disponibilidad del material para la ejecución de la prestación.',
      analisis: 'Exigir la titularidad o autorización de explotación de la cantera y la acreditación documental de la disponibilidad del material…',
    } as HallazgoBases;
    const otro = { id: 'x', titulo: 'Experiencia', enLasBases: 'El postor debe acreditar un monto facturado acumulado equivalente a S/ 354,750.00', analisis: 'Monto.' } as HallazgoBases;
    const quedan = sinLoQueCubrenLosControles([delModelo, otro], r.map((d) => ({ tramo: [d.inicio, d.hasta] as [number, number], tema: TEMA_DISPONIBILIDAD })), KIMBIRI);
    comprobar('el del modelo sobre la capacidad legal se va; el de la experiencia queda', quedan.length === 1 && quedan[0].id === 'x', quedan.map((h) => h.id));
  }

  console.log('\nA qué bases y requerimientos aplica');
  comprobar('LPA para bienes (be-2): sí', contrataUnBien('be-2', ''));
  comprobar('CP de servicios (be-8): no', !contrataUnBien('be-8', 'adquisición de bienes'));
  comprobar('SIE de bienes (be-17): sí', contrataUnBien('be-17', 'SUBASTA INVERSA ELECTRÓNICA … adquisición de cemento portland tipo I'));
  comprobar('SIE de un servicio (be-17): no', !contrataUnBien('be-17', 'SUBASTA INVERSA ELECTRÓNICA … contratación del servicio de limpieza; suministro de insumos'));
  comprobar('requerimiento: EETT de afirmado → bien', esBien({ tipo_documento: 'EETT', objeto_inferido: 'Adquisición de material de afirmado' }, ''));
  comprobar('requerimiento: TDR → no', !esBien({ tipo_documento: 'TDR', objeto_inferido: 'Servicio de limpieza' }, ''));

  if (process.argv[2] === 'real') await corridaReal();

  console.log(fallos ? `\n${fallos} comprobación(es) fallaron.` : '\nTodo en orden.');
  process.exit(fallos ? 1 : 0);
})();

async function corridaReal() {
  console.log('\nKimbiri, LPA N° 005-2026-MDK/OC-2 (bases reales)');
  const { leerBases } = await import('../../src/lib/evaluacion/bases/leer');
  const { cotejarBases, identificarEstandar, prepararBases } = await import('../../src/lib/evaluacion/bases/cotejo');
  const { partirEnCapitulos } = await import('../../src/lib/evaluacion/bases/capitulos');
  const { paginasDeLasBases } = await import('../../src/lib/evaluacion/bases/ubicacion');
  const { controlDeDisponibilidadDelBien } = await import('../../src/lib/evaluacion/bases/evaluar');
  const { reforzarAuditoria } = await import('../../src/lib/evaluacion/auditoria-tdr');
  const estandares = (await import('../../src/lib/evaluacion/bases/estandar.generado.json')).default;

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: ev, error } = await sb.from('evaluations').select('bases_file_path, textos').eq('id', 'c3d39b1c-b463-4f2e-b57a-20da6c2684de').single();
  if (error) throw error;
  const fila = ev as { bases_file_path: string; textos: { bases: string } };
  const guardadas: Record<string, string> = {};
  for (const trozo of fila.textos.bases.split(/(?==== P[áa]gina \d+ ===)/)) {
    const n = Number(/=== P[áa]gina (\d+) ===/.exec(trozo)?.[1]);
    if (n) guardadas[String(n)] = trozo.replace(/=== P[áa]gina \d+ ===/, '').trim();
  }
  const l = await leerBases(sb, fila.bases_file_path, { transcribir: false, cache: { leer: async () => guardadas, guardar: async () => {} } });
  const b = prepararBases(l.texto);
  const est = identificarEstandar(b, estandares as never)[0].estandar;
  comprobar(`se identifica la LPA para bienes (${est.id})`, est.id === 'be-2', est.id);
  comprobar('se aplica el control (contrata un bien)', contrataUnBien(est.id, b.texto));
  const caps = (await import(`../../src/lib/evaluacion/bases/capitulos/${est.id}.json`)).default;
  const capitulos = partirEnCapitulos(b, cotejarBases(b, est), caps);
  const paginas = l.textoPaginas && l.textoPaginas.join('\n') === l.texto ? paginasDeLasBases(l.textoPaginas, l.folios) : undefined;
  const hs = await controlDeDisponibilidadDelBien(b, capitulos, paginas, sb, est.titulo);
  comprobar('evaluación de bases: una observación crítica', hs.length === 1 && hs[0].severidad === 'critico', hs.map((h) => h.titulo));
  const h = hs[0];
  if (h) {
    comprobar('…Capítulo III, numeral 7.1, literal A., página 33 (impresa; 35 del PDF)', h.capitulo.startsWith('CAPÍTULO III') && h.numeral === '7.1' && h.literal === 'A.' && h.pagina === '33' && h.paginaArchivo === 35, [h.capitulo, h.numeral, h.literal, h.pagina, h.paginaArchivo]);
    comprobar('…la norma: Ley art. 5, Reglamento 72 y 272.3, bases estándar', /artículo 5 de la Ley/.test(h.norma) && /72\.3/.test(h.norma) && /272\.3/.test(h.norma) && /bases estándar/.test(h.norma), h.norma);
    comprobar('…los tres precedentes están en la biblioteca', (h.fuentes ?? []).length === 3, (h.fuentes ?? []).map((f) => f.numero));
    comprobar('…pide suprimir y propone la redacción con la habilitación', /Redacción propuesta: «Habilitación para la explotación/.test(h.paraElProveedor.solicitud), h.paraElProveedor.solicitud);
    console.log('\n      Título:', h.titulo);
    console.log('      Análisis:', h.analisis);
    console.log('      Solicitud:', h.paraElProveedor.solicitud);
    console.log('      Para la Entidad:', h.paraLaEntidad);
    console.log('      Norma:', h.norma);
    console.log('      Fuentes:', (h.fuentes ?? []).map((f) => f.numero).join(' · '));
  }

  console.log('\nEvaluación del requerimiento sobre el Capítulo III de esas bases');
  const capIII = capitulos.find((c) => c.rotulo === 'CAPÍTULO III');
  const texto = l.texto.slice(l.texto.indexOf('ESPECIFICACIONES TÉCNICAS') >= 0 ? l.texto.indexOf('ESPECIFICACIONES TÉCNICAS') : 0);
  const auditada = await reforzarAuditoria(
    sb,
    capIII ? capIII.bases : texto,
    {
      tipo_documento: 'EETT',
      objeto_inferido: 'Adquisición de material de afirmado para la pavimentación de ocho sectores de Kimbiri',
      stats: { criticos: 0, altos: 1, medios: 0, bajos: 0 },
      hallazgos: [
        {
          id: 'capacidad_legal_cantera',
          categoria: 'otro',
          severidad: 'alto',
          titulo: 'Exigencia de habilitación de cantera en la capacidad legal',
          ubicacion: 'Numeral 7.1',
          extracto_literal: 'Habilitación para la explotación y/o aprovechamiento de la cantera de donde provendrá el material, conforme a la normativa sectorial aplicable',
          descripcion: 'La capacidad legal no debe incluir la cantera.',
          recomendacion: 'Retirar.',
        },
      ],
    },
  );
  const delControl = auditada.hallazgos.filter((x) => x.id.startsWith('disponibilidad_del_bien'));
  comprobar('requerimiento: una observación crítica del control', delControl.length === 1 && delControl[0].severidad === 'critico', auditada.hallazgos.map((x) => x.id));
  comprobar('…con numeral y literal en la ubicación', /7\.1/.test(delControl[0]?.ubicacion ?? '') && /literal A\./.test(delControl[0]?.ubicacion ?? ''), delControl[0]?.ubicacion);
  comprobar('…y reemplaza la del auditor que atacaba la cantera', !auditada.hallazgos.some((x) => x.id === 'capacidad_legal_cantera'), auditada.hallazgos.map((x) => x.id));
  comprobar('…con los precedentes en el fundamento', (delControl[0]?.fundamento_normativo ?? []).some((f) => /6746-2025/.test(f.norma)), delControl[0]?.fundamento_normativo);
  console.log('      Fundamento:', (delControl[0]?.fundamento_normativo ?? []).map((f) => f.norma).join(' | '));
}
