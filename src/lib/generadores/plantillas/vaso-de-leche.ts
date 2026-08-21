/**
 * Plantilla: REQUERIMIENTO — SUMINISTRO DE BIENES PARA PROGRAMA DE VASO DE LECHE
 *
 * Transcripción de "PROCEDIMIENTOS DE SELECCIÓN/1. BIENES/
 * 3. Suministro de bienes para programa de vaso de leche.docx".
 *
 * LO QUE LA DISTINGUE: es la plantilla con más norma incrustada. El
 * padrón de beneficiarios, los valores nutricionales mínimos de la
 * R.M. N° 711-2002-SA-DM, el origen nacional de los insumos que exige la
 * Ley N° 31554 y la leyenda obligatoria del envase —"PROGRAMA DEL VASO
 * DE LECHE / LEY N.° 24059 / DISTRIBUCIÓN GRATUITA / PROHIBIDA SU
 * VENTA"— no son opcionales ni redactables.
 *
 * También trae la lista cerrada de documentos sanitarios (DIGESA, plan
 * HACCP, INACAL, saneamiento ambiental) que la Entidad debe exigir de
 * manera obligatoria, con variantes según el postor sea fabricante o
 * distribuidor, y un bloque adicional cuando el objeto es leche cruda.
 */
import type { PlantillaRequerimiento } from '../plantilla-tipos';
import {
  seccionEncabezado,
  seccionFinalidadPublica,
  seccionObjetivo,
  seccionAntecedentes,
  seccionPenalidades,
  seccionControversias,
  seccionViciosOcultos,
  seccionAnticorrupcion,
  seccionSolicitante,
  PAGO_PLAZO,
  PAGO_INTERESES,
  EXPERIENCIA_TITULAR,
  VALIDACION_ADELANTO,
  VALIDACION_EXPERIENCIA,
  VALIDACION_MYPE,
} from './comunes';

/** Leyenda que debe ir impresa en el envase. No admite variación. */
const LEYENDA_ENVASE =
  'Asimismo, el envase deberá llevar impreso, como mínimo, la siguiente identificación institucional:\nNombre de la Entidad.\nLogotipo institucional.\nPROGRAMA DEL VASO DE LECHE.\nLEY N.° 24059.\nDISTRIBUCIÓN GRATUITA.\nPROHIBIDA SU VENTA.';

export const PLANTILLA_VASO_DE_LECHE: PlantillaRequerimiento = {
  id: 'ps-vaso-de-leche',
  familia: 'procedimiento_seleccion',
  objeto: 'bienes',
  encabezado: 'REQUERIMIENTO',
  subtitulo: 'SUMINISTRO DE BIENES PARA PROGRAMA DE VASO DE LECHE',
  origen:
    'PROCEDIMIENTOS DE SELECCIÓN/1. BIENES/3. Suministro de bienes para programa de vaso de leche.docx',

  validaciones: [VALIDACION_ADELANTO, VALIDACION_EXPERIENCIA, VALIDACION_MYPE],

  secciones: [
    seccionEncabezado(
      'Indicar una breve descripción del requerimiento, mediante la denominación del (los) bien(es) a ser contratado(s)',
    ),
    seccionFinalidadPublica(),
    seccionObjetivo(
      undefined,
      'Contribuir a la adecuada ejecución del Programa del Vaso de Leche mediante la entrega periódica de alimentos en los plazos establecidos por la Entidad.',
    ),
    seccionAntecedentes(
      'Explicar de manera general el motivo por el cual se efectúa el requerimiento de la contratación del bien. En caso de existir documentos fuente de la contratación, mencionarlos y adjuntarlos',
      'La presente contratación es necesaria para garantizar el abastecimiento continuo de los productos alimenticios que serán distribuidos a los beneficiarios del Programa del Vaso de Leche, evitando la interrupción de la atención alimentaria y asegurando el cumplimiento de las metas institucionales y de la normativa que regula dicho programa social.',
    ),

    {
      id: 'descripcion_general',
      titulo: 'DESCRIPCIÓN GENERAL DEL REQUERIMIENTO',
      bloques: [],
      subsecciones: [
        {
          id: 'descripcion_bienes',
          titulo: 'Descripción de los bienes a contratar',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Para determinar la cantidad, el numeral 4.1 del artículo 4 de la Ley N° 27470 exige un abastecimiento obligatorio los siete días de la semana a los niños. Excepcionalmente, mediante acuerdo del comité de administración ratificado por resolución de alcaldía, puede autorizarse la entrega de la ración alimenticia en una sola oportunidad semanal equivalente a la misma, en lugares alejados del centro de distribución.',
            },
            {
              clase: 'tabla',
              id: 'items',
              etiqueta: 'Bienes requeridos',
              instruccion:
                'Describir de manera general los bienes objeto de la contratación, indicando las cantidades requeridas y su unidad de medida',
              columnas: ['Ítem', 'Cantidad', 'Unidad de medida', 'Descripción del bien'],
              minimo: 1,
            },
            {
              clase: 'opcion',
              id: 'forma_contratacion',
              etiqueta: 'Forma de contratación',
              instruccion:
                'Completar si serán contratados por ítems, por paquetes o mediante un ítem único',
              opciones: [
                {
                  valor: 'item_unico',
                  texto: 'Los bienes antes descritos serán contratados mediante un único ítem.',
                },
                {
                  valor: 'por_items',
                  texto:
                    'Los bienes antes descritos serán contratados por ítems independientes, pudiendo los proveedores presentar oferta por uno o más ítems.',
                },
                {
                  valor: 'paquete',
                  texto:
                    'Los bienes antes descritos serán contratados por paquete único, debiendo el postor presentar oferta por la totalidad de los bienes que integran el paquete.',
                },
              ],
            },
          ],
        },
        {
          id: 'beneficiarios',
          titulo: 'Beneficiarios del Programa del Vaso de Leche',
          bloques: [
            {
              clase: 'nota',
              texto:
                'El artículo 6 de la Ley N° 27470 da cobertura a niños de 0 a 6 años, madres gestantes y en período de lactancia, priorizando a quienes se encuentren en situación de pobreza, presenten desnutrición o estén afectados por tuberculosis. En la medida en que se atienda a esa población, se mantiene la atención a niños de 7 a 13 años, ancianos y afectados por tuberculosis.',
            },
            {
              clase: 'tabla',
              id: 'beneficiarios',
              etiqueta: 'Padrón de beneficiarios',
              instruccion:
                'Consignar el número de beneficiarios indicando si son de primera o segunda prioridad',
              columnas: ['Clasificación de beneficiarios', 'Cantidad'],
              minimo: 1,
            },
            {
              clase: 'fijo',
              texto:
                'La distribución de los productos alimenticios se efectuará de acuerdo con el padrón de beneficiarios aprobado por la Entidad y conforme a las disposiciones establecidas para el Programa del Vaso de Leche.',
            },
          ],
        },
        {
          id: 'documentacion_sanitaria',
          titulo: 'Documentación para acreditar el cumplimiento de las especificaciones técnicas',
          bloques: [
            {
              // Lista cerrada y obligatoria. No es una guía: la Entidad
              // "deberá señalar los siguientes documentos de manera
              // obligatoria".
              clase: 'fijo',
              texto:
                'Copia del Registro Sanitario vigente del producto ofertado, expedido por la Dirección General de Salud Ambiental e Inocuidad Alimentaria – DIGESA, según los artículos 102 y 105 del Decreto Supremo N° 007-98-SA, que aprueba el Reglamento sobre Vigilancia y Control Sanitario de Alimentos y Bebidas y sus modificatorias.',
              fundamento: 'DS N° 007-98-SA, arts. 102 y 105',
            },
            {
              clase: 'fijo',
              texto:
                'Copia de la Resolución Directoral vigente que otorga Validación Técnica Oficial al Plan HACCP, emitida por la Dirección General de Salud Ambiental e Inocuidad Alimentaria - DIGESA, de acuerdo con lo dispuesto en la Resolución Ministerial Nº 449-2006/MINSA.',
              fundamento: 'RM N° 449-2006/MINSA',
            },
            {
              clase: 'fijo',
              texto:
                'Copia del Certificado Técnico Productivo de Planta vigente emitido por una entidad acreditada por el Instituto Nacional de Calidad - INACAL, que acredite que la empresa fabricante del producto ofertado cumple con el proceso productivo establecido en la Resolución Ministerial Nº 451-2006-MINSA. (Sólo cuando se trate de adquisición de productos a base de granos y otros destinados a Programas Sociales de Alimentación comprendidos en dicha resolución).',
              fundamento: 'RM N° 451-2006-MINSA',
            },
            {
              clase: 'fijo',
              texto:
                'Copia del certificado de saneamiento ambiental vigente (actividades de desinfección, desinsectación, desratización, limpieza y desinfección de reservorios de agua y limpieza de tanques sépticos) en correspondencia a los anexos del Decreto Supremo N° 022-2001-SA, realizada a la planta procesadora del producto, almacenes de la planta procesadora y almacenes de la empresa comercializadora del producto ofertado.',
              fundamento: 'DS N° 022-2001-SA; RM N° 449-2001-SA/DM',
            },
            {
              clase: 'fijo',
              texto:
                'En caso el postor sea fabricante, bastará que se presente el certificado de saneamiento ambiental vigente (actividades de desinfección, desinsectación, desratización y limpieza de ambientes) de la planta siempre que el almacén se encuentre ubicado dentro de la planta, y si el almacén está ubicado fuera de la planta, deberá presentar ambos certificados.',
            },
            {
              clase: 'fijo',
              texto:
                'En caso el postor sea distribuidor que almacena el producto ofertado, adicionalmente a los documentos del fabricante, deberá presentar el certificado de saneamiento ambiental vigente de su almacén (actividades de desinfección, desinsectación, desratización y limpieza de ambientes), y si es distribuidor que se limita a recoger el producto del almacén del fabricante, solo deberá presentar los documentos del fabricante.',
            },
          ],
          subsecciones: [
            {
              id: 'leche_cruda',
              titulo: 'Requisitos adicionales para leche cruda de vaca',
              condicion: 'es_leche_cruda',
              bloques: [
                {
                  clase: 'fijo',
                  texto:
                    'En caso la leche provenga de Centros de Acopio, los mismos deberán contar con la Autorización Sanitaria del Establecimiento vigente emitida por el Servicio Nacional de sanidad Agraria - SENASA, cumpliendo los requisitos establecidos en el artículo 33º del Reglamento de Inocuidad Agroalimentaria, aprobado mediante Decreto Supremo Nº 004-2011-AG.',
                  fundamento: 'DS N° 004-2011-AG, art. 33',
                },
                {
                  clase: 'fijo',
                  texto:
                    'En caso la leche provenga de ganaderos aledaños a la zona, los hatos o establos deberán contar con la Certificación vigente de Hato o Establo oficialmente Libre de Brucelosis o Tuberculosis Bovina (Certificación de condición sanitaria) emitido por el Servicio Nacional de sanidad Agraria - SENASA, de conformidad con el Reglamento para el Control y Erradicación de la Tuberculosis Bovina aprobado por el Decreto Supremo Nº 031-2000-AG y el Reglamento para el Control y Erradicación de la Brucelosis Bovina aprobado por el Decreto Supremo Nº 033-2000-AG.',
                  fundamento: 'DS N° 031-2000-AG; DS N° 033-2000-AG',
                },
              ],
            },
          ],
        },
      ],
    },

    {
      id: 'caracteristicas',
      titulo: 'CARACTERÍSTICAS Y CONDICIONES DE LOS BIENES A CONTRATAR',
      bloques: [],
      subsecciones: [
        {
          id: 'caracteristicas_tecnicas',
          titulo: 'Características técnicas del bien',
          bloques: [
            {
              clase: 'nota',
              texto:
                'La procedencia del producto, el contenido de la ración, la frecuencia de suministro y el valor nutricional deben cumplir el numeral 4.1 del artículo 4 de la Ley N° 27470. El comité de administración del programa es el responsable de seleccionar los insumos alimenticios; las representantes de las organizaciones de base alcanzan sus propuestas previa consulta a las beneficiarias.',
            },
            {
              clase: 'nota',
              texto:
                'Los valores nutricionales mínimos de la ración diaria se rigen por la Resolución Ministerial N° 711-2002-SA-DM: proteína 12-15%, grasa 20-25%, carbohidratos 60-68% y un mínimo de 207 Kcal de energía. Las condiciones y requisitos sanitarios de los alimentos a base de granos destinados a programas sociales se rigen por la Resolución Ministerial N° 451-2006-MINSA, incluidos los criterios microbiológicos y físico-químicos del artículo 10 y las prohibiciones específicas del artículo 12.',
            },
            {
              clase: 'tabla',
              id: 'distribucion_energetica',
              etiqueta: 'Distribución energética diaria por ración',
              instruccion: 'La ración puede estar compuesta por un solo producto',
              columnas: [
                'PRODUCTOS',
                'Cantidad (g)',
                'Proteína (g)',
                'Grasa (g)',
                'Carbohidratos (g)',
                'Energía (Kcal)',
              ],
              minimo: 1,
            },
            {
              clase: 'redactado',
              id: 'caracteristicas_tecnicas',
              etiqueta: 'Especificaciones técnicas del producto',
              instruccion:
                'Incluir las especificaciones técnicas conforme a la normativa aplicable al suministro de productos alimenticios para el Programa del Vaso de Leche, considerando el principio de valor por dinero. En esta sección solo se incluyen las características del bien',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'insumos_nacionales',
          titulo: 'Insumos de origen nacional',
          bloques: [
            {
              clase: 'nota',
              texto:
                'La procedencia de origen del insumo debe ser concordante con el artículo 4 de la Ley N° 31554, modificación del numeral 4.1 del artículo 4 de la Ley N° 27470.',
            },
            {
              clase: 'redactado',
              id: 'insumos_nacionales',
              etiqueta: 'Origen nacional de los insumos',
              instruccion:
                'Precisar qué insumos deben ser de origen nacional y cómo se garantiza su procedencia',
              ejemplo:
                'Los insumos que conforman el producto Hojuelas de avena, quinua y sorgo precocidas fortificadas con vitaminas y minerales, presentación en bolsa de 500 g, deberán ser de origen nacional, de conformidad con lo dispuesto en el numeral 4.1 del artículo 4 de la Ley N.° 27470, modificado por la Ley N.° 31554.\n\nEl contratista deberá garantizar que los insumos utilizados en la elaboración del producto provengan de la producción nacional, sin perjuicio del cumplimiento de las especificaciones técnicas, requisitos sanitarios y valores nutricionales establecidos en la normativa aplicable al Programa del Vaso de Leche.',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'vida_util',
          titulo: 'Vida útil del producto',
          bloques: [
            {
              clase: 'redactado',
              id: 'vida_util',
              etiqueta: 'Vida útil exigida',
              instruccion:
                'Precisar la vida útil mínima del producto, calculada a partir de la fecha de entrega y en función de sus características, y cómo se verificará',
              ejemplo:
                'El producto Hojuelas de avena, quinua y sorgo precocidas fortificadas con vitaminas y minerales, presentación en bolsa de 500 g, deberá contar con una vida útil mínima de nueve (9) meses, computada a partir de la fecha de entrega en el almacén de la Entidad, considerando las características propias del producto.\n\nLa Entidad verificará el cumplimiento de este requisito mediante la revisión de la fecha de producción y la fecha de vencimiento consignadas en el rotulado del producto al momento de la entrega.',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'envase_embalaje',
          titulo: 'Envase, embalaje y rotulado',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Para las disposiciones referentes al envase y rotulado se deberá tener en cuenta lo establecido en el Decreto Supremo N° 007-98-SA, la Resolución Ministerial N° 451-2006-MINSA y demás normas pertinentes.',
            },
          ],
          subsecciones: [
            {
              id: 'envase',
              titulo: 'Envase',
              bloques: [
                {
                  clase: 'tabla',
                  id: 'envase',
                  etiqueta: 'Características del envase',
                  instruccion:
                    'Precisar peso neto, tipo, material, sistema de cerrado y otras características del envase',
                  columnas: ['Aspecto a precisar', 'Descripción'],
                  minimo: 1,
                },
                {
                  clase: 'nota',
                  texto:
                    'El peso neto, el tipo y material del envase, así como el sistema de cerrado, deberán corresponder a la información autorizada en el Registro Sanitario del producto, estar debidamente sustentados y no restringir la libre concurrencia de proveedores.',
                },
              ],
            },
            {
              id: 'embalaje',
              titulo: 'Embalaje',
              condicion: 'requiere_embalaje',
              bloques: [
                {
                  clase: 'tabla',
                  id: 'embalaje',
                  etiqueta: 'Características del embalaje',
                  instruccion:
                    'Precisar si requiere embalaje, unidades por embalaje, tipo, material, sistema de cerrado y otras características',
                  columnas: ['Aspecto a precisar', 'Descripción'],
                  minimo: 1,
                },
                {
                  clase: 'nota',
                  texto:
                    'Las características del embalaje deberán ser las estrictamente necesarias para garantizar la protección, conservación e inocuidad del producto. El diseño y material deberán ser inocuos y aptos para uso alimentario, cuando corresponda.',
                },
              ],
            },
            {
              id: 'rotulado',
              titulo: 'Rotulado',
              bloques: [
                {
                  clase: 'redactado',
                  id: 'rotulado',
                  etiqueta: 'Información del rotulado',
                  instruccion:
                    'Señalar el tipo de rotulado y la información que debe contener: características del producto, elaboración, manipulación, conservación, propiedades, contenido, fecha de expiración y limitaciones a su comercialización',
                  ejemplo:
                    'Nombre del producto.\nRelación de ingredientes.\nContenido neto.\nNombre o razón social y dirección del fabricante.\nNúmero de Registro Sanitario.\nNúmero de lote.\nFecha de producción y fecha de vencimiento.\nCondiciones de conservación.\nInformación nutricional.\nInstrucciones de preparación.\nPaís de origen, cuando corresponda.',
                  extension: 'lista',
                },
                {
                  // Leyenda obligatoria del programa. Va como texto fijo
                  // porque su omisión invalida el rotulado.
                  clase: 'fijo',
                  texto: LEYENDA_ENVASE,
                  fundamento: 'Ley N° 24059 — identificación obligatoria del Programa',
                },
              ],
            },
          ],
        },
        {
          id: 'transporte',
          titulo: 'Transporte',
          condicion: 'incluye_transporte',
          bloques: [
            {
              clase: 'redactado',
              id: 'transporte',
              etiqueta: 'Condiciones de transporte',
              instruccion:
                'Señalar el medio de transporte, las características mínimas de los vehículos, el personal mínimo para carga y descarga, y las medidas que aseguren la entrega en las condiciones requeridas',
              ejemplo:
                'El transporte de los productos del Programa del Vaso de Leche estará a cargo del contratista, quien deberá garantizar que los bienes sean trasladados hasta el almacén de la Entidad en condiciones que preserven su calidad e inocuidad.\n\nLos productos deberán transportarse en vehículos autorizados para el traslado de alimentos, limpios, cerrados y en buen estado de conservación, evitando la exposición a humedad, polvo, contaminación o cualquier otra condición que pueda afectar el producto.\n\nEl vehículo deberá contar con la documentación necesaria para su circulación y cumplir con las disposiciones sanitarias aplicables al transporte de alimentos. Las labores de carga y descarga serán responsabilidad del contratista y no deberán generar costo adicional para la Entidad.',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'garantia_comercial',
          titulo: 'Garantía comercial',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'La garantía comercial comprende el reemplazo de los productos que, con posterioridad a la conformidad de la entrega, presenten defectos de fabricación, alteraciones en su composición, contaminación, envases deteriorados o con pérdida de hermeticidad, rotulado incorrecto, vencimiento anticipado o cualquier otra condición que los haga no aptos para el consumo humano, siempre que dichas situaciones no sean atribuibles a un almacenamiento o manipulación inadecuados por parte de la Entidad.',
              fundamento: 'Plantilla — alcance de la garantía',
            },
            {
              clase: 'fijo',
              texto:
                'Para la atención de la garantía, el contratista deberá contar con una línea telefónica fija o móvil para las coordinaciones que correspondan, cuyo horario de atención debe ser de lunes a viernes de 8:30 - 18:00 horas.',
            },
            {
              clase: 'fijo',
              texto:
                'El plazo máximo para la entrega de los bienes a reemplazar, serán dentro de cinco (5) días calendario computados a partir del día siguiente de la notificación al contratista. La notificación será efectuada por el comprador público a través de correo electrónico que fue autorizado por el contratista.',
            },
            {
              clase: 'fijo',
              texto:
                'Los bienes para remplazar deben ser nuevos y debe tener las mismas características del bien contratado. Todos los gastos deberán ser cubiertos por el contratista.',
            },
            {
              clase: 'fijo',
              texto:
                'La garantía comercial del producto se extenderá hasta la fecha de vencimiento consignada en el envase, siempre que el producto haya sido almacenado conforme a las condiciones establecidas por el fabricante.',
            },
          ],
        },
        {
          id: 'muestras',
          titulo: 'Muestras',
          condicion: 'requiere_muestras',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Si, como resultado de la estrategia de contratación, se concluye que la presentación de muestras genera costos innecesarios o restringe la competencia, no deberá exigirse su presentación, en observancia de los principios de Competencia y Libertad de Concurrencia.',
            },
            {
              clase: 'redactado',
              id: 'muestras',
              etiqueta: 'Condiciones de las muestras',
              instruccion:
                'Precisar como mínimo: las características o requisitos funcionales objeto de verificación; la metodología y pruebas objetivas de evaluación; el número de muestras por producto; el órgano responsable de su evaluación; y el lugar, dirección, fecha y horario de presentación',
              ejemplo:
                'Los postores deberán presentar una (1) muestra del producto, conjuntamente con la presentación de su oferta.\n\nLa muestra tendrá por finalidad verificar únicamente el tipo y presentación del envase, el rotulado conforme a la normativa vigente y el peso neto declarado.\n\nLa evaluación se realizará mediante verificación documental y medición objetiva del peso, así como la revisión del rotulado conforme al Decreto Supremo N.° 007-98-SA y la Resolución Ministerial N.° 451-2006/MINSA, sin recurrir a pruebas organolépticas. Estará a cargo del Comité, con el apoyo del área usuaria, de corresponder.',
              extension: 'varios_parrafos',
            },
          ],
        },
      ],
    },

    {
      id: 'condiciones_contratacion',
      titulo: 'CONDICIONES DE CONTRATACIÓN',
      bloques: [],
      subsecciones: [
        {
          id: 'modalidad_pago',
          titulo: 'Modalidad de pago',
          bloques: [
            {
              clase: 'opcion',
              id: 'modalidad_pago',
              etiqueta: 'Modalidad de pago',
              instruccion:
                'Precisar el sistema de contratación que corresponda, de conformidad con el artículo 130 del Reglamento',
              opciones: [
                {
                  valor: 'suma_alzada',
                  texto:
                    'El contrato se rige por la modalidad de pago de Suma Alzada, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando las cantidades, magnitudes y calidades de la prestación están definidas en el requerimiento.',
                },
                {
                  valor: 'precios_unitarios',
                  texto:
                    'El contrato se rige por la modalidad de pago de Precios Unitarios, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando no puede conocerse con exactitud o precisión las cantidades o magnitudes requeridas.',
                },
              ],
            },
            {
              clase: 'nota',
              texto:
                'En caso la convocatoria se refiera a un contrato de contingencia conforme al artículo 284 del Reglamento, debe considerarse una de las modalidades de pago establecidas en el artículo 286, de acuerdo con la estrategia de contratación.',
            },
          ],
        },
        {
          id: 'plazo_entrega',
          titulo: 'Plazo de entrega',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'Los bienes materia de la presente convocatoria se suministran por un plazo de {{plazo_suministro}}, conforme al siguiente cronograma de entrega:',
              campos: [
                {
                  clase: 'campo',
                  id: 'plazo_suministro',
                  etiqueta: 'Plazo de suministro',
                  ayuda: 'Indicar plazo de suministro',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'tabla',
              id: 'cronograma_entregas',
              etiqueta: 'Cronograma de entregas',
              instruccion: 'Consignar el cronograma con la periodicidad de las entregas',
              columnas: ['N° de Entrega', 'Plazo de la entrega', 'Cantidad', 'Unidad de medida'],
              minimo: 1,
            },
          ],
        },
        {
          id: 'lugar_entrega',
          titulo: 'Lugar de entrega de los bienes',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'Los bienes materia de la presente convocatoria se entregan en el almacén de la entidad, ubicada en {{lugar_entrega}}, salvo días feriados. previa coordinación con el responsable de almacén.',
              campos: [
                {
                  clase: 'campo',
                  id: 'lugar_entrega',
                  etiqueta: 'Lugar de entrega',
                  ayuda:
                    'Consignar la dirección exacta donde será entregado el bien considerando distrito, provincia, departamento y horario de atención',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
          ],
        },
        {
          id: 'entregables',
          titulo: 'Entregable',
          condicion: 'tiene_entregables',
          bloques: [
            {
              clase: 'tabla',
              id: 'entregables',
              etiqueta: 'Entregables',
              instruccion:
                'Señalar los documentos que el contratista debe entregar, la oportunidad y/o plazo de entrega y el medio de entrega',
              columnas: ['N°', 'Entregable', 'Plazo', 'Contenido'],
              minimo: 1,
            },
          ],
        },
        {
          id: 'adelanto_directo',
          titulo: 'Adelanto directo',
          condicion: 'otorga_adelanto',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Aplica únicamente cuando corresponda otorgar adelantos directos y así se haya previsto y sustentado en la estrategia de contratación, conforme al artículo 137 del Reglamento. En caso contrario, consignar "NO APLICA".',
            },
            {
              clase: 'parrafo',
              texto:
                'La entidad contratante otorgará {{adelanto_cantidad}} adelantos directos por el {{adelanto_porcentaje}} del monto del contrato original.',
              campos: [
                {
                  clase: 'campo',
                  id: 'adelanto_cantidad',
                  etiqueta: 'Número de adelantos',
                  ayuda: 'Consignar número de adelantos a otorgarse',
                  tipo: 'numero',
                  obligatorio: true,
                },
                {
                  clase: 'campo',
                  id: 'adelanto_porcentaje',
                  etiqueta: 'Porcentaje de adelanto directo',
                  ayuda:
                    'Consignar porcentaje, considerando que los adelantos directos no pueden exceder en conjunto del 30% del monto del contrato original',
                  tipo: 'numero',
                  obligatorio: true,
                  validacion: 'adelanto_directo_max',
                },
              ],
            },
            {
              clase: 'parrafo',
              texto:
                'El contratista debe solicitar los adelantos dentro de los {{adelanto_plazo_solicitud}} días siguientes de perfeccionamiento del contrato, adjuntando a su solicitud la garantía por adelantos acompañada del comprobante de pago correspondiente. Vencido dicho plazo no procede la solicitud del adelanto.',
              campos: [
                {
                  clase: 'campo',
                  id: 'adelanto_plazo_solicitud',
                  etiqueta: 'Plazo para solicitar el adelanto',
                  ayuda: 'Consignar plazo en días',
                  tipo: 'dias',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'parrafo',
              texto:
                'La Entidad otorgará el adelanto dentro de los {{adelanto_plazo_entrega}} días calendario siguientes a la presentación de la solicitud, siempre que esta cumpla con los requisitos establecidos en el contrato y en la normativa vigente.',
              campos: [
                {
                  clase: 'campo',
                  id: 'adelanto_plazo_entrega',
                  etiqueta: 'Plazo para entregar el adelanto',
                  ayuda: 'Consignar plazo en días calendario',
                  tipo: 'dias',
                  obligatorio: true,
                },
              ],
            },
          ],
        },

        seccionPenalidades('larga'),
        seccionControversias(true),

        {
          id: 'plazo_respuestas',
          titulo: 'Plazo para respuestas entre las partes',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'Los plazos para la respuesta de las partes sobre aspectos vinculados con la ejecución contractual que no han sido específicamente previstos en el reglamento, aplica el plazo máximo de respuesta establecido en el cuadro siguiente:',
            },
            {
              clase: 'campo',
              id: 'plazo_respuesta',
              etiqueta: 'Plazo máximo de respuesta',
              ayuda: 'Consignar el plazo en días calendario',
              tipo: 'dias',
              obligatorio: true,
            },
            {
              clase: 'fijo',
              texto:
                'Antes del vencimiento de dicho plazo, las partes pueden acordar su prórroga para cada caso específico considerando la cláusula de notificaciones del contrato.',
            },
          ],
        },
      ],
    },

    {
      id: 'otras_consideraciones',
      titulo: 'OTRAS CONSIDERACIONES PARA LA EJECUCIÓN DE LA PRESTACIÓN',
      bloques: [],
      subsecciones: [
        {
          id: 'recursos_entidad',
          titulo: 'Recursos u obligaciones a ser provistos por la entidad',
          condicion: 'entidad_provee_recursos',
          bloques: [
            {
              clase: 'redactado',
              id: 'recursos_entidad',
              etiqueta: 'Recursos provistos por la Entidad',
              instruccion:
                'Listar los recursos y facilidades que la entidad debe brindar al proveedor para que pueda ejecutar de manera eficiente, segura y oportuna el contrato',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'conformidad',
          titulo: 'Conformidad de la entrega de los bienes',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'El {{area_conformidad}} en calidad de área usuaria es el competente para emitir la conformidad. Donde, en caso corresponda deberá señalar los días de retraso injustificado u otras penalidades que incurrió el contratista, para efectos que la Dependencia Encargada de Contrataciones (DEC) proceda con la determinación el importe a penalizar.',
              campos: [
                {
                  clase: 'campo',
                  id: 'area_conformidad',
                  etiqueta: 'Área usuaria que otorga la conformidad',
                  ayuda: 'Consignar el área usuaria',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'parrafo',
              texto:
                'La conformidad se emite en un plazo máximo de siete (7) días calendario contabilizados desde el día siguiente de recibido {{objeto_conformidad}}',
              campos: [
                {
                  clase: 'campo',
                  id: 'objeto_conformidad',
                  etiqueta: 'Qué se recibe',
                  ayuda:
                    'Consignar el entregable, o el/los bien/es que fue materia de contratación, completar según corresponda',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'redactado',
              id: 'conformidad_accesorias',
              etiqueta: 'Conformidad de las prestaciones accesorias',
              instruccion:
                'Señalar quién otorga la conformidad de cada prestación accesoria, qué se verifica y en qué plazo, cuando corresponda',
              extension: 'parrafo',
              // El formato lo pide "cuando corresponda": sin prestaciones
              // accesorias no hay conformidad accesoria que regular.
              visibleSi: { condicion: 'tiene_prestaciones_accesorias' },
            },
          ],
        },
        {
          id: 'verificaciones',
          titulo: 'Verificaciones técnicas, pruebas o ensayos para la conformidad del bien',
          condicion: 'requiere_ensayos',
          bloques: [
            {
              clase: 'redactado',
              id: 'verificaciones',
              etiqueta: 'Pruebas y ensayos',
              instruccion:
                'Indicar la relación de pruebas o ensayos requeridos, la cantidad de muestras a ensayar, los parámetros de aceptación, quién realizará las pruebas, quién asumirá el gasto y con qué periodicidad. Precisar si se admite muestra dirimente',
              ejemplo:
                'Las verificaciones comprenderán, como mínimo, la inspección física del producto, envase, embalaje y rotulado; la verificación de la vigencia del Registro Sanitario, fecha de producción, fecha de vencimiento y número de lote; y la toma de una (1) muestra representativa por lote entregado.\n\nLos ensayos serán realizados por un laboratorio acreditado o autorizado y el costo será asumido por el contratista. En caso de que los resultados no sean conformes, la Entidad podrá solicitar el análisis de una muestra dirimente, cuyos resultados serán definitivos.\n\nEn cada entrega, el contratista deberá presentar el Certificado de Calidad o Certificado de Conformidad del lote entregado.',
              extension: 'varios_parrafos',
            },
            {
              clase: 'tabla',
              id: 'ensayos',
              etiqueta: 'Ensayos y parámetros de aceptación',
              columnas: ['Ensayo o verificación', 'Parámetro de aceptación'],
              minimo: 1,
            },
          ],
        },
        {
          id: 'forma_pago',
          titulo: 'Forma y requisitos de pago',
          bloques: [
            { clase: 'fijo', texto: 'El pago se realiza de conformidad con lo establecido en el artículo 67 de la Ley.' },
            { clase: 'fijo', texto: PAGO_PLAZO, fundamento: 'Plantilla — forma de pago' },
            {
              // Esta plantilla redacta la presentación de documentos de
              // otra manera que el resto: enumera qué documentos emite
              // la Entidad. Por eso no reutiliza bloquesPago().
              clase: 'parrafo',
              texto:
                'Salvo los documentos que emite la entidad contratante, tales como los documentos de recepción y verificación, así como la conformidad, el contratista deberá presentar la documentación restante en {{lugar_presentacion}}, sito en {{direccion_presentacion}}',
              campos: [
                {
                  clase: 'campo',
                  id: 'lugar_presentacion',
                  etiqueta: 'Dependencia donde se presenta la documentación',
                  ayuda:
                    'Consignar mesa de partes o la dependencia específica de la entidad contratante donde se debe presentar la documentación',
                  tipo: 'texto',
                  obligatorio: true,
                },
                {
                  clase: 'campo',
                  id: 'direccion_presentacion',
                  etiqueta: 'Dirección',
                  ayuda: 'Consignar la dirección exacta',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            { clase: 'fijo', texto: PAGO_INTERESES, fundamento: 'Ley N° 32069, art. 67.5' },
          ],
        },

        seccionViciosOcultos(),
        seccionAnticorrupcion(true),

        {
          id: 'anexos_tecnicos',
          titulo: 'Anexos técnicos',
          condicion: 'tiene_anexos',
          bloques: [
            {
              clase: 'redactado',
              id: 'anexos_tecnicos',
              etiqueta: 'Anexos técnicos',
              instruccion: 'Indicar la relación de los anexos que se adjuntan al requerimiento',
              extension: 'lista',
            },
          ],
        },
      ],
    },

    {
      id: 'requisitos_contratista',
      titulo: 'REQUISITOS Y RECURSOS PROVISTOS POR EL CONTRATISTA',
      bloques: [],
      subsecciones: [
        {
          id: 'requisitos_proveedor',
          titulo: 'Requisitos del proveedor',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'Contar con RUC activo y habido en la SUNAT.\nRealizar actividades en el objeto de la contratación.\nPersona natural y/o jurídica.\nNo debe tener impedimentos para contratar con el Estado.',
              fundamento: 'Plantilla — requisitos del proveedor',
            },
          ],
        },
        {
          id: 'recursos_contratista',
          titulo: 'Recursos u obligaciones del contratista',
          bloques: [
            {
              clase: 'redactado',
              id: 'recursos_contratista',
              etiqueta: 'Recursos y obligaciones del contratista',
              instruccion:
                'Precisar los recursos, medios, equipos, materiales, personal, licencias, autorizaciones o permisos que el contratista deberá proporcionar, así como sus responsabilidades durante la ejecución contractual',
              ejemplo:
                'Entregar los productos en las cantidades, lugares, fechas y horarios establecidos por la Entidad.\nGarantizar que los productos cumplan con las especificaciones técnicas, requisitos sanitarios, condiciones de inocuidad y vida útil exigidos en el requerimiento.\nUtilizar vehículos adecuados para el transporte de alimentos, asegurando que los productos se conserven en óptimas condiciones hasta su entrega.\nAsumir los costos de transporte, carga, descarga y cualquier otro gasto necesario para la entrega de los bienes.\nReemplazar, sin costo adicional para la Entidad, los productos que presenten defectos, deterioro o incumplimiento de las especificaciones técnicas.\nCumplir con la normativa sanitaria y demás disposiciones legales aplicables durante la ejecución contractual.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'verificacion_calidad',
          titulo: 'Documentación para la verificación de la calidad del producto',
          condicion: 'requiere_certificados',
          bloques: [
            {
              clase: 'redactado',
              id: 'verificacion_calidad',
              etiqueta: 'Certificados exigidos en cada entrega',
              instruccion:
                'Indicar los certificados que el contratista debe presentar en cada entrega (certificado de conformidad o calidad, certificado de inspección, informe de ensayo)',
              extension: 'parrafo',
            },
          ],
        },
      ],
    },

    {
      id: 'requisitos_calificacion',
      titulo: 'REQUISITOS DE CALIFICACIÓN',
      bloques: [
        {
          clase: 'nota',
          texto:
            'Consignar uno o más de los requisitos siguientes, en caso así haya sido sustentado en la estrategia de contratación',
        },
        {
          clase: 'fijo',
          texto:
            'Para determinar que los postores cuentan con las capacidades necesarias para ejecutar el contrato, los evaluadores incorporan obligatoriamente los siguientes requisitos de calificación.',
        },
      ],
      subsecciones: [
        {
          id: 'experiencia_postor',
          titulo: 'Experiencia del postor en la especialidad',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'El postor debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto}}, por la venta de bienes iguales o similares al objeto de la convocatoria, durante los diez años anteriores a la fecha de la presentación de ofertas, que se computan desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto',
                  etiqueta: 'Monto facturado acumulado exigido',
                  ayuda:
                    'Consignar el monto de facturación expresado en números y letras en la moneda de la convocatoria, monto que no puede ser mayor a tres veces la cuantía de la contratación o del ítem',
                  tipo: 'moneda',
                  obligatorio: true,
                  validacion: 'experiencia_max',
                },
              ],
            },
            {
              clase: 'parrafo',
              texto: 'Se consideran bienes similares a los siguientes {{bienes_similares}}',
              campos: [
                {
                  clase: 'campo',
                  id: 'bienes_similares',
                  etiqueta: 'Bienes similares',
                  ayuda: 'Consignar los bienes similares al objeto convocado',
                  tipo: 'texto_largo',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'fijo',
              texto:
                'La experiencia del postor en la especialidad se acredita con un máximo de veinte contrataciones mediante copia simple de: (i) contratos u órdenes de compra, y su respectiva conformidad o constancia de prestación; o (ii) comprobantes de pago cuya cancelación se acredite documental y fehacientemente, con constancia de depósito, nota de abono, reporte de estado de cuenta, cualquier otro documento emitido por entidad del sistema financiero que acredite el abono o mediante cancelación en el mismo comprobante de pago, o comprobante de retención electrónico emitido por SUNAT por la retención del IGV. En caso el postor sustente su experiencia en la especialidad mediante contrataciones realizadas con privados, para acreditarla debe presentar de forma obligatoria lo indicado en el numeral (ii) del presente párrafo; no es posible que acredite su experiencia únicamente con la presentación de contratos u órdenes de compra con conformidad o constancia de prestación.',
              fundamento: 'Plantilla — acreditación de experiencia, texto invariable',
            },
            {
              clase: 'fijo',
              texto:
                'En caso los postores presenten varios comprobantes de pago para acreditar una sola contratación, se debe acreditar que corresponden a dicha contratación; de lo contrario, se asumirá que los comprobantes acreditan contrataciones independientes, en cuyo caso solo se considerará, para la evaluación, las veinte primeras contrataciones indicadas en el Anexo Nº 11 referido a la Experiencia del Postor en la Especialidad.',
            },
            {
              clase: 'fijo',
              texto:
                'En el caso de suministro, solo se considera como experiencia la parte del contrato que haya sido ejecutada durante los diez años anteriores a la fecha de presentación de ofertas, debiendo adjuntarse copia de las conformidades correspondientes a tal parte o los respectivos comprobantes de pago cancelados.',
            },
            { clase: 'fijo', texto: EXPERIENCIA_TITULAR },
            {
              clase: 'fijo',
              texto:
                'Si el postor acredita experiencia de otra persona jurídica como consecuencia de una reorganización societaria, debe presentar adicionalmente el Anexo N° 13.',
            },
            {
              clase: 'fijo',
              texto:
                'Las personas jurídicas resultantes de un proceso de reorganización societaria no pueden acreditar como experiencia del postor en la especialidad aquella que le hubieran transmitido como parte de dicha reorganización las personas jurídicas sancionadas con inhabilitación vigente o definitiva.',
            },
            {
              clase: 'fijo',
              texto:
                'Cuando en los contratos, órdenes de compra o comprobantes de pago el monto facturado se encuentre expresado en moneda extranjera, debe indicarse el tipo de cambio venta publicado por la Superintendencia de Banca, Seguros y AFP correspondiente a la fecha de suscripción del contrato, de emisión de la orden de compra o de cancelación del comprobante de pago, según corresponda.',
            },
            {
              clase: 'fijo',
              texto:
                'Sin perjuicio de lo anterior, los postores deben llenar y presentar el Anexo Nº 11 referido a la Experiencia del Postor en la Especialidad.',
            },
          ],
          subsecciones: [
          {
            id: 'experiencia_mype',
            titulo: 'Régimen para micro y pequeña empresa',
            condicion: 'aplica_mype',
            bloques: [
              {
                clase: 'nota',
                texto:
                  'Este texto se incluye en procedimientos de selección por relación de ítems, cuando la cuantía de la contratación de algún ítem corresponda al monto de una Licitación Pública abreviada de bienes.',
              },
              {
                clase: 'parrafo',
                texto:
                  'En el caso de postores que declaren en el Anexo N° 1 tener la condición de micro y pequeña empresa, se acredita una experiencia de {{experiencia_monto_mype}}, por la venta de bienes iguales o similares al objeto de la convocatoria, durante los diez años anteriores a la fecha de la presentación de ofertas que se computarán desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda. En el caso de consorcios, todos los integrantes deben contar con la condición de micro y pequeña empresa.',
                campos: [
                  {
                    clase: 'campo',
                    id: 'experiencia_monto_mype',
                    etiqueta: 'Monto exigido a micro y pequeña empresa',
                    ayuda:
                      'Consignar el monto de facturación expresado en números y letras en la moneda de la convocatoria, monto que no debe superar el 25% de la cuantía de la contratación del ítem',
                    tipo: 'moneda',
                    obligatorio: true,
                    validacion: 'experiencia_mype',
                  },
                ],
              },
            ],
          },
          ],
        },
        {
          id: 'consorcio',
          titulo: 'Participación en consorcio',
          condicion: 'exige_consorcio',
          bloques: [
            {
              clase: 'parrafo',
              texto: 'El número máximo de consorciados es de {{consorcio_max}}.',
              campos: [
                {
                  clase: 'campo',
                  id: 'consorcio_max',
                  etiqueta: 'Número máximo de consorciados',
                  ayuda:
                    'Consignar el número máximo de integrantes del consorcio en función a la naturaleza de la prestación',
                  tipo: 'numero',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'parrafo',
              texto: 'El porcentaje mínimo de participación de cada consorciado es de {{consorcio_pct}}.',
              campos: [
                {
                  clase: 'campo',
                  id: 'consorcio_pct',
                  etiqueta: 'Participación mínima por consorciado',
                  ayuda: 'Consignar el porcentaje mínimo de participación de cada integrante del consorcio',
                  tipo: 'numero',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'parrafo',
              texto:
                'El porcentaje mínimo de participación en la ejecución del contrato, para el integrante del consorcio que acredite mayor experiencia, es de {{consorcio_pct_experiencia}}.',
              campos: [
                {
                  clase: 'campo',
                  id: 'consorcio_pct_experiencia',
                  etiqueta: 'Participación mínima del consorciado con mayor experiencia',
                  ayuda:
                    'Consignar el porcentaje mínimo de participación en las obligaciones del integrante del consorcio que acredite la mayor experiencia',
                  tipo: 'numero',
                  obligatorio: true,
                },
              ],
            },
            { clase: 'fijo', texto: 'Se acredita con la promesa de consorcio.' },
          ],
        },
      ],
    },

    seccionSolicitante(),
  ],
};
