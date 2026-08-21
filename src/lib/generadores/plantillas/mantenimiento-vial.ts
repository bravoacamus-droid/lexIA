/**
 * Plantilla: REQUERIMIENTO — SERVICIOS DE MANTENIMIENTO VIAL
 *
 * Transcripción de "PROCEDIMIENTOS DE SELECCIÓN/2. SERVICIOS/
 * 3. Servicio de mantrenimiento vial.docx" (la errata del nombre es del
 * original).
 *
 * TRES RASGOS PROPIOS:
 *
 *  · La experiencia mira VEINTICINCO años atrás. No diez como en bienes
 *    ni quince como en el resto de servicios: es el horizonte más largo
 *    de las quince plantillas.
 *  · El tope de experiencia es de UNA vez la cuantía, como en
 *    consultoría, no de tres.
 *  · Aparece una sección que no existe en ningún otro formato: gestión
 *    de la calidad, con los niveles de servicio exigidos a la vía y los
 *    criterios de aceptación de cada partida. En mantenimiento vial lo
 *    que se contrata es un estado de la vía, no un conjunto de tareas.
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
  VALIDACION_ADELANTO,
  VALIDACION_EXPERIENCIA_CONSULTORIA,
  VALIDACION_MYPE,
} from './comunes';

export const PLANTILLA_MANTENIMIENTO_VIAL: PlantillaRequerimiento = {
  id: 'ps-mantenimiento-vial',
  familia: 'procedimiento_seleccion',
  objeto: 'servicios',
  encabezado: 'REQUERIMIENTO',
  subtitulo: 'SERVICIOS DE MANTENIMIENTO VIAL',
  origen: 'PROCEDIMIENTOS DE SELECCIÓN/2. SERVICIOS/3. Servicio de mantrenimiento vial.docx',

  validaciones: [VALIDACION_ADELANTO, VALIDACION_EXPERIENCIA_CONSULTORIA, VALIDACION_MYPE],

  secciones: [
    seccionEncabezado(
      'Indicar una breve descripción del requerimiento, mediante la denominación del servicio a ser contratado',
    ),

    seccionFinalidadPublica(
      'La contratación tiene por finalidad garantizar la adecuada conservación y operatividad de la infraestructura vial mediante la ejecución de actividades de mantenimiento rutinario, permitiendo mantener las condiciones de transitabilidad, seguridad y funcionalidad de la vía durante el período de ejecución contractual.',
    ),

    seccionObjetivo(),

    seccionAntecedentes(
      'Describir las razones que sustentan la necesidad del mantenimiento vial y, de corresponder, los documentos que lo sustentan: planes de conservación vial, programas de mantenimiento rutinario, informes de inspección vial, manuales y normativa técnica aplicable',
    ),

    {
      id: 'descripcion_general',
      titulo: 'DESCRIPCIÓN GENERAL DEL REQUERIMIENTO',
      bloques: [
        {
          clase: 'tabla',
          id: 'items',
          etiqueta: 'Tramos y actividades requeridos',
          instruccion:
            'Describir el servicio indicando las actividades y prestaciones que garantizan las condiciones de transitabilidad, seguridad y conservación. Cuando comprenda más de un ítem, señalar longitud de intervención, tipo de mantenimiento y alcance',
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
                'Precisar las condiciones técnicas mínimas privilegiando los resultados esperados, los niveles de servicio, las condiciones de transitabilidad y la conservación de la infraestructura. Describir qué comprende el servicio, cómo debe ejecutarse, qué actividades de conservación comprende, qué resultados se esperan, qué condiciones técnicas mínimas debe cumplir, qué niveles de servicio, estándares y metodologías deben observarse, y qué normativa técnica resulta aplicable',
              ejemplo:
                'El servicio comprenderá, como mínimo, las siguientes actividades:\nConservación de la plataforma de la vía.\nLimpieza y descolmatación de cunetas.\nLimpieza de alcantarillas y obras de drenaje.\nEliminación de derrumbes y material excedente.\nDesbroce y limpieza del derecho de vía.\nPerfilado y conservación de la superficie de rodadura.\nConservación y reposición de la señalización vial.\nMantenimiento de obras de arte y elementos complementarios de la vía.\nAtención de emergencias menores que afecten la transitabilidad.',
              extension: 'lista',
            },
            {
              clase: 'nota',
              texto:
                'Deben incluirse las exigencias previstas en la normativa técnica y sectorial aplicable al mantenimiento vial: manuales, especificaciones técnicas, normas ambientales, normas de seguridad y salud en el trabajo y demás disposiciones aplicables.',
            },
          ],
        },
        {
          id: 'partidas',
          titulo: 'Partidas y actividades del servicio de mantenimiento vial',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'El contratista deberá ejecutar la totalidad de las partidas y actividades previstas en el expediente técnico del servicio de mantenimiento vial, conforme a las especificaciones técnicas, metrados, procedimientos constructivos, niveles de servicio y demás documentos que forman parte integrante del presente requerimiento.',
              fundamento: 'Plantilla — mantenimiento vial',
            },
            { clase: 'fijo', texto: 'Las actividades comprendidas en el servicio son las siguientes:' },
            {
              clase: 'tabla',
              id: 'partidas',
              etiqueta: 'Partidas del servicio',
              instruccion: 'Detallar las partidas y actividades conforme al expediente técnico',
              columnas: ['N°', 'Partida', 'Unidad de medida', 'Metrado'],
              minimo: 1,
            },
          ],
        },
        {
          id: 'documentacion_perfeccionamiento',
          titulo: 'Documentación para la suscripción del contrato',
          condicion: 'exige_documentacion_contrato',
          bloques: [
            {
              clase: 'tabla',
              id: 'documentacion_perfeccionamiento',
              etiqueta: 'Documentación para el perfeccionamiento',
              instruccion:
                'Indicar la documentación adicional que el adjudicatario debe presentar, directamente relacionada con el objeto y necesaria para acreditar las condiciones técnicas, legales, operativas o de seguridad',
              advertencia: true,
              columnas: ['N.°', 'Documentación'],
              minimo: 1,
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
                'El Plan de Trabajo deberá contener, como mínimo: objetivos y alcance del servicio; descripción de las actividades de mantenimiento vial a ejecutar; metodología de ejecución de las partidas previstas; cronograma valorizado de actividades; programación semanal y/o mensual de intervenciones; relación del personal clave y no clave asignado; relación de maquinaria, equipos y herramientas; procedimiento de control de calidad; medidas de seguridad y salud en el trabajo; identificación de riesgos y medidas de mitigación; mecanismos de coordinación con la Entidad; y cronograma de presentación de informes y entregables.',
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
                'Aplica cuando resulte necesario establecer un período durante el cual el contratista garantice la calidad y correcta ejecución de las actividades realizadas. Comprende la subsanación de deficiencias, errores constructivos, incumplimientos técnicos o deterioros prematuros atribuibles al contratista detectados tras la conformidad.',
            },
            {
              clase: 'fijo',
              texto:
                'Durante el período de garantía, el contratista será responsable de subsanar, sin costo adicional para la Entidad, las deficiencias técnicas, omisiones o incumplimientos detectados en las actividades ejecutadas que resulten atribuibles al servicio contratado.',
              fundamento: 'Plantilla — alcance de la garantía',
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
          // Sección exclusiva de esta plantilla: en mantenimiento vial lo
          // que se contrata es un ESTADO de la vía, no un conjunto de
          // tareas, así que los niveles de servicio son el criterio de
          // aceptación.
          id: 'gestion_calidad',
          titulo: 'Gestión de la calidad',
          condicion: 'tiene_gestion_calidad',
          bloques: [
            {
              clase: 'redactado',
              id: 'gestion_calidad',
              etiqueta: 'Criterios de calidad',
              instruccion:
                'Establecer los criterios mínimos de calidad aplicables: los niveles de servicio exigidos para la vía, los estándares técnicos del expediente técnico, los criterios de aceptación de cada partida o actividad ejecutada y los procedimientos de supervisión, inspección y control de calidad',
              extension: 'lista',
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
                  valor: 'precios_unitarios',
                  texto:
                    'El contrato se rige por la modalidad de pago de Precios Unitarios, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando no puede conocerse con exactitud o precisión las cantidades o magnitudes requeridas.',
                },
                {
                  valor: 'suma_alzada',
                  texto:
                    'El contrato se rige por la modalidad de pago de Suma Alzada, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando las cantidades, magnitudes y calidades de la prestación están definidas en los términos de referencia.',
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
                  etiqueta: 'Tramo o vía objeto del servicio',
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
                'Señalar los documentos que el contratista debe entregar, la oportunidad o plazo de presentación, el contenido mínimo y el medio de presentación',
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
                'Listar los recursos y facilidades que la entidad debe brindar al contratista para que pueda ejecutar de manera eficiente, segura y oportuna el contrato',
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
                'Establecer la maquinaria, equipos, herramientas, materiales, personal, licencias y autorizaciones que el contratista debe proporcionar o mantener, y las obligaciones que asume durante la ejecución del servicio',
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
              clase: 'tabla',
              id: 'personal_clave',
              etiqueta: 'Personal clave',
              instruccion:
                'Para cada cargo precisar las responsabilidades principales y, de corresponder, la capacitación requerida',
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
          titulo: 'Equipamiento no estratégico',
          condicion: 'exige_equipamiento',
          bloques: [
            {
              clase: 'tabla',
              id: 'equipamiento',
              etiqueta: 'Equipamiento',
              instruccion:
                'Detallar la maquinaria y equipos requeridos que no tienen condición de estratégicos',
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
      bloques: [],
      subsecciones: [
        {
          id: 'experiencia_postor',
          titulo: 'Experiencia del postor en la especialidad',
          bloques: [
            {
              // Veinticinco años: el horizonte más largo de las quince
              // plantillas. Y el tope es de UNA vez la cuantía.
              clase: 'parrafo',
              texto:
                'El postor debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto}}, por la contratación de servicios iguales o similares al objeto de la convocatoria, durante los veinticinco años anteriores a la fecha de la presentación de ofertas que se computan desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto',
                  etiqueta: 'Monto facturado acumulado exigido',
                  ayuda:
                    'Consignar el monto de facturación expresado en números y letras en la moneda de la convocatoria, monto que no puede ser mayor a una vez el valor de la cuantía de la contratación o del ítem',
                  tipo: 'moneda',
                  obligatorio: true,
                  validacion: 'experiencia_max',
                },
              ],
            },
            {
              clase: 'parrafo',
              texto: 'Se consideran servicios similares a los siguientes: {{servicios_similares}}',
              campos: [
                {
                  clase: 'campo',
                  id: 'servicios_similares',
                  etiqueta: 'Servicios similares',
                  ayuda: 'Consignar los servicios similares al objeto convocado',
                  tipo: 'texto_largo',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'fijo',
              texto:
                'La experiencia del postor en la especialidad se acredita con un máximo de veinte contrataciones, mediante copia simple de: (i) contratos u órdenes de servicios, y su respectiva conformidad o constancia de prestación o liquidación; o (ii) comprobantes de pago cuya cancelación se acredite documental y fehacientemente, con constancia de depósito, nota de abono, reporte de estado de cuenta o cualquier otro documento emitido por entidad del sistema financiero que acredite el abono o mediante cancelación en el mismo comprobante de pago o comprobante de retención electrónico emitido por SUNAT por la retención del IGV. En caso el postor sustente su experiencia en la especialidad mediante contrataciones realizadas con privados, para acreditarla debe presentar de forma obligatoria lo indicado en el numeral (ii) del presente párrafo; no es posible que acredite su experiencia únicamente con la presentación de contratos u órdenes de servicios con conformidad o constancia de prestación.',
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
                'En el caso de servicios de ejecución periódica o continuada, solo se considera como experiencia la parte del contrato que haya sido ejecutada durante los veinticinco años anteriores a la fecha de presentación de ofertas, debiendo adjuntarse copia de las conformidades correspondientes a tal parte o los respectivos comprobantes de pago cancelados.',
            },
            { clase: 'fijo', texto: EXPERIENCIA_TITULAR },
            {
              clase: 'fijo',
              texto:
                'Si el postor acredita experiencia de otra persona jurídica como consecuencia de una reorganización societaria, debe presentar adicionalmente el Anexo N° 12. Las personas jurídicas resultantes de un proceso de reorganización societaria no pueden acreditar como experiencia del postor en la especialidad que le hubiesen transmitido como parte de dicha reorganización las personas jurídicas sancionadas con inhabilitación vigente o definitiva.',
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
          id: 'experiencia_mype',
          titulo: 'Régimen para micro y pequeña empresa',
          condicion: 'aplica_mype',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Este texto se incluye en procedimientos por relación de ítems cuando la cuantía de algún ítem corresponda al monto de un Concurso Público Abreviado.',
            },
            {
              clase: 'parrafo',
              texto:
                'En el caso de postores que declaren en el Anexo N° 1 tener la condición de micro y pequeña empresa, se acredita una experiencia de {{experiencia_monto_mype}}, por la contratación de servicios iguales o similares al objeto de la convocatoria, durante los veinticinco (25) años anteriores a la fecha de la presentación de ofertas que se computa desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda. En el caso de consorcios, todos los integrantes deben contar con la condición de micro y pequeña empresa.',
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
        {
          id: 'capacidad_tecnica',
          titulo: 'Capacidad técnica y profesional',
          condicion: 'exige_capacidad_tecnica',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Este requisito debe completarse para cada integrante del personal clave, considerando el de cada prestación (diseño y/o mantenimiento). El tiempo de experiencia mínimo debe ser razonable y congruente con el periodo en el que el personal ejecuta las actividades y con la cuantía de la contratación. La colegiatura y habilitación de los profesionales debe requerirse para el inicio de su participación efectiva, tanto para los titulados en el Perú como en el extranjero.',
            },
            {
              clase: 'tabla',
              id: 'experiencia_personal_clave',
              etiqueta: 'Experiencia del personal clave',
              columnas: [
                'Cargo y/o responsabilidad',
                'Cant.',
                'Tiempo de experiencia',
                'Cargo desempeñado',
                'Cómputo de experiencia',
              ],
              minimo: 1,
            },
            {
              clase: 'fijo',
              texto:
                'El postor debe señalar la denominación del puesto, cargo y/o posición; y tiempo de experiencia del personal clave propuesto (años, meses y días) en el Anexo N° 16, adjuntando en su oferta, copia simple de cualquiera de los siguientes documentos: (i) contratos y su respectiva conformidad; (ii) constancias; (iii) certificados; o (iv) cualquier otra documentación que, de manera fehaciente, demuestre la experiencia del personal propuesto.',
              fundamento: 'Plantilla — acreditación del personal clave',
            },
            {
              clase: 'tabla',
              id: 'calificaciones_personal_clave',
              etiqueta: 'Calificaciones del personal clave',
              instruccion:
                'Como requisito de calificación solo puede consignarse "grado de bachiller" o "título profesional", según el perfil definido por el área usuaria',
              columnas: ['Cargo y/o responsabilidad', 'Profesión', 'Grado o título profesional requerido'],
              minimo: 1,
            },
            {
              clase: 'fijo',
              texto:
                'El postor debe señalar los nombres y apellidos, documento de identidad, el nombre de la universidad o institución educativa que expidió el grado o título profesional, y el grado o título profesional obtenido en el Anexo N° 16, adjuntando en su oferta copia del grado de bachiller o título profesional. En caso se acredite estudios en el extranjero del personal clave, debe presentarse, adicionalmente, copia simple de la revalidación o reconocimiento del grado o título ante la SUNEDU.',
              fundamento: 'Plantilla — acreditación de calificaciones',
            },
          ],
        },
      ],
    },

    seccionSolicitante(),
  ],
};
