/**
 * Plantilla: REQUERIMIENTO — SERVICIOS EN GENERAL
 *
 * Transcripción de "PROCEDIMIENTOS DE SELECCIÓN/2. SERVICIOS/
 * 1. Servicios en general.docx".
 *
 * Es la plantilla base de la familia de servicios y la que más se
 * aparta de las de bienes:
 *
 *  · La experiencia del postor mira QUINCE años atrás, no diez.
 *  · Aparecen ocho modalidades de pago —tarifas, porcentajes, honorario
 *    fijo con comisión de éxito, pago por consumo— más tres exclusivas
 *    de emergencia (disponibilidad, activación y mixto, art. 286).
 *  · El sistema de entrega es propio de servicios: diseño de la
 *    operación y mantenimiento, o gestión de instalaciones.
 *  · Las prestaciones accesorias se desarrollan una por una y con plazo
 *    y lugar independientes de la principal.
 *  · Entra el personal clave y no clave, con la advertencia de que el
 *    personal no clave y el equipamiento no estratégico NO pueden
 *    exigirse para la presentación de ofertas.
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
  VALIDACION_EXPERIENCIA,
  VALIDACION_MYPE,
} from './comunes';

export const PLANTILLA_SERVICIOS_GENERAL: PlantillaRequerimiento = {
  id: 'ps-servicios-general',
  familia: 'procedimiento_seleccion',
  objeto: 'servicios',
  encabezado: 'REQUERIMIENTO',
  subtitulo: 'SERVICIOS EN GENERAL',
  origen: 'PROCEDIMIENTOS DE SELECCIÓN/2. SERVICIOS/1. Servicios en general.docx',

  validaciones: [VALIDACION_ADELANTO, VALIDACION_EXPERIENCIA, VALIDACION_MYPE],

  secciones: [
    seccionEncabezado(
      'Indicar una breve descripción del requerimiento, mediante la denominación del (los) servicio(s) a ser contratado(s)',
    ),
    seccionFinalidadPublica(),
    seccionObjetivo(),
    seccionAntecedentes(
      'Explicar de manera general el motivo por el cual se efectúa el requerimiento de la contratación del servicio. En caso de existir documentos fuente (plan de bienestar, plan de capacitación), mencionarlos y adjuntarlos. Si el objeto corresponde al ASISTE, considerar las disposiciones del Subcapítulo 6 del Capítulo III del Reglamento',
      'La Entidad cuenta con equipos informáticos que constituyen herramientas indispensables para el desarrollo de las actividades administrativas y la prestación de los servicios institucionales. Debido al uso continuo, dichos equipos requieren mantenimiento preventivo periódico y atención correctiva cuando se presenten fallas, a fin de evitar interrupciones en las labores del personal y preservar su adecuado funcionamiento. En ese sentido, resulta necesaria la contratación del servicio para garantizar la continuidad operativa de los equipos, optimizar su rendimiento y prolongar su vida útil, contribuyendo al cumplimiento de los objetivos institucionales.',
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
          clase: 'nota',
          texto:
            'Cuando el objeto de la contratación corresponda a servicios comprendidos en una Ficha de Homologación, la descripción deberá ser concordante con la denominación establecida en dichos documentos.',
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
                'Precisar las condiciones técnicas mínimas que debe cumplir la prestación, privilegiando los resultados esperados, el desempeño y la funcionalidad. Describir qué comprende el servicio, cómo debe ejecutarse, qué resultados debe alcanzar, qué condiciones técnicas mínimas debe cumplir y qué metodología, estándares o niveles de servicio deben observarse',
              ejemplo:
                'El servicio comprende la ejecución del mantenimiento preventivo y correctivo de las computadoras e impresoras de la Entidad, con la finalidad de garantizar su operatividad, prolongar su vida útil y reducir la ocurrencia de fallas que afecten la continuidad de las labores institucionales.\n\nEl servicio deberá ejecutarse conforme a las recomendaciones del fabricante y las buenas prácticas aplicables, considerando como mínimo: diagnóstico técnico previo de los equipos; ejecución del mantenimiento con herramientas e insumos adecuados; reemplazo de componentes únicamente cuando sea autorizado por la Entidad; verificación del correcto funcionamiento luego de cada intervención; atención de incidencias dentro de los tiempos máximos establecidos; y presentación de informes técnicos por cada intervención realizada.',
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
                'Detallar las principales actividades que ejecutará el contratista. Conviene un lenguaje preciso con verbos como elaborar, describir, definir, analizar, redactar, presentar o supervisar. Según la naturaleza del servicio, especificar el procedimiento a emplear. Si no corresponde detallarlas, consignar "NO APLICA"',
              ejemplo:
                'Actividad 1: Elaborar el cronograma de mantenimiento y coordinar su ejecución con la Entidad.\nActividad 2: Realizar el mantenimiento preventivo de los equipos conforme a la programación aprobada.\nActividad 3: Ejecutar el mantenimiento correctivo de los equipos que presenten fallas durante la vigencia del contrato.\nActividad 4: Emitir los informes técnicos de cada intervención realizada.',
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
                'Indicar la documentación adicional que el adjudicatario debe presentar, directamente relacionada con el objeto y necesaria para acreditar las condiciones técnicas, legales, operativas o de seguridad',
              advertencia: true,
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
          bloques: [
            {
              clase: 'nota',
              texto:
                'Cada prestación accesoria debe describirse de manera independiente, precisando su alcance, procedimiento de ejecución, plazo, lugar, niveles de servicio, forma y requisitos de pago, procedimiento de conformidad, período de garantía y demás condiciones aplicables. Si requiere personal especializado, equipos, licencias o autorizaciones, esos requisitos van en el numeral de recursos provistos por el contratista.',
            },
          ],
          subsecciones: [
            {
              id: 'mantenimiento',
              titulo: 'Mantenimiento preventivo y/o correctivo',
              condicion: 'accesoria_mantenimiento',
              bloques: [
                {
                  clase: 'redactado',
                  id: 'mantenimiento',
                  etiqueta: 'Mantenimiento',
                  instruccion:
                    'Precisar como mínimo: el alcance; el tipo (preventivo, correctivo o ambos); la programación o frecuencia; las actividades mínimas; el procedimiento de ejecución; los materiales, insumos o repuestos; el lugar de ejecución; el tiempo máximo de atención o reparación; y las condiciones para el otorgamiento de la conformidad',
                  ejemplo:
                    'El contratista realizará el mantenimiento preventivo de los equipos instalados con una frecuencia trimestral durante doce (12) meses.\n\nCada intervención comprenderá, como mínimo: inspección del funcionamiento de cámaras y grabadores; limpieza de equipos; verificación del cableado y conectores; actualización de firmware cuando corresponda; pruebas de funcionamiento; y emisión del informe técnico.\n\nEl mantenimiento correctivo comprenderá el diagnóstico y reparación de fallas que afecten el funcionamiento del sistema, debiendo restablecer su operatividad dentro del plazo máximo establecido en el contrato.',
                  extension: 'varios_parrafos',
                },
              ],
            },
            {
              id: 'soporte_tecnico',
              titulo: 'Soporte técnico',
              condicion: 'accesoria_soporte',
              bloques: [
                {
                  clase: 'redactado',
                  id: 'soporte_tecnico',
                  etiqueta: 'Soporte técnico',
                  instruccion:
                    'Precisar como mínimo: la modalidad (presencial, remoto o mixto); el alcance; el horario de atención; los canales habilitados para incidencias; el tiempo máximo de respuesta y solución; el lugar; el plazo; y las condiciones para la conformidad',
                  ejemplo:
                    'El contratista brindará soporte técnico remoto y presencial durante doce (12) meses posteriores a la conformidad del servicio.\n\nEl soporte comprenderá la atención de incidencias, el diagnóstico de fallas, la asistencia para la configuración del sistema, el restablecimiento del servicio y las recomendaciones para prevenir nuevas incidencias.\n\nLas incidencias podrán comunicarse mediante teléfono, correo electrónico o mesa de ayuda. El tiempo máximo de respuesta será de dos (2) horas para atención remota y de veinticuatro (24) horas para atención presencial.',
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
                    'Precisar como mínimo: los temas a desarrollar; el número mínimo de participantes; la modalidad; la duración mínima; el momento o plazo de realización; el perfil mínimo del expositor; el material a entregar; el tipo de constancia o certificado; y las condiciones para la conformidad',
                  ejemplo:
                    'El contratista brindará una capacitación dirigida a ocho (8) servidores designados por la Entidad, dentro de los diez (10) días calendario siguientes a la puesta en operación del sistema.\n\nLa capacitación tendrá una duración mínima de ocho (8) horas lectivas y comprenderá la operación del sistema, la consulta y reproducción de grabaciones, la administración de usuarios, la atención de incidencias frecuentes y las buenas prácticas de operación.\n\nAl finalizar, el contratista entregará el material de capacitación y las constancias de participación correspondientes.',
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
              clase: 'nota',
              texto:
                'La exigencia de seguros deberá estar sustentada en la estrategia de contratación y guardar relación con los riesgos propios de la ejecución. No corresponde exigirlos cuando la naturaleza de la prestación no lo justifique o cuando constituya una restricción injustificada a la competencia.',
            },
            {
              clase: 'redactado',
              id: 'seguros',
              etiqueta: 'Seguros exigidos',
              instruccion:
                'Precisar como mínimo el tipo de seguro requerido, las coberturas mínimas, el monto asegurado, el período de vigencia, la oportunidad de presentación y cualquier otra condición necesaria',
              ejemplo:
                'El contratista deberá mantener vigente durante toda la ejecución contractual un Seguro Complementario de Trabajo de Riesgo (SCTR), en las coberturas de salud y pensión, para todo el personal que participe en la ejecución del servicio.\n\nEl seguro deberá presentarse a la Entidad antes del inicio de la prestación mediante la mesa de partes virtual o el correo electrónico institucional que esta determine.\n\nLa cobertura deberá comprender los riesgos inherentes a las actividades contratadas y mantenerse vigente hasta la culminación del servicio.',
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
                'La Entidad requiere la presentación de un Plan de Trabajo dentro de los cinco (5) días calendario siguientes a la notificación de la orden de servicio o a la suscripción del contrato, según corresponda.\n\nEl Plan de Trabajo deberá contener, como mínimo: objetivos de la prestación; metodología de ejecución; relación y secuencia de las actividades; cronograma de ejecución; personal responsable; recursos y equipos que se emplearán; y riesgos identificados con sus medidas de mitigación.\n\nSerá evaluado por el área usuaria, que contará con un plazo máximo de tres (3) días calendario para emitir su conformidad o formular observaciones. De no existir observaciones dentro de dicho plazo, el Plan de Trabajo se entenderá aprobado.',
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
                'Aplica únicamente cuando, por la naturaleza del servicio, resulte necesario establecer un período durante el cual el contratista garantice la calidad de la prestación ejecutada.',
            },
            {
              clase: 'fijo',
              texto:
                'Durante el período de garantía, el contratista será responsable de subsanar, sin costo adicional para la Entidad, las deficiencias, errores, omisiones o incumplimientos que sean atribuibles a la ejecución del servicio y que sean detectados con posterioridad al otorgamiento de la conformidad, siempre que no correspondan a causas imputables a la Entidad, caso fortuito o fuerza mayor.',
              fundamento: 'Plantilla — alcance de la garantía',
            },
            {
              clase: 'fijo',
              texto:
                'La Entidad comunicará las observaciones mediante correo electrónico u otro medio que permita acreditar su recepción. El contratista deberá iniciar las acciones de subsanación dentro de los dos (2) días hábiles siguientes de recibida la comunicación y culminarlas en un plazo máximo de cinco (5) días hábiles, salvo que el requerimiento establezca un plazo distinto por la naturaleza del servicio.',
            },
            {
              clase: 'fijo',
              texto:
                'La subsanación comprenderá todos los recursos, materiales, equipos, personal y demás actividades necesarias para corregir las observaciones formuladas, sin generar costo adicional para la Entidad.',
            },
            {
              clase: 'parrafo',
              texto:
                'El período de garantía será de {{garantia_periodo}}, computado a partir del día siguiente del otorgamiento de la conformidad del servicio.',
              campos: [
                {
                  clase: 'campo',
                  id: 'garantia_periodo',
                  etiqueta: 'Período de garantía',
                  ayuda:
                    'Consignar el plazo, por ejemplo: treinta (30) días calendario, seis (6) meses o un (1) año',
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
          condicion: 'prevé_visita',
          bloques: [
            {
              clase: 'redactado',
              id: 'visita',
              etiqueta: 'Condiciones de la visita',
              instruccion:
                'Precisar como mínimo: el objeto de la visita; el lugar de ejecución; la oportunidad (fecha y hora o forma de coordinación); el medio de comunicación para solicitarla; el servidor o dependencia responsable; y la indicación expresa de que es facultativa',
              extension: 'varios_parrafos',
            },
            {
              // La plantilla lo repite dos veces: no es opcional
              // recordarlo, porque exigir la visita restringiría la
              // concurrencia.
              clase: 'fijo',
              texto:
                'La visita tiene carácter facultativo. Su realización no constituye requisito para la admisión de la oferta ni otorga puntaje alguno durante la evaluación de ofertas.',
              fundamento: 'Plantilla — carácter facultativo de la visita',
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
              instruccion:
                'Indicar la relación de los anexos que se van a adjuntar al requerimiento',
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
                  valor: 'tarifas',
                  texto:
                    'El contrato se rige por la modalidad de pago de Tarifas, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando no puede conocerse con precisión el tiempo de prestación del servicio; se valoriza multiplicando la tarifa por el tiempo real de ejecución. Las tarifas incluyen costos directos, cargas sociales, tributos, gastos generales y utilidades.',
                },
                {
                  valor: 'porcentajes',
                  texto:
                    'El contrato se rige por la modalidad de pago en base a porcentajes, de conformidad con el artículo 130 del Reglamento. Es aplicable en la contratación de servicios de cobranzas, recuperaciones o prestaciones de naturaleza similar. Dicho porcentaje incluye todos los conceptos que comprende la contraprestación.',
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
            {
              clase: 'nota',
              texto:
                'En caso la convocatoria se refiera a un contrato de contingencia conforme al artículo 284 del Reglamento, debe considerarse una de las modalidades de pago del artículo 286: pago por disponibilidad (periódico por mantener rotación, stock o capacidad de respuesta), pago por activación (solo cuando se cumple la condición que activa la ejecución) o pago mixto. Si se aplica el pago por disponibilidad debe establecerse que, verificado el incumplimiento del contratista en mantener alguna de las situaciones previstas, la entidad puede resolver el contrato.',
            },
          ],
        },
        {
          id: 'sistema_entrega',
          titulo: 'Sistema de entrega para servicios',
          bloques: [
            {
              clase: 'opcion',
              id: 'sistema_entrega',
              etiqueta: 'Sistema de entrega',
              instruccion:
                'Consignar el sistema de entrega determinado en la estrategia de contratación, de conformidad con el artículo 129 del Reglamento',
              opciones: [
                {
                  valor: 'no_aplica',
                  texto:
                    'No aplica, por no corresponder a ninguno de los sistemas de entrega regulados.',
                },
                {
                  valor: 'diseno_operacion',
                  texto:
                    'El contrato se rige por el sistema de entrega de Diseño de la operación y mantenimiento, de conformidad con el artículo 129 del Reglamento. Comprende la elaboración de un documento con el diseño de la operación y mantenimiento, el diseño de la gestión de instalaciones, el manual de operación y mantenimiento o el plan de gestión vial, según corresponda.',
                },
                {
                  valor: 'gestion_instalaciones',
                  texto:
                    'El contrato se rige por el sistema de entrega de Gestión de instalaciones, de conformidad con el artículo 129 del Reglamento. El contratista se encarga de la operación y/o el mantenimiento de una edificación o infraestructura, pudiendo incluir la adquisición de bienes y servicios necesarios que determine la entidad contratante.',
                },
              ],
            },
          ],
        },
        {
          id: 'plazo_prestacion',
          titulo: 'Plazo de prestación del servicio',
          bloques: [],
          subsecciones: [
            {
              id: 'plazo_principal',
              titulo: 'Prestación principal',
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
                {
                  clase: 'nota',
                  texto:
                    'En caso el contratista deba realizar previamente entrega de bienes o trabajos de implementación (instalaciones, adecuaciones, configuración, pruebas), precisar además el plazo de dichos trabajos. Se recomienda suscribir un Acta que deje constancia de la fecha en que culminaron y del inicio del servicio.',
                },
              ],
            },
            {
              id: 'plazo_accesorias',
              titulo: 'Prestación accesoria',
              condicion: 'tiene_prestaciones_accesorias',
              bloques: [
                {
                  clase: 'tabla',
                  id: 'plazo_accesorias',
                  etiqueta: 'Plazos de las prestaciones accesorias',
                  instruccion:
                    'Establecer de manera independiente el plazo de cada prestación accesoria y el evento que da inicio a su cómputo',
                  columnas: ['Prestación accesoria', 'Plazo', 'Inicio del cómputo'],
                  minimo: 0,
                },
                {
                  clase: 'nota',
                  texto:
                    'El plazo de las prestaciones accesorias debe establecerse de manera independiente al de la prestación principal, y el evento que determina el inicio de su cómputo debe estar claramente definido, evitando superposiciones, vacíos o interpretaciones que generen controversias.',
                },
              ],
            },
          ],
        },
        {
          id: 'lugar_prestacion',
          titulo: 'Lugar de prestación del servicio',
          bloques: [],
          subsecciones: [
            {
              id: 'lugar_principal',
              titulo: 'Prestación principal',
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
              id: 'lugar_accesorias',
              titulo: 'Prestación accesoria',
              condicion: 'tiene_prestaciones_accesorias',
              bloques: [
                {
                  clase: 'tabla',
                  id: 'lugar_accesorias',
                  etiqueta: 'Lugar de las prestaciones accesorias',
                  instruccion:
                    'Señalar de manera independiente el lugar donde se ejecutará cada prestación accesoria, indicando dirección exacta, distrito, provincia y departamento, y el horario o condiciones',
                  columnas: ['Prestación accesoria', 'Lugar de ejecución'],
                  minimo: 0,
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
                'Señalar los documentos que el contratista debe entregar, la oportunidad y/o plazo de entrega y el medio de entrega: correo electrónico, mesa de partes virtual de la Entidad, entre otros',
              columnas: ['N°', 'Entregable', 'Plazo', 'Contenido'],
              minimo: 1,
            },
            {
              clase: 'parrafo',
              texto:
                'Los entregables deberán ser presentados a través de Mesa de Partes virtual de la Entidad y/o correo electrónico {{canal_entregables}}, en los plazos y fechas establecidas en los Términos de Referencia.',
              campos: [
                {
                  clase: 'campo',
                  id: 'canal_entregables',
                  etiqueta: 'Mesa de partes o correo',
                  ayuda: 'Consignar el link de la mesa de partes y/o el correo electrónico',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
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

        seccionControversias(true, 'servicios'),

        {
          id: 'plazo_respuestas',
          titulo: 'Plazo para respuestas entre las partes',
          bloques: [
            {
              // Redacción propia de servicios; en bienes la frase es otra.
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
                'Listar los recursos y facilidades que la entidad debe brindar al proveedor para que pueda ejecutar de manera eficiente, segura y oportuna el contrato',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'conformidad',
          titulo: 'Conformidad de la prestación',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'El {{area_conformidad}} en calidad de área usuaria, es el competente para emitir la conformidad. Donde, en caso corresponda deberá señalar los días de retraso injustificado u otras penalidades que incurrió el contratista, para efectos la Dependencia Encargada de Contrataciones (DEC) proceda con la determinación el importe a penalizar.',
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
                'Establecer los recursos, medios, equipos, herramientas, materiales, personal, infraestructura, licencias, autorizaciones o sistemas informáticos que el contratista debe proporcionar o mantener, y las obligaciones que asume para garantizar la adecuada ejecución. Las exigencias deben ser objetivas, razonables y proporcionales, sin restringir injustificadamente la libre concurrencia',
              ejemplo:
                'Proporcionar el personal, equipos, herramientas, instrumentos e implementos necesarios para la correcta ejecución del servicio.\nEjecutar el servicio conforme a las especificaciones técnicas, el plan de trabajo y los plazos establecidos por la Entidad.\nUtilizar materiales, insumos y repuestos que cumplan con las características técnicas exigidas en el requerimiento.\nCumplir las normas de seguridad y salud en el trabajo y proporcionar al personal los equipos de protección personal requeridos.\nMantener permanentemente la limpieza y el orden del área donde se ejecuten los trabajos, retirando los residuos generados al término de cada intervención.\nComunicar oportunamente a la Entidad cualquier situación que pueda afectar la continuidad o calidad del servicio.\nSubsanar, sin costo adicional para la Entidad, las observaciones o deficiencias atribuibles al contratista.\nCumplir la normativa técnica, ambiental y sectorial aplicable durante toda la ejecución contractual.',
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
                'El personal clave corresponde a profesionales o especialistas cuya participación resulta determinante para el cumplimiento de los objetivos del servicio. Las capacitaciones o certificaciones en gestión de proyectos —PMP® (PMI), IPMA®, PRINCE2® o APMP® (APM), o equivalentes— NO serán objeto de acreditación durante el procedimiento de selección: se presentan para el perfeccionamiento del contrato o el inicio de la implementación.',
            },
            {
              clase: 'tabla',
              id: 'personal_clave',
              etiqueta: 'Personal clave',
              instruccion:
                'Para cada cargo o función precisar, como mínimo, las principales responsabilidades y, de corresponder, la capacitación requerida',
              columnas: ['Cargo y/o responsabilidad', 'Actividades principales', 'Capacitación'],
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
              instruccion:
                'Para cada cargo indicar la cantidad requerida, la formación académica o técnica exigida, la experiencia mínima y la capacitación necesaria',
              columnas: [
                'Cargo y/o responsabilidad',
                'Cant.',
                'Profesión y grado o título profesional requerido',
                'Experiencia mínima',
                'Capacitación',
              ],
              minimo: 1,
            },
            {
              // Advertencia crítica: exigirlo en la oferta sería una
              // barrera de entrada indebida.
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
                'Detallar el equipamiento requerido que no tiene condición de estratégico. Debe guardar relación directa con la naturaleza de la prestación y ser razonablemente necesario',
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
                'Incluir los requisitos relacionados a la habilitación para llevar a cabo la actividad económica materia de la contratación, conforme a la normativa que regule el objeto contractual',
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
              // En servicios el horizonte es de QUINCE años, no diez.
              clase: 'parrafo',
              texto:
                'El postor debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto}}, por la contratación de servicios iguales o similares al objeto de la convocatoria, durante los quince años anteriores a la fecha de la presentación de ofertas que se computa desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto',
                  etiqueta: 'Monto facturado acumulado exigido',
                  ayuda:
                    'Consignar el monto de facturación expresado en números y letras en la moneda de la convocatoria, monto que no podrá ser mayor a tres veces la cuantía de la contratación o del ítem',
                  tipo: 'moneda',
                  obligatorio: true,
                  validacion: 'experiencia_max',
                },
              ],
            },
            {
              clase: 'parrafo',
              texto: 'Se consideran servicios similares a los siguientes {{servicios_similares}}',
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
                'La experiencia del postor en la especialidad se acredita con un máximo de veinte (20) contrataciones, mediante copia simple de: (i) contratos u órdenes de servicios, y su respectiva conformidad o constancia de prestación; o (ii) comprobantes de pago cuya cancelación se acredite documental y fehacientemente, con constancia de depósito, nota de abono, reporte de estado de cuenta, cualquier otro documento emitido por entidad del sistema financiero que acredite el abono o mediante cancelación en el mismo comprobante de pago, o comprobante de retención electrónico emitido por SUNAT por la retención del IGV. En caso el postor sustente su experiencia en la especialidad mediante contrataciones realizadas con privados, para acreditarla debe presentar de forma obligatoria lo indicado en el numeral (ii) del presente párrafo; no es posible que acredite su experiencia únicamente con la presentación de contratos u órdenes de servicio con conformidad o constancia de prestación.',
              fundamento: 'Plantilla — acreditación de experiencia, texto invariable',
            },
            {
              clase: 'fijo',
              texto:
                'En caso los postores presenten varios comprobantes de pago para acreditar una sola contratación, se debe acreditar que corresponden a dicha contratación; de lo contrario, se asumirá que los comprobantes acreditan contrataciones independientes, en cuyo caso solo se considerará, para la evaluación, las veinte (20) primeras contrataciones indicadas en el Anexo Nº 11 referido a la Experiencia del Postor en la Especialidad.',
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
                'Si el postor acredita experiencia de otra persona jurídica como consecuencia de una reorganización societaria, debe presentar adicionalmente el Anexo N° 14.',
            },
            {
              clase: 'fijo',
              texto:
                'Las personas jurídicas resultantes de un proceso de reorganización societaria no pueden acreditar como experiencia del postor en la especialidad aquella que le hubieran transmitido como parte de dicha reorganización las personas jurídicas sancionadas con inhabilitación vigente o definitiva.',
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
                'En el caso de postores que declaren en el Anexo N° 1 tener la condición de micro y pequeña empresa, se acredita una experiencia de {{experiencia_monto_mype}}, por la contratación de servicios iguales o similares al objeto de la convocatoria, durante los quince años anteriores a la fecha de la presentación de ofertas que se computa desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda. En el caso de consorcios, todos los integrantes deben contar con la condición de micro y pequeña empresa.',
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
                'Pueden ser personal clave los profesionales especialistas esenciales para ejecutar la prestación; no lo son quienes brinden labores de asistencia administrativa, técnica u operativa. El tiempo de experiencia mínimo debe ser razonable y congruente con el periodo en que el personal ejecutará las actividades, de forma que no restrinja la participación de postores. Tratándose de un ASISTE, la formación académica y la experiencia del personal clave se incorporan obligatoriamente en las Bases.',
            },
            {
              clase: 'redactado',
              id: 'capacidad_tecnica_requisito',
              etiqueta: 'Requisitos',
              instruccion:
                'Precisar la experiencia y formación del personal clave, el equipamiento estratégico o la infraestructura exigida como requisito adicional de calificación',
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
      ],
    },

    seccionSolicitante(),
  ],
};
