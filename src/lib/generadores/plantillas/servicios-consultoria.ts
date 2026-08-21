/**
 * Plantilla: REQUERIMIENTO — SERVICIOS DE CONSULTORÍA EN GENERAL
 *
 * Transcripción de "PROCEDIMIENTOS DE SELECCIÓN/2. SERVICIOS/
 * 2. Servicios de Consultoría en General.docx".
 *
 * EL DETALLE QUE MÁS IMPORTA: la experiencia exigible al postor se
 * limita a UNA VEZ el valor de la cuantía, no a tres como en el resto de
 * bienes y servicios. Por eso el validador de topes dejó de tener el
 * multiplicador escrito en el código y ahora lo toma de la plantilla: un
 * aviso correcto en una plantilla y falso en otra es peor que no tener
 * aviso.
 *
 * El resto sigue el esqueleto de servicios, con las prestaciones
 * accesorias propias de una consultoría —asistencia técnica, soporte
 * metodológico, capacitación— y una garantía de la prestación que ya no
 * habla de reparar equipos sino de corregir errores, omisiones e
 * inconsistencias técnicas de los productos entregados.
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
  bloquesPagoAnticipado,
  EXPERIENCIA_TITULAR,
  VALIDACION_ADELANTO,
  VALIDACION_EXPERIENCIA_CONSULTORIA,
} from './comunes';

export const PLANTILLA_SERVICIOS_CONSULTORIA: PlantillaRequerimiento = {
  id: 'ps-servicios-consultoria',
  familia: 'procedimiento_seleccion',
  objeto: 'consultoria_general',
  encabezado: 'REQUERIMIENTO',
  subtitulo: 'SERVICIOS DE CONSULTORÍA EN GENERAL',
  origen: 'PROCEDIMIENTOS DE SELECCIÓN/2. SERVICIOS/2. Servicios de Consultoría en General.docx',

  validaciones: [VALIDACION_ADELANTO, VALIDACION_EXPERIENCIA_CONSULTORIA],

  secciones: [
    seccionEncabezado(
      'Indicar una breve descripción del requerimiento, mediante la denominación del servicio de consultoría a ser contratado',
    ),

    seccionFinalidadPublica(
      'La contratación tiene por finalidad contribuir al fortalecimiento de la gestión institucional mediante la identificación de oportunidades de mejora en los procesos administrativos de la Entidad, proponiendo alternativas técnicas y viables que permitan optimizar la eficiencia operativa, mejorar la calidad de los servicios brindados y coadyuvar al cumplimiento de los objetivos estratégicos institucionales.',
    ),

    seccionObjetivo(
      'Contratar el servicio de consultoría para la elaboración de un diagnóstico y propuesta de mejora de los procesos administrativos de la Entidad, con la finalidad de optimizar su gestión interna y fortalecer la capacidad institucional para el cumplimiento de sus objetivos estratégicos.',
      'Analizar los procesos administrativos objeto de la consultoría, identificando sus fortalezas, debilidades y oportunidades de mejora.\nElaborar un diagnóstico técnico sustentado que permita determinar las principales problemáticas y riesgos asociados a los procesos evaluados.\nFormular propuestas de mejora técnicamente viables, orientadas a optimizar la eficiencia, eficacia y calidad de los procesos institucionales.\nPresentar los productos o entregables de la consultoría conforme a los términos y plazos establecidos en el requerimiento.\nProponer recomendaciones para la implementación y sostenibilidad de las mejoras planteadas.',
    ),

    seccionAntecedentes(
      'Explicar de manera general el motivo por el cual se efectúa el requerimiento de la contratación del servicio. En caso de existir documentos fuente, mencionarlos y adjuntarlos. Si el objeto corresponde al ASISTE, considerar las disposiciones del Subcapítulo 6 del Capítulo III del Reglamento',
    ),

    {
      id: 'descripcion_general',
      titulo: 'DESCRIPCIÓN GENERAL DEL REQUERIMIENTO',
      bloques: [
        {
          clase: 'tabla',
          id: 'items',
          etiqueta: 'Servicios de consultoría requeridos',
          instruccion:
            'Describir de manera general el servicio de consultoría, indicando de forma resumida las prestaciones, productos o entregables que serán elaborados por el consultor',
          columnas: ['N.°', 'Descripción del servicio'],
          minimo: 1,
        },
        {
          clase: 'opcion',
          id: 'forma_contratacion',
          etiqueta: 'Forma de contratación',
          instruccion: 'Precisar si la contratación será por ítem único, por ítems independientes o por paquetes',
          opciones: [
            {
              valor: 'item_unico',
              texto:
                'La presente contratación comprende un único ítem correspondiente al servicio de consultoría descrito en el presente requerimiento.',
            },
            {
              valor: 'por_items',
              texto:
                'Los servicios antes descritos serán contratados por ítems independientes, pudiendo los postores presentar ofertas por uno o más ítems.',
            },
            {
              valor: 'paquete',
              texto:
                'Los servicios antes descritos serán contratados como un paquete único, debiendo el postor presentar oferta por la totalidad de las prestaciones comprendidas en el paquete.',
            },
          ],
        },
        {
          clase: 'nota',
          texto:
            'Cuando el servicio de consultoría se encuentre sujeto a disposiciones normativas especiales o estándares técnicos aprobados por la autoridad competente, la descripción deberá ser concordante con la denominación y alcance establecidos en dichos documentos.',
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
                'Precisar las condiciones técnicas mínimas que debe cumplir la prestación, privilegiando los resultados esperados. Describir qué comprende el servicio, cómo debe ejecutarse, qué resultados debe alcanzar, qué condiciones técnicas mínimas debe cumplir y qué metodología, estándares o niveles de servicio deben observarse',
              ejemplo:
                'El servicio comprende el diagnóstico de la situación actual de la gestión documental institucional, el análisis de los procesos relacionados con la administración de archivos y la elaboración del Plan de Gestión Documental y Digitalización de Archivos.\n\nLa consultoría deberá ejecutarse considerando las buenas prácticas aplicables, la normativa vigente en materia archivística y las necesidades institucionales identificadas durante la ejecución del servicio.\n\nComo mínimo, la prestación deberá comprender el levantamiento y análisis de la información proporcionada por la Entidad; la identificación de necesidades y oportunidades de mejora; la elaboración de los productos y entregables establecidos; la formulación de recomendaciones técnicas y propuestas de implementación; y la presentación y sustentación de los entregables ante la Entidad.',
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
          bloques: [
            {
              clase: 'redactado',
              id: 'actividades',
              etiqueta: 'Actividades del consultor',
              instruccion:
                'Detallar las principales actividades que ejecutará el consultor, en relación con los entregables esperados, con verbos que permitan identificar claramente las obligaciones (elaborar, describir, definir, analizar, redactar, presentar, supervisar). Especificar el procedimiento cuando la naturaleza del servicio lo requiera',
              ejemplo:
                'Actividad 1: Diagnóstico de la situación actual. Recopilar, revisar y analizar la información proporcionada por la Entidad.\nActividad 2: Análisis y evaluación técnica. Evaluar los procesos existentes e identificar oportunidades de mejora y necesidades técnicas.\nActividad 3: Elaboración de la propuesta técnica, incluyendo lineamientos técnicos, procedimientos, cronograma y recomendaciones.\nActividad 4: Presentación y sustentación de los entregables ante la Entidad, absolviendo las observaciones dentro del plazo establecido.',
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
                'La documentación debe guardar relación directa con el objeto de la consultoría y resultar indispensable para garantizar la adecuada ejecución, evitando exigencias innecesarias o restrictivas. No pueden exigirse documentos que dupliquen requisitos ya acreditados durante el procedimiento de selección.',
            },
            {
              clase: 'tabla',
              id: 'documentacion_perfeccionamiento',
              etiqueta: 'Documentación para el perfeccionamiento',
              columnas: ['N.°', 'Documentación'],
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
                'Consignar el documento mediante el cual la autoridad de la gestión administrativa aprobó la compatibilización del requerimiento',
              tipo: 'texto',
              obligatorio: true,
            },
          ],
        },
        {
          id: 'prestaciones_accesorias',
          titulo: 'Prestaciones accesorias a la prestación principal',
          condicion: 'tiene_prestaciones_accesorias',
          bloques: [],
          subsecciones: [
            {
              id: 'asistencia_tecnica',
              titulo: 'Asistencia técnica especializada',
              condicion: 'accesoria_asistencia',
              bloques: [
                {
                  clase: 'redactado',
                  id: 'asistencia_tecnica',
                  etiqueta: 'Asistencia técnica',
                  instruccion:
                    'Precisar el alcance de la asistencia técnica, las actividades que comprenderá, el plazo durante el cual será brindada, la modalidad de atención (presencial, virtual o mixta), el tiempo máximo de respuesta, los productos o resultados esperados y las condiciones para el otorgamiento de la conformidad',
                  ejemplo:
                    'La asistencia técnica comprenderá la absolución de consultas formuladas por la Entidad, la orientación respecto a la implementación del documento elaborado, la atención de observaciones de carácter técnico y la emisión de recomendaciones complementarias relacionadas con los entregables.',
                  extension: 'varios_parrafos',
                },
              ],
            },
            {
              id: 'soporte_metodologico',
              titulo: 'Soporte técnico o metodológico',
              condicion: 'accesoria_soporte',
              bloques: [
                {
                  clase: 'redactado',
                  id: 'soporte_metodologico',
                  etiqueta: 'Soporte técnico o metodológico',
                  instruccion:
                    'Precisar el alcance del soporte, la modalidad de atención, los canales habilitados, el tiempo máximo de respuesta, el plazo durante el cual se brindará y las condiciones para la conformidad',
                  ejemplo:
                    'El soporte comprenderá la orientación para la aplicación de la metodología propuesta, la absolución de consultas relacionadas con los procedimientos diseñados, la atención de incidencias vinculadas con la implementación de los productos entregados y las recomendaciones para la adecuada aplicación de la consultoría. El tiempo máximo de respuesta será de dos (2) días hábiles.',
                  extension: 'varios_parrafos',
                },
              ],
            },
            {
              id: 'capacitacion',
              titulo: 'Capacitación y/o entrenamiento',
              condicion: 'accesoria_capacitacion',
              bloques: [
                {
                  clase: 'redactado',
                  id: 'capacitacion',
                  etiqueta: 'Capacitación',
                  instruccion:
                    'Precisar los temas a desarrollar, el número mínimo de participantes, la modalidad, la duración mínima, el momento o plazo de realización, el perfil mínimo del expositor, el material a entregar, el tipo de constancia o certificado y las condiciones para la conformidad',
                  ejemplo:
                    'La capacitación comprenderá, como mínimo, los alcances del sistema implementado, los roles y responsabilidades de los servidores, los procedimientos establecidos, el uso de los formatos desarrollados y las buenas prácticas para su implementación.\n\nAl finalizar, el contratista entregará el material de capacitación, las presentaciones utilizadas, el registro de asistencia y las constancias de participación.',
                  extension: 'varios_parrafos',
                },
              ],
            },
          ],
        },
        {
          id: 'seguros',
          titulo: 'Seguros',
          condicion: 'requiere_seguros',
          bloques: [
            {
              clase: 'redactado',
              id: 'seguros',
              etiqueta: 'Seguros exigidos',
              instruccion:
                'Precisar el tipo de seguro requerido, las coberturas mínimas exigidas, el período de vigencia y la oportunidad para su presentación',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'plan_trabajo',
          titulo: 'Plan de trabajo',
          condicion: 'requiere_plan_trabajo',
          bloques: [
            {
              clase: 'redactado',
              id: 'plan_trabajo',
              etiqueta: 'Plan de trabajo',
              instruccion:
                'Delimitar el contenido, condiciones y oportunidad de entrega del plan, así como el plazo con el que cuenta el área usuaria para su aprobación',
              ejemplo:
                'El Plan de Trabajo deberá contener, como mínimo: objetivos y alcance de la consultoría; metodología que será empleada; relación y secuencia de las actividades a ejecutar; cronograma detallado de ejecución; relación del equipo consultor y distribución de responsabilidades; productos y entregables comprometidos; mecanismos de coordinación con el área usuaria; y riesgos identificados con sus medidas de mitigación.',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'garantia_prestacion',
          titulo: 'Garantía de la prestación',
          condicion: 'tiene_garantia_prestacion',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Aplica únicamente cuando resulte necesario establecer un período durante el cual el contratista garantice la calidad, integridad y adecuada formulación de los productos entregados. Comprende la subsanación de errores, omisiones, inconsistencias técnicas o deficiencias atribuibles al contratista advertidas tras la conformidad, siempre que no sean consecuencia de modificaciones de la Entidad ni de causas no imputables al contratista.',
            },
            {
              clase: 'fijo',
              texto:
                'Durante el período de garantía, el contratista será responsable de subsanar, sin costo adicional para la Entidad, los errores, omisiones, inconsistencias técnicas o incumplimientos detectados en los productos entregados que resulten atribuibles a la ejecución de la consultoría.',
              fundamento: 'Plantilla — alcance de la garantía',
            },
            {
              clase: 'fijo',
              texto:
                'La garantía comprenderá la revisión, corrección y actualización de los documentos o productos entregables cuando ello resulte necesario para asegurar el adecuado cumplimiento del objeto contractual.',
            },
            {
              clase: 'fijo',
              texto:
                'La Entidad comunicará las observaciones al contratista mediante correo electrónico institucional u otro medio que permita acreditar su recepción.',
            },
            {
              clase: 'fijo',
              texto:
                'El contratista deberá iniciar las acciones de subsanación dentro del plazo máximo de dos (2) días hábiles de recibida la comunicación y efectuar las correcciones correspondientes dentro del plazo que se establezca en el requerimiento, considerando la naturaleza y complejidad de las observaciones formuladas.',
            },
            { clase: 'fijo', texto: 'Las subsanaciones efectuadas no generarán costo adicional alguno para la Entidad.' },
            {
              clase: 'parrafo',
              texto:
                'El período de garantía será de {{garantia_periodo}}, computado a partir del día siguiente del otorgamiento de la conformidad del servicio.',
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
          id: 'visita',
          titulo: 'Visita al lugar de ejecución del servicio',
          condicion: 'preve_visita',
          bloques: [
            {
              clase: 'redactado',
              id: 'visita',
              etiqueta: 'Condiciones de la visita',
              instruccion:
                'Precisar el objeto de la visita, el lugar, la oportunidad, el medio de coordinación, el responsable y la indicación expresa de que es facultativa',
              extension: 'varios_parrafos',
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
                    'El contrato se rige por la modalidad de pago de Suma Alzada, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando las cantidades, magnitudes y calidades de la prestación están definidas en los términos de referencia.',
                },
                {
                  valor: 'precios_unitarios',
                  texto:
                    'El contrato se rige por la modalidad de pago de Precios Unitarios, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando no puede conocerse con exactitud o precisión las cantidades o magnitudes requeridas.',
                },
                {
                  valor: 'tarifas',
                  texto:
                    'El contrato se rige por la modalidad de pago de Tarifas, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando no puede conocerse con precisión el tiempo de prestación del servicio.',
                },
                {
                  valor: 'esquema_mixto',
                  texto:
                    'El contrato se rige por un Esquema mixto, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando la entidad contratante puede utilizar más de una modalidad de pago en un mismo contrato.',
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
                'Los servicios materia de la presente convocatoria se prestan en el plazo de {{plazo_servicio}} días calendario, computados a partir del día siguiente de la notificación de la orden de servicio o suscripción del contrato o del cumplimiento de la condición establecida en los Términos de Referencia, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'plazo_servicio',
                  etiqueta: 'Plazo de ejecución',
                  ayuda: 'Consignar los días de ejecución del servicio',
                  tipo: 'dias',
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
          ],
        },
        {
          id: 'entregables',
          titulo: 'Entregable',
          bloques: [
            {
              clase: 'tabla',
              id: 'entregables',
              etiqueta: 'Entregables',
              instruccion:
                'Señalar los productos que el consultor debe entregar, la oportunidad o plazo de presentación, el contenido mínimo y el medio de presentación',
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

        {
          id: 'subcontratacion',
          titulo: 'Subcontratación',
          bloques: [
            {
              clase: 'opcion',
              id: 'subcontratacion',
              etiqueta: 'Subcontratación',
              instruccion: 'Indicar si se permite o se prohíbe la subcontratación',
              opciones: [
                {
                  valor: 'prohibida',
                  texto: 'Se encuentra prohibida la subcontratación de las prestaciones objeto del contrato.',
                },
                {
                  valor: 'permitida',
                  texto:
                    'El contratista puede subcontratar hasta un máximo del 40% del monto del contrato vigente de conformidad con lo dispuesto en el artículo 108 del Reglamento. Se consideran prestaciones esenciales que no pueden ser materia de subcontratación las siguientes:',
                },
              ],
            },
            {
              clase: 'redactado',
              id: 'prestaciones_no_subcontratables',
              etiqueta: 'Prestaciones que no pueden subcontratarse',
              instruccion:
                'Completar las prestaciones esenciales que, de acuerdo con lo determinado por el área usuaria en los términos de referencia, no pueden ser materia de subcontratación',
              extension: 'lista',
              // Solo tiene sentido si se permitió subcontratar: si está
              // prohibida, la pregunta no existe.
              visibleSi: { opcion: 'subcontratacion', valor: 'permitida' },
            },
          ],
        },

        seccionControversias(true, 'servicios'),

        {
          id: 'plazo_respuestas',
          titulo: 'Plazo para respuestas entre las partes',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'Para los plazos de respuesta de las partes sobre aspectos vinculados con la ejecución contractual que no han sido específicamente previstos en el Reglamento, aplica el plazo máximo de respuesta del siguiente cuadro:',
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
                'Antes del vencimiento de este plazo máximo, las partes pueden acordar su prórroga para cada situación específica considerando la cláusula de notificaciones del contrato.',
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
                'Listar los recursos, información y facilidades que la entidad debe brindar al consultor para que pueda ejecutar de manera eficiente, segura y oportuna el contrato',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'conformidad',
          titulo: 'Conformidad de la prestación',
          bloques: [
            {
              clase: 'redactado',
              id: 'conformidad',
              etiqueta: 'Conformidad',
              instruccion:
                'Precisar el órgano competente para emitir la conformidad, qué se verifica y en qué plazo',
              extension: 'varios_parrafos',
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
          titulo: 'Verificaciones técnicas, validaciones o revisiones para la conformidad del servicio',
          condicion: 'requiere_verificaciones',
          bloques: [
            {
              clase: 'redactado',
              id: 'verificaciones',
              etiqueta: 'Verificaciones para la conformidad',
              instruccion:
                'Precisar las verificaciones técnicas, pruebas funcionales, ensayos, inspecciones, validaciones operativas o revisiones documentarias que la Entidad realizará para comprobar el cumplimiento de las obligaciones contractuales, los términos de referencia y los niveles de servicio. La conformidad solo se emite cuando esas verificaciones acrediten el cumplimiento',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'forma_pago',
          titulo: 'Forma y requisitos de pago',
          bloques: [
            { clase: 'fijo', texto: 'El pago se realiza de conformidad con lo establecido en el artículo 67 de la Ley.' },
            ...bloquesPago(),
            ...bloquesPagoAnticipado(),
          ],
        },
        {
          id: 'pago_accesorias',
          titulo: 'Prestaciones accesorias',
          condicion: 'tiene_prestaciones_accesorias',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'La Entidad contratante efectuará el pago de las prestaciones accesorias mediante {{modalidad_pago_accesorias}}.',
              campos: [
                {
                  clase: 'campo',
                  id: 'modalidad_pago_accesorias',
                  etiqueta: 'Modalidad de pago de las accesorias',
                  ayuda:
                    'Consignar si corresponde pago único, pagos a cuenta, pagos periódicos, pagos mensuales u otra modalidad, según la naturaleza de la prestación accesoria',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'tabla',
              id: 'pago_accesorias',
              etiqueta: 'Requisitos para el pago de las prestaciones accesorias',
              instruccion:
                'Establecer, para cada prestación accesoria, la relación de documentos que el contratista debe presentar para efectos de pago',
              columnas: ['Prestación accesoria', 'Requisitos para el pago'],
              minimo: 0,
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
                'Establecer los recursos humanos, medios técnicos, infraestructura, equipos informáticos, licencias, software especializado, metodologías o sistemas de información que el contratista debe proporcionar, y las obligaciones que asume (cumplimiento del plan de trabajo y la metodología propuesta, plazos, normativa aplicable, confidencialidad, atención de observaciones, participación en reuniones de coordinación)',
              ejemplo:
                'Ejecutar la consultoría conforme al plan de trabajo, metodología, cronograma y demás condiciones establecidas en los Términos de Referencia.\nRecopilar, analizar y procesar la información necesaria para el cumplimiento de los objetivos, empleando metodologías técnicamente aceptadas.\nParticipar en las reuniones de coordinación, presentación de avances, mesas de trabajo y demás actividades convocadas por la Entidad.\nPresentar los entregables, informes, productos o documentos técnicos dentro de los plazos establecidos y con el contenido mínimo requerido.\nCumplir con la normativa técnica, sectorial y demás disposiciones legales aplicables durante toda la ejecución contractual.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'personal_clave',
          titulo: 'Personal clave',
          condicion: 'exige_personal_clave',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Describir el personal requerido precisando el cargo o función, las actividades o responsabilidades a su cargo y la formación académica exigida. La experiencia mínima del personal clave se establece en los Requisitos de Calificación.',
            },
            {
              clase: 'tabla',
              id: 'personal_clave',
              etiqueta: 'Personal clave',
              columnas: ['Cargo y/o responsabilidad', 'Actividades principales'],
              minimo: 1,
            },
          ],
        },
        {
          id: 'personal_no_clave',
          titulo: 'Personal no clave',
          condicion: 'exige_personal_no_clave',
          bloques: [
            {
              clase: 'nota',
              texto:
                'El personal no clave comprende a los profesionales, técnicos o especialistas que participan en actividades específicas de la consultoría, sin asumir la responsabilidad principal de los productos o entregables contractuales.',
            },
            {
              clase: 'tabla',
              id: 'personal_no_clave',
              etiqueta: 'Personal no clave',
              columnas: [
                'Cargo y/o responsabilidad',
                'Cant.',
                'Profesión y grado o título profesional requerido',
                'Experiencia mínima',
              ],
              minimo: 1,
            },
            {
              clase: 'fijo',
              texto: 'Nota: Este requisito no debe ser exigido para la presentación la ofertas.',
              fundamento: 'Plantilla — prohibición expresa',
            },
          ],
        },
        {
          id: 'equipamiento',
          titulo: 'Equipamiento NO estratégico',
          condicion: 'exige_equipamiento',
          bloques: [
            {
              clase: 'tabla',
              id: 'equipamiento',
              etiqueta: 'Equipamiento',
              instruccion:
                'Establecer el equipamiento necesario que no tenga condición de estratégico. Debe guardar relación directa con la naturaleza de la prestación',
              columnas: ['Equipamiento estratégico', 'Cant.', 'Características mínimas'],
              minimo: 1,
            },
            {
              clase: 'fijo',
              texto: 'Nota: Este requisito no debe ser exigido para la presentación la ofertas.',
              fundamento: 'Plantilla — prohibición expresa',
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
            'En caso así se determine en la estrategia de contratación, la entidad contratante puede incluir cualquiera de los siguientes requisitos de calificación facultativos. Cabe señalar que, una vez incorporados en el presente numeral, los requisitos de calificación se consideran obligatorios, debiéndose eliminar aquellos que no hayan sido seleccionados.',
        },
      ],
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
          bloques: [
            {
              // UNA vez la cuantía, no tres. Es el rasgo distintivo de
              // consultoría en general.
              clase: 'parrafo',
              texto:
                'El postor debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto}}, por la contratación de consultorías iguales o similares al objeto de la convocatoria, durante los quince años anteriores a la fecha de la presentación de ofertas, que se computa desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto',
                  etiqueta: 'Monto facturado acumulado exigido',
                  ayuda:
                    'Consignar el monto de facturación expresado en números y letras en la moneda de la convocatoria, monto que no es mayor a una vez el valor de la cuantía de la contratación o del ítem',
                  tipo: 'moneda',
                  obligatorio: true,
                  validacion: 'experiencia_max',
                },
              ],
            },
            {
              clase: 'parrafo',
              texto: 'Se consideran servicios de consultoría similares a los siguientes {{servicios_similares}}',
              campos: [
                {
                  clase: 'campo',
                  id: 'servicios_similares',
                  etiqueta: 'Servicios de consultoría similares',
                  ayuda: 'Consignar los servicios similares al objeto convocado',
                  tipo: 'texto_largo',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'fijo',
              texto:
                'La experiencia del postor en la especialidad se acredita con copia simple de: (i) contratos u órdenes de servicios, y su respectiva conformidad o constancia de prestación; o (ii) comprobantes de pago cuya cancelación se acredite documental y fehacientemente, con constancia de depósito, nota de abono, reporte de estado de cuenta o cualquier otro documento emitido por entidad del sistema financiero que acredite el abono o mediante cancelación en el mismo comprobante de pago o comprobante de retención electrónico emitido por SUNAT por la retención del IGV, correspondientes a un máximo de veinte contrataciones. En caso el postor sustente su experiencia en la especialidad mediante contrataciones realizadas con privados, para acreditarla debe presentar de forma obligatoria lo indicado en el numeral (ii) del presente párrafo; no es posible que acredite su experiencia únicamente con la presentación de contratos u órdenes de servicios con conformidad o constancia de prestación.',
              fundamento: 'Plantilla — acreditación de experiencia, texto invariable',
            },
            {
              clase: 'fijo',
              texto:
                'En caso los postores presenten varios comprobantes de pago para acreditar una sola contratación, se debe acreditar que corresponden a dicha contratación; de lo contrario, se asume que los comprobantes acreditan contrataciones independientes, en cuyo caso solo se considerará, para la evaluación, las veinte (20) primeras contrataciones indicadas en el Anexo Nº 11 referido a la Experiencia del Postor en la Especialidad.',
            },
            {
              clase: 'fijo',
              texto:
                'En el caso de servicios de ejecución periódica o continuada, solo se considera como experiencia la parte del contrato que haya sido ejecutada durante los quince años anteriores a la fecha de presentación de ofertas, debiendo adjuntarse copia de las conformidades correspondientes a tal parte o los respectivos comprobantes de pago cancelados.',
            },
            { clase: 'fijo', texto: EXPERIENCIA_TITULAR },
            {
              clase: 'fijo',
              texto:
                'Si el postor acredita experiencia de otra persona jurídica como consecuencia de una reorganización societaria, debe presentar adicionalmente el Anexo N° 12.',
            },
            {
              clase: 'fijo',
              texto:
                'Las personas jurídicas resultantes de un proceso de reorganización societaria no pueden acreditar como experiencia del postor en la especialidad que le hubiesen transmitido como parte de dicha reorganización las personas jurídicas sancionadas con inhabilitación vigente o definitiva.',
            },
            {
              clase: 'fijo',
              texto:
                'Cuando en los contratos, órdenes de servicios o comprobantes de pago el monto facturado se encuentre expresado en moneda extranjera, debe indicarse el tipo de cambio venta publicado por la Superintendencia de Banca, Seguros y AFP correspondiente a la fecha de suscripción del contrato, de emisión de la orden de servicio o de cancelación del comprobante de pago, según corresponda.',
            },
            {
              clase: 'fijo',
              texto:
                'Sin perjuicio de lo anterior, los postores deben llenar y presentar el Anexo Nº 11 referido a la Experiencia del Postor en la Especialidad.',
            },
          ],
        },
        {
          id: 'capacidad_tecnica',
          titulo: 'Capacidad técnica y profesional del personal clave',
          condicion: 'exige_capacidad_tecnica',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Este requisito debe completarse para cada uno de los integrantes del personal clave. El tiempo de experiencia mínimo debe ser razonable y congruente con el periodo en el que el personal ejecuta las actividades y con la cuantía de la contratación, de forma que no restrinja la participación de postores.',
            },
            {
              clase: 'redactado',
              id: 'capacidad_tecnica_requisito',
              etiqueta: 'Requisitos',
              instruccion:
                'Precisar la experiencia y formación exigida a cada integrante del personal clave',
              extension: 'parrafo',
            },
            {
              clase: 'redactado',
              id: 'capacidad_tecnica_acreditacion',
              etiqueta: 'Acreditación',
              instruccion: 'Precisar los documentos con los que se acredita el requisito',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'participacion_consorcio',
          titulo: 'Participación en consorcio',
          condicion: 'exige_requisitos_consorcio',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Consignar uno o más de los requisitos siguientes, en caso así haya sido sustentado en la estrategia de contratación.',
            },
            {
              clase: 'parrafo',
              texto:
                'D.1 El número máximo de consorciados es de {{consorcio_maximo}}.',
              campos: [
                {
                  clase: 'campo',
                  id: 'consorcio_maximo',
                  etiqueta: 'Número máximo de consorciados',
                  ayuda:
                    'Consignar el número máximo de integrantes del consorcio en función a la naturaleza de la prestación',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'parrafo',
              texto:
                'D.2 El porcentaje mínimo de participación de cada consorciado es de {{consorcio_participacion}}.',
              campos: [
                {
                  clase: 'campo',
                  id: 'consorcio_participacion',
                  etiqueta: 'Participación mínima de cada consorciado',
                  ayuda:
                    'Consignar el porcentaje mínimo de participación de cada integrante del consorcio',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'parrafo',
              texto:
                'D.3 El porcentaje mínimo de participación en la ejecución del contrato, para el integrante del consorcio que acredite mayor experiencia, es de {{consorcio_participacion_lider}}.',
              campos: [
                {
                  clase: 'campo',
                  id: 'consorcio_participacion_lider',
                  etiqueta: 'Participación mínima del consorciado con mayor experiencia',
                  ayuda:
                    'Consignar el porcentaje mínimo de participación en las obligaciones del integrante del consorcio que acredite la mayor experiencia',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'fijo',
              texto: 'Se acredita con la promesa de consorcio.',
              fundamento: 'Plantilla — participación en consorcio',
            },
          ],
        },
      ],
    },

    seccionSolicitante(),
  ],
};
