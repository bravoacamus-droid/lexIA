/**
 * Plantilla: REQUERIMIENTO — SERVICIO PARA CONTRATACIÓN DE EXPERTOS Y
 * GERENTES DE PROYECTOS
 *
 * Transcripción de "PROCEDIMIENTOS DE SELECCIÓN/2. SERVICIOS/
 * 5. Servicio de expertos y gerente de proyectos.docx".
 *
 * LO QUE LA HACE DISTINTA DE TODAS LAS DEMÁS: aquí el postor es una
 * PERSONA, no una empresa. Por eso la experiencia no se mide en monto
 * facturado sino en años y cargos desempeñados, y no aplican los topes
 * de tres veces la cuantía ni el 25% MYPE. Lo que sí aplica —y en las
 * plantillas de bienes no— es el tope del 10% a la suma de penalidades,
 * que esta plantilla enuncia expresamente.
 *
 * Además, el formato sirve a DOS figuras con necesidades de información
 * distintas: al experto hay que decirle a qué procedimientos de
 * selección asistirá, y al gerente de proyecto hay que entregarle los
 * datos del proyecto (contrato de obra, expediente técnico, CUI). Van
 * como secciones condicionales excluyentes.
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
  VALIDACION_ADELANTO,
  VALIDACION_PENALIDADES,
} from './comunes';

export const PLANTILLA_EXPERTOS_GERENTES: PlantillaRequerimiento = {
  id: 'ps-expertos-gerentes',
  familia: 'procedimiento_seleccion',
  objeto: 'servicios',
  encabezado: 'REQUERIMIENTO',
  subtitulo: 'SERVICIO PARA CONTRATACIÓN DE EXPERTOS Y GERENTES DE PROYECTOS',
  origen:
    'PROCEDIMIENTOS DE SELECCIÓN/2. SERVICIOS/5. Servicio de expertos y gerente de proyectos.docx',

  validaciones: [VALIDACION_ADELANTO, VALIDACION_PENALIDADES],

  secciones: [
    seccionEncabezado(
      'Indicar una breve descripción del requerimiento, mediante la denominación del servicio a ser contratado',
    ),

    seccionFinalidadPublica(
      'La contratación tiene por finalidad fortalecer la gestión integral del proyecto de inversión mediante la incorporación de un Gerente de Proyecto especializado, responsable de coordinar la planificación, ejecución, seguimiento y control del proyecto, contribuyendo al cumplimiento de los plazos, costos, calidad y objetivos estratégicos establecidos por la Entidad.',
    ),

    seccionObjetivo(
      'Contratar los servicios de un experto o gerente de proyecto para brindar dirección, gestión y asistencia técnica especializada durante la ejecución del proyecto o intervención a cargo de la Entidad, contribuyendo al cumplimiento de los objetivos institucionales, la adecuada gestión de riesgos y la obtención de los resultados previstos.',
      'Dirigir, coordinar y supervisar la ejecución de las actividades comprendidas en el proyecto o intervención asignada.\nRealizar el seguimiento permanente al cumplimiento del cronograma, presupuesto, alcance, calidad y gestión de riesgos del proyecto.\nCoordinar con las distintas áreas de la Entidad, consultores, contratistas, supervisores y demás actores involucrados.\nElaborar y presentar informes técnicos, reportes de avance, indicadores de desempeño y demás entregables establecidos contractualmente.\nFormular recomendaciones técnicas y de gestión orientadas a optimizar la ejecución del proyecto y prevenir desviaciones.\nContribuir al cumplimiento de los estándares técnicos, normativos y de gestión aplicables al proyecto.\nBrindar asesoría especializada para la toma de decisiones relacionadas con la gestión integral del proyecto.',
    ),

    seccionAntecedentes(
      'Describir la necesidad de contar con profesionales especializados que aporten conocimientos técnicos y experiencia en la gestión integral de proyectos, considerando la complejidad técnica, la magnitud de los recursos comprometidos y la necesidad de asegurar el cumplimiento de plazos, costos, estándares de calidad y objetivos del proyecto',
      'La Entidad ejecuta un proyecto de inversión cuya complejidad técnica y nivel de coordinación requieren la participación de un profesional especializado en gerencia de proyectos. En ese sentido, resulta necesaria la contratación de un Gerente de Proyecto que dirija y coordine la ejecución de las actividades técnicas y administrativas, realice el seguimiento del cronograma, presupuesto y riesgos, y promueva el cumplimiento de los objetivos del proyecto conforme a la normativa vigente y los estándares de gestión aplicables.',
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
            'Describir de manera general el servicio objeto de la contratación y los resultados concretos que se espera alcanzar',
          columnas: ['N.°', 'Descripción del servicio', 'Resultados esperados'],
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
      ],
    },

    {
      id: 'caracteristicas',
      titulo: 'CARACTERÍSTICAS Y CONDICIONES DEL SERVICIO A CONTRATAR',
      bloques: [
        {
          clase: 'nota',
          texto:
            'En esta sección NO corresponde precisar la documentación de capacidad legal del proveedor ni ninguna que corresponda a sus capacidades o calificaciones: esas van en los requisitos de calificación.',
        },
      ],
      subsecciones: [
        {
          id: 'informacion_experto',
          titulo: 'Información de la contratación (solo para Expertos)',
          condicion: 'es_experto',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Debe precisarse si la contratación es para uno o varios procedimientos de selección, el objeto de estos y las fechas estimadas de sus convocatorias, así como toda la información relevante que deba conocer el experto y los responsables de brindársela durante la ejecución contractual.',
            },
            {
              clase: 'tabla',
              id: 'informacion_experto',
              etiqueta: 'Información del procedimiento',
              columnas: ['Aspecto', 'Información a consignar'],
              minimo: 1,
            },
          ],
        },
        {
          id: 'informacion_proyecto',
          titulo: 'Información del Proyecto (solo para Gerentes de Proyecto)',
          condicion: 'es_gerente_proyecto',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Deben precisarse los datos del proyecto e incluirse la obligación de la Entidad de proporcionar toda la información relevante para la adecuada prestación del servicio (contrato de obra, información de preinversión, expediente técnico, entre otros).',
            },
            {
              clase: 'tabla',
              id: 'informacion_proyecto',
              etiqueta: 'Información del proyecto',
              columnas: ['Aspecto', 'Información a consignar'],
              minimo: 1,
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
              etiqueta: 'Actividades del contratista',
              instruccion:
                'Establecer las principales actividades que ejecutará el contratista, en relación directa con los resultados esperados, con verbos en infinitivo (analizar, elaborar, evaluar, revisar, coordinar, asesorar, emitir, supervisar, presentar, implementar, verificar). Precisar el procedimiento, metodología, estándares técnicos o lineamientos aplicables. Si no corresponde, consignar "NO APLICA"',
              ejemplo:
                'Actividad 1: Analizar la documentación técnica y contractual del proyecto.\nActividad 2: Coordinar permanentemente con la Entidad, supervisión y demás actores del proyecto.\nActividad 3: Monitorear el avance físico, financiero y contractual del proyecto.\nActividad 4: Identificar riesgos y proponer acciones preventivas o correctivas.',
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
                'No podrán exigirse documentos que dupliquen requisitos ya acreditados durante el procedimiento de selección ni que no guarden relación con la naturaleza del servicio. Para gerentes de proyecto, la constancia de colegiatura y habilitación profesional vigente es requisito obligatorio para el inicio de la ejecución, según el numeral 222.2 del artículo 222 del Reglamento.',
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
          id: 'plan_trabajo',
          titulo: 'Plan de trabajo',
          condicion: 'requiere_plan_trabajo',
          bloques: [
            {
              clase: 'nota',
              texto:
                'La aprobación del Plan de Trabajo no libera al contratista de la responsabilidad por el cumplimiento integral de sus obligaciones, ni limita las facultades de dirección, supervisión o control de la Entidad. Si el servicio no lo requiere, consignar "NO APLICA".',
            },
            {
              clase: 'redactado',
              id: 'plan_trabajo',
              etiqueta: 'Plan de trabajo',
              instruccion:
                'Establecer el contenido mínimo del Plan de Trabajo, el plazo para su presentación, el medio de presentación y el plazo con el que contará el área usuaria para su revisión y aprobación',
              ejemplo:
                'La Entidad requerirá la presentación del Plan de Trabajo dentro de los cinco (5) días calendario siguientes al perfeccionamiento del contrato.\n\nEl Plan de Trabajo deberá contener, como mínimo: objetivos del servicio; alcance de la gestión del proyecto; metodología de dirección y seguimiento; organización del servicio y responsables; cronograma general de actividades; programación de reuniones de coordinación; estrategia para el seguimiento del alcance, plazo, costo y calidad; metodología para la identificación y seguimiento de riesgos; relación de entregables y cronograma de presentación; y mecanismos de comunicación con la Entidad y demás actores.\n\nSerá presentado mediante la Mesa de Partes Virtual o el correo electrónico institucional y evaluado por el área usuaria dentro del plazo máximo de tres (3) días hábiles. De no emitirse pronunciamiento dentro de dicho plazo, el Plan de Trabajo se entenderá aprobado.',
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
                  valor: 'esquema_mixto',
                  texto:
                    'El contrato se rige por un Esquema mixto, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando la entidad contratante puede utilizar más de una modalidad de pago en un mismo contrato.',
                },
                {
                  valor: 'honorario_comision',
                  texto:
                    'El contrato se rige por la modalidad de pago en base a un honorario fijo y una comisión de éxito, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando la entidad contratante requiere que el postor formule su oferta contemplando un monto fijo y un monto adicional como incentivo pagado al alcanzarse el resultado esperado.',
                },
                {
                  valor: 'consumo',
                  texto:
                    'El contrato se rige por la modalidad de Pago por consumo, de conformidad con el artículo 130 del Reglamento. Es aplicable a servicios de consumo variable cuando la unidad de medida del pago sea la hora de labor profesional especializada. Previo a cualquier actividad, el contratista comunica a la entidad contratante la estimación de horas, debiendo contar con la aceptación expresa del responsable de dar conformidad.',
                },
              ],
            },
          ],
        },
        {
          id: 'sistema_entrega',
          titulo: 'Sistema de entrega para servicios',
          bloques: [
            {
              // Fijo, sin alternativa: la plantilla lo resuelve de una
              // vez para este objeto contractual.
              clase: 'fijo',
              texto: 'No aplica.',
              fundamento: 'Plantilla — expertos y gerentes de proyectos',
            },
          ],
        },
        {
          id: 'plazo_prestacion',
          titulo: 'Plazo de prestación',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'Los servicios materia de la presente convocatoria se prestan en el plazo de {{plazo_servicio}}, días calendario, computados a partir del día siguiente de la notificación de la orden de servicio o suscripción del contrato o del cumplimiento de la condición establecida en los Términos de Referencia, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'plazo_servicio',
                  etiqueta: 'Plazo de prestación',
                  ayuda: 'Consignar el plazo de prestación de los servicios',
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
                'Indicar como mínimo la denominación del entregable, la oportunidad o plazo de presentación, el contenido mínimo y el medio de presentación. Si el servicio no requiere entregables, consignar "NO APLICA"',
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

        // Esta plantilla SÍ enuncia el tope del 10%.
        seccionPenalidades('larga', true),

        {
          id: 'subcontratacion',
          titulo: 'Subcontratación',
          bloques: [
            {
              clase: 'fijo',
              texto: 'La subcontratación se encuentra prohibida en esta contratación.',
              fundamento: 'Plantilla — expertos y gerentes de proyectos',
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
              clase: 'nota',
              texto:
                'Los recursos y facilidades que proporcione la Entidad deberán guardar relación con el objeto del servicio y no implicarán la transferencia de responsabilidades que correspondan al contratista. Si no corresponde, consignar "NO APLICA".',
            },
            {
              clase: 'redactado',
              id: 'recursos_entidad',
              etiqueta: 'Recursos provistos por la Entidad',
              instruccion:
                'Precisar los recursos, información, documentación, accesos y demás facilidades necesarias para la adecuada ejecución de la prestación',
              ejemplo:
                'Designar un servidor responsable de la coordinación del servicio.\nProporcionar el expediente de contratación, requerimiento, estudio de mercado, bases, consultas, observaciones, informes técnicos y demás documentación necesaria para el desarrollo de la asistencia técnica.\nFacilitar el acceso a la información institucional relacionada con el procedimiento de selección, respetando las restricciones de confidencialidad que resulten aplicables.',
              extension: 'lista',
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
                'Precisar las verificaciones técnicas, revisiones documentarias y validaciones que la Entidad realizará para comprobar que el servicio se ejecutó conforme a los Términos de Referencia, el contrato y los resultados esperados. La conformidad solo se emite cuando las verificaciones acrediten el cumplimiento integral',
              ejemplo:
                'La revisión del cumplimiento de los Términos de Referencia.\nLa evaluación del cumplimiento de las funciones asignadas.\nLa verificación de los informes de seguimiento y control del proyecto.\nLa revisión del monitoreo efectuado respecto del alcance, plazo, costo, calidad y riesgos.\nLa evaluación de las recomendaciones formuladas para la toma de decisiones.\nLa verificación del cumplimiento del cronograma de actividades y de los entregables comprometidos.\nLa revisión de la documentación técnica que sustenta los informes presentados.',
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
                'Establecer los recursos, medios, infraestructura, equipos informáticos, software, licencias, herramientas tecnológicas, personal o autorizaciones que el contratista debe proporcionar, y las obligaciones que asume (observancia del Plan de Trabajo, cumplimiento de plazos, calidad técnica de los entregables, confidencialidad, disponibilidad del personal propuesto). Si no corresponde exigir algún recurso, consignar "NO APLICA"',
              ejemplo:
                'Asumir todos los costos derivados de los equipos, transporte, comunicaciones y demás recursos necesarios para la ejecución del servicio, salvo aquellos que expresamente sean proporcionados por la Entidad.\nGuardar absoluta reserva y confidencialidad respecto de toda la información a la que tenga acceso durante la ejecución contractual.\nCumplir las disposiciones emitidas por el coordinador o responsable designado por la Entidad, siempre que se encuentren dentro del marco contractual.\nCumplir la normativa aplicable, así como las políticas internas de seguridad, acceso a instalaciones y uso de la información de la Entidad.',
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
                'En el caso de gerentes de proyecto, el numeral 222.2 del artículo 222 del Reglamento establece que debe ser un profesional colegiado y habilitado de la carrera de ingeniería, arquitectura o afines a la gestión de proyectos, por lo que la colegiatura debe requerirse de manera obligatoria al inicio de la ejecución del servicio.',
            },
            {
              clase: 'redactado',
              id: 'capacidad_legal_requisito',
              etiqueta: 'Requisitos',
              instruccion:
                'Incluir los requisitos relacionados a la habilitación para llevar a cabo la actividad materia de la contratación',
              extension: 'parrafo',
            },
            {
              clase: 'redactado',
              id: 'capacidad_legal_acreditacion',
              etiqueta: 'Acreditación',
              instruccion: 'Incluir el documento con el que se acredita el requisito de habilitación',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'formacion_academica',
          titulo: 'Formación académica',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Como requisito de calificación solo puede consignarse "grado de bachiller" o "título profesional", según el perfil definido por el área usuaria. Conforme al artículo 16 de la Ley N° 30512, los títulos que se otorgan según el nivel del programa formativo son título profesional, título profesional técnico y título de segunda especialidad.',
            },
            {
              clase: 'tabla',
              id: 'formacion_academica',
              etiqueta: 'Formación académica exigida',
              columnas: ['Cargo y/o responsabilidad', 'Profesión', 'Grado o título profesional requerido'],
              minimo: 1,
            },
            {
              clase: 'fijo',
              texto:
                'El postor debe señalar su nombre y apellidos, documento de identidad, el nombre de la universidad o institución educativa que expidió el grado o título profesional, y el grado o título profesional obtenido en el Anexo N° 15, adjuntando en su oferta copia del grado de bachiller o título profesional. En caso se acredite estudios en el extranjero, debe presentarse, adicionalmente, copia simple de la revalidación o reconocimiento del grado o título ante la SUNEDU.',
              fundamento: 'Plantilla — acreditación de formación académica',
            },
          ],
        },
        {
          id: 'certificaciones',
          titulo: 'Certificaciones del postor',
          condicion: 'exige_certificaciones',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Para los gerentes de proyecto, incluir la certificación oficial en el contrato estandarizado elegido; para los expertos, la certificación que la entidad contratante sustente en la estrategia de contratación.',
            },
            {
              clase: 'tabla',
              id: 'certificaciones',
              etiqueta: 'Certificaciones exigidas',
              columnas: ['Cargo y/o responsabilidad', 'Materia o área de capacitación', 'Cantidad de horas'],
              minimo: 1,
            },
            { clase: 'fijo', texto: 'Se acredita con la presentación de la certificación correspondiente.' },
          ],
        },
        {
          id: 'experiencia_postor',
          titulo: 'Experiencia del postor',
          bloques: [
            {
              clase: 'nota',
              texto:
                'La entidad puede considerar un tiempo de experiencia mayor al establecido en los artículos 57 y 222 del Reglamento, siempre que sea razonable y congruente con el periodo en el que el postor ejecuta las actividades, de forma que no restrinja la participación. Al calificar debe valorarse de manera integral la documentación: aunque la denominación no coincida literalmente con la de las bases, se valida la experiencia si las actividades realizadas corresponden a la especialidad requerida.',
            },
            {
              // Aquí la experiencia se mide en años y cargos, no en
              // monto facturado. Por eso no hay tope de tres veces la
              // cuantía ni régimen MYPE en esta plantilla.
              clase: 'tabla',
              id: 'experiencia_postor',
              etiqueta: 'Experiencia mínima requerida',
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
              clase: 'parrafo',
              texto: 'Se consideran como trabajos o prestaciones similares a los siguientes {{trabajos_similares}}.',
              campos: [
                {
                  clase: 'campo',
                  id: 'trabajos_similares',
                  etiqueta: 'Trabajos o prestaciones similares',
                  ayuda: 'Consignar los trabajos o prestaciones similares',
                  tipo: 'texto_largo',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'fijo',
              texto:
                'La experiencia del postor se acredita con copia simple de cualquiera de los siguientes documentos: (i) contratos y su respectiva conformidad; (ii) constancias; (iii) certificados; o (iv) cualquier otra documentación que, de manera fehaciente, demuestre la experiencia del postor.',
              fundamento: 'Plantilla — acreditación de experiencia, texto invariable',
            },
            {
              clase: 'fijo',
              texto:
                'Los documentos que acreditan la experiencia deben incluir los nombres y apellidos del postor, el cargo desempeñado, el plazo de la prestación indicando el día, mes y año de inicio y culminación, el nombre de la entidad u organización que emite el documento, la fecha de emisión y nombres y apellidos de quien suscribe el documento.',
            },
            {
              clase: 'fijo',
              texto:
                'En caso los documentos que acreditan la experiencia establezcan está en meses sin especificar los días se debe considerar el mes completo. Se considera aquella experiencia que no tenga una antigüedad mayor a veinticinco años anteriores a la fecha de la presentación de ofertas (Anexo N° 11). De presentarse experiencia ejecutada paralelamente (traslape), para el cómputo de la misma sólo se considera una vez el periodo traslapado. En ningún caso corresponde exigir que el postor acredite experiencia en más de un cargo.',
            },
          ],
        },
      ],
    },

    seccionSolicitante(),
  ],
};
