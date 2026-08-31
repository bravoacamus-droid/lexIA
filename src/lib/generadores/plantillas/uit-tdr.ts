/**
 * Plantilla: ANEXO 2 — TÉRMINOS DE REFERENCIA (menores a 8 UIT)
 *
 * Transcripción de "MENORES A 8 UIT/ANEXO 2 - TÉRMINOS DE
 * REFERENCIA.docx". Es el formato para contratar SERVICIOS y
 * CONSULTORÍAS por debajo de las ocho UIT.
 *
 * Comparte con el ANEXO 1 todo el régimen del contrato menor
 * —conciliación obligatoria, garantía no exigible, fórmula de penalidad
 * con F = 0.40, confidencialidad y propiedad intelectual— y añade dos
 * cosas propias:
 *
 *  · Cierra la cláusula de confidencialidad con las consecuencias de
 *    romperla: falta grave, penalidades, resolución, indemnización y
 *    acciones administrativas, civiles o penales.
 *  · Pide dos requisitos más al proveedor: no tener impedimento para
 *    contratar con el Estado y contar con correo electrónico para
 *    notificaciones durante la ejecución.
 *
 * La experiencia mira QUINCE años, como en los servicios grandes, y el
 * tope sigue siendo de tres veces la cuantía.
 */
import type { PlantillaRequerimiento } from '../plantilla-tipos';
import {
  seccionAnticorrupcion,
  seccionViciosOcultos,
  seccionSolicitante,
  bloquesPago,
  bloquesPagoAnticipado,
  VALIDACION_ADELANTO,
  VALIDACION_EXPERIENCIA,
  VALIDACION_PENALIDADES,
} from './comunes';
import {
  seccionesCabecera8Uit,
  seccionPenalidades8Uit,
  seccionesRegimenContratoMenor,
  seccionConfidencialidad,
} from './menores-8uit-comunes';

export const PLANTILLA_UIT_TDR: PlantillaRequerimiento = {
  id: 'uit-tdr',
  familia: 'menor_8_uit',
  objeto: 'servicios',
  encabezado: 'TÉRMINOS DE REFERENCIA',
  subtitulo: 'CONTRATACIÓN DE SERVICIOS MENOR A 8 UIT',
  origen: 'MENORES A 8 UIT/ANEXO 2 - TÉRMINOS DE REFERENCIA.docx',

  validaciones: [VALIDACION_ADELANTO, VALIDACION_EXPERIENCIA, VALIDACION_PENALIDADES],

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
          // Los tres apartados del formato que no estaban. Observación
          // de César (agosto de 2026): "en LexIA, no se consideró los
          // siguientes campos del modelo de formato".
          id: 'descripcion_general',
          titulo: 'Descripción general del servicio a contratar',
          bloques: [
            {
              clase: 'redactado',
              id: 'descripcion_general',
              etiqueta: 'Descripción general del servicio',
              instruccion:
                'Describir de manera general el servicio objeto de la contratación, indicando de forma resumida las prestaciones que serán ejecutadas',
              extension: 'parrafo',
            },
            {
              // Cuando hay varios ítems, el formato pide identificarlos
              // uno a uno con su descripción.
              clase: 'tabla',
              id: 'descripcion_items',
              etiqueta: 'Descripción por ítem',
              instruccion:
                'Cuando la contratación comprenda más de un ítem o paquete, identificar cada uno señalando su respectiva descripción',
              columnas: ['Ítem', 'Descripción del servicio'],
              minimo: 0,
              complementaria: true,
            },
          ],
        },
        {
          id: 'documentacion_suscripcion',
          titulo: 'Documentación para la suscripción (perfeccionamiento) del contrato',
          condicion: 'requiere_documentacion_suscripcion',
          bloques: [
            {
              clase: 'redactado',
              id: 'documentacion_suscripcion',
              etiqueta: 'Documentación adicional para el perfeccionamiento del contrato',
              instruccion:
                'Señalar la documentación adicional que el adjudicatario debe presentar para perfeccionar el contrato. Debe estar directamente relacionada con el objeto de la contratación y resultar necesaria para su ejecución; no puede exigirse documentación que constituya un requisito de calificación ya evaluado',
              extension: 'lista',
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
                'En caso la autoridad de la gestión administrativa haya aprobado el proceso de compatibilización del requerimiento, consignar el documento mediante el cual se aprobó',
              tipo: 'texto',
              obligatorio: true,
            },
          ],
        },
        {
          id: 'caracteristicas_tecnicas',
          titulo: 'Características técnicas y condiciones de ejecución del servicio',
          bloques: [
            {
              clase: 'redactado',
              id: 'caracteristicas_tecnicas',
              etiqueta: 'Características técnicas y condiciones de ejecución',
              instruccion:
                'Describir qué comprende el servicio, cómo debe ejecutarse, qué resultados debe alcanzar, qué condiciones técnicas mínimas debe cumplir y qué metodología, estándares o niveles de servicio deben observarse',
              ejemplo:
                'Diagnóstico técnico previo de los equipos.\nEjecución del servicio con herramientas e insumos adecuados.\nVerificación del correcto funcionamiento luego de cada intervención.\nPresentación de informes técnicos por cada intervención realizada.',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'actividades',
          titulo: 'Actividades',
          bloques: [
            {
              clase: 'redactado',
              id: 'actividades',
              etiqueta: 'Actividades del contratista',
              instruccion:
                'Detallar las principales actividades que ejecutará el contratista, con verbos precisos y en relación directa con los resultados esperados',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'prestaciones_accesorias',
          titulo: 'Prestaciones accesorias a la prestación principal',
          condicion: 'tiene_prestaciones_accesorias',
          bloques: [
            {
              clase: 'redactado',
              id: 'mantenimiento',
              etiqueta: 'Mantenimiento preventivo y/o correctivo',
              instruccion:
                'Precisar el alcance, el tipo de mantenimiento, la frecuencia, las actividades mínimas y el tiempo máximo de atención',
              extension: 'varios_parrafos',
            },
            {
              clase: 'redactado',
              id: 'soporte_tecnico',
              etiqueta: 'Soporte técnico',
              instruccion:
                'Precisar la modalidad, el alcance, el horario, los canales de atención y los tiempos máximos de respuesta',
              ejemplo:
                'Diagnóstico de fallas.\nAsistencia para la configuración del sistema.\nRestablecimiento del servicio.\nRecomendaciones para prevenir nuevas incidencias.',
              extension: 'varios_parrafos',
            },
            {
              clase: 'redactado',
              id: 'capacitacion',
              etiqueta: 'Capacitación y/o entrenamiento',
              instruccion:
                'Precisar los temas, el número mínimo de participantes, la modalidad, la duración, el perfil del expositor y el material a entregar',
              extension: 'varios_parrafos',
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
                'Delimitar el contenido, condiciones y oportunidad de entrega, y el plazo del área usuaria para su aprobación',
              ejemplo:
                'Objetivos de la prestación.\nMetodología de ejecución del servicio.\nRelación y secuencia de las actividades a desarrollar.\nCronograma de ejecución.\nRecursos y equipos que se emplearán.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'garantia_prestacion',
          titulo: 'Garantía de la prestación',
          condicion: 'tiene_garantia_prestacion',
          // Como en bienes: el formato trae las condiciones escritas y
          // del período solo deja el plazo. Observación de César (agosto
          // de 2026): "en la garantía comercial (alcance de la garantía,
          // condiciones de la garantía) las condiciones ya están
          // establecidas por lo que no hay necesidad de redactar".
          bloques: [
            { clase: 'titulo', texto: 'Alcance de la garantía', nivel: 3 },
            {
              // El alcance sí lo escribe el área usuaria: depende del
              // servicio. El formato lo deja entre corchetes.
              clase: 'redactado',
              id: 'garantia_prestacion',
              etiqueta: 'Alcance de la garantía',
              instruccion:
                'Precisar qué comprende la garantía del servicio: la subsanación de deficiencias, fallas o incorrecta ejecución atribuibles al contratista y, de corresponder, el reemplazo de los repuestos instalados que presenten defectos, sin costo adicional para la Entidad',
              ejemplo:
                'El contratista garantizará la calidad de los trabajos ejecutados durante el mantenimiento preventivo y correctivo de los equipos de aire acondicionado. La garantía comprende la subsanación de cualquier deficiencia, falla o incorrecta ejecución del servicio atribuible al contratista, así como el reemplazo de los repuestos instalados que presenten defectos de fabricación o funcionamiento, sin costo adicional para la Entidad.',
              extension: 'varios_parrafos',
            },
            { clase: 'titulo', texto: 'Condiciones de la garantía', nivel: 3 },
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
            { clase: 'titulo', texto: 'Período de garantía', nivel: 3 },
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
          condicion: 'preve_visita',
          bloques: [
            {
              clase: 'redactado',
              id: 'visita',
              etiqueta: 'Condiciones de la visita',
              instruccion:
                'Precisar el objeto, el lugar, la oportunidad, el medio de coordinación, el responsable y la indicación expresa de que es facultativa',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'anexos',
          titulo: 'Anexos',
          condicion: 'tiene_anexos',
          bloques: [
            {
              clase: 'redactado',
              id: 'anexos',
              etiqueta: 'Anexos',
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
                'Precisar la modalidad de pago que corresponda. Suma alzada: cuando las cantidades, magnitudes y calidades de la prestación estén definidas en los términos de referencia. Precios unitarios: cuando no puede conocerse con exactitud o precisión las cantidades o magnitudes requeridas. Tarifas: cuando no puede conocerse con precisión el tiempo de prestación del servicio. Pago por consumo: cuando se paga por lo efectivamente consumido. Esquema mixto: cuando la entidad puede utilizar más de una modalidad en un mismo contrato',
              opciones: [
                // La redacción del formato: "El contrato se rige por la
                // modalidad de pago de […], de conformidad con el
                // artículo 130 del Reglamento". Observación de César
                // (agosto de 2026): "en la modalidad de pago, debe
                // adecuarse los textos según el modelo proporcionado",
                // con el ejemplo escrito así.
                //
                // Cuándo aplica cada una no va en el documento —el
                // formato lo pone entre corchetes, como guía para el
                // área usuaria—: vive en la instrucción de arriba.
                {
                  valor: 'suma_alzada',
                  texto:
                    'El contrato se rige por la modalidad de pago de SUMA ALZADA, de conformidad con el artículo 130 del Reglamento.',
                },
                {
                  valor: 'precios_unitarios',
                  texto:
                    'El contrato se rige por la modalidad de pago de PRECIOS UNITARIOS, de conformidad con el artículo 130 del Reglamento.',
                },
                {
                  valor: 'tarifas',
                  texto:
                    'El contrato se rige por la modalidad de pago de TARIFAS, de conformidad con el artículo 130 del Reglamento.',
                },
                {
                  valor: 'pago_consumo',
                  texto:
                    'El contrato se rige por la modalidad de pago de PAGO POR CONSUMO, de conformidad con el artículo 130 del Reglamento.',
                },
                {
                  valor: 'esquema_mixto',
                  texto:
                    'El contrato se rige por la modalidad de pago de ESQUEMA MIXTO, de conformidad con el artículo 130 del Reglamento.',
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
                  texto: 'El contrato se rige por el sistema de entrega de Diseño de la operación y mantenimiento, de conformidad con el artículo 129 del Reglamento.',
                },
                {
                  valor: 'gestion_instalaciones',
                  texto: 'El contrato se rige por el sistema de entrega de Gestión de instalaciones, de conformidad con el artículo 129 del Reglamento.',
                },
              ],
            },
          ],
        },
        {
          id: 'plazo_prestacion',
          titulo: 'Plazo de prestación del servicio',
          bloques: [
            { clase: 'titulo', texto: 'Prestación principal', nivel: 3 },
            {
              // El formato trae el párrafo escrito y solo deja los días.
              // LexIA pedía redactar el plazo entero. Observación de
              // César (agosto de 2026): "en la opción de Plazo de la
              // prestación principal, debe adecuarse según el modelo
              // proporcionado".
              clase: 'parrafo',
              texto:
                'Los servicios materia de la presente convocatoria se prestan en el plazo de {{plazo_servicio}} días calendario, computados a partir del día siguiente de la notificación de la orden de servicio o suscripción del contrato o del cumplimiento de la condición establecida en los Términos de Referencia, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'plazo_servicio',
                  etiqueta: 'Plazo de la prestación principal',
                  ayuda: 'Consignar los días de ejecución del servicio',
                  tipo: 'dias',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'titulo',
              texto: 'Prestación accesoria',
              nivel: 3,
              visibleSi: { condicion: 'tiene_prestaciones_accesorias' },
            },
            {
              clase: 'tabla',
              id: 'plazo_accesorias',
              etiqueta: 'Plazos de las prestaciones accesorias',
              instruccion:
                'Establecer de manera independiente el plazo de cada prestación accesoria y el evento que da inicio a su cómputo',
              columnas: ['Prestación accesoria', 'Plazo', 'Inicio del cómputo'],
              minimo: 0,
              // Sin prestaciones accesorias no hay plazo que fijar. Vive
              // suelto dentro del plazo principal, así que la condición
              // la lleva el bloque.
              visibleSi: { condicion: 'tiene_prestaciones_accesorias' },
            },
          ],
        },
        {
          id: 'lugar_prestacion',
          titulo: 'Lugar de prestación del servicio',
          // Dividido en principal y accesoria, como el formato.
          // Observaciones de César (agosto de 2026): la ventana "debe ser
          // redimensionable desde una esquina o borde" —que ya lo es para
          // todos los campos— y "debe incorporarse la opción de lugar de
          // prestación para prestación accesoria".
          bloques: [
            { clase: 'titulo', texto: 'Prestación principal', nivel: 3 },
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
                  tipo: 'texto_largo',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'nota',
              texto:
                'En caso se establezca que las prestaciones se van a realizar en varios lugares, se recomienda incorporar un cuadro con las direcciones exactas de cada lugar.',
            },
            {
              clase: 'tabla',
              id: 'lugares_prestacion',
              etiqueta: 'Lugares de prestación',
              instruccion:
                'Cuando el servicio se preste en varios lugares: el lugar, su dirección exacta y la referencia que permita ubicarlo',
              columnas: ['Lugar', 'Dirección', 'Referencia'],
              minimo: 0,
              complementaria: true,
            },
            {
              clase: 'titulo',
              texto: 'Prestación accesoria',
              nivel: 3,
              visibleSi: { condicion: 'tiene_prestaciones_accesorias' },
            },
            {
              clase: 'redactado',
              id: 'lugar_prestacion_accesoria',
              etiqueta: 'Lugar de ejecución de las prestaciones accesorias',
              instruccion:
                'Señalar de manera independiente el lugar donde se ejecutará cada prestación accesoria, con el distrito, la provincia y el departamento. Si se ejecutan en un lugar distinto al de la prestación principal, precisarlo expresamente. Si no corresponde, consignar NO APLICA',
              extension: 'parrafo',
              visibleSi: { condicion: 'tiene_prestaciones_accesorias' },
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
                'Señalar los documentos que el contratista debe entregar, la oportunidad o plazo de entrega y el medio de entrega',
              columnas: ['N°', 'Entregable', 'Plazo', 'Contenido'],
              minimo: 1,
            },
            {
              // La condición que cierra el apartado en el formato
              // y no estaba. Observación de César (agosto de 2026):
              // "al entregable le falta añadir la siguiente
              // condición". El canal lo rellena la entidad.
              clase: 'parrafo',
              texto:
                'Los entregables deberán ser presentados a través de Mesa de Partes virtual de la Entidad y/o correo electrónico {{entregables_canal}}, en los plazos y fechas establecidas en los Términos de Referencia.',
              campos: [
                {
                  clase: 'campo',
                  id: 'entregables_canal',
                  etiqueta: 'Mesa de partes virtual y/o correo electrónico',
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
              clase: 'nota',
              texto:
                'Aplica únicamente cuando corresponda otorgar adelantos y así se haya previsto y sustentado en la estrategia de contratación. Si se otorga, el contratista debe presentar previamente una garantía por idéntico monto.',
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

        seccionPenalidades8Uit(),

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
                    'Se permite la subcontratación de las prestaciones objeto del contrato, conforme a las condiciones establecidas en la normativa de contrataciones públicas.',
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
              instruccion: 'Consignar las fórmulas de reajuste correspondientes y el procedimiento aplicable',
              extension: 'parrafo',
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
              // El formato no deja esto a la redacción: trae los dos
              // párrafos escritos y solo dos huecos —el área usuaria y
              // qué se recibe—. Observación de César (agosto de 2026):
              // "en el Órgano quien brindará la conformidad, debe ser
              // adecuado según modelo alcanzado".
              clase: 'parrafo',
              texto:
                'El {{area_conformidad}} en calidad de área usuaria, es el competente para emitir la conformidad. Donde, en caso corresponda deberá señalar los días de retraso injustificado u otras penalidades que incurrió el contratista, para efectos la Dependencia Encargada de Contrataciones (DEC) proceda con la determinación el importe a penalizar.',
              campos: [
                {
                  clase: 'campo',
                  id: 'area_conformidad',
                  etiqueta: 'Área usuaria que emite la conformidad',
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
            { clase: 'titulo', texto: 'Prestación principal', nivel: 3 },
            { clase: 'fijo', texto: 'El pago se realiza de conformidad con lo establecido en el artículo 67 de la Ley.' },
            ...bloquesPago(),
            ...bloquesPagoAnticipado(),
            {
              // El pago de las accesorias tiene su propio numeral más
              // abajo —"Prestaciones accesorias"—, con su modalidad y su
              // cuadro de requisitos. Aquí solo se avisa, para que quien
              // lea el apartado sepa dónde está. Observación de César
              // (agosto de 2026): el formato divide la forma de pago en
              // prestación principal y accesoria.
              clase: 'nota',
              texto:
                'La forma y los requisitos de pago de las prestaciones accesorias se establecen de manera independiente en el numeral "Prestaciones accesorias".',
              visibleSi: { condicion: 'tiene_prestaciones_accesorias' },
            },
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
      titulo: 'REQUISITOS Y RECURSOS PROVISTOS POR EL PROVEEDOR',
      bloques: [],
      subsecciones: [
        {
          // El formato pide aquí el personal, clave y no clave, y no
          // estaba. Observación de César (agosto de 2026): "personal
          // clave y no clave del numeral REQUISITOS Y RECURSOS
          // PROVISTOS POR EL PROVEEDOR" y "adecuar a la opción de
          // personal clave y no clave conforme al modelo".
          id: 'personal_clave',
          titulo: 'Personal clave',
          condicion: 'exige_personal_clave',
          bloques: [
            {
              clase: 'nota',
              texto:
                'El personal clave son los profesionales o especialistas cuya participación resulta determinante para el cumplimiento de los objetivos del servicio. Su experiencia mínima se establece en los Requisitos de Calificación. Los grados académicos o títulos profesionales no se acreditan durante el procedimiento de selección: se presentan para el perfeccionamiento del contrato o el inicio de la prestación, según corresponda.',
            },
            {
              clase: 'tabla',
              id: 'personal_clave',
              etiqueta: 'Personal clave',
              instruccion:
                'Para cada cargo o función: las actividades principales que realizará y la capacitación exigida, de corresponder',
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
              clase: 'nota',
              texto:
                'Cuando la ejecución del servicio requiera personal de apoyo, operativo, técnico o administrativo que complemente las actividades del personal clave. Las exigencias deben ser objetivas, razonables y proporcionales a la naturaleza del servicio.',
            },
            {
              clase: 'tabla',
              id: 'personal_no_clave',
              etiqueta: 'Personal no clave',
              instruccion:
                'Para cada cargo: la cantidad requerida, la formación académica o técnica exigida, la experiencia mínima y la capacitación necesaria',
              columnas: [
                'Cargo y/o responsabilidad',
                'Cant.',
                'Profesión y grado o título profesional requerido',
                'Experiencia mínima',
                'Capacitación',
              ],
              minimo: 1,
            },
          ],
        },
        {
          id: 'requisitos_proveedor',
          titulo: 'Requisitos del proveedor',
          bloques: [
            {
              // Dos requisitos más que en el ANEXO 1: impedimento y
              // correo electrónico para notificaciones.
              clase: 'fijo',
              texto:
                'Contar con RUC activo y habido en la SUNAT.\nRealizar actividades en el objeto de la contratación.\nRegistro Nacional de Proveedores en los casos que la contratación supere una (1) UIT.\nCódigo de cuenta interbancario (CCI) vinculado al RUC.\nPersona natural y/o jurídica.\nNo tener impedimento para contratar con el Estado.\nContar con correo electrónico para efectos de notificación en la fase de ejecución contractual durante la vigencia del contrato.',
              fundamento: 'Plantilla — requisitos del proveedor en contratos menores',
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
                'Establecer los recursos, medios, equipos, herramientas, materiales, personal, infraestructura, licencias, autorizaciones o sistemas informáticos que el contratista debe proporcionar o mantener, y las obligaciones que asume',
              extension: 'lista',
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
              instruccion: 'Detallar el equipamiento requerido que no tiene condición de estratégico',
              columnas: ['Equipamiento', 'Cant.', 'Características mínimas'],
              minimo: 1,
            },
            {
              // El cierre que el formato pone bajo el cuadro y faltaba.
              clase: 'fijo',
              texto:
                'Este requisito no materia de evaluación al momento de la recepción de las cotizaciones.',
            },
          ],
        },
        {
          // La infraestructura estratégica no estaba. Observación de
          // César (agosto de 2026): "adecuar la infraestructura y
          // equipamiento estratégico, según modelo".
          id: 'infraestructura',
          titulo: 'Infraestructura estratégica',
          condicion: 'exige_infraestructura',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Las características y condiciones que se exijan a la infraestructura no deben constituir exigencias desproporcionadas, irrazonables o innecesarias.',
            },
            {
              clase: 'tabla',
              id: 'infraestructura',
              etiqueta: 'Infraestructura estratégica',
              instruccion:
                'Detallar la infraestructura clasificada como estratégica para ejecutar la prestación objeto de la contratación',
              columnas: [
                'Infraestructura estratégica',
                'Cant.',
                'Características mínimas de la infraestructura',
              ],
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
          id: 'capacidad_legal',
          titulo: 'Capacidad legal',
          condicion: 'exige_habilitacion',
          bloques: [
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
              clase: 'titulo',
              texto: 'Requisitos:',
              nivel: 3,
            },
            {
              clase: 'parrafo',
              texto:
                'El postor debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto}}, por la contratación de servicios iguales o similares al objeto de la convocatoria, durante los quince (15) años anteriores a la fecha de la presentación de ofertas que se computa desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto',
                  etiqueta: 'Monto facturado acumulado exigido',
                  ayuda:
                    'Consignar el monto de facturación expresado en números y letras en la moneda de la convocatoria, monto que no podrá ser mayor a tres veces de la cuantía de la contratación o del ítem, en caso de servicios en general o servicio de consultoría en general, respectivamente según corresponda',
                  tipo: 'moneda',
                  obligatorio: true,
                  validacion: 'experiencia_max',
                },
              ],
            },
            {
              clase: 'parrafo',
              texto: 'Se consideran servicios similares a los siguientes: {{servicios_similares}}.',
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
            {
              // Los rótulos con que el formato separa lo que se exige
              // de cómo se acredita. Observación de César (agosto de
              // 2026): "respecto a la experiencia del postor en la
              // especialidad falta definir el texto 'Acreditación'".
              clase: 'titulo',
              texto: 'Acreditación:',
              nivel: 3,
            },
            {
              clase: 'fijo',
              texto:
                'La experiencia del postor en la especialidad se acreditará con copia simple de (i) contratos u órdenes de servicios, y su respectiva conformidad o constancia de prestación; o (ii) comprobantes de pago cuya cancelación se acredite documental y fehacientemente, con constancia de depósito, nota de abono, reporte de estado de cuenta, cualquier otro documento emitido por entidad del sistema financiero que acredite el abono o mediante cancelación en el mismo comprobante de pago, o comprobante de retención electrónico emitido por SUNAT por la retención del IGV correspondientes a un máximo de veinte contrataciones. En caso el postor sustente su experiencia en la especialidad mediante contrataciones realizadas con privados, para acreditarla debe presentar de forma obligatoria lo indicado en el numeral (ii) del presente párrafo; no es posible que acredite su experiencia únicamente con la presentación de contratos u órdenes de compra con conformidad o constancia de prestación.',
              fundamento: 'Plantilla — acreditación de experiencia, texto invariable',
            },
          ],
        },
        {
          id: 'capacidad_tecnica',
          titulo: 'Capacidad técnica y profesional del personal clave',
          condicion: 'exige_capacidad_tecnica',
          bloques: [
            {
              clase: 'tabla',
              id: 'formacion_academica',
              etiqueta: 'Formación académica',
              instruccion:
                'Como requisito de calificación solo puede consignarse "grado de bachiller" o "título profesional"',
              columnas: ['Cargo y/o responsabilidad', 'Profesión', 'Grado o título profesional requerido'],
              minimo: 1,
            },
            {
              clase: 'tabla',
              id: 'experiencia_personal_clave',
              etiqueta: 'Experiencia del personal clave',
              columnas: ['Cargo y/o responsabilidad', 'Tiempo de experiencia', 'Cargo desempeñado'],
              minimo: 1,
            },
            {
              // Lo que el formato dice bajo el cuadro y no estaba.
              // Observación de César (agosto de 2026): "adecuar a la
              // opción de Experiencia del personal clave conforme al
              // modelo (cuadro); asimismo, la forma de acreditación ya
              // está definido".
              clase: 'fijo',
              texto:
                'El tiempo de experiencia mínimo debe ser razonable y congruente con el periodo en el cual el personal ejecuta las actividades para las que se le requiere, de forma tal que no constituya una restricción a la participación de postores. Al calificar la experiencia del personal, se debe valorar de manera integral los documentos presentados por el postor para acreditar dicha experiencia. En tal sentido, aun cuando en los documentos presentados la denominación del cargo o puesto no coincida literalmente con aquella prevista en las bases, se debe validar la experiencia si las actividades que realizó el personal corresponden con la función propia del cargo o puesto requerido en las bases.',
            },
            { clase: 'titulo', texto: 'Acreditación:', nivel: 3 },
            {
              clase: 'fijo',
              texto:
                'La experiencia del personal clave se acreditará con cualquiera de los siguientes documentos: (i) copia simple de contratos y su respectiva conformidad o (ii) constancias o (iii) certificados o (iv) cualquier otra documentación que, de manera fehaciente demuestre la experiencia del personal propuesto. Los documentos que acreditan la experiencia deben incluir los nombres y apellidos del personal clave, el cargo desempeñado, el plazo de la prestación indicando el día, mes y año de inicio y culminación, el nombre de la entidad u organización que emite el documento, la fecha de emisión y nombres y apellidos de quien suscribe el documento. En caso los documentos para acreditar la experiencia establezcan el plazo de la experiencia adquirida por el personal clave en meses sin especificar los días se debe considerar el mes completo. De presentarse experiencia ejecutada paralelamente (traslape), para el cómputo del tiempo de dicha experiencia sólo se considerará una vez el periodo traslapado.',
            },
            {
              clase: 'tabla',
              id: 'capacitacion_personal',
              etiqueta: 'Capacitación',
              instruccion: 'Precisar la materia o área de capacitación y la cantidad de horas exigida',
              columnas: ['Cargo y/o responsabilidad', 'Materia o área de capacitación', 'Cantidad de horas'],
              minimo: 0,
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
        {
          id: 'infraestructura_estrategica',
          titulo: 'Infraestructura estratégica',
          condicion: 'exige_infraestructura',
          bloques: [
            {
              clase: 'tabla',
              id: 'infraestructura_estrategica',
              etiqueta: 'Infraestructura estratégica',
              columnas: ['Infraestructura estratégica', 'Cant.', 'Características mínimas'],
              minimo: 1,
            },
          ],
        },
      ],
    },

    seccionSolicitante(),
  ],
};
