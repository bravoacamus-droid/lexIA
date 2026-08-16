/**
 * Plantilla: REQUERIMIENTO — SERVICIOS - COMPARACIÓN DE PRECIOS
 *
 * Transcripción de "PROCEDIMIENTOS DE SELECCIÓN/2. SERVICIOS/
 * 4. Servicios compración de precios.docx" (la errata del nombre es del
 * original).
 *
 * DOS RASGOS QUE CONVIENE NO PASAR POR ALTO:
 *
 *  · La experiencia mira DIEZ años atrás, no quince como en el resto de
 *    servicios. En comparación de precios el horizonte es el de bienes.
 *  · La garantía está redactada con el texto de BIENES —"defectos de
 *    diseño y/o fabricación... de los bienes contratados"— pese a
 *    tratarse de un formato de servicios. Se transcribe tal cual: no me
 *    corresponde corregir el formato oficial, y cambiarlo haría fallar
 *    el cotejo contra el .docx. Vale la pena comentárselo a César.
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
  bloquesPago,
  EXPERIENCIA_TITULAR,
  VALIDACION_EXPERIENCIA,
  VALIDACION_MYPE,
} from './comunes';

export const PLANTILLA_SERVICIOS_COMPARACION_PRECIOS: PlantillaRequerimiento = {
  id: 'ps-servicios-comparacion-precios',
  familia: 'procedimiento_seleccion',
  objeto: 'servicios',
  encabezado: 'REQUERIMIENTO',
  subtitulo: 'SERVICIOS - COMPARACIÓN DE PRECIOS',
  origen: 'PROCEDIMIENTOS DE SELECCIÓN/2. SERVICIOS/4. Servicios compración de precios.docx',

  validaciones: [VALIDACION_EXPERIENCIA, VALIDACION_MYPE],

  secciones: [
    seccionEncabezado(
      'Indicar una breve descripción del requerimiento, mediante la denominación del (los) servicio(s) a ser contratado(s)',
    ),

    seccionFinalidadPublica(
      'La contratación tiene por finalidad garantizar el adecuado funcionamiento de los equipos de aire acondicionado instalados en las oficinas de la Entidad mediante la ejecución del servicio de mantenimiento preventivo, contribuyendo a preservar condiciones adecuadas de trabajo, evitar interrupciones en las actividades institucionales y prolongar la vida útil de los equipos.',
    ),

    seccionObjetivo(
      'Contratar el servicio de mantenimiento preventivo de equipos de aire acondicionado, conforme a los Términos de Referencia establecidos por la Entidad, garantizando su ejecución oportuna, eficiente y con la calidad requerida para asegurar el adecuado funcionamiento de los equipos.',
      'Ejecutar el mantenimiento preventivo de los equipos conforme a las condiciones técnicas establecidas en los Términos de Referencia.\nVerificar el correcto funcionamiento de los equipos mediante pruebas operativas posteriores al mantenimiento.\nReducir la probabilidad de fallas que puedan afectar el normal desarrollo de las actividades institucionales.\nContribuir a prolongar la vida útil de los equipos mediante la ejecución oportuna del mantenimiento preventivo.',
    ),

    seccionAntecedentes(
      'Describir las razones que sustentan la necesidad de contratar el servicio: el problema identificado, la necesidad institucional a atender y los documentos que sustentan el requerimiento. En Comparación de Precios la necesidad debe corresponder a un servicio disponible en el mercado y cuyas características puedan definirse objetivamente, sin requerir soluciones desarrolladas específicamente para la Entidad',
      'Los equipos de aire acondicionado instalados en las oficinas de la Entidad requieren mantenimiento preventivo periódico para conservar su adecuado funcionamiento y evitar fallas que afecten el desarrollo de las actividades institucionales. En ese sentido, resulta necesario contratar un proveedor especializado que ejecute dicho servicio conforme a las condiciones técnicas establecidas en los Términos de Referencia.',
    ),

    {
      id: 'descripcion_general',
      titulo: 'DESCRIPCIÓN GENERAL DEL REQUERIMIENTO',
      bloques: [
        {
          clase: 'tabla',
          id: 'items',
          etiqueta: 'Servicios requeridos',
          instruccion:
            'Describir de manera general el servicio objeto de la contratación, indicando de forma resumida las prestaciones que serán ejecutadas',
          columnas: ['N.°', 'Descripción del servicio'],
          minimo: 1,
        },
        {
          clase: 'opcion',
          id: 'forma_contratacion',
          etiqueta: 'Forma de contratación',
          instruccion: 'Completar si serán contratados por ítems, por paquetes o mediante un ítem único',
          opciones: [
            {
              valor: 'item_unico',
              texto:
                'La contratación comprende un único ítem, conforme a la descripción consignada en el presente requerimiento.',
            },
            {
              valor: 'por_items',
              texto:
                'Los servicios antes descritos serán contratados por ítems independientes, pudiendo los proveedores presentar ofertas por uno o más ítems.',
            },
            {
              valor: 'paquete',
              texto:
                'Los servicios antes descritos serán contratados por paquete único, debiendo el postor presentar oferta por la totalidad de las prestaciones comprendidas en el paquete.',
            },
          ],
        },
        {
          clase: 'nota',
          texto:
            'Cuando el objeto de la contratación corresponda a servicios comprendidos en una Ficha de Homologación, la descripción deberá ser concordante con la denominación establecida en dichos documentos.',
        },
      ],
    },

    {
      id: 'caracteristicas',
      titulo: 'CARACTERÍSTICAS Y CONDICIONES DEL SERVICIO A CONTRATAR',
      bloques: [],
      subsecciones: [
        {
          id: 'caracteristicas_tecnicas',
          titulo: 'Características técnicas y condiciones de ejecución del servicio',
          bloques: [
            {
              clase: 'redactado',
              id: 'caracteristicas_tecnicas',
              etiqueta: 'Características técnicas y condiciones de ejecución',
              instruccion:
                'Precisar las condiciones técnicas mínimas que debe cumplir la prestación, privilegiando los resultados esperados, el desempeño y la funcionalidad. Describir qué comprende el servicio, cómo debe ejecutarse, qué resultados debe alcanzar, qué condiciones técnicas mínimas debe cumplir y qué metodología, estándares o niveles de servicio deben observarse',
              ejemplo:
                'El servicio comprende la ejecución del mantenimiento preventivo y correctivo de las computadoras e impresoras de la Entidad, con la finalidad de garantizar su operatividad, prolongar su vida útil y reducir la ocurrencia de fallas que afecten la continuidad de las labores institucionales.\n\nEl servicio deberá ejecutarse conforme a las recomendaciones del fabricante y las buenas prácticas aplicables, considerando como mínimo: diagnóstico técnico previo; ejecución del mantenimiento con herramientas e insumos adecuados; reemplazo de componentes únicamente cuando sea autorizado por la Entidad; verificación del correcto funcionamiento luego de cada intervención; atención de incidencias dentro de los tiempos máximos establecidos; y presentación de informes técnicos por cada intervención.',
              extension: 'varios_parrafos',
            },
            {
              clase: 'nota',
              texto:
                'Se deben incluir las exigencias previstas en leyes, reglamentos, normas metrológicas y normas técnicas de naturaleza obligatoria vinculadas al objeto. Pueden incluirse normas técnicas de carácter voluntario siempre que se ajusten al numeral 44.5 del artículo 44 del Reglamento.',
            },
          ],
        },
        {
          id: 'actividades',
          titulo: 'Actividades a desarrollar',
          condicion: 'tiene_actividades',
          bloques: [
            {
              clase: 'redactado',
              id: 'actividades',
              etiqueta: 'Actividades del contratista',
              instruccion:
                'Detallar las principales actividades que ejecutará el contratista, con verbos precisos (elaborar, describir, definir, analizar, redactar, presentar, supervisar). Si no corresponde detallarlas, consignar "NO APLICA"',
              ejemplo:
                'Actividad 1: Realizar el mantenimiento preventivo de los equipos conforme a la programación aprobada.\nActividad 2: Ejecutar el mantenimiento correctivo de los equipos que presenten fallas durante la vigencia del contrato.\nActividad 3: Emitir los informes técnicos de cada intervención realizada.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'documentacion_perfeccionamiento',
          titulo: 'Documentación para la suscripción del contrato',
          condicion: 'exige_documentacion_contrato',
          bloques: [
            {
              clase: 'nota',
              texto:
                'No podrán exigirse documentos que dupliquen requisitos ya acreditados durante el procedimiento de selección ni que no guarden relación con la prestación. La documentación debe ser objetiva, razonable, proporcional y de posible cumplimiento por los potenciales proveedores.',
            },
            {
              clase: 'tabla',
              id: 'documentacion_perfeccionamiento',
              etiqueta: 'Documentación para el perfeccionamiento',
              instruccion:
                'Indicar la documentación adicional que el adjudicatario debe presentar, directamente relacionada con el objeto',
              columnas: ['Tipo de servicio', 'Documentación'],
              minimo: 1,
            },
          ],
        },
        {
          id: 'compatibilizacion',
          titulo: 'Documento que aprobó la compatibilización del requerimiento',
          condicion: 'tiene_compatibilizacion',
          bloques: [
            {
              clase: 'campo',
              id: 'compatibilizacion',
              etiqueta: 'Documento de compatibilización',
              ayuda:
                'Consignar el documento mediante el cual se aprobó la compatibilización. Si no corresponde, consignar "NO APLICA"',
              tipo: 'texto',
              obligatorio: true,
            },
          ],
        },
        {
          id: 'garantia_comercial',
          titulo: 'Garantía comercial',
          bloques: [
            {
              // El original usa el texto de bienes aunque el formato sea
              // de servicios. Se reproduce tal cual.
              clase: 'fijo',
              texto:
                'La garantía comercial, comprende contra defectos de diseño y/o fabricación, averías o fallas de funcionamiento, o pérdida total de los bienes contratados, ajenos al uso normal o habitual de los bienes y no detectables al momento que se otorgó la conformidad.',
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
              clase: 'parrafo',
              texto:
                'El período de garantía será de {{garantia_periodo}}, computado a partir del día siguiente del otorgamiento de la conformidad del bien.',
              campos: [
                {
                  clase: 'campo',
                  id: 'garantia_periodo',
                  etiqueta: 'Período de garantía',
                  ayuda: 'Consignar el plazo, por ejemplo: treinta (30) días calendario, seis (6) meses o un (1) año',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
          ],
        },
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
                {
                  valor: 'esquema_mixto',
                  texto:
                    'El contrato se rige por un Esquema mixto, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando la entidad contratante puede utilizar más de una modalidad de pago en un mismo contrato.',
                },
                {
                  valor: 'costo_reembolsable',
                  texto:
                    'El contrato se rige por la modalidad de Costo reembolsable, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando la entidad contratante requiere reembolsar al contratista los costos reales en que incurre durante la ejecución del contrato.',
                },
              ],
            },
          ],
        },
        {
          id: 'plazo_prestacion',
          titulo: 'Plazo de prestación del servicio',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'Los bienes o servicios materia de la presente convocatoria se entregan/prestan en el plazo de {{plazo_servicio}}, computado a partir del día siguiente de {{hito_inicio}}',
              campos: [
                {
                  clase: 'campo',
                  id: 'plazo_servicio',
                  etiqueta: 'Plazo de prestación',
                  ayuda: 'Consignar el plazo de prestación del servicio',
                  tipo: 'dias',
                  obligatorio: true,
                },
                {
                  clase: 'campo',
                  id: 'hito_inicio',
                  etiqueta: 'Hito desde el que se computa',
                  ayuda:
                    'La notificación de la orden de compra, el perfeccionamiento del contrato, o el cumplimiento de la condición de inicio que corresponda',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
          ],
        },
        {
          id: 'lugar_prestacion',
          titulo: 'Lugar de prestación del servicio',
          bloques: [
            {
              clase: 'parrafo',
              texto: 'El servicio se presta en {{lugar_servicio}}',
              campos: [
                {
                  clase: 'campo',
                  id: 'lugar_servicio',
                  etiqueta: 'Lugar de prestación',
                  ayuda:
                    'Indicar el detalle del lugar o los lugares en que se prestará el servicio considerando el distrito, provincia y departamento',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'nota',
              texto:
                'En caso el servicio se ejecute en las instalaciones del contratista o en otro lugar que este deba proporcionar, consignar esa condición y detallar las características mínimas exigidas.',
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

        seccionPenalidades('larga'),

        {
          id: 'subcontratacion',
          titulo: 'Subcontratación',
          bloques: [
            {
              clase: 'fijo',
              texto: 'Se encuentra prohibida la subcontratación de las prestaciones objeto del contrato.',
              fundamento: 'Plantilla — comparación de precios',
            },
          ],
        },

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

        seccionViciosOcultos(),
        seccionAnticorrupcion(true),
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
              ejemplo:
                'Facilitar el acceso a las instalaciones donde se encuentran ubicados los equipos objeto del mantenimiento.\nDesignar un servidor responsable para coordinar el ingreso del personal técnico y supervisar la ejecución del servicio.\nProporcionar la relación e identificación de los equipos objeto del mantenimiento y la información técnica disponible.\nGestionar los permisos de ingreso y acceso a las instalaciones de la Entidad, cuando corresponda.\nGarantizar que los ambientes donde se ejecutará el servicio se encuentren disponibles en las fechas programadas.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'conformidad',
          titulo: 'Órgano quien brindará la conformidad',
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
                    'Consignar el entregable, o finalizado el/los servicio/s que fue materia de contratación, completar según corresponda',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
          ],
        },
        {
          id: 'forma_pago',
          titulo: 'Forma y requisitos de pago',
          bloques: [
            { clase: 'fijo', texto: 'El pago se realiza de conformidad con lo establecido en el artículo 67 de la Ley.' },
            ...bloquesPago(),
            {
              clase: 'nota',
              texto:
                'De manera excepcional se permite que el pago se realice de forma total o parcial al inicio de la vigencia contractual, siempre que se sustente que es una condición de mercado indispensable. En ese caso el contratista debe entregar previamente una garantía conforme al numeral de garantía de fiel cumplimiento, y el área usuaria emite una primera conformidad para efectos administrativos de pago y, después, la conformidad final.',
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
          titulo: 'Recursos, medios y obligaciones del contratista',
          bloques: [
            {
              clase: 'redactado',
              id: 'recursos_contratista',
              etiqueta: 'Recursos y obligaciones del contratista',
              instruccion:
                'Establecer los recursos, medios, equipos, herramientas, materiales, personal, infraestructura, licencias, autorizaciones o sistemas informáticos que el contratista debe proporcionar o mantener, y las obligaciones que asume. Las exigencias deben ser objetivas, razonables y proporcionales, sin restringir injustificadamente la libre concurrencia',
              ejemplo:
                'Proporcionar el personal, equipos, herramientas, instrumentos e implementos necesarios para la correcta ejecución del servicio.\nEjecutar el servicio conforme a las especificaciones técnicas, el plan de trabajo y los plazos establecidos por la Entidad.\nUtilizar materiales, insumos y repuestos que cumplan con las características técnicas exigidas en el requerimiento.\nCumplir las normas de seguridad y salud en el trabajo y proporcionar al personal los equipos de protección personal requeridos.\nMantener permanentemente la limpieza y el orden del área donde se ejecuten los trabajos.\nComunicar oportunamente a la Entidad cualquier situación que pueda afectar la continuidad o calidad del servicio.\nSubsanar, sin costo adicional para la Entidad, las observaciones o deficiencias atribuibles al contratista.\nCumplir la normativa técnica, ambiental y sectorial aplicable durante toda la ejecución contractual.',
              extension: 'lista',
            },
          ],
        },
      ],
    },

    {
      id: 'requisitos_calificacion',
      titulo: 'REQUISITOS DE CALIFICACIÓN',
      bloques: [],
      subsecciones: [
        {
          id: 'capacidad_legal',
          titulo: 'Capacidad legal',
          condicion: 'exige_habilitacion',
          bloques: [
            {
              clase: 'nota',
              texto:
                'El requisito de capacidad legal únicamente es obligatorio si la normativa que regula el objeto contractual exige determinada habilitación para llevar a cabo la actividad económica. Caso contrario, esta subsección se elimina.',
            },
            {
              clase: 'redactado',
              id: 'capacidad_legal_requisito',
              etiqueta: 'Requisitos',
              instruccion:
                'Incluir los requisitos relacionados a la habilitación para llevar a cabo la actividad económica materia de la contratación',
              extension: 'parrafo',
            },
            {
              clase: 'redactado',
              id: 'capacidad_legal_acreditacion',
              etiqueta: 'Acreditación',
              instruccion: 'Incluir el documento con el que se acredita el requisito de habilitación del postor',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'experiencia_postor',
          titulo: 'Experiencia del postor en la especialidad',
          condicion: 'exige_experiencia',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Requisito de calificación facultativo. Una vez incorporado se considera obligatorio; deben eliminarse los que no se seleccionen.',
            },
            {
              // Diez años, no quince: en comparación de precios el
              // horizonte es el de bienes aunque el objeto sea servicio.
              clase: 'parrafo',
              texto:
                'El postor debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto}}, por la contratación de servicios iguales o similares al objeto de la convocatoria, durante los diez años anteriores a la fecha de la presentación de ofertas que se computa desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto',
                  etiqueta: 'Monto facturado acumulado exigido',
                  ayuda:
                    'Consignar el monto de facturación en números y letras en la moneda de la convocatoria, monto que no podrá ser mayor a tres veces la cuantía de la contratación o del ítem',
                  tipo: 'moneda',
                  obligatorio: true,
                  validacion: 'experiencia_max',
                },
              ],
            },
            {
              clase: 'parrafo',
              texto:
                'Los postores que declaren en el Anexo N° 2 tener la condición de micro y pequeña empresa acreditan, con las mismas condiciones, una experiencia de {{experiencia_monto_mype}}, por la venta o prestación de {{objeto_experiencia}} iguales o similares al objeto de la convocatoria. Para consorcios, todos sus integrantes deben contar con la condición de micro y pequeña empresa.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto_mype',
                  etiqueta: 'Monto exigido a micro y pequeña empresa',
                  ayuda:
                    'Consignar el monto de facturación en números y letras en la moneda de la convocatoria, sin exceder el 25% de la cuantía de la contratación',
                  tipo: 'moneda',
                  obligatorio: true,
                  validacion: 'experiencia_mype',
                },
                {
                  clase: 'campo',
                  id: 'objeto_experiencia',
                  etiqueta: 'Objeto de la experiencia',
                  ayuda: 'Consignar bienes o servicios, según corresponda',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'parrafo',
              texto: 'Se consideran servicios similares a los siguientes {{servicios_similares}}.',
              campos: [
                {
                  clase: 'campo',
                  id: 'servicios_similares',
                  etiqueta: 'Servicios similares',
                  ayuda: 'Consignar los bienes o servicios similares al objeto convocado',
                  tipo: 'texto_largo',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'fijo',
              texto:
                'La experiencia del postor en la especialidad se acredita con un máximo de veinte contrataciones, mediante copia simple de (i) contratos u órdenes de compra o servicio, y su respectiva conformidad o constancia de prestación; o (ii) comprobantes de pago cuya cancelación se acredite documental y fehacientemente, con constancia de depósito, nota de abono, reporte de estado de cuenta, cualquier otro documento emitido por entidad del sistema financiero que acredite el abono o mediante cancelación en el mismo comprobante de pago o comprobante de retención electrónico emitido por SUNAT por la retención del IGV. En caso el postor sustente su experiencia en la especialidad mediante contrataciones realizadas con privados, para acreditarla debe presentar de forma obligatoria lo indicado en el numeral (ii) del presente párrafo; no es posible que acredite su experiencia únicamente con la presentación de contratos u órdenes de compra o servicio con conformidad o constancia de prestación.',
              fundamento: 'Plantilla — acreditación de experiencia, texto invariable',
            },
            {
              clase: 'fijo',
              texto:
                'En caso los postores presenten varios comprobantes de pago para acreditar una sola contratación, se debe acreditar que corresponden a dicha contratación; de lo contrario, se asumirá que los comprobantes de pago acreditan contrataciones independientes, en ese caso solo se considerará, para su evaluación, las veinte (20) primeras contrataciones indicadas en el Anexo Nº 10 referido a la Experiencia del Postor en la Especialidad.',
            },
            {
              clase: 'fijo',
              texto:
                'En el caso de suministro, solo se considera como experiencia la parte del contrato que haya sido ejecutada durante los diez (10) años anteriores a la fecha de presentación de ofertas, debiendo adjuntarse copia de las conformidades o los respectivos comprobantes de pago cancelados correspondientes a tal parte.',
            },
            { clase: 'fijo', texto: EXPERIENCIA_TITULAR },
            {
              clase: 'fijo',
              texto:
                'Si el postor acredita experiencia de otra persona jurídica como consecuencia de una reorganización societaria, debe presentar el Anexo N° 11.',
            },
            {
              clase: 'fijo',
              texto:
                'Las personas jurídicas resultantes de un proceso de reorganización societaria no pueden acreditar como experiencia del postor en la especialidad que le hubiesen transmitido como parte de dicha reorganización las personas jurídicas sancionadas con inhabilitación vigente o definitiva.',
            },
            {
              clase: 'fijo',
              texto:
                'Cuando en los contratos, órdenes de compra o de servicio o comprobantes de pago el monto facturado se encuentre expresado en moneda extranjera, debe indicarse el tipo de cambio venta publicado por la Superintendencia de Banca, Seguros y AFP correspondiente a la fecha de suscripción del contrato, de emisión de la orden de compra o de servicio o de cancelación del comprobante de pago, según corresponda.',
            },
            {
              clase: 'fijo',
              texto:
                'Sin perjuicio de lo anterior, los postores deben llenar y presentar el Anexo Nº 10 referido a la Experiencia del Postor en la Especialidad.',
            },
          ],
        },
      ],
    },

    seccionSolicitante(),
  ],
};
