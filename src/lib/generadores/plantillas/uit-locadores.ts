/**
 * Plantilla: ANEXO 3 — TÉRMINOS DE REFERENCIA PARA LOCADORES
 * (menores a 8 UIT)
 *
 * Transcripción de "MENORES A 8 UIT/ANEXO 3 - TÉRMINOS DE REFERENCIA -
 * LOCADORES.docx". Es el formato para servicios técnicos, profesionales
 * o especializados prestados por PERSONAS NATURALES.
 *
 * LO QUE NO PUEDE FALTAR NI SUAVIZARSE
 *
 * El párrafo que declara la ausencia de vínculo laboral. Una locación de
 * servicios mal redactada se convierte en desnaturalización del
 * contrato, con responsabilidad para la Entidad. Por eso el texto que
 * afirma que las actividades son temporales, sin subordinación, que no
 * establecen relación laboral y que no otorgan los beneficios de la
 * legislación laboral va como bloque invariable y NO como algo que el
 * modelo redacte.
 *
 * Es también la plantilla más corta de las quince —531 líneas— y la
 * única sin experiencia del postor medida en monto facturado: aquí se
 * califica al profesional por su formación y sus años de ejercicio.
 */
import type { PlantillaRequerimiento } from '../plantilla-tipos';
import {
  seccionAnticorrupcion,
  seccionViciosOcultos,
  seccionSolicitante,
  bloquesPago,
  VALIDACION_PENALIDADES,
} from './comunes';
import {
  seccionesCabecera8Uit,
  seccionPenalidades8Uit,
  seccionesRegimenContratoMenor,
  seccionConfidencialidad,
} from './menores-8uit-comunes';

export const PLANTILLA_UIT_LOCADORES: PlantillaRequerimiento = {
  id: 'uit-locadores',
  familia: 'menor_8_uit',
  objeto: 'servicios',
  encabezado: 'TÉRMINOS DE REFERENCIA',
  subtitulo:
    'SERVICIOS TÉCNICOS, PROFESIONALES Y/O ESPECIALIZADOS REALIZADOS POR PERSONAS NATURALES (LOCADOR)',
  origen: 'MENORES A 8 UIT/ANEXO 3 - TÉRMINOS DE REFERENCIA - LOCADORES.docx',

  validaciones: [VALIDACION_PENALIDADES],

  secciones: [
    ...seccionesCabecera8Uit({
      ayudaDenominacion:
        'Indicar una breve descripción del requerimiento, mediante la denominación del (los) servicio(s) a ser contratado(s)',
      objeto: 'servicio',
      ejemploFinalidad:
        'La contratación tiene por finalidad garantizar la continuidad de las actividades administrativas mediante el adecuado funcionamiento de los equipos informáticos, contribuyendo a una atención oportuna y eficiente de los servicios que brinda la Entidad.',
      ejemploObjetivo:
        'Contratar el servicio de mantenimiento preventivo y correctivo de computadoras e impresoras, con la finalidad de asegurar su adecuado funcionamiento y reducir la ocurrencia de fallas que afecten el desarrollo de las actividades institucionales.',
      ejemploAntecedentes:
        'Los equipos informáticos de la Entidad requieren mantenimiento periódico para preservar su operatividad, prevenir fallas y corregir desperfectos que puedan afectar la continuidad de las labores administrativas. En ese sentido, resulta necesario contratar el servicio de mantenimiento preventivo y correctivo a fin de asegurar el adecuado funcionamiento de dichos equipos durante su vida útil.',
    }),

    {
      id: 'caracteristicas',
      titulo: 'CARACTERÍSTICAS Y CONDICIONES DEL SERVICIO A CONTRATAR',
      bloques: [],
      subsecciones: [
        {
          id: 'actividades',
          titulo: 'Actividades',
          bloques: [
            {
              clase: 'redactado',
              id: 'actividades',
              etiqueta: 'Actividades del locador',
              instruccion:
                'Detallar las actividades que ejecutará el locador. Deben guardar relación directa con el objeto del servicio y orientarse a la obtención de productos o resultados concretos',
              extension: 'lista',
            },
            {
              // El núcleo jurídico de esta plantilla. Sin este párrafo la
              // locación puede desnaturalizarse en relación laboral.
              clase: 'fijo',
              texto:
                'Las actividades antes mencionadas tienen un carácter temporal y no son de naturaleza laboral. Además, estas actividades se realizan sin subordinación, por lo que su contratación no establece una relación laboral con la entidad, y no otorga ninguno de los beneficios previstos en la legislación laboral.',
              fundamento: 'Plantilla — ausencia de vínculo laboral',
            },
            {
              clase: 'fijo',
              texto:
                'Las actividades descritas constituyen obligaciones contractuales orientadas al cumplimiento del objeto de la contratación y a la obtención de los productos o resultados esperados.',
            },
            {
              clase: 'fijo',
              texto:
                'La ejecución del servicio se realizará con autonomía técnica y sin subordinación respecto de la Entidad, conforme a las condiciones pactadas en el contrato de locación de servicios, por lo que no genera vínculo laboral ni el reconocimiento de los derechos propios del régimen laboral aplicable al personal de la Entidad.',
              fundamento: 'Plantilla — autonomía técnica del locador',
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
                'Precisar el tipo de seguro requerido, las coberturas mínimas, el período de vigencia y la oportunidad de presentación',
              extension: 'parrafo',
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
                'Delimitar el contenido, condiciones y oportunidad de entrega del plan, y el plazo del área usuaria para su aprobación',
              ejemplo:
                'Objetivo de la asesoría.\nMetodología para el desarrollo del servicio.\nCronograma de actividades.\nProgramación de reuniones de coordinación.\nCronograma de presentación de informes o productos.',
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
              instruccion: 'Precisar el sistema de contratación que corresponda',
              opciones: [
                {
                  valor: 'suma_alzada',
                  texto:
                    'De acuerdo con el objeto contractual, la modalidad de pago es Suma Alzada. Es aplicable cuando las cantidades, magnitudes y calidades de la prestación están definidas en los términos de referencia.',
                },
                {
                  valor: 'tarifas',
                  texto:
                    'De acuerdo con el objeto contractual, la modalidad de pago es Tarifas. Es aplicable cuando no puede conocerse con precisión el tiempo de prestación del servicio.',
                },
                {
                  valor: 'consumo',
                  texto:
                    'De acuerdo con el objeto contractual, la modalidad de pago es Pago por consumo, aplicable a servicios de consumo variable cuando la unidad de medida del pago sea la hora de labor profesional especializada.',
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
              clase: 'opcion',
              id: 'sistema_entrega',
              etiqueta: 'Sistema de entrega',
              instruccion: 'Consignar el sistema de entrega determinado en la estrategia de contratación',
              opciones: [
                { valor: 'no_aplica', texto: 'No aplica ningún sistema de entrega.' },
                {
                  valor: 'diseno_operacion',
                  texto: 'El contrato se rige por el sistema de entrega de Diseño de la operación y mantenimiento.',
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
          id: 'entregables',
          titulo: 'Entregable',
          bloques: [
            {
              clase: 'tabla',
              id: 'entregables',
              etiqueta: 'Entregables',
              instruccion:
                'Señalar los informes o productos que el locador debe entregar, el plazo y el medio de entrega',
              columnas: ['N°', 'Entregable', 'Plazo', 'Contenido'],
              minimo: 1,
            },
          ],
        },

        seccionPenalidades8Uit(),

        {
          id: 'subcontratacion',
          titulo: 'Subcontratación',
          bloques: [
            {
              // Sin alternativa: un locador presta el servicio en
              // persona; subcontratar desnaturalizaría la figura.
              clase: 'fijo',
              texto: 'Se encuentra prohibida la subcontratación de las prestaciones objeto del contrato.',
              fundamento: 'Plantilla — locación de servicios',
            },
          ],
        },

        ...seccionesRegimenContratoMenor(),
        seccionViciosOcultos(),
        seccionConfidencialidad(true),
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
                'Listar los recursos, información y facilidades que la entidad debe brindar al locador para que pueda ejecutar el servicio',
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
                'Precisar el órgano competente para emitir la conformidad, qué se verifica y en qué plazo',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'verificaciones',
          titulo: 'Verificaciones técnicas, pruebas o ensayos para la conformidad del bien',
          condicion: 'requiere_verificaciones',
          bloques: [
            {
              clase: 'redactado',
              id: 'verificaciones',
              etiqueta: 'Verificaciones para la conformidad',
              instruccion:
                'Indicar la relación de pruebas o ensayos requeridos para la conformidad del bien y la cantidad de muestras que debe entregar el contratista, en función de la naturaleza de los bienes',
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
      titulo: 'REQUISITOS Y RECURSOS PROVISTOS POR EL PROVEEDOR',
      bloques: [],
      subsecciones: [
        {
          id: 'requisitos_proveedor',
          titulo: 'Requisitos del proveedor',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'Contar con RUC activo y habido en la SUNAT.\nRealizar actividades en el objeto de la contratación.\nRegistro Nacional de Proveedores en los casos que la contratación supere una (1) UIT.\nCódigo de cuenta interbancario (CCI) vinculado al RUC.\nPersona natural y/o jurídica.\nNo tener impedimento para contratar con el Estado.\nContar con correo electrónico para efectos de notificación en la fase de ejecución contractual durante la vigencia del contrato.',
              fundamento: 'Plantilla — requisitos del proveedor en contratos menores',
            },
          ],
        },
        {
          id: 'obligaciones_contratista',
          titulo: 'Obligaciones mínimas del contratista',
          bloques: [
            { clase: 'fijo', texto: 'El contratista deberá cumplir, como mínimo, con las siguientes obligaciones:' },
            {
              clase: 'fijo',
              texto:
                'Ejecutar el servicio conforme a los Términos de Referencia, la orden de servicio o contrato y la propuesta presentada, cuando corresponda.\nDesarrollar las actividades en los plazos establecidos, observando criterios de calidad, eficiencia y oportunidad.\nAplicar los conocimientos técnicos o profesionales necesarios para alcanzar los resultados esperados del servicio.\nElaborar y presentar los informes, productos, entregables o documentación técnica previstos en los plazos establecidos.\nAsistir a las reuniones de coordinación convocadas por la Entidad cuando ello resulte necesario para la ejecución del servicio.\nMantener comunicación permanente con el responsable designado por la Entidad respecto al avance del servicio y comunicar oportunamente cualquier situación que pueda afectar su ejecución.\nAtender y subsanar, dentro del plazo otorgado por la Entidad, las observaciones formuladas respecto de los entregables o productos presentados, siempre que sean atribuibles al contratista.\nGuardar absoluta reserva y confidencialidad respecto de toda la información, documentación y datos a los que tenga acceso durante la ejecución del servicio, aun después de concluida la contratación.',
              fundamento: 'Plantilla — obligaciones mínimas del locador',
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
          id: 'formacion_academica',
          titulo: 'Formación académica',
          bloques: [
            {
              clase: 'tabla',
              id: 'formacion_academica',
              etiqueta: 'Formación académica exigida',
              instruccion:
                'Consignar el grado de bachiller, título profesional, título profesional técnico o título de segunda especialidad, según el perfil requerido',
              columnas: ['Cargo y/o responsabilidad', 'Profesión', 'Grado o título profesional requerido'],
              minimo: 1,
            },
          ],
        },
        {
          id: 'experiencia',
          titulo: 'Experiencia',
          bloques: [
            {
              // A diferencia del resto de plantillas, aquí no hay monto
              // facturado: se califica al profesional por años y cargos.
              clase: 'tabla',
              id: 'experiencia',
              etiqueta: 'Experiencia mínima requerida',
              instruccion:
                'Precisar el tiempo de experiencia general y la experiencia específica: tiempo, cargo desempeñado y cómputo',
              columnas: [
                'Tiempo de experiencia general',
                'Tiempo de experiencia específica',
                'Cargo desempeñado',
                'Cómputo de experiencia',
              ],
              minimo: 1,
            },
            {
              clase: 'redactado',
              id: 'experiencia_acreditacion',
              etiqueta: 'Acreditación',
              instruccion:
                'Precisar los documentos con los que se acredita la experiencia: contratos y su conformidad, constancias, certificados u otra documentación fehaciente',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'capacitacion',
          titulo: 'Capacitación',
          condicion: 'exige_capacitacion',
          bloques: [
            {
              clase: 'tabla',
              id: 'capacitacion',
              etiqueta: 'Capacitación exigida',
              columnas: ['Materia o área de capacitación', 'Cantidad de horas'],
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
              columnas: ['Equipamiento estratégico', 'Cant.', 'Características mínimas'],
              minimo: 1,
            },
          ],
        },
      ],
    },

    seccionSolicitante(),
  ],
};
