/**
 * Plantilla: REQUERIMIENTO — SERVICIO DE CONSULTORÍA DE OBRAS
 *
 * Transcripción de "PROCEDIMIENTOS DE SELECCIÓN/3. CONSULTORÍA DE OBRAS/
 * 1. Servicio de consultoría de obras.docx".
 *
 * ES UN ARCHIVO QUE CUBRE CUATRO SERVICIOS, como confirmó César: no
 * faltaban tres plantillas, están todas aquí dentro.
 *
 *   1. Formulación de inversiones con componente de edificación o
 *      infraestructura (fichas técnicas, estudios de preinversión).
 *   2. Elaboración de expedientes técnicos de obra.
 *   3. Supervisión de la elaboración del expediente técnico.
 *   4. Supervisión de la ejecución de obras.
 *
 * Los cuatro comparten el esqueleto, pero difieren en cosas que no son
 * de detalle: el sistema de entrega no aplica a los dos servicios de
 * supervisión; el incentivo por respuesta rápida SOLO existe para ellos;
 * y el plazo de responsabilidad se cuenta desde hitos distintos en cada
 * caso. Por eso el servicio concreto es una condición del formulario y
 * varios apartados dependen de ella.
 *
 * Es la plantilla más larga de las quince: 1.405 líneas.
 */
import type { PlantillaRequerimiento } from '../plantilla-tipos';
import {
  seccionEncabezado,
  seccionFinalidadPublica,
  seccionObjetivo,
  seccionPenalidades,
  seccionControversias,
  seccionAnticorrupcion,
  seccionSolicitante,
  bloquesPago,
  EXPERIENCIA_TITULAR,
  VALIDACION_ADELANTO,
  VALIDACION_EXPERIENCIA_CONSULTORIA,
} from './comunes';

export const PLANTILLA_CONSULTORIA_OBRAS: PlantillaRequerimiento = {
  id: 'ps-consultoria-obras',
  familia: 'procedimiento_seleccion',
  objeto: 'consultoria_obras',
  encabezado: 'REQUERIMIENTO',
  subtitulo: 'SERVICIO DE CONSULTORÍA DE OBRAS',
  origen: 'PROCEDIMIENTOS DE SELECCIÓN/3. CONSULTORÍA DE OBRAS/1. Servicio de consultoría de obras.docx',

  validaciones: [
    VALIDACION_ADELANTO,
    VALIDACION_EXPERIENCIA_CONSULTORIA,
    {
      id: 'responsabilidad_min',
      descripcion:
        'El plazo de responsabilidad del consultor no puede ser menor de tres (3) años. En supervisión de obra, no menor al plazo de responsabilidad del contratista ejecutor supervisado.',
      fundamento: 'Plantilla — responsabilidad del consultor',
    },
  ],

  secciones: [
    seccionEncabezado(
      'Indicar una breve descripción del requerimiento, mediante la denominación del servicio de consultoría de obra a ser contratado',
    ),

    seccionFinalidadPublica(),
    seccionObjetivo(),

    {
      // El original titula esta sección solo "JUSTIFICACIÓN", sin
      // "ANTECEDENTES", a diferencia de las otras catorce.
      id: 'justificacion',
      titulo: 'JUSTIFICACIÓN DE LA NECESIDAD DE LA CONTRATACIÓN',
      bloques: [
        {
          clase: 'redactado',
          id: 'antecedentes',
          etiqueta: 'Justificación de la necesidad',
          instruccion:
            'Explicar el motivo por el cual se efectúa el requerimiento del servicio de consultoría de obra, mencionando y adjuntando los documentos fuente que lo sustentan',
          extension: 'varios_parrafos',
        },
      ],
    },

    {
      id: 'descripcion_general',
      titulo: 'DESCRIPCIÓN GENERAL DEL REQUERIMIENTO',
      bloques: [
        {
          // De qué servicio se trata condiciona medio documento, así que
          // se pregunta de entrada.
          clase: 'opcion',
          id: 'tipo_consultoria',
          etiqueta: 'Servicio de consultoría de obra',
          instruccion:
            'Precisar cuál de los cuatro servicios se contrata: de ello dependen el sistema de entrega, los incentivos aplicables y el plazo de responsabilidad',
          opciones: [
            {
              valor: 'formulacion',
              texto:
                'El servicio corresponde a la formulación de inversiones con componente de edificación o infraestructura.',
            },
            {
              valor: 'expediente',
              texto: 'El servicio corresponde a la elaboración del expediente técnico de obra.',
            },
            {
              valor: 'supervision_expediente',
              texto: 'El servicio corresponde a la supervisión de la elaboración del expediente técnico de obra.',
            },
            {
              valor: 'supervision_obra',
              texto: 'El servicio corresponde a la supervisión de la ejecución de obra.',
            },
          ],
        },
        {
          clase: 'campo',
          id: 'nombre_proyecto',
          etiqueta: 'Nombre del proyecto de inversión / IOARR / actividad',
          ayuda: 'Consignar la denominación completa del proyecto',
          tipo: 'texto',
          obligatorio: true,
        },
        {
          clase: 'campo',
          id: 'cui',
          etiqueta: 'Código Único de Inversión (CUI) o código idea',
          ayuda: 'Consignar el CUI, de corresponder',
          tipo: 'texto',
          obligatorio: true,
        },
        {
          clase: 'campo',
          id: 'ubicacion',
          etiqueta: 'Ubicación',
          ayuda: 'Consignar distrito, provincia y departamento',
          tipo: 'texto',
          obligatorio: true,
        },
        {
          clase: 'campo',
          id: 'especialidad',
          etiqueta: 'Especialidad',
          ayuda:
            'Consignar la especialidad de acuerdo con el artículo 157, según el listado que la Dirección General de Abastecimiento apruebe',
          tipo: 'texto',
          obligatorio: true,
        },
        {
          clase: 'campo',
          id: 'subespecialidad',
          etiqueta: 'Subespecialidad',
          ayuda: 'Consignar la subespecialidad de acuerdo con el artículo 157',
          tipo: 'texto',
          obligatorio: true,
        },
        {
          clase: 'campo',
          id: 'tipologia',
          etiqueta: 'Tipología',
          ayuda: 'Consignar la tipología de acuerdo con el artículo 157',
          tipo: 'texto',
          obligatorio: true,
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
                'Describir qué comprende el servicio de consultoría de obra, cómo debe ejecutarse, qué resultados se esperan alcanzar, qué condiciones técnicas mínimas debe cumplir, qué metodologías, procedimientos y estándares técnicos deberán observarse y qué normativa técnica resulta aplicable',
              ejemplo:
                'Recopilación y análisis de información existente.\nDesarrollo de estudios básicos requeridos para el proyecto.\nElaboración de planos de ingeniería.\nCompatibilización de especialidades.\nLevantamiento de observaciones formuladas por la Entidad.\nSustentación técnica de los entregables.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'metas_fisicas',
          titulo: 'Metas físicas u objetivos funcionales',
          bloques: [
            {
              clase: 'redactado',
              id: 'metas_fisicas',
              etiqueta: 'Metas físicas u objetivos funcionales',
              instruccion:
                'Consignar las metas físicas del proyecto o, cuando no estén definidas, los objetivos funcionales en términos de desempeño y operación esperados',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'metodologias_colaborativas',
          titulo: 'Empleo de metodologías colaborativas',
          condicion: 'usa_metodologias_colaborativas',
          bloques: [
            {
              clase: 'redactado',
              id: 'metodologias_colaborativas',
              etiqueta: 'Metodologías colaborativas',
              instruccion:
                'Precisar los requerimientos BIM u otras metodologías colaborativas: niveles de información, estándares, protocolos, formatos de intercambio y condiciones del Entorno Común de Datos (CDE). Si no se prevé, consignar "NO APLICA"',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'gestion_calidad',
          titulo: 'Gestión de la calidad',
          bloques: [
            {
              clase: 'redactado',
              id: 'gestion_calidad',
              etiqueta: 'Gestión de la calidad',
              instruccion:
                'Establecer los criterios de calidad aplicables al servicio',
              ejemplo:
                'Cumplimiento de la normativa técnica y sectorial aplicable.\nAplicación de normas de diseño, construcción y seguridad vigentes.\nProcedimientos internos de revisión y control de calidad de los entregables.\nControl de versiones y trazabilidad de la información técnica generada.\nAplicación de metodologías colaborativas y BIM, cuando corresponda.\nAtención y levantamiento oportuno de observaciones formuladas por la Entidad.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'situacion_proyecto',
          titulo: 'Situación actual del proyecto y disponibilidad del área',
          bloques: [
            {
              clase: 'redactado',
              id: 'situacion_proyecto',
              etiqueta: 'Situación del proyecto y del área',
              instruccion:
                'Precisar los antecedentes y estado actual de la inversión, el nivel de avance en el ciclo de inversión, la información técnica disponible, la situación del saneamiento físico legal del terreno, la libre disponibilidad del área o infraestructura existente y la existencia de interferencias, servidumbres, afectaciones o restricciones',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'criterios_diseno',
          titulo: 'Criterios y principios de diseño del proyecto',
          condicion: 'tiene_criterios_diseno',
          bloques: [
            {
              clase: 'redactado',
              id: 'criterios_diseno',
              etiqueta: 'Criterios y principios de diseño',
              instruccion:
                'Establecer los criterios y principios que debe observar el diseño del proyecto',
              ejemplo:
                'Ambientes que favorezcan los procesos de enseñanza y aprendizaje.\nAccesibilidad universal para estudiantes, docentes y visitantes.\nEspacios flexibles que permitan futuras ampliaciones.\nEstrategias de confort térmico y eficiencia energética.\nSeguridad estructural y evacuación ante emergencias.\nIntegración de áreas recreativas y espacios de convivencia escolar.',
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
              clase: 'tabla',
              id: 'documentacion_perfeccionamiento',
              etiqueta: 'Documentación para el perfeccionamiento',
              instruccion:
                'Indicar la documentación adicional que el adjudicatario debe presentar, directamente relacionada con el objeto de la consultoría',
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
                'Precisar el tipo de seguro requerido, las coberturas mínimas, el período de vigencia y la oportunidad para su presentación',
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
                'Delimitar el contenido, condiciones y oportunidad de entrega del plan, y el plazo con el que cuenta el área usuaria para su aprobación',
              ejemplo:
                'Objetivos y alcance de la consultoría.\nMetodología para el desarrollo de los estudios y diseños.\nCronograma detallado de ejecución.\nProgramación de actividades de campo y gabinete.\nRelación del personal clave y funciones asignadas.\nCronograma de elaboración y presentación de entregables.\nMecanismos de control de calidad.\nIdentificación de riesgos y medidas de mitigación.\nMecanismos de coordinación con la Entidad.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'anexos_tecnicos',
          titulo: 'Anexos técnicos',
          bloques: [
            {
              clase: 'redactado',
              id: 'anexos_tecnicos',
              etiqueta: 'Anexos técnicos',
              instruccion:
                'Incorporar los anexos que correspondan al servicio contratado. Para elaboración de expediente técnico: estudio de mecánica de suelos, EVAR, estudios de gestión de riesgos, levantamiento topográfico, estudios hidrológicos e hidráulicos, geológicos y geotécnicos, evaluaciones estructurales, inventario de infraestructura existente, requerimientos de mobiliario y equipamiento, y guías para la elaboración del expediente. Para supervisión de obra: expediente técnico aprobado, contrato de ejecución, bases integradas, calendario de avance, cronograma valorizado y planes de seguridad y manejo ambiental',
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
          id: 'sistema_entrega',
          titulo: 'Sistema de entrega para servicios',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Cuando el objeto corresponda a la supervisión de elaboración de expediente técnico o a la supervisión de ejecución de obra, debe consignarse "NO APLICA", por no corresponder a ninguno de los sistemas de entrega regulados para la formulación y diseño de inversiones.',
            },
            {
              clase: 'opcion',
              id: 'sistema_entrega',
              etiqueta: 'Sistema de entrega',
              instruccion:
                'Consignar el sistema de entrega determinado en la estrategia de contratación, de conformidad con los artículos 159 y 160 del Reglamento',
              opciones: [
                {
                  valor: 'no_aplica',
                  texto:
                    'No aplica, por no corresponder a ninguno de los sistemas de entrega regulados para la formulación y diseño de inversiones.',
                },
                {
                  valor: 'solo_formulacion',
                  texto:
                    'El contrato se rige por el sistema de entrega de Solo formulación o solo diseño, de conformidad con los artículos 159 y 160 del Reglamento. Se contrata a un consultor para que realice todas las actividades correspondientes a la formulación y evaluación en el marco del SNPMGI y, una vez obtenida la viabilidad, a otro consultor para la elaboración del expediente técnico.',
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
                'El servicio materia de la presente convocatoria se presta en el plazo de {{plazo_servicio}} días calendario, computados a partir del día siguiente de la suscripción del contrato o del cumplimiento de la condición establecida en los Términos de Referencia, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'plazo_servicio',
                  etiqueta: 'Plazo de ejecución',
                  ayuda:
                    'Consignar el plazo de prestación de la consultoría de obra: formulación, elaboración de expediente técnico, supervisión de la elaboración o supervisión de ejecución de obra',
                  tipo: 'dias',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'nota',
              texto:
                'El inicio del plazo para la formulación y/o elaboración del diseño se computa desde el día siguiente de cumplidas las condiciones del numeral 176.2 del artículo 176 del Reglamento. La sumatoria de los plazos de los entregables debe guardar concordancia con el plazo total. El plazo de elaboración NO comprende los períodos de revisión por parte de la Entidad o la supervisión, ni el plazo otorgado al consultor para la primera subsanación de observaciones, conforme al numeral 144.7 del artículo 144 del Reglamento.',
            },
          ],
        },
        {
          id: 'lugar_prestacion',
          titulo: 'Lugar de prestación de servicio',
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
                'Precisar la denominación de cada entregable, el plazo de presentación, el contenido mínimo y el medio de presentación',
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
                'El otorgamiento de adelantos directos es FACULTATIVO y procede solo cuando la Entidad determine su necesidad y así se haya sustentado en la estrategia de contratación, conforme al artículo 66 de la Ley N° 32069 y al artículo 178 de su Reglamento. Si no corresponde, consignar "NO APLICA".',
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
            {
              clase: 'fijo',
              texto:
                'El contratista deberá solicitar el adelanto dentro de los diez (10) días calendario contados desde el día siguiente del perfeccionamiento del contrato o desde el cumplimiento de la condición establecida para su otorgamiento, según corresponda, adjuntando:',
              fundamento: 'Ley N° 32069, art. 66; Reglamento, art. 178',
            },
            {
              clase: 'fijo',
              texto: 'Solicitud de adelanto.\nComprobante de pago correspondiente.',
              fundamento: 'Plantilla — documentos para el adelanto',
            },
          ],
        },

        // Su .docx cierra las penalidades con el tope conjunto del 10%.
        seccionPenalidades('larga', true),

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
        {
          id: 'reajuste',
          titulo: 'Reajuste de los pagos',
          condicion: 'tiene_reajuste',
          bloques: [
            {
              clase: 'redactado',
              id: 'reajuste',
              etiqueta: 'Fórmula de reajuste',
              instruccion:
                'Consignar las fórmulas de reajuste correspondientes y el procedimiento aplicable',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'incentivos',
          titulo: 'Aplicación de incentivos',
          condicion: 'aplica_incentivos',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Aplica únicamente cuando la Entidad haya previsto la incorporación de incentivos en la estrategia de contratación, conforme al artículo 162 del Reglamento. Deben ser objetivos, verificables, razonables y estar directamente relacionados con la mejora de los resultados esperados. Si no se prevén, consignar "NO APLICA".',
            },
            {
              // Este incentivo NO existe para los otros dos servicios de
              // esta misma plantilla.
              clase: 'nota',
              texto:
                'El incentivo por respuesta rápida de la supervisión es aplicable ÚNICAMENTE en supervisión de elaboración de expediente técnico y supervisión de ejecución de obra. Procede cuando el supervisor cumple indicadores de desempeño previamente establecidos, relacionados con la oportunidad, calidad y eficiencia de sus pronunciamientos técnicos. La Entidad debe definir expresamente los indicadores, la metodología de medición y la forma de acreditación.',
            },
            {
              clase: 'redactado',
              id: 'incentivos',
              etiqueta: 'Incentivos previstos',
              instruccion:
                'Precisar los incentivos, sus indicadores de desempeño, la metodología de medición, el porcentaje de bonificación y la forma de acreditación y otorgamiento',
              extension: 'varios_parrafos',
            },
          ],
        },

        seccionControversias(true, 'servicios'),

        {
          id: 'plazo_respuestas',
          titulo: 'Plazo para respuestas entre las partes',
          bloques: [
            {
              clase: 'redactado',
              id: 'plazo_respuestas',
              etiqueta: 'Plazo para respuestas',
              instruccion:
                'Consignar el plazo máximo de respuesta de las partes sobre aspectos vinculados con la ejecución contractual no previstos específicamente en el Reglamento',
              extension: 'parrafo',
            },
          ],
        },
        {
          // Aquí no se llama "vicios ocultos" a secas: la responsabilidad
          // del consultor abarca errores y omisiones de diseño, que es
          // otra cosa.
          id: 'responsabilidad_consultor',
          titulo: 'Responsabilidad del consultor por vicios ocultos, errores u omisiones',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'Durante el plazo de responsabilidad establecido en la normativa de contrataciones públicas, el consultor será responsable de los errores, omisiones, deficiencias técnicas, incompatibilidades, deficiencias de diseño, incumplimientos normativos o cualquier otra situación atribuible a la elaboración o supervisión de los estudios, expedientes técnicos o servicios de consultoría contratados.',
              fundamento: 'Plantilla — responsabilidad del consultor',
            },
            {
              clase: 'redactado',
              id: 'responsabilidad_alcance',
              etiqueta: 'Alcance de la responsabilidad',
              instruccion:
                'Establecer las responsabilidades del contratista según el servicio. En elaboración de expedientes técnicos: errores de diseño, deficiencias en memorias descriptivas, especificaciones o planos, incompatibilidades entre especialidades, deficiencias en metrados, presupuestos o análisis de costos, omisiones de información técnica relevante e incumplimiento de normas técnicas. En supervisión de elaboración: deficiencias en la revisión y control de calidad del expediente, omisión de observaciones relevantes e incumplimiento de las obligaciones de supervisión. En supervisión de obra: deficiencias en el control técnico de la ejecución, omisión de observaciones sobre incumplimientos contractuales y falta de control de calidad',
              extension: 'lista',
            },
            {
              clase: 'campo',
              id: 'plazo_responsabilidad',
              etiqueta: 'Plazo de responsabilidad',
              ayuda:
                'No menor de tres (3) años desde la conformidad de la obra ejecutada o desde la aprobación del estudio. En supervisión de obra, no menor al plazo de responsabilidad del contratista ejecutor supervisado, computado desde la conformidad de la recepción',
              tipo: 'texto',
              obligatorio: true,
              validacion: 'responsabilidad_min',
            },
          ],
        },

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
          bloques: [
            {
              clase: 'redactado',
              id: 'recursos_entidad',
              etiqueta: 'Recursos e información provistos por la Entidad',
              instruccion:
                'Listar la información y facilidades que la Entidad entregará según el servicio: términos de referencia, ficha técnica o estudio de preinversión, declaratoria de viabilidad, información topográfica y catastral, estudios básicos existentes, planos, certificados de parámetros urbanísticos, títulos de propiedad; y para supervisión, el expediente técnico aprobado, el contrato de ejecución, las bases integradas y los calendarios',
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
              etiqueta: 'Órgano que brindará la conformidad',
              instruccion:
                'Precisar el órgano competente para emitir la conformidad, qué se verifica en cada entregable y en qué plazo',
              extension: 'varios_parrafos',
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
                'Contar con RUC activo y habido en la SUNAT.\nRealizar actividades en el objeto de la contratación.\nPersona natural y/o jurídica.',
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
                'Establecer los recursos humanos, medios técnicos, software especializado, licencias, equipos y metodologías que el consultor debe proporcionar, y las obligaciones que asume',
              ejemplo:
                'Mantener la confidencialidad de la información proporcionada por la Entidad.\nUtilizar software especializado compatible con la naturaleza del servicio.\nEjecutar la consultoría conforme al plan de trabajo, la metodología y el cronograma aprobados.\nParticipar en las reuniones de coordinación y sustentación técnica convocadas por la Entidad.\nLevantar oportunamente las observaciones formuladas a los entregables.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'personal_clave',
          titulo: 'Personal clave',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Pueden ser personal clave los profesionales especialistas esenciales para ejecutar la prestación. NO son personal clave quienes brinden labores de asistencia administrativa o técnica, labores operativas o laboren como obreros.',
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
                'Detallar el equipamiento requerido que no tiene condición de estratégico',
              columnas: ['Equipamiento', 'Cant.', 'Características mínimas'],
              minimo: 1,
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
              clase: 'nota',
              texto:
                'La especialidad la determina la entidad conforme al artículo 157 del Reglamento y el listado aprobado mediante Resolución Directoral N° 0016-2025-EF/54.01. No pueden consignarse subespecialidades "afines" ni tipologías específicas.',
            },
            {
              clase: 'parrafo',
              texto:
                'El postor debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto}}, en {{objeto_experiencia}} en la especialidad y subespecialidades determinadas, durante los veinticinco años anteriores a la fecha de la presentación de ofertas que se computan desde la fecha de la conformidad o emisión del comprobante de pago final, según corresponda.',
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
                {
                  clase: 'campo',
                  id: 'objeto_experiencia',
                  etiqueta: 'Objeto de la experiencia',
                  ayuda:
                    'Consignar: formulación de inversiones con componente edificación o infraestructura / elaboración de expedientes técnicos de obras / supervisión de la elaboración de expediente técnico de obra / supervisión de ejecución de obras',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            { clase: 'fijo', texto: 'Se consideran la siguiente especialidad y subespecialidades como experiencia del postor:' },
            {
              clase: 'tabla',
              id: 'especialidades',
              etiqueta: 'Especialidad y subespecialidades',
              columnas: ['N.°', 'Especialidad', 'Subespecialidad(es) admitida(s)'],
              minimo: 1,
            },
            {
              clase: 'fijo',
              texto:
                'La experiencia del postor en la especialidad se acredita con un máximo de veinte contrataciones, mediante copia simple de: (i) contratos u órdenes de servicios, y su respectiva conformidad o constancia de prestación o liquidación; o (ii) comprobantes de pago cuya cancelación se acredite documental y fehacientemente, con constancia de depósito, nota de abono, reporte de estado de cuenta o cualquier otro documento emitido por entidad del sistema financiero que acredite el abono o mediante cancelación en el mismo comprobante de pago o comprobante de retención electrónico emitido por SUNAT por la retención del IGV. En caso el postor sustente su experiencia en la especialidad mediante contrataciones realizadas con privados, para acreditarla debe presentar de forma obligatoria lo indicado en el numeral (ii) del presente párrafo; no es posible que acredite su experiencia únicamente con la presentación de contratos u órdenes de servicio con conformidad o constancia de prestación.',
              fundamento: 'Plantilla — acreditación de experiencia, texto invariable',
            },
            {
              clase: 'fijo',
              texto:
                'En caso los postores presenten varios comprobantes de pago para acreditar una sola contratación, se debe acreditar que corresponden a dicha contratación; de lo contrario, se asume que los comprobantes acreditan contrataciones independientes, en cuyo caso solo se considerará, para la evaluación, las veinte primeras contrataciones indicadas en el Anexo Nº 10 referido a la Experiencia del Postor en la Especialidad.',
            },
            {
              clase: 'fijo',
              texto:
                'Se precisa que, en los casos en que se acredite la experiencia respecto de contratos de formulación y diseño, así como de diseño y construcción, se debe verificar que el componente se encuentre concluido. El concepto componente debe ser entendido en el marco de lo dispuesto en la definición 13 del Anexo I del Reglamento de la Ley 32069.',
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
                'Si el postor acredita experiencia de otra persona jurídica como consecuencia de una reorganización societaria, debe presentar adicionalmente el Anexo N° 11.',
            },
            {
              clase: 'fijo',
              texto:
                'Las personas jurídicas resultantes de un proceso de reorganización societaria no pueden acreditar como experiencia del postor en la especialidad aquella que le hubieran transmitido como parte de dicha reorganización las personas jurídicas sancionadas con inhabilitación vigente o definitiva.',
            },
            {
              clase: 'fijo',
              texto:
                'Cuando en los contratos, órdenes de servicios o comprobantes de pago el monto facturado se encuentre expresado en moneda extranjera, debe indicarse el tipo de cambio venta publicado por la Superintendencia de Banca, Seguros y AFP correspondiente a la fecha de suscripción del contrato, de emisión de la orden de compra o de cancelación del comprobante de pago, según corresponda.',
            },
            {
              clase: 'fijo',
              texto:
                'Sin perjuicio de lo anterior, los postores deben llenar y presentar el Anexo Nº 10 referido a la Experiencia del Postor en la Especialidad.',
            },
          ],
        },
        {
          id: 'capacidad_tecnica',
          titulo: 'Capacidad técnica y profesional',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Como requisito de calificación solo puede consignarse "grado de bachiller" o "título profesional", según el perfil del personal clave definido por el área usuaria. El tiempo de experiencia mínimo debe ser razonable y congruente con el periodo en el que el personal ejecuta las actividades y con la cuantía de la contratación.',
            },
            {
              clase: 'tabla',
              id: 'calificaciones_personal_clave',
              etiqueta: 'Calificaciones del personal clave',
              columnas: ['Cargo y/o responsabilidad', 'Profesión', 'Grado o título profesional requerido'],
              minimo: 1,
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
          ],
        },
        {
          id: 'equipamiento_estrategico',
          titulo: 'Equipamiento estratégico',
          condicion: 'exige_equipamiento_estrategico',
          bloques: [
            {
              clase: 'tabla',
              id: 'equipamiento_estrategico',
              etiqueta: 'Equipamiento estratégico',
              instruccion:
                'Consignar el equipamiento (equipo y/o maquinaria) requerido para ejecutar la consultoría, según la especialidad y subespecialidad',
              columnas: ['Equipamiento estratégico', 'Cant.', 'Características mínimas'],
              minimo: 1,
            },
          ],
        },
        {
          id: 'infraestructura_estrategica',
          titulo: 'Infraestructura estratégica',
          condicion: 'exige_infraestructura',
          bloques: [
            {
              clase: 'tabla',
              id: 'infraestructura_estrategica',
              etiqueta: 'Infraestructura estratégica',
              instruccion:
                'Consignar la infraestructura requerida para ejecutar la consultoría, cuando resulte indispensable',
              columnas: ['Infraestructura', 'Cant.', 'Características mínimas'],
              minimo: 1,
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
            { clase: 'fijo', texto: 'Se acredita con la promesa de consorcio.' },
          ],
        },
      ],
    },

    seccionSolicitante(),
  ],
};
