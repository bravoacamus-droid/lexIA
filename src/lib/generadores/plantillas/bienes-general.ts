/**
 * Plantilla: REQUERIMIENTO — BIENES EN GENERAL
 * Procedimiento de selección · Ley N° 32069 y DS N° 009-2025-EF
 *
 * Transcripción fiel de la plantilla que entregó César en
 * "ESTRUCTURA DE REQUERIMIENTO/PROCEDIMIENTOS DE SELECCIÓN/1. BIENES/
 *  1. Bienes en General.docx"
 * (extraída a docs/estructura-requerimiento/ para poder auditarla).
 *
 * CÓMO LEER ESTE ARCHIVO
 *
 * Cada bloque declara qué es, y el ensamblador actúa en consecuencia:
 *   · `fijo`      se copia palabra por palabra — es texto que debe
 *                 aparecer así ante el OECE, no una sugerencia.
 *   · `campo`     lo aporta el usuario.
 *   · `redactado` lo escribe el modelo, guiado por el `ejemplo` de la
 *                 plantilla, que fija el nivel de detalle esperado.
 *   · `opcion`    alternativas excluyentes que trae la propia plantilla.
 *   · `tabla`     columnas fijas, filas del usuario.
 *   · `nota`      advertencia normativa incrustada entre corchetes.
 *
 * Las secciones con `condicion` traducen los "de corresponder": se
 * incluyen solo si aplican, en vez de arrastrar apartados vacíos.
 */
import type { PlantillaRequerimiento } from '../plantilla-tipos';

/**
 * Cláusula antisoborno — se reproduce ÍNTEGRA y sin cambios.
 * Es la parte más larga de texto invariable de la plantilla.
 */
const CLAUSULA_ANTISOBORNO = `A la suscripción de este contrato, El Contratista declara y garantiza no haber ofrecido, negociado, prometido o efectuado ningún pago o entrega de cualquier beneficio o incentivo ilegal, de manera directa o indirecta, a los evaluadores del proceso de contratación o cualquier servidor de la entidad contratante.

Asimismo, El Contratista se obliga a mantener una conducta proba e íntegra durante la vigencia del contrato, y después de culminado el mismo en caso existan controversias pendientes de resolver, lo que supone actuar con probidad, sin cometer actos ilícitos, directa o indirectamente.

Aunado a ello, El Contratista se obliga a abstenerse de ofrecer, negociar, prometer o dar regalos, cortesías, invitaciones, donativos o cualquier beneficio o incentivo ilegal, directa o indirectamente, a funcionarios públicos, servidores públicos, locadores de servicios o proveedores de servicios del área usuaria, de la dependencia encargada de la contratación, actores del proceso de contratación y/o cualquier servidor de la entidad contratante, con la finalidad de obtener alguna ventaja indebida o beneficio ilícito. En esa línea, se obliga a adoptar las medidas técnicas, organizativas y/o de personal necesarias para asegurar que no se practiquen los actos previamente señalados.

Adicionalmente, El Contratista se compromete a denunciar oportunamente ante las autoridades competentes los actos de corrupción o de inconducta funcional de los cuales tuviera conocimiento durante la ejecución del contrato con la entidad contratante.

Tratándose de una persona jurídica, lo anterior se extiende a sus accionistas, participacionistas, integrantes de los órganos de administración, apoderados, representantes legales, funcionarios, asesores o cualquier persona vinculada a la persona jurídica que representa; comprometiéndose a informarles sobre los alcances de las obligaciones asumidas en virtud del presente contrato.

Finalmente, el incumplimiento de las obligaciones establecidas en esta cláusula, durante la ejecución contractual, otorga a la entidad contratante el derecho de resolver total o parcialmente el contrato. Cuando lo anterior se produzca por parte de un proveedor adjudicatario de los catálogos electrónicos de acuerdo marco, el incumplimiento de la presente cláusula conllevará que sea excluido de los Catálogos Electrónicos de Acuerdo Marco. En ningún caso, dichas medias impiden el inicio de las acciones civiles, penales y administrativas a que hubiera lugar.`;

/**
 * Acreditación de la experiencia del postor — texto invariable.
 * Detalla qué documentos valen y cómo se computan; reescribirlo
 * cambiaría las reglas de evaluación.
 */
const ACREDITACION_EXPERIENCIA = `La experiencia del postor en la especialidad se acredita con un máximo de veinte contrataciones, mediante copia simple de: (i) contratos u órdenes de compra, y su respectiva conformidad o constancia de prestación; o (ii) comprobantes de pago cuya cancelación se acredite documental y fehacientemente, con constancia de depósito, nota de abono, reporte de estado de cuenta, cualquier otro documento emitido por entidad del sistema financiero que acredite el abono o mediante cancelación en el mismo comprobante de pago, o comprobante de retención electrónico emitido por SUNAT por la retención del IGV. En caso el postor sustente su experiencia en la especialidad mediante contrataciones realizadas con privados, para acreditarla debe presentar de forma obligatoria lo indicado en el numeral (ii) del presente párrafo; no es posible que acredite su experiencia únicamente con la presentación de contratos u órdenes de compra con conformidad o constancia de prestación.

En caso los postores presenten varios comprobantes de pago para acreditar una sola contratación, se debe acreditar que corresponden a dicha contratación; de lo contrario, se asume que los comprobantes acreditan contrataciones independientes, en cuyo caso solo se considera, para la evaluación, las veinte primeras contrataciones indicadas en el Anexo Nº 11 referido a la Experiencia del Postor en la Especialidad.

En el caso de suministro, solo se considera como experiencia la parte del contrato que haya sido ejecutada durante los diez años anteriores a la fecha de presentación de ofertas, debiendo adjuntarse copia de las conformidades correspondientes a tal parte o los respectivos comprobantes de pago cancelados.

Si el titular de la experiencia no es el postor, consignar si dicha experiencia corresponde a la matriz en caso de que el postor sea sucursal, o fue transmitida por reorganización societaria, debiendo acompañar la documentación sustentatoria correspondiente.

Si el postor acredita experiencia de otra persona jurídica como consecuencia de una reorganización societaria, debe presentar adicionalmente el Anexo N° 14.`;

export const PLANTILLA_BIENES_GENERAL: PlantillaRequerimiento = {
  id: 'ps-bienes-general',
  familia: 'procedimiento_seleccion',
  objeto: 'bienes',
  encabezado: 'REQUERIMIENTO',
  subtitulo: 'BIENES EN GENERAL',
  origen: 'PROCEDIMIENTOS DE SELECCIÓN/1. BIENES/1. Bienes en General.docx',

  validaciones: [
    {
      id: 'adelanto_directo_max',
      descripcion: 'Los adelantos directos no pueden exceder en conjunto el 30% del monto del contrato original.',
      fundamento: 'Plantilla — Condiciones de contratación, adelanto directo',
    },
    // NOTA: el tope del 10% para la suma de penalidades NO figura en esta
    // plantilla. Existe en la normativa, pero aquí solo se registran los
    // topes que la propia plantilla enuncia, para que la auditoría contra
    // el .docx de origen siga siendo exacta.
    {
      id: 'experiencia_max',
      descripcion: 'El monto de facturación exigido como experiencia no puede ser mayor a tres veces la cuantía de la contratación o del ítem.',
      fundamento: 'Plantilla — Requisitos de calificación, experiencia del postor',
    },
    {
      id: 'experiencia_mype',
      descripcion: 'Para micro y pequeña empresa, la experiencia exigida no debe superar el 25% de la cuantía de la contratación del ítem.',
      fundamento: 'Plantilla — Requisitos de calificación, régimen MYPE',
    },
    {
      id: 'jprd_umbral',
      descripcion: 'La JPRD solo procede si el objeto es suministro de bienes y el monto contractual supera S/ 10 000 000,00.',
      fundamento: 'Plantilla — Solución de controversias contractuales',
    },
  ],

  secciones: [
    // ── Encabezado ──────────────────────────────────────────────────
    {
      id: 'encabezado',
      titulo: 'Datos de la contratación',
      bloques: [
        {
          clase: 'campo',
          id: 'organo',
          etiqueta: 'Órgano y/o Dirección (Área Usuaria)',
          ayuda: 'Indicar la denominación del órgano o unidad orgánica que requiere la contratación',
          tipo: 'texto',
          obligatorio: true,
        },
        {
          clase: 'campo',
          id: 'actividad_poi',
          etiqueta: 'Actividad del POI',
          ayuda: 'Indicar la actividad del POI con cargo a la cual se realiza la contratación',
          tipo: 'texto',
          obligatorio: true,
        },
        {
          clase: 'campo',
          id: 'numero_cmn',
          etiqueta: 'Número de CMN',
          ayuda: 'Indicar código del CMN del SIGA',
          tipo: 'texto',
          obligatorio: true,
        },
        {
          clase: 'campo',
          id: 'denominacion',
          etiqueta: 'Denominación de la contratación',
          ayuda: 'Indicar una breve descripción del requerimiento, mediante la denominación del (los) bien(es) a ser contratado(s)',
          tipo: 'texto',
          obligatorio: true,
        },
      ],
    },

    // ── 1. Finalidad pública ────────────────────────────────────────
    {
      id: 'finalidad_publica',
      titulo: 'FINALIDAD PÚBLICA DE LA CONTRATACIÓN',
      bloques: [
        {
          clase: 'redactado',
          id: 'finalidad',
          etiqueta: 'Finalidad pública',
          instruccion:
            'Detallar aquello que se busca satisfacer, mejorar y/o atender con la contratación requerida según las actividades previstas en el Plan Operativo Institucional (POI), así como las acciones y objetivos estratégicos del Plan Estratégico Institucional (PEI) de la Entidad',
          ejemplo:
            'La contratación tiene por finalidad dotar a las áreas de la entidad de mobiliario adecuado que permita organizar la documentación y desarrollar las labores administrativas en condiciones apropiadas, contribuyendo a una atención eficiente de los ciudadanos.',
          extension: 'parrafo',
        },
      ],
    },

    // ── 2. Objetivo ─────────────────────────────────────────────────
    {
      id: 'objetivo',
      titulo: 'OBJETIVO DE LA CONTRATACIÓN',
      bloques: [
        {
          clase: 'nota',
          texto: 'El objetivo debe responder a la pregunta "qué quiero contratar" y "para qué quiero contratar".',
        },
      ],
      subsecciones: [
        {
          id: 'objetivo_general',
          titulo: 'Objetivo general',
          bloques: [
            {
              clase: 'redactado',
              id: 'objetivo_general',
              etiqueta: 'Objetivo general',
              instruccion:
                'Detallar el propósito de la contratación, o aquello que se espera lograr a través de la contratación requerida',
              ejemplo:
                'Adquirir muebles de melamina para equipar las oficinas de la Entidad, con la finalidad de mejorar la organización de los ambientes de trabajo y contribuir al adecuado desarrollo de las actividades institucionales.',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'objetivo_especifico',
          titulo: 'Objetivo específico',
          bloques: [
            {
              clase: 'redactado',
              id: 'objetivos_especificos',
              etiqueta: 'Objetivos específicos',
              instruccion: 'Enumerar los objetivos específicos que se desprenden del objetivo general',
              ejemplo:
                'Dotar a las oficinas de mobiliario funcional y adecuado para el almacenamiento de documentos, equipos y materiales de trabajo.\nReemplazar el mobiliario deteriorado o insuficiente, mejorando las condiciones de trabajo del personal.\nOptimizar el aprovechamiento de los espacios físicos mediante la implementación de muebles acordes con las necesidades de cada ambiente.',
              extension: 'lista',
            },
          ],
        },
      ],
    },

    // ── 3. Antecedentes ─────────────────────────────────────────────
    {
      id: 'antecedentes',
      // La plantilla trae "ANTECEDENSTES" con errata; se corrige en el
      // documento generado.
      titulo: 'ANTECEDENTES Y/O JUSTIFICACIÓN DE LA NECESIDAD DE LA CONTRATACIÓN',
      bloques: [
        {
          clase: 'redactado',
          id: 'antecedentes',
          etiqueta: 'Antecedentes y justificación',
          instruccion:
            'Explicar de manera general el motivo por el cual se efectúa el requerimiento de la contratación del bien. En caso de existir documentos fuente de la contratación, mencionarlos y adjuntarlos',
          ejemplo:
            'Los muebles actualmente utilizados presentan un avanzado estado de deterioro y resultan insuficientes para almacenar la documentación y el material de trabajo, por lo que es necesario adquirir nuevo mobiliario para garantizar el adecuado funcionamiento de las actividades administrativas.',
          extension: 'parrafo',
        },
      ],
    },

    // ── 4. Descripción general ──────────────────────────────────────
    {
      id: 'descripcion_general',
      titulo: 'DESCRIPCIÓN GENERAL DEL REQUERIMIENTO',
      bloques: [
        {
          clase: 'tabla',
          id: 'items',
          etiqueta: 'Bienes requeridos',
          instruccion:
            'Describir de manera general los bienes objeto de la contratación, indicando las cantidades requeridas y su unidad de medida. Cuando la contratación comprenda más de un ítem o paquete, identificar cada uno señalando cantidad, unidad de medida y descripción',
          columnas: ['N.°', 'Cantidad', 'Unidad de medida', 'Descripción del bien'],
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
              texto: 'Los bienes antes descritos serán contratados mediante un único ítem.',
            },
            {
              valor: 'por_items',
              texto:
                'Los bienes antes descritos serán contratados por ítems independientes, pudiendo los proveedores presentar oferta por uno o más ítems.',
            },
            {
              valor: 'paquete',
              texto:
                'Los bienes antes descritos serán contratados por paquete único, debiendo el postor presentar oferta por la totalidad de los bienes que integran el paquete.',
            },
          ],
        },
        {
          clase: 'nota',
          texto:
            'Cuando el objeto de la contratación corresponda a bienes comprendidos en una Ficha de Homologación o en una Ficha Técnica para Subasta Inversa Electrónica, la descripción del bien deberá ser concordante con la denominación establecida en dichos documentos.',
        },
      ],
    },

    // ── 5. Características y condiciones ────────────────────────────
    {
      id: 'caracteristicas',
      titulo: 'CARACTERÍSTICAS Y CONDICIONES DE LOS BIENES A CONTRATAR',
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
                'Indicar los atributos técnicos que debe cumplir el bien: dimensiones, material, composición, unidad de medida, presentación, y/o requisitos funcionales relevantes como funcionalidad, rendimiento o resultado esperado. Según la naturaleza del bien, puede exigirse periodo mínimo de vigencia o año de fabricación, fecha de expiración, repuestos y accesorios, y condiciones de almacenamiento',
              ejemplo:
                'Tipo de bien: Escritorio de oficina con cajonera lateral.\nMaterial: Melamina de alta densidad de 18 mm de espesor como mínimo.\nDimensiones: 1.20 m de largo × 0.60 m de ancho × 0.75 m de alto (± 5%).\nTapacantos: PVC de 2 mm en bordes expuestos y de 0.45 mm en bordes interiores.\nCajonera: Tres (3) cajones con correderas metálicas telescópicas y cerradura con dos llaves.\nHerrajes: Tornillería, bisagras y accesorios metálicos anticorrosivos.\nEstado del bien: Todos los muebles deberán ser nuevos, sin uso, de primer uso y libres de defectos de fabricación.',
              extension: 'lista',
            },
            {
              clase: 'nota',
              texto:
                'El requerimiento incluye lo previsto en leyes, reglamentos, normas metrológicas y normas técnicas de naturaleza obligatoria vinculadas al objeto. Puede incluir normas técnicas voluntarias solo si: (i) sirven para asegurar el cumplimiento de los requisitos funcionales o técnicos; (ii) existe en el mercado una entidad que pueda acreditar su cumplimiento; (iii) se basan en normas internacionales aplicables en el territorio nacional; y (iv) no contravienen normas técnicas obligatorias.',
            },
            {
              clase: 'nota',
              texto:
                'En caso el requerimiento conlleve a la suscripción de un contrato de contingencia, debe incluir lo dispuesto en el artículo 285 del Reglamento.',
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
                'Indicar las condiciones bajo las cuales debe operar el bien: rango de temperatura, altitud, humedad, voltaje, presión, entre otras',
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
              clase: 'tabla',
              id: 'envase',
              etiqueta: 'Envase',
              columnas: ['Característica', 'Especificación'],
              ayudaColumnas: [
                'Peso neto, tipo de envase, material, sistema de cerrado u otras',
                'Indicar el valor o condición exigida',
              ],
              minimo: 1,
            },
            {
              clase: 'redactado',
              id: 'rotulado',
              etiqueta: 'Rotulado',
              instruccion:
                'Indicar los datos que debe contener el rotulado, incluida la fecha de expiración y las condiciones de conservación',
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
              instruccion: 'Precisar las condiciones de transporte que debe cumplir el proveedor',
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
              etiqueta: 'Alcance y condiciones de la garantía',
              instruccion:
                'Precisar el alcance de la garantía, sus condiciones —teléfono de contacto, plazo de reposición— y el periodo de vigencia',
              extension: 'parrafo',
            },
            {
              clase: 'campo',
              id: 'garantia_periodo',
              etiqueta: 'Período de garantía',
              ayuda: 'Indicar el periodo, contado desde la conformidad',
              tipo: 'texto',
              obligatorio: true,
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
              extension: 'parrafo',
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
              instruccion: 'Precisar si se exigen visitas o presentación de muestras, y en qué condiciones',
              extension: 'parrafo',
            },
            {
              clase: 'nota',
              texto:
                'Si, como resultado de la estrategia de contratación, se concluye que la presentación de muestras genera costos innecesarios o restringe la competencia, no deberá exigirse su presentación.',
            },
          ],
        },
      ],
      bloques: [],
    },

    // ── 6. Condiciones de contratación ──────────────────────────────
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
                    'El contrato se rige por un Esquema mixto, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando la entidad contratante puede utilizar más de una modalidad de pago —suma alzada, tarifas, costo reembolsable y/o precios unitarios— en un mismo contrato.',
                },
                {
                  valor: 'costo_reembolsable',
                  texto:
                    'El contrato se rige por la modalidad de Costo reembolsable, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando la entidad contratante requiere reembolsar al contratista los costos reales en que incurre durante la ejecución del contrato, tras el sinceramiento de las cantidades, precios unitarios, plazo y gastos generales.',
                },
              ],
            },
            {
              clase: 'nota',
              texto:
                'En caso la convocatoria se refiera a un contrato de contingencia conforme al artículo 284 del Reglamento, debe considerarse una de las modalidades de pago establecidas en el artículo 286 del Reglamento.',
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
              instruccion:
                'Según la naturaleza, complejidad y alcance de la contratación, de conformidad con el artículo 129 del Reglamento',
              opciones: [
                {
                  valor: 'no_aplica',
                  texto:
                    'El contrato se rige por el sistema de entrega de NO APLICA, por no corresponder a ninguno de los sistemas de entrega regulados en la normativa de contrataciones públicas.',
                },
                {
                  valor: 'llave_en_mano',
                  texto:
                    'El contrato se rige por el sistema de entrega de Llave en mano, de conformidad con el artículo 129 del Reglamento. Comprende la entrega del bien y todas las prestaciones necesarias para que quede completamente instalado, configurado, probado y operativo, siendo responsabilidad del proveedor su adecuada puesta en funcionamiento.',
                },
                {
                  valor: 'llave_en_mano_mantenimiento',
                  texto:
                    'El contrato se rige por el sistema de entrega de Llave en mano con mantenimiento, de conformidad con el artículo 129 del Reglamento. Comprende la entrega del bien, su instalación, puesta en funcionamiento y la prestación del servicio de mantenimiento durante un período determinado.',
                },
                {
                  valor: 'suministro_comodato',
                  texto:
                    'El contrato se rige por el sistema de entrega de Suministro con comodato, de conformidad con el artículo 129 del Reglamento.',
                },
              ],
            },
            {
              clase: 'nota',
              texto:
                'El sistema de entrega llave en mano con mantenimiento es obligatorio para adquirir equipamiento médico, a fin de garantizar su ciclo de vida y operatividad.',
            },
          ],
          // El sistema de entrega SIEMPRE se declara —aunque sea "NO
          // APLICA"—; lo condicional es solo el detalle de prestaciones,
          // que la plantilla pide únicamente cuando hay un sistema
          // especial (llave en mano, con mantenimiento o comodato).
          subsecciones: [
            {
              id: 'prestaciones_entrega',
              titulo: 'Prestaciones comprendidas en el sistema de entrega',
              condicion: 'sistema_entrega_especial',
              bloques: [
                {
                  clase: 'fijo',
                  texto:
                    'Cuando corresponda la aplicación de alguno de estos sistemas, la Entidad deberá describir de manera clara, objetiva y detallada las prestaciones que forman parte de la contratación, así como las obligaciones específicas que asumirá el proveedor durante la ejecución contractual.',
                },
                {
                  clase: 'tabla',
                  id: 'prestaciones_entrega',
                  etiqueta: 'Prestaciones del sistema de entrega',
                  instruccion:
                    'Detallar las prestaciones que forman parte de la contratación y las obligaciones específicas del proveedor',
                  columnas: ['N.°', 'Prestación', 'Detalle del servicio'],
                  minimo: 1,
                },
              ],
            },
          ],
        },
        {
          id: 'plazos',
          titulo: 'Plazos y condiciones de entrega',
          bloques: [
            {
              clase: 'campo',
              id: 'lugar_entrega',
              etiqueta: 'Lugar de entrega',
              ayuda: 'Dirección exacta y horarios de recepción',
              tipo: 'texto',
              obligatorio: true,
            },
            {
              clase: 'campo',
              id: 'plazo_entrega',
              etiqueta: 'Plazo de entrega',
              ayuda: 'Indicar el plazo en días calendario y el hito desde el que se computa',
              tipo: 'dias',
              obligatorio: true,
            },
            {
              clase: 'tabla',
              id: 'entregables',
              etiqueta: 'Entregables',
              columnas: ['N.°', 'Plazo', 'Contenido', 'Medio de entrega'],
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
          ],
        },
        {
          id: 'penalidades',
          titulo: 'Penalidades',
          bloques: [],
          subsecciones: [
            {
              id: 'penalidad_mora',
              titulo: 'Penalidad por mora',
              bloques: [
                {
                  clase: 'fijo',
                  texto:
                    'En caso de retraso injustificado del contratista en la ejecución de las prestaciones objeto del contrato, la entidad contratante le aplica automáticamente una penalidad por mora por cada día de atraso que le sea imputable, de conformidad con el artículo 120 del Reglamento.',
                  fundamento: 'Reglamento, art. 120',
                },
              ],
            },
            {
              id: 'otras_penalidades',
              titulo: 'Otras penalidades',
              // La plantilla es explícita: este numeral SOLO aplica si el
              // área usuaria sustenta la necesidad de penalidades
              // distintas a la mora.
              condicion: 'tiene_otras_penalidades',
              bloques: [
                {
                  clase: 'nota',
                  texto:
                    'Las penalidades deberán estar vinculadas al incumplimiento de obligaciones contractuales específicas, ser objetivas, razonables, congruentes y proporcionales con el objeto de la contratación, de manera que no afecten el equilibrio económico-financiero del contrato ni constituyan restricciones injustificadas a la competencia, conforme al principio de valor por dinero. Para cada penalidad deberá precisarse, como mínimo: (i) el supuesto de incumplimiento; (ii) la forma de verificación; (iii) el procedimiento para su aplicación; y (iv) el monto o la forma de cálculo de la penalidad.',
                },
                {
                  clase: 'fijo',
                  texto: 'Adicionalmente a la penalidad por mora, se aplicarán las siguientes penalidades:',
                },
                {
                  clase: 'tabla',
                  id: 'otras_penalidades',
                  etiqueta: 'Otras penalidades',
                  columnas: [
                    'N°',
                    'Supuestos de aplicación de penalidad',
                    'Forma de cálculo',
                    'Procedimiento y medios de verificación',
                  ],
                  minimo: 1,
                },
                {
                  clase: 'redactado',
                  id: 'procedimiento_penalidades',
                  etiqueta: 'Procedimiento de notificación y descargos',
                  instruccion:
                    'Señalar el plazo y forma en que se notifica al contratista el supuesto incurrido para que remita sus descargos, y el plazo en que la entidad contratante evalúa dicho descargo y emite una decisión',
                  ejemplo:
                    'Cuando se verifique alguno de estos supuestos, el área usuaria y/o la DEC notificará al contratista dentro del plazo máximo de un (01) día hábil, adjuntando el informe técnico y el sustento correspondiente.\nEl contratista contará con un plazo de dos (02) días hábiles para presentar sus descargos, los cuales deberán estar debidamente sustentados con evidencia objetiva.\nLa Entidad evaluará los descargos presentados en un plazo máximo de tres (03) días hábiles, emitiendo la decisión correspondiente sobre la procedencia o no de la penalidad, la cual será comunicada al contratista por escrito.',
                  extension: 'varios_parrafos',
                },
              ],
            },
          ],
        },
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
          ],
        },
        {
          id: 'controversias',
          titulo: 'Solución de controversias contractuales',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'Las controversias que surjan entre las partes durante la ejecución del contrato se resuelven mediante conciliación, cuando se haya pactado, y arbitraje.\n\nPara el caso del arbitraje, el postor ganador de la buena pro selecciona una de las siguientes Instituciones Arbitrales para administrarlo:',
            },
            {
              clase: 'tabla',
              id: 'instituciones_arbitrales',
              etiqueta: 'Instituciones arbitrales',
              instruccion: 'Señalar en orden alfabético el listado de TRES Instituciones Arbitrales propuestas por la entidad',
              columnas: ['N.º', 'Instituciones Arbitrales', 'RUC'],
              minimo: 3,
            },
            {
              clase: 'nota',
              texto:
                'La JPRD solo puede contemplarse como medio de solución de controversias si el objeto contractual es suministro de bienes y el monto contractual supera S/ 10 000 000,00 (diez millones y 00/100 soles).',
            },
          ],
        },
        {
          id: 'plazo_respuestas',
          titulo: 'Plazo para respuestas entre las partes',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'Los plazos para la respuesta de las partes sobre aspectos vinculados con la ejecución contractual que no han sido específicamente previstos en el Reglamento, aplica el plazo máximo de respuesta establecido a continuación.',
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
        {
          id: 'vicios_ocultos',
          titulo: 'Responsabilidad por vicios ocultos',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'La conformidad de la prestación otorgada por la Entidad no enerva su derecho a reclamar posteriormente por defectos o vicios ocultos, de conformidad con lo establecido en el literal c) del numeral 69.2 del artículo 69 de la Ley N° 32069 y el numeral 144.9 del artículo 144 de su Reglamento.',
              fundamento: 'Ley N° 32069, art. 69.2.c; Reglamento, art. 144.9',
            },
            {
              clase: 'campo',
              id: 'vicios_ocultos_plazo',
              etiqueta: 'Plazo de responsabilidad por vicios ocultos',
              ayuda: 'Consignar el tiempo en años, contado a partir de la conformidad otorgada por la Entidad',
              tipo: 'texto',
              obligatorio: true,
            },
          ],
        },
        {
          id: 'anticorrupcion',
          titulo: 'Normas de anticorrupción y antisoborno',
          bloques: [
            {
              clase: 'fijo',
              texto: CLAUSULA_ANTISOBORNO,
              fundamento: 'Plantilla — cláusula obligatoria',
            },
          ],
        },
      ],
    },

    // ── 7. Otras consideraciones ────────────────────────────────────
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
                'Listar los recursos y facilidades que la entidad debe brindar al proveedor. La Entidad debe crear todas las condiciones, internas y externas, para que el contratista pueda ejecutar de manera eficiente, segura y oportuna el contrato',
              ejemplo:
                'Proveer al contratista el espacio físico acondicionado (cuartos limpios, electricidad regulada, acceso restringido).\nEntregar planos y permisos municipales para las obras civiles necesarias.\nProporcionar acceso al edificio y personal de supervisión durante la instalación.\nGarantizar que el lugar cumpla con las normas de seguridad para equipos eléctricos y manejo de agentes biológicos.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'conformidad',
          titulo: 'Conformidad y verificación técnica de los bienes',
          bloques: [
            {
              clase: 'redactado',
              id: 'conformidad',
              etiqueta: 'Conformidad',
              instruccion:
                'Precisar quién otorga la conformidad, qué se verifica y en qué plazo',
              extension: 'parrafo',
            },
          ],
        },
      ],
    },

    // ── 8. Requisitos y recursos del contratista ────────────────────
    {
      id: 'requisitos_contratista',
      titulo: 'REQUISITOS Y RECURSOS PROVISTOS POR EL CONTRATISTA',
      bloques: [
        {
          clase: 'tabla',
          id: 'personal_clave',
          etiqueta: 'Personal clave',
          instruccion: 'Consignar cargo o función, profesión exigida y actividades principales',
          columnas: ['Cargo y/o responsabilidad', 'Profesión y grado o título profesional requerido', 'Actividades principales'],
          minimo: 0,
        },
      ],
    },

    // ── 9. Requisitos de calificación ───────────────────────────────
    {
      id: 'requisitos_calificacion',
      titulo: 'REQUISITOS DE CALIFICACIÓN',
      bloques: [
        {
          clase: 'fijo',
          texto:
            'Para determinar que los postores cuentan con las capacidades necesarias para ejecutar el contrato, los evaluadores incorporan obligatoriamente los siguientes requisitos de calificación.',
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
                'Incluir los requisitos relacionados a la habilitación para llevar a cabo la actividad económica materia de la contratación, conforme a la normativa que regule el objeto contractual',
              extension: 'parrafo',
            },
            {
              clase: 'redactado',
              id: 'capacidad_legal_acreditacion',
              etiqueta: 'Acreditación',
              instruccion:
                'Incluir el documento con el que se debe acreditar el requisito relacionado a la habilitación del postor',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'experiencia_postor',
          titulo: 'Experiencia del postor en la especialidad',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'El postor debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto}}, por la venta de bienes iguales o similares al objeto de la convocatoria, durante los diez años anteriores a la fecha de la presentación de ofertas, que se computan desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto',
                  etiqueta: 'Monto facturado acumulado exigido',
                  ayuda:
                    'Consignar el monto de facturación expresado en números y letras en la moneda de la convocatoria, monto que no puede ser mayor a tres veces la cuantía de la contratación o del ítem',
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
              texto: ACREDITACION_EXPERIENCIA,
              fundamento: 'Plantilla — acreditación de experiencia, texto invariable',
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
                'Este texto se incluye en procedimientos de selección por relación de ítems, cuando la cuantía de la contratación de algún ítem corresponda al monto de una Licitación Pública abreviada de bienes.',
            },
            {
              clase: 'parrafo',
              texto:
                'En el caso de postores que declaren en el Anexo N° 1 tener la condición de micro y pequeña empresa, se acredita una experiencia de {{experiencia_monto_mype}}, por la venta de bienes iguales o similares al objeto de la convocatoria, durante los diez años anteriores a la fecha de la presentación de ofertas que se computarán desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda. En el caso de consorcios, todos los integrantes deben contar con la condición de micro y pequeña empresa.',
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
              clase: 'redactado',
              id: 'capacidad_tecnica_requisito',
              etiqueta: 'Requisitos',
              instruccion:
                'Precisar el equipamiento estratégico, la infraestructura o el personal exigido como requisito adicional de calificación',
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

    // ── 10. Funcionario solicitante ─────────────────────────────────
    {
      id: 'solicitante',
      titulo: 'FUNCIONARIO Y/O SERVIDOR CIVIL SOLICITANTE',
      bloques: [
        {
          clase: 'campo',
          id: 'solicitante_nombre',
          etiqueta: 'Nombres y apellidos',
          ayuda: 'Consignar el funcionario o servidor civil que formula el requerimiento',
          tipo: 'texto',
          obligatorio: true,
        },
        {
          clase: 'campo',
          id: 'solicitante_cargo',
          etiqueta: 'Cargo',
          ayuda: 'Consignar el cargo del solicitante',
          tipo: 'texto',
          obligatorio: true,
        },
        {
          clase: 'campo',
          id: 'solicitante_fecha',
          etiqueta: 'Fecha',
          ayuda: 'Fecha de formulación del requerimiento',
          tipo: 'fecha',
          obligatorio: true,
        },
      ],
    },
  ],
};
