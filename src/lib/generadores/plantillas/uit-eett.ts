/**
 * Plantilla: ANEXO 1 — ESPECIFICACIONES TÉCNICAS (menores a 8 UIT)
 *
 * Transcripción de "MENORES A 8 UIT/ANEXO 1 - ESPECIFICACIONES
 * TÉCNICAS.docx". Es el formato para contratar BIENES por debajo de las
 * ocho UIT.
 *
 * QUÉ LO SEPARA DE LOS PROCEDIMIENTOS DE SELECCIÓN
 *
 * No es una versión reducida del formato grande: se rige por otras
 * reglas. Las controversias van obligatoriamente a conciliación y no a
 * arbitraje; la garantía de fiel cumplimiento no es exigible salvo que
 * haya adelanto; la cláusula de gestión de riesgos tampoco; la penalidad
 * por mora se calcula con una fórmula explícita en vez de remitir al
 * Reglamento; y aparecen confidencialidad y propiedad intelectual, que
 * en los formatos grandes no están. Todo eso vive en
 * menores-8uit-comunes.ts, compartido con los otros dos anexos.
 *
 * Añade además dos requisitos del proveedor que los formatos grandes no
 * piden: el RNP cuando la contratación supera una UIT, y el código de
 * cuenta interbancario vinculado al RUC.
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

export const PLANTILLA_UIT_EETT: PlantillaRequerimiento = {
  id: 'uit-eett',
  familia: 'menor_8_uit',
  objeto: 'bienes',
  encabezado: 'ESPECIFICACIONES TECNICAS',
  subtitulo: 'CONTRATACIÓN DE BIENES MENOR A 8 UIT',
  origen: 'MENORES A 8 UIT/ANEXO 1 - ESPECIFICACIONES TÉCNICAS.docx',

  validaciones: [VALIDACION_ADELANTO, VALIDACION_EXPERIENCIA, VALIDACION_PENALIDADES],

  secciones: [
    ...seccionesCabecera8Uit({
      ayudaDenominacion:
        'Indicar una breve descripción del requerimiento, mediante la denominación del (los) bien(es) a ser contratado(s)',
      objeto: 'bien',
      ejemploFinalidad:
        'La contratación tiene por finalidad dotar a las áreas de la entidad de mobiliario adecuado que permita organizar la documentación y desarrollar las labores administrativas en condiciones apropiadas, contribuyendo a una atención eficiente de los ciudadanos.',
      ejemploObjetivo:
        'Adquirir muebles de melamina para equipar las oficinas de la entidad y mejorar la organización de los ambientes de trabajo.',
      ejemploAntecedentes:
        'Los muebles actualmente utilizados presentan un avanzado estado de deterioro y resultan insuficientes para almacenar la documentación y el material de trabajo, por lo que es necesario adquirir nuevo mobiliario para garantizar el adecuado funcionamiento de las actividades administrativas.',
    }),

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
              clase: 'redactado',
              id: 'caracteristicas_tecnicas',
              etiqueta: 'Características técnicas',
              instruccion:
                'Indicar los atributos técnicos del bien: tipo, material, dimensiones, herrajes, acabados, estado y garantía comercial mínima. Nunca exigir marca específica',
              ejemplo:
                'Tipo de bien: Escritorio de oficina con cajonera lateral.\nMaterial: Melamina de alta densidad de 18 mm de espesor como mínimo.\nDimensiones: 1.20 m de largo × 0.60 m de ancho × 0.75 m de alto (± 5%).\nHerrajes: Tornillería, bisagras y accesorios metálicos anticorrosivos.\nGarantía comercial: Mínima de doce (12) meses contra defectos de fabricación.',
              extension: 'lista',
            },
            {
              clase: 'tabla',
              id: 'caracteristicas_por_item',
              etiqueta: 'Características por ítem',
              instruccion: 'En caso de relación de ítems, detallar las características de cada bien',
              columnas: ['N.°', 'Característica', 'Especificación'],
              minimo: 0,
              // El formato pone un cuadro por bien —"Bien N.° 01: XYZ"
              // y debajo el suyo—. Observación de César de agosto.
              repetible: { etiquetaTitulo: 'Bien N.° (denominación)' },
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
              ayuda: 'Consignar el documento mediante el cual se aprobó la compatibilización del requerimiento',
              tipo: 'texto',
              obligatorio: true,
            },
          ],
        },
        {
          id: 'condiciones_operacion',
          titulo: 'Condiciones de operación',
          condicion: 'tiene_condiciones_operacion',
          bloques: [
            {
              clase: 'redactado',
              id: 'condiciones_operacion',
              etiqueta: 'Condiciones de operación',
              instruccion:
                'Indicar el rango o tolerancia de parámetros bajo los que debe operar el bien: temperatura, humedad, voltaje, presión y otros',
              ejemplo:
                'Temperatura de operación: De 10 °C a 32 °C.\nHumedad relativa: Entre 20 % y 80 %, sin condensación.\nAlimentación eléctrica: 220 V, 60 Hz.',
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
              instruccion: 'Precisar el alcance del mantenimiento, su frecuencia y las actividades que comprende',
              ejemplo:
                'Inspección general del equipo.\nLimpieza de componentes internos y externos.\nVerificación de niveles de aceite, refrigerante y combustible.\nAjuste de conexiones eléctricas y mecánicas.\nPruebas de funcionamiento bajo carga.\nEmisión del informe técnico correspondiente.',
              extension: 'lista',
            },
            {
              clase: 'redactado',
              id: 'soporte_tecnico',
              etiqueta: 'Soporte técnico',
              instruccion: 'Precisar el alcance del soporte y los tiempos máximos de atención',
              ejemplo: 'Atención remota: hasta cuatro (4) horas.',
              extension: 'lista',
            },
            {
              clase: 'redactado',
              id: 'capacitacion',
              etiqueta: 'Capacitación y/o entrenamiento',
              instruccion: 'Precisar los temas mínimos que comprenderá la capacitación',
              ejemplo:
                'Instalación y configuración inicial del servidor.\nAdministración básica y monitoreo del equipo.\nProcedimientos de respaldo y recuperación de información.\nBuenas prácticas de operación, mantenimiento y seguridad.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'envase_embalaje',
          titulo: 'Envase, embalaje y rotulado',
          condicion: 'requiere_envase',
          bloques: [
            {
              clase: 'redactado',
              id: 'envase',
              etiqueta: 'Envase',
              instruccion:
                'Precisar las características del envase primario y secundario, considerando la naturaleza del producto y las condiciones de conservación',
              extension: 'varios_parrafos',
            },
            {
              clase: 'redactado',
              id: 'embalaje',
              etiqueta: 'Embalaje',
              instruccion:
                'Indicar el tipo de embalaje primario y secundario, considerando la manipulación, transporte y almacenaje',
              extension: 'varios_parrafos',
            },
            {
              clase: 'redactado',
              id: 'rotulado',
              etiqueta: 'Rotulado',
              instruccion:
                'Señalar la información que debe contener el rotulado: nombre del producto, peso, fechas de producción y vencimiento, condiciones de almacenamiento y código de lote',
              ejemplo:
                'Nombre del producto: Pavo congelado entero.\nPeso neto y bruto.\nFecha de producción y fecha de vencimiento.\nCondiciones de almacenamiento: "Mantener congelado a -18°C".\nCódigo de lote para trazabilidad.',
              extension: 'lista',
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
                'Señalar el medio de transporte, las características mínimas de los vehículos y el personal para carga y descarga',
              extension: 'parrafo',
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
              instruccion: 'Precisar tipo de seguro, cobertura, plazo, monto y fecha de presentación',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'garantia_comercial',
          titulo: 'Garantía comercial',
          bloques: [
            {
              clase: 'redactado',
              id: 'garantia_alcance',
              etiqueta: 'Alcance, condiciones y período de la garantía',
              instruccion:
                'Precisar el alcance de la garantía, sus condiciones de atención —teléfono, plazo de reposición— y el período de vigencia',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'disponibilidad',
          titulo: 'Disponibilidad de servicios y repuestos',
          condicion: 'requiere_repuestos',
          bloques: [
            {
              clase: 'redactado',
              id: 'disponibilidad',
              etiqueta: 'Disponibilidad de servicio técnico y repuestos',
              instruccion:
                'Precisar la disponibilidad exigida de servicio técnico y de repuestos durante la vida útil del bien',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'visitas_muestras',
          titulo: 'Visitas y muestras',
          condicion: 'requiere_muestras',
          bloques: [
            {
              clase: 'redactado',
              id: 'visitas_muestras',
              etiqueta: 'Visitas y muestras',
              instruccion:
                'Precisar si se exigen visitas o muestras y en qué condiciones. Señalar de manera literal y objetiva que la visita es facultativa. Para las muestras, precisar qué características serán objeto de verificación',
              ejemplo:
                'Tipo y calidad de la tela.\nColor institucional.\nTipo y calidad de las costuras.\nAcabado de la prenda.\nCalidad de los bordados o estampados institucionales, de corresponder.',
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
              instruccion: 'Precisar el sistema de contratación que corresponda',
              opciones: [
                {
                  valor: 'suma_alzada',
                  texto:
                    'De acuerdo con el objeto contractual, la modalidad de pago es Suma Alzada. Es aplicable cuando las cantidades, magnitudes y calidades de la prestación están definidas en el requerimiento.',
                },
                {
                  valor: 'precios_unitarios',
                  texto:
                    'De acuerdo con el objeto contractual, la modalidad de pago es Precios Unitarios. Es aplicable cuando no puede conocerse con exactitud o precisión las cantidades o magnitudes requeridas.',
                },
                {
                  valor: 'esquema_mixto',
                  texto:
                    'De acuerdo con el objeto contractual, la modalidad de pago es un Esquema mixto, aplicable cuando la entidad contratante puede utilizar más de una modalidad de pago en un mismo contrato.',
                },
                {
                  valor: 'costo_reembolsable',
                  texto:
                    'De acuerdo con el objeto contractual, la modalidad de pago es Costo reembolsable, aplicable cuando la entidad contratante requiere reembolsar al contratista los costos reales en que incurre durante la ejecución del contrato.',
                },
              ],
            },
          ],
        },
        {
          id: 'sistema_entrega',
          titulo: 'Sistema de entrega para bienes',
          bloques: [
            {
              clase: 'opcion',
              id: 'sistema_entrega',
              etiqueta: 'Sistema de entrega',
              instruccion: 'Consignar el sistema de entrega determinado en la estrategia de contratación',
              opciones: [
                {
                  valor: 'no_aplica',
                  texto: 'No aplica ningún sistema de entrega.',
                },
                { valor: 'llave_en_mano', texto: 'El contrato se rige por el sistema de entrega de Llave en mano.' },
                {
                  valor: 'llave_en_mano_mantenimiento',
                  texto: 'El contrato se rige por el sistema de entrega de Llave en mano con mantenimiento.',
                },
                {
                  valor: 'suministro_comodato',
                  texto: 'El contrato se rige por el sistema de entrega de Suministro con comodato.',
                },
              ],
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
                'Los bienes materia de la presente contratación deberán ser entregados en el plazo de {{plazo_entrega}}, computado a partir del día siguiente de {{hito_inicio}}',
              campos: [
                {
                  clase: 'campo',
                  id: 'plazo_entrega',
                  etiqueta: 'Plazo de entrega',
                  ayuda: 'Consignar el plazo de entrega',
                  tipo: 'dias',
                  obligatorio: true,
                },
                {
                  clase: 'campo',
                  id: 'hito_inicio',
                  etiqueta: 'Hito desde el que se computa',
                  ayuda:
                    'La notificación de la orden de compra, el perfeccionamiento del contrato o el cumplimiento de la condición de inicio que corresponda',
                  tipo: 'texto',
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
              clase: 'nota',
              texto:
                'Cuando la contratación contemple un sistema de entrega —llave en mano, llave en mano con mantenimiento o suministro con comodato— debe establecerse de manera independiente el plazo de cada prestación, precisando el evento que determina el inicio de su ejecución. En suministros, indicar el número de entregas, su periodicidad y el cronograma.',
            },
          ],
        },
        {
          id: 'lugar_entrega',
          titulo: 'Lugar de entrega de los bienes',
          bloques: [
            {
              clase: 'campo',
              id: 'lugar_entrega',
              etiqueta: 'Lugar de entrega',
              ayuda:
                'Consignar la dirección exacta considerando distrito, provincia, departamento y horario de atención',
              tipo: 'texto',
              obligatorio: true,
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
                'Aplica únicamente cuando corresponda otorgar adelantos directos y así se haya previsto y sustentado en la estrategia de contratación, conforme al artículo 137 del Reglamento. En caso contrario, consignar "NO APLICA". Si se otorga adelanto, el contratista debe presentar previamente una garantía por idéntico monto.',
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
        seccionConfidencialidad(),
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
          titulo: 'Conformidad y verificación técnica de los bienes',
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
              id: 'verificaciones',
              etiqueta: 'Verificaciones técnicas, pruebas o ensayos',
              instruccion:
                'Indicar las pruebas o ensayos requeridos para la conformidad del bien, los parámetros de aceptación, quién las realiza y quién asume su costo',
              extension: 'parrafo',
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
          id: 'forma_pago',
          titulo: 'Forma y requisitos de pago',
          bloques: [
            { clase: 'fijo', texto: 'El pago se realiza de conformidad con lo establecido en el artículo 67 de la Ley.' },
            // Su .docx dice "responsable de", no "del".
            ...bloquesPago('de'),
            ...bloquesPagoAnticipado(),
          ],
        },
        {
          id: 'pago_accesorias',
          titulo: 'Prestaciones accesorias',
          condicion: 'tiene_prestaciones_accesorias',
          bloques: [
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
              // Dos requisitos que los formatos grandes no piden: el RNP
              // solo desde una UIT, y el CCI para poder pagar.
              clase: 'fijo',
              texto:
                'Contar con RUC activo y habido en la SUNAT.\nRealizar actividades en el objeto de la contratación.\nRegistro Nacional de Proveedores en los casos que la contratación supere una (1) UIT.\nCódigo de cuenta interbancario (CCI) vinculado al RUC.\nPersona natural y/o jurídica.',
              fundamento: 'Plantilla — requisitos del proveedor en contratos menores',
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
                'Precisar los recursos, medios, equipos, materiales, personal, licencias o autorizaciones que el contratista deberá proporcionar, así como sus responsabilidades durante la ejecución contractual',
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
                'En la contratación de bienes este numeral aplica cuando el objeto comprenda instalación, montaje, configuración, implementación, puesta en funcionamiento, capacitación, mantenimiento u otras prestaciones accesorias que requieran personal especializado. La experiencia mínima se establece en los Requisitos de Calificación.',
            },
            {
              clase: 'tabla',
              id: 'personal_clave',
              etiqueta: 'Personal clave',
              columnas: ['Cargo y/o responsabilidad', 'Actividades principales', 'Formación académica'],
              minimo: 1,
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
            'Una vez incorporados, los requisitos de calificación se consideran obligatorios; deben eliminarse los que no se seleccionen. Pueden ser personal clave los profesionales especialistas esenciales para ejecutar la prestación; no lo son quienes brinden labores de asistencia administrativa, técnica u operativa. El tiempo de experiencia mínimo debe ser razonable y no constituir una restricción a la participación de postores.',
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
          condicion: 'exige_experiencia',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'El postor debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto}}, por la venta de bienes iguales o similares al objeto de la convocatoria, durante los diez (10) años anteriores a la fecha de la presentación de ofertas, que se computarán desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda.',
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
                'La experiencia del postor en la especialidad se acredita con un máximo de veinte contrataciones, mediante copia simple de: (i) contratos u órdenes de compra, y su respectiva conformidad o constancia de prestación; o (ii) comprobantes de pago cuya cancelación se acredite documental y fehacientemente, con constancia de depósito, nota de abono, reporte de estado de cuenta, cualquier otro documento emitido por entidad del sistema financiero que acredite el abono o mediante cancelación en el mismo comprobante de pago, o comprobante de retención electrónico emitido por SUNAT por la retención del IGV. En caso el postor sustente su experiencia en la especialidad mediante contrataciones realizadas con privados, para acreditarla debe presentar de forma obligatoria lo indicado en el numeral (ii) del presente párrafo; no es posible que acredite su experiencia únicamente con la presentación de contratos u órdenes de compra con conformidad o constancia de prestación.',
              fundamento: 'Plantilla — acreditación de experiencia, texto invariable',
            },
          ],
        },
        {
          id: 'capacidad_tecnica',
          titulo: 'Capacidad técnica y profesional',
          condicion: 'exige_capacidad_tecnica',
          bloques: [
            {
              clase: 'tabla',
              id: 'experiencia_personal_clave',
              etiqueta: 'Experiencia del personal clave',
              instruccion:
                'Precisar el cargo, el tiempo de experiencia y los trabajos o prestaciones que debe acreditar cada integrante del personal clave',
              columnas: ['Cargo y/o responsabilidad', 'Tiempo de experiencia', 'Cargo desempeñado'],
              minimo: 1,
            },
            {
              clase: 'redactado',
              id: 'capacidad_tecnica_acreditacion',
              etiqueta: 'Acreditación',
              instruccion: 'Precisar los documentos con los que se acredita la experiencia del personal clave',
              extension: 'parrafo',
            },
          ],
        },
      ],
    },

    seccionSolicitante(),
  ],
};
