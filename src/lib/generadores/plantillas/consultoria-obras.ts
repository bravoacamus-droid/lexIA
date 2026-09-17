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
  METODO_EXPERIENCIA_PERSONAL_CLAVE,
  METODO_FORMACION_PERSONAL_CLAVE,
  METODO_PERSONAL_CLAVE,
  METODO_PERSONAL_NO_CLAVE,
  METODO_SIMILARES,
  METODO_EQUIPAMIENTO_ESTRATEGICO,
  METODO_EQUIPAMIENTO_NO_ESTRATEGICO,
  METODO_INFRAESTRUCTURA_ESTRATEGICA,
  METODO_RECURSOS_CONTRATISTA,
  bloquesPagoAnticipado,
  METODO_VERIFICACIONES,
  METODO_RECURSOS_ENTIDAD,
  seccionConfidencialidad,
  seccionAdelantoDirecto,
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
              valor: 'formulacion_diseno',
              texto:
                'El servicio corresponde a la formulación y el diseño del proyecto, bajo el sistema de entrega de formulación y diseño.',
            },
            {
              valor: 'supervision_expediente',
              texto: 'El servicio corresponde a la supervisión de la elaboración del expediente técnico de obra.',
            },
            {
              valor: 'supervision_obra',
              texto: 'El servicio corresponde a la supervisión de la ejecución de obra.',
            },
            {
              valor: 'supervision_diseno_construccion',
              texto:
                'El servicio corresponde a la supervisión del diseño y la construcción, bajo el sistema de entrega de diseño y construcción.',
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
      // Una tabla por sistema de entrega, la que corresponda al
      // servicio elegido arriba. El formato trae las seis y la
      // plantilla no traía ninguna. Observación de César.
      subsecciones: [
        {
          id: 'descripcion_solo_formulacion',
          titulo: 'Para el caso de sistema de entrega de consultoría de obra de solo formulación, incluir la siguiente tabla:',
          visibleSi: { opcion: 'tipo_consultoria', valor: 'formulacion' },
          bloques: [
            {
              clase: 'campo',
              id: 'origen_formulacion',
              etiqueta: 'Origen de la formulación',
              ayuda:
                'Consignar si el punto de partida es una idea de proyecto de inversión o una formulación y evaluación que hubiese perdido vigencia',
              tipo: 'texto',
              obligatorio: true,
            },
            { clase: 'fijo', texto: 'Se debe proporcionar, obligatoriamente, todos los documentos (incluidos anexos) que conforman la idea de proyecto de inversión.' },
          ],
        },
        {
          id: 'descripcion_solo_diseno',
          titulo: 'Para el caso de sistema de entrega de consultoría de obra de solo diseño, incluir la siguiente tabla:',
          visibleSi: { opcion: 'tipo_consultoria', valor: 'expediente' },
          bloques: [
            {
              clase: 'campo',
              id: 'nivel_preinversion',
              etiqueta: 'Nivel de estudios de preinversión o expediente técnico del contrato resuelto',
              ayuda:
                'Consignar ficha técnica, perfil de inversión o expediente técnico del contrato resuelto',
              tipo: 'texto',
              obligatorio: true,
            },
            {
              clase: 'campo',
              id: 'fecha_actualizacion',
              etiqueta: 'Documento y última fecha de actualización',
              ayuda:
                'Consignar el documento y la fecha de su última actualización',
              tipo: 'texto',
              obligatorio: true,
            },
            {
              clase: 'campo',
              id: 'procedimiento_previo',
              etiqueta: 'Tipo y número del procedimiento de selección convocado antes, de corresponder',
              ayuda:
                'Consignar el tipo y número del procedimiento que se convocó para la formulación y evaluación o el expediente técnico del contrato resuelto',
              tipo: 'texto',
              obligatorio: true,
            },
            { clase: 'fijo', texto: 'La ficha técnica y/o estudio de preinversión en versión digital deben estar publicados en el SEACE de la Pladicop, desde la fecha de la convocatoria del presente procedimiento de selección. En caso de corresponder a un saldo de obra, se publica la información que la entidad contratante defina como: expediente técnico primigenio, valorización última emitida, constatación física de la obra, entre otros.' },
          ],
        },
        {
          id: 'descripcion_formulacion_diseno',
          titulo: 'Para el caso de la contratación de consultoría de obra con sistema de entrega de formulación y diseño, incluir la siguiente tabla:',
          visibleSi: { opcion: 'tipo_consultoria', valor: 'formulacion_diseno' },
          bloques: [
            {
              clase: 'campo',
              id: 'origen_formulacion_diseno',
              etiqueta: 'Origen de la formulación',
              ayuda:
                'Consignar si el punto de partida es una idea de proyecto de inversión o una formulación y evaluación que hubiese perdido vigencia',
              tipo: 'texto',
              obligatorio: true,
            },
            { clase: 'fijo', texto: 'Se debe proporcionar, obligatoriamente, todos los documentos (incluidos anexos) que conforman la idea de proyecto de inversión.' },
          ],
        },
        {
          id: 'descripcion_supervision_expediente',
          titulo: 'Para el caso de la contratación de supervisión de la elaboración de expediente técnico, incluir la siguiente tabla:',
          visibleSi: { opcion: 'tipo_consultoria', valor: 'supervision_expediente' },
          bloques: [
            {
              clase: 'campo',
              id: 'procedimiento_expediente',
              etiqueta: 'Tipo y número del procedimiento de selección convocado para la elaboración del expediente técnico, de corresponder',
              ayuda:
                'Consignar el tipo y número del procedimiento',
              tipo: 'texto',
              obligatorio: true,
            },
            { clase: 'fijo', texto: 'Se debe proporcionar, obligatoriamente, la estructura de costos referencial del servicio de supervisión de la elaboración del expediente técnico.' },
          ],
        },
        {
          id: 'descripcion_supervision_obra',
          titulo: 'Para el caso de la contratación de supervisión de ejecución de obra, incluir la siguiente tabla:',
          visibleSi: { opcion: 'tipo_consultoria', valor: 'supervision_obra' },
          bloques: [
            {
              clase: 'campo',
              id: 'procedimiento_obra',
              etiqueta: 'Tipo y número del procedimiento de selección convocado para la ejecución de la obra, de corresponder',
              ayuda:
                'Consignar el tipo y número del procedimiento',
              tipo: 'texto',
              obligatorio: true,
            },
            { clase: 'fijo', texto: 'Se debe proporcionar, obligatoriamente, la estructura de costos referencial del servicio de supervisión de ejecución de obra.' },
          ],
        },
        {
          id: 'descripcion_supervision_diseno',
          titulo: 'Para el caso de la contratación de supervisión de diseño y construcción, incluir la siguiente tabla:',
          visibleSi: { opcion: 'tipo_consultoria', valor: 'supervision_diseno_construccion' },
          bloques: [
            {
              clase: 'campo',
              id: 'procedimiento_diseno_construccion',
              etiqueta: 'Tipo y número del procedimiento de selección convocado para la ejecución de la obra, de corresponder',
              ayuda:
                'Consignar el tipo y número del procedimiento',
              tipo: 'texto',
              obligatorio: true,
            },
            { clase: 'fijo', texto: 'Se debe proporcionar, obligatoriamente, la estructura de costos referencial del servicio de supervisión de ejecución de obra. En caso de no establecerse el tipo y numero de procedimiento de selección del contrato principal a supervisar, se publican como adjuntos todos los documentos (incluidos anexos) que conforman el expediente técnico de la obra en versión digital los que deben ser publicados en el SEACE de la Pladicop, desde la fecha de la convocatoria del presente procedimiento de selección' },
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
          id: 'partidas',
          titulo: 'Partidas y actividades del servicio de mantenimiento vial',
          condicion: 'tiene_partidas',
          // El título dice "mantenimiento vial" porque así está en el
          // .docx de consultoría de obras: es un arrastre del otro
          // formato. Se respeta, que el documento sale como su formato.
          bloques: [
            { clase: 'fijo', texto: 'El consultor deberá ejecutar la totalidad de las actividades previstas en los términos de referencia, conforme al alcance de la consultoría, la normativa técnica aplicable y los objetivos establecidos por la Entidad.' },
            { clase: 'fijo', texto: 'Las actividades deberán guardar relación directa con los productos y entregables requeridos.' },
            { clase: 'nota', texto: '[Importante: Para cada contratación específica, las actividades deberán adecuarse al alcance real del servicio de consultoría de obra requerido y a la normativa sectorial aplicable. En el caso de expedientes técnicos y supervisiones, resulta recomendable estructurar las actividades conforme a las especialidades que integran el proyecto (arquitectura, estructuras, instalaciones sanitarias, instalaciones eléctricas, mecánica, comunicaciones, impacto ambiental, seguridad, entre otras).]' },
            {
              clase: 'redactado',
              id: 'partidas',
              etiqueta: 'Partidas y actividades',
              instruccion:
                'Enumerar las partidas y actividades del servicio, adecuadas al alcance real de la consultoría de obra contratada',
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
              etiqueta: 'Contenido mínimo del plan de trabajo',
              instruccion:
                'Enumerar el contenido mínimo que debe tener el plan de trabajo, vinculado al objeto y a las actividades de la prestación',
              ejemplo:
                'Objetivos y alcance de la consultoría.\nMetodología para el desarrollo de los estudios y diseños.\nCronograma detallado de ejecución.\nProgramación de actividades de campo y gabinete.\nRelación del personal clave y funciones asignadas.\nCronograma de elaboración y presentación de entregables.\nMecanismos de control de calidad.\nIdentificación de riesgos y medidas de mitigación.\nMecanismos de coordinación con la Entidad.',
              extension: 'lista',
            },
            {
              // El formato de lista sirve para enumerar el contenido
              // mínimo, no para las condiciones: la oportunidad, el
              // medio de entrega o el plazo de evaluación no son
              // viñetas. Observación 8 de César (setiembre de 2026):
              // «este formato no se adecua, solo se adecúa para el
              // contenido mínimo del plan de trabajo, pero no para las
              // condiciones».
              clase: 'redactado',
              id: 'plan_trabajo_condiciones',
              etiqueta: 'Condiciones del plan de trabajo',
              instruccion:
                'Precisar las condiciones y criterios que deberá considerar el plan, la oportunidad y el plazo de presentación, el medio de entrega, el plazo del área usuaria para su evaluación cuando corresponda y las demás condiciones necesarias para su revisión y aprobación, sin incorporar exigencias innecesarias',
              extension: 'varios_parrafos',
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
                {
                  valor: 'tarifas',
                  texto:
                    'El contrato se rige por la modalidad de pago de Tarifas, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando no puede conocerse con precisión el tiempo de prestación del servicio.',
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
          // Consultoría de obras conserva SU texto, no el unificado.
          // Su formato no parametriza el adelanto: fija diez días para
          // pedirlo, la relación de documentos, siete días para
          // entregarlo y la prohibición de fideicomisos del numeral
          // 178.2. Unificarlo le quitaba todo eso. César, al absolver
          // las preguntas pendientes (16/09/2026): la observación del
          // adelanto vale para bienes y servicios, "quedando exceptuado
          // la consultoría de obras y ejecución de obras, el cual debe
          // mantener el texto que indica en el formato".
          id: 'adelanto_directo',
          titulo: 'Adelanto directo',
          condicion: 'otorga_adelanto',
          bloques: [
            { clase: 'nota', texto: '[El presente numeral será aplicable únicamente cuando, por la naturaleza, complejidad o condiciones de ejecución de la consultoría de obra, la Entidad determine la necesidad de otorgar adelantos directos y dicha condición haya sido prevista y sustentada en la estrategia de contratación, de conformidad con el artículo 66 de la Ley N.° 32069 y el artículo 178 de su Reglamento.\n\nImportante: El otorgamiento de adelantos directos es facultativo. En caso la Entidad determine que no corresponde su otorgamiento, deberá consignarse “NO APLICA” en el presente numeral.]' },
            {
              clase: 'fijo',
              texto: 'El contratista deberá solicitar el adelanto dentro de los diez (10) días calendario contados desde el día siguiente del perfeccionamiento del contrato o desde el cumplimiento de la condición establecida para su otorgamiento, según corresponda, adjuntando:',
              fundamento: 'Reglamento, art. 178',
            },
            { clase: 'fijo', texto: 'Solicitud de adelanto.\nComprobante de pago correspondiente.\nGarantía por adelanto otorgada mediante carta fianza o póliza de caución, emitida conforme a la normativa vigente.', lista: true },
            { clase: 'fijo', texto: 'La garantía deberá ser emitida por el mismo monto del adelanto solicitado y cumplir las condiciones de incondicionalidad, solidaridad, irrevocabilidad y realización automática, manteniéndose vigente hasta la amortización total del adelanto otorgado.' },
            { clase: 'fijo', texto: 'La Entidad entregará el adelanto dentro de los siete (7) días calendario siguientes a la presentación de la solicitud, siempre que se cumplan los requisitos establecidos en el contrato y en la normativa vigente.' },
            { clase: 'fijo', texto: 'La amortización del adelanto se efectuará mediante descuentos proporcionales en los pagos parciales que correspondan durante la ejecución contractual.' },
            {
              clase: 'fijo',
              texto: 'No procede la constitución de fideicomisos para garantizar adelantos en consultorías de obra, de conformidad con el numeral 178.2 del Reglamento.',
              fundamento: 'Reglamento, num. 178.2',
            },
          ],
        },

        // Su .docx cierra las penalidades con el tope conjunto del 10%.
        seccionPenalidades('larga', 'componentes', 'servicio'),

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
          ],
          // El formato enumera DOS incentivos y la plantilla solo traía
          // el de respuesta rápida. Observación de César.
          subsecciones: [
            {
              id: 'incentivo_anticipado',
              titulo: 'Incentivo por cumplimiento anticipado de la fecha programada de la culminación de la prestación',
              bloques: [
                { clase: 'fijo', texto: '' },
                { clase: 'fijo', texto: 'Para estos efectos, la Entidad deberá precisar:' },
              {
                clase: 'fijo',
                texto: 'El componente o entregable al que aplica el incentivo.\nLa metodología de verificación.\nEl mecanismo de cálculo.\nLa oportunidad de pago.',
                lista: true,
              },
                {
                  clase: 'redactado',
                  id: 'incentivo_anticipado',
                  etiqueta: 'Cumplimiento anticipado de la fecha programada de culminación',
                  instruccion:
                    'Indicar las precisiones correspondientes y los componentes a los que aplica el incentivo, la metodología de verificación, el mecanismo de cálculo y la oportunidad de pago',
                  extension: 'varios_parrafos',
                },
              ],
            },
            {
              id: 'incentivo_respuesta',
              titulo: 'Incentivo por respuesta rápida de la supervisión',
              bloques: [
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
          ],
        },

        {
          // El numeral entero faltaba. Observación de César.
          id: 'ahorros_pciv',
          titulo: 'Repartición de los ahorros generados por propuestas de cambio de ingeniería de valor',
          condicion: 'admite_pciv',
          bloques: [
            { clase: 'nota', texto: '[Este numeral será aplicable únicamente cuando la Entidad haya previsto en la estrategia de contratación la posibilidad de presentar Propuestas de Cambio de Ingeniería de Valor (PCIV), conforme a lo establecido en el artículo 205 del Reglamento de la Ley N.° 32069.' },
            { clase: 'fijo', texto: 'Las PCIV constituyen propuestas técnicas formuladas por el contratista orientadas a optimizar el diseño, las soluciones técnicas, los procedimientos o las especificaciones del proyecto, generando ahorros económicos sin afectar la funcionalidad, calidad, seguridad, vida útil, sostenibilidad ni los objetivos de la inversión.' },
            { clase: 'fijo', texto: 'La aplicación de este mecanismo procede únicamente en las consultorías de obras que comprendan el componente de diseño, tales como la elaboración de expedientes técnicos o las contrataciones bajo el sistema de entrega de formulación y diseño, siempre que se encuentre debidamente sustentada en la estrategia de contratación.]' },
            { clase: 'nota', texto: '[En caso la Entidad no haya previsto la posibilidad de presentar PCIV durante la ejecución contractual, deberá consignar expresamente: "NO APLICA".]' },
            { clase: 'fijo', texto: 'En caso la Entidad contratante acepte una Propuesta de Cambio de Ingeniería de Valor (PCIV), los ahorros efectivamente generados serán distribuidos entre las partes de acuerdo con los porcentajes establecidos a continuación:]' },
            { clase: 'fijo', texto: 'Los ahorros generados serán repartidos entre las partes según los siguientes porcentajes:' },
            {
              clase: 'redactado',
              id: 'ahorros_reparto',
              etiqueta: 'Reparto de los ahorros',
              instruccion:
                'Precisar los porcentajes en que se reparten los ahorros entre la Entidad y el contratista, y el procedimiento para acreditarlos',
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
            { clase: 'titulo', texto: 'Condiciones de la responsabilidad', nivel: 3 },
            { clase: 'fijo', texto: 'La Entidad comunicará al consultor la existencia de errores, omisiones, deficiencias o vicios ocultos mediante documento formal, correo electrónico institucional u otro medio que permita acreditar su recepción.' },
            { clase: 'fijo', texto: 'El consultor deberá evaluar las observaciones formuladas y presentar los informes, aclaraciones, correcciones o documentación técnica que corresponda dentro del plazo que establezca la Entidad, considerando la naturaleza y complejidad de las observaciones.' },
            { clase: 'fijo', texto: 'Las correcciones o subsanaciones que resulten atribuibles al consultor no generarán costo adicional para la Entidad.' },
            { clase: 'fijo', texto: 'La responsabilidad del consultor subsiste aun cuando la Entidad haya otorgado conformidad a la prestación, sin perjuicio de las demás acciones que correspondan conforme a la normativa vigente.' },
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

        // El artículo que César añadió en setiembre de 2026
        // (observación 17). Su .docx no lo trae, así que los cuatro
        // apartados nacen apagados: el documento no cambia mientras la
        // Entidad no active los que le apliquen.
        seccionConfidencialidad(false),
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
                metodo: METODO_RECURSOS_ENTIDAD,
              extension: 'lista',
            },
          ],
        },
        {
          id: 'conformidad',
          titulo: 'Conformidad de la prestación',
          bloques: [],
          // Los dos numerales que el formato cuelga de aquí. El
          // segundo estaba al mismo nivel, no dentro, y empujaba la
          // numeración del resto. Observación de César.
          subsecciones: [
            {
              id: 'conformidad_organo',
              titulo: 'Órgano quien brindará la conformidad',
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
                    metodo: METODO_VERIFICACIONES,
                  extension: 'lista',
                },
              ],
            },
          ],
        },
        {
          id: 'forma_pago',
          titulo: 'Forma y requisitos de pago',
          bloques: [],
          // El formato lo dice dos veces, una por familia de servicio.
          // Observación de César.
          subsecciones: [
            {
              id: 'pago_formulacion_diseno',
              titulo: 'En el caso de consultoría de obra bajo el sistema de entrega de solo formulación, solo diseño o formulación y diseño, así como en la supervisión de la elaboración de expediente técnico',
              visibleSi: {
                opcion: 'tipo_consultoria',
                valor: ['formulacion', 'expediente', 'formulacion_diseno', 'supervision_expediente'],
              },
              bloques: [
                { clase: 'fijo', texto: 'El pago se realiza de conformidad con lo establecido en el artículo 67 de la Ley.' },
              ],
            },
            {
              id: 'pago_supervision_obra',
              titulo: 'En el caso de consultoría de obra de supervisión de ejecución de obras',
              visibleSi: {
                opcion: 'tipo_consultoria',
                valor: ['supervision_obra', 'supervision_diseno_construccion'],
              },
              bloques: [
                { clase: 'fijo', texto: 'El pago se realiza de conformidad con lo establecido en el artículo 67 de la Ley.' },
                { clase: 'fijo', texto: 'La entidad contratante paga las contraprestaciones pactadas a favor del contratista dentro de los diez (10) días hábiles siguientes de otorgada la conformidad por parte del área usuaria, plazo que podrá ser prorrogable, previa justificación de la demora, hasta por cinco (05) días hábiles adicionales.' },
                { clase: 'fijo', texto: 'En el caso que se haya suscrito contrato con un consorcio, el pago se efectuará, a quien corresponda, conforme lo estipulado en el respectivo en el contrato de consorcio.' },
              ],
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
                'Contar con RUC activo y habido en la SUNAT.\nRealizar actividades en el objeto de la contratación.\nPersona natural y/o jurídica.',
              fundamento: 'Plantilla — requisitos del proveedor',
                          lista: true,
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
                metodo: METODO_RECURSOS_CONTRATISTA,
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
              metodo: METODO_PERSONAL_CLAVE,
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
              metodo: METODO_PERSONAL_NO_CLAVE,
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
                metodo: METODO_EQUIPAMIENTO_NO_ESTRATEGICO,
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
      // El formato los agrupa en dos, y las cabezas van con letra
      // en una sola serie que cruza de un grupo al otro, como en
      // el .docx. Observación de César.
      subsecciones: [
        {
          id: 'calificacion_obligatorios',
          titulo: 'Requisitos de calificación obligatorios',
          bloques: [
          ],
          subsecciones: [
            {
              id: 'experiencia_postor',
              titulo: 'Experiencia del postor en la especialidad',
              numeralLiteral: true,
              bloques: [
                {
                  clase: 'nota',
                  texto:
                    'La especialidad la determina la entidad conforme al artículo 157 del Reglamento y el listado aprobado mediante Resolución Directoral N° 0016-2025-EF/54.01. No pueden consignarse subespecialidades "afines" ni tipologías específicas.',
                },
                { clase: 'titulo', texto: 'Requisitos:', nivel: 3 },
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
                        metodo: METODO_SIMILARES,
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
                { clase: 'titulo', texto: 'Acreditación:', nivel: 3 },
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
              numeralLiteral: true,
              condicion: 'exige_capacidad_tecnica',
              bloques: [
                {
                  clase: 'nota',
                  texto:
                    'Como requisito de calificación solo puede consignarse "grado de bachiller" o "título profesional", según el perfil del personal clave definido por el área usuaria. El tiempo de experiencia mínimo debe ser razonable y congruente con el periodo en el que el personal ejecuta las actividades y con la cuantía de la contratación.',
                },
              ],
              // Los dos numerales del formato: los cuadros estaban sueltos.
              subsecciones: [
                {
                  id: 'calificaciones_personal',
                  titulo: 'Calificaciones del personal clave',
                  bloques: [
                    { clase: 'titulo', texto: 'Requisitos:', nivel: 3 },
                    {
                      clase: 'tabla',
                      id: 'calificaciones_personal_clave',
                      metodo: METODO_FORMACION_PERSONAL_CLAVE,
                      etiqueta: 'Calificaciones del personal clave',
                      columnas: ['Cargo y/o responsabilidad', 'Profesión', 'Grado o título profesional requerido'],
                      minimo: 1,
                    },
                    { clase: 'titulo', texto: 'Acreditación:', nivel: 3 },
                    { clase: 'fijo', texto: 'El postor debe señalar los nombres y apellidos, documento de identidad, el nombre de la universidad o institución educativa que expidió el grado o título profesional, y el grado o título profesional obtenido en el Anexo N° 15. En caso se declare estudios en el extranjero del personal clave, debe presentarse, adicionalmente, copia simple de la revalidación o reconocimiento del grado o título ante la SUNEDU.' },
                    { clase: 'fijo', texto: 'Los evaluadores o la DEC, según corresponda, verifican los grados o títulos profesionales en el Registro Nacional de Grados Académicos y Títulos Profesionales de la Superintendencia Nacional de Educación Superior Universitaria – SUNEDU, a través del siguiente link: https://enlinea.sunedu.gob.pe/ o en el Registro Nacional de Certificados, Grados y Títulos a cargo del Ministerio de Educación, a través del siguiente link: https://titulosinstitutos.minedu.gob.pe/ según corresponda.' },
                  ],
                },
                {
                  id: 'experiencia_personal',
                  titulo: 'Experiencia del personal clave',
                  bloques: [
                    { clase: 'titulo', texto: 'Requisitos:', nivel: 3 },
                    {
                      clase: 'tabla',
                      id: 'experiencia_personal_clave',
                      metodo: METODO_EXPERIENCIA_PERSONAL_CLAVE,
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
                    { clase: 'titulo', texto: 'Acreditación:', nivel: 3 },
                    { clase: 'fijo', texto: 'El postor debe señalar la denominación del puesto, cargo y/o posición, y tiempo de experiencia del personal clave propuesto (años, meses y días) en el Anexo N° 15.' },
                    { clase: 'fijo', texto: 'Sólo en caso que en las bases se considere el requisito de Experiencia del Personal Clave y adicionalmente el factor de evaluación Experiencia Específica Adicional del Personal Clave, el postor acredita toda la experiencia del personal clave propuesto en la oferta para la evaluación técnica, adjuntando en dicha oferta copia simple de cualquiera de los siguientes documentos: (i) contratos y su respectiva conformidad; (ii) constancias; (iii) certificados; o (iv) cualquier otra documentación que, de manera fehaciente, demuestre la experiencia del personal propuesto. Estos documentos deben señalar los nombres y apellidos del personal clave; el cargo desempeñado, indicando el día, mes y año de inicio y culminación; el nombre de la entidad u organización que emite el documento; la fecha de emisión y nombres y apellidos de quien suscribe el documento.' },
                    { clase: 'fijo', texto: 'Caso contrario, el requisito de Experiencia del Personal Clave se acredita para la suscripción del contrato.' },
                    { clase: 'fijo', texto: 'En caso los documentos que acreditan la experiencia establezcan esta en meses sin especificar los días se debe considerar el mes completo. Se considera aquella experiencia que no tenga una antigüedad mayor a veinticinco años anteriores a la fecha de la presentación de ofertas. El inicio de plazo de la experiencia debe ser [CONSIGNAR DESDE BACHILLER O DESDE LA COLEGIATURA, DE SER EL CASO]. De presentarse experiencia ejecutada paralelamente (traslape), para el cómputo de la misma sólo se considera una vez el periodo traslapado. En ningún caso corresponde exigir que el mismo personal clave acredite experiencia en más de un cargo.' },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'calificacion_adicionales',
          titulo: 'Requisitos de calificación adicionales',
          bloques: [
            {
              clase: 'nota',
              texto:
                'En caso así se determine en la estrategia de contratación, la entidad contratante puede incluir cualquiera de los siguientes requisitos de calificación facultativos. Cabe señalar que, una vez incorporados en el presente numeral, los requisitos de calificación se consideran obligatorios, debiéndose eliminar aquellos que no hayan sido seleccionados:',
            },
          ],
          subsecciones: [
            {
              id: 'capacidad_tecnica_adicional',
              titulo: 'Capacidad técnica y profesional',
              numeralLiteral: true,
              // El formato repite el título en los adicionales, con la
              // letra siguiente de la serie. Observación de César.
              bloques: [],
              subsecciones: [
                {
                  id: 'equipamiento_estrategico',
                  titulo: 'Equipamiento estratégico',
                  condicion: 'exige_equipamiento_estrategico',
                  bloques: [
                    { clase: 'titulo', texto: 'Requisitos:', nivel: 3 },
                    {
                      clase: 'tabla',
                      id: 'equipamiento_estrategico',
                      etiqueta: 'Equipamiento estratégico',
                      instruccion:
                        'Consignar el equipamiento (equipo y/o maquinaria) requerido para ejecutar la consultoría, según la especialidad y subespecialidad',
                        metodo: METODO_EQUIPAMIENTO_ESTRATEGICO,
                      columnas: ['Equipamiento estratégico', 'Cant.', 'Características mínimas'],
                      minimo: 1,
                    },
                    { clase: 'titulo', texto: 'Acreditación:', nivel: 3 },
                    { clase: 'fijo', texto: 'Copia simple de los documentos que sustenten la propiedad, la posesión, el compromiso de compraventa o alquiler, u otro documento que acredite que el equipamiento estratégico estará disponible para la ejecución del contrato.' },
                    { clase: 'fijo', texto: 'Este requisito de calificación se acredita para la suscripción del contrato.' },
                  ],
                },
                {
                  id: 'infraestructura_estrategica',
                  titulo: 'Infraestructura estratégica',
                  condicion: 'exige_infraestructura',
                  bloques: [
                    { clase: 'titulo', texto: 'Requisitos:', nivel: 3 },
                    {
                      clase: 'tabla',
                      id: 'infraestructura_estrategica',
                      etiqueta: 'Infraestructura estratégica',
                      instruccion:
                        'Consignar la infraestructura requerida para ejecutar la consultoría, cuando resulte indispensable',
                        metodo: METODO_INFRAESTRUCTURA_ESTRATEGICA,
                      columnas: ['Infraestructura', 'Cant.', 'Características mínimas'],
                      minimo: 1,
                    },
                    { clase: 'titulo', texto: 'Acreditación:', nivel: 3 },
                    { clase: 'fijo', texto: 'Copia simple de documentos que sustenten la propiedad, la posesión, el compromiso de compraventa o alquiler, u otro documento que acredite la disponibilidad de la infraestructura estratégica requerida estará disponible para la ejecución del contrato.' },
                    { clase: 'fijo', texto: 'Este requisito de calificación se acredita para la suscripción del contrato.' },
                  ],
                },
              ],
            },
            {
              id: 'consorcio',
              titulo: 'Participación en consorcio',
              numeralLiteral: true,
              condicion: 'exige_consorcio',
              bloques: [
                { clase: 'titulo', texto: 'Requisitos:', nivel: 3 },
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
                { clase: 'titulo', texto: 'Acreditación:', nivel: 3 },
                { clase: 'fijo', texto: 'Se acredita con la promesa de consorcio.' },
              ],
            },
          ],
        },
      ],
    },

    seccionSolicitante(),
  ],
};
