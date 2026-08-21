/**
 * Plantilla: REQUERIMIENTO — BIENES - COMPARACIÓN DE PRECIOS
 *
 * Transcripción de "PROCEDIMIENTOS DE SELECCIÓN/1. BIENES/
 * 4. Bienes compración de precios.docx" (la errata del nombre es del
 * original).
 *
 * LO QUE LA DISTINGUE: procedimiento acotado a bienes de oferta estándar
 * entregables en 5 días hábiles y por debajo de S/ 100 000. La
 * subcontratación está prohibida sin alternativa, no hay adelantos y el
 * único factor de evaluación es el precio.
 *
 * OJO: el texto de acreditación de experiencia NO es el mismo que en
 * Bienes en General —cambia el número de anexo (10 en vez de 11) y
 * añade "orden de compra o servicio"—, así que se transcribe aparte. El
 * auditor fue quien obligó a mirarlo de cerca.
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
  VALIDACION_EXPERIENCIA,
  VALIDACION_MYPE,
} from './comunes';

export const PLANTILLA_BIENES_COMPARACION_PRECIOS: PlantillaRequerimiento = {
  id: 'ps-bienes-comparacion-precios',
  familia: 'procedimiento_seleccion',
  objeto: 'bienes',
  encabezado: 'REQUERIMIENTO',
  subtitulo: 'BIENES - COMPARACIÓN DE PRECIOS',
  origen: 'PROCEDIMIENTOS DE SELECCIÓN/1. BIENES/4. Bienes compración de precios.docx',

  validaciones: [VALIDACION_EXPERIENCIA, VALIDACION_MYPE],

  secciones: [
    seccionEncabezado(
      'Indicar una breve descripción del requerimiento, mediante la denominación del (los) bien(es) a ser contratado(s)',
    ),

    seccionFinalidadPublica(
      'La contratación tiene por finalidad fortalecer la capacidad operativa de la Entidad mediante la adquisición de equipos informáticos que permitan mejorar el procesamiento de información, optimizar los tiempos de atención y brindar servicios públicos de manera eficiente.',
    ),

    seccionObjetivo(
      'Adquirir los bienes requeridos por la Entidad, conforme a las especificaciones técnicas establecidas en el requerimiento, garantizando su calidad, oportunidad de entrega y adecuado funcionamiento para el cumplimiento de las actividades institucionales.',
      'Abastecer oportunamente a las áreas usuarias con los bienes requeridos.\nGarantizar que los bienes cumplan las especificaciones técnicas y estándares de calidad establecidos por la Entidad.\nMejorar la eficiencia en el desarrollo de las actividades institucionales mediante la disponibilidad de bienes adecuados.\nOptimizar el uso de los recursos públicos mediante la adquisición de bienes que satisfagan la necesidad institucional.',
    ),

    seccionAntecedentes(
      'Describir las razones que sustentan la necesidad de adquirir los bienes: el problema identificado, la necesidad institucional a atender y los documentos que sustentan el requerimiento (informes técnicos, solicitudes del área usuaria, diagnósticos, inventarios, planes institucionales, estudios de mercado). Justificar que la contratación resulta necesaria para garantizar la continuidad de las actividades institucionales',
      'Los equipos informáticos actualmente utilizados presentan obsolescencia tecnológica y fallas recurrentes que afectan el desempeño de las actividades institucionales. Por ello, resulta necesaria la adquisición de nuevos equipos que permitan mejorar la capacidad operativa y la calidad de los servicios brindados por la Entidad.',
    ),

    {
      id: 'descripcion_general',
      titulo: 'DESCRIPCIÓN GENERAL DEL REQUERIMIENTO',
      bloques: [
        {
          clase: 'tabla',
          id: 'items',
          etiqueta: 'Bienes requeridos',
          instruccion:
            'Describir de manera general los bienes objeto de la contratación, indicando las cantidades requeridas y su unidad de medida',
          columnas: ['N.°', 'Cantidad', 'Unidad de medida', 'Descripción del bien'],
          minimo: 1,
        },
        {
          clase: 'opcion',
          id: 'forma_contratacion',
          etiqueta: 'Forma de contratación',
          instruccion: 'Completar si serán contratados por ítems, por paquetes o mediante un ítem único',
          opciones: [
            { valor: 'item_unico', texto: 'Los bienes antes descritos serán contratados mediante un único ítem.' },
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
          // Los límites del procedimiento. Van como nota para que el
          // área usuaria los vea antes de seguir: si la cuantía o el
          // plazo no encajan, este no es el formato.
          clase: 'nota',
          texto:
            'Condición de uso: solo aplica para bienes de oferta estándar que puedan entregarse en un máximo de 5 días hábiles y cuya cuantía no supere los S/ 100,000.00. Invitaciones: el oficial de compra debe registrar la convocatoria en la Pladicop e invitar a un mínimo de tres (3) proveedores. Evaluación: el único factor de evaluación es el precio, y se requiere un mínimo de dos (2) ofertas calificadas para otorgar la buena pro.',
        },
      ],
    },

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
              clase: 'nota',
              texto:
                'Esta contratación corresponde a bienes de oferta estándar disponibles en el mercado, que no requieren fabricación, producción, diseño, adaptación ni desarrollo específico. Las especificaciones definen las características mínimas de calidad, funcionalidad, desempeño y seguridad, sin restringir la libre competencia ni favorecer a un fabricante, marca o proveedor determinado.',
            },
            {
              clase: 'redactado',
              id: 'caracteristicas_tecnicas',
              etiqueta: 'Características técnicas',
              instruccion:
                'Definir las características mínimas que deben cumplir los bienes, de modo que puedan ser suministrados por cualquier proveedor que las acredite, conforme a los principios de libertad de concurrencia, igualdad de trato, competencia y transparencia',
              ejemplo:
                'La presente contratación corresponde a la adquisición de llantas para vehículos, las cuales constituyen bienes de oferta estándar disponibles en el mercado nacional e internacional, comercializadas por diversos fabricantes y distribuidores autorizados, sin requerir fabricación, diseño o adecuación específica.\n\nLas especificaciones técnicas definen las características mínimas que deberán cumplir las llantas: medidas, índice de carga, código de velocidad, tipo de construcción, capacidad de tracción, resistencia al desgaste, fecha de fabricación, garantía comercial y demás requisitos técnicos necesarios para asegurar la seguridad, confiabilidad y adecuado desempeño de la flota vehicular institucional.',
              extension: 'varios_parrafos',
            },
            {
              clase: 'tabla',
              id: 'caracteristicas_por_item',
              etiqueta: 'Características por ítem',
              instruccion: 'En caso de relación de ítems, detallar las características de cada bien',
              columnas: ['N.°', 'Característica', 'Especificación'],
              minimo: 0,
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
                'Consignar el documento mediante el cual la autoridad de la gestión administrativa aprobó la compatibilización del requerimiento. Si no corresponde, consignar "NO APLICA"',
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
                'Indicar el rango o tolerancia de parámetros bajo los que debe operar el bien: temperatura, altitud, tiempo, humedad relativa, frecuencia, resistencia de materiales, electricidad, vibraciones, potencia, voltaje, presión. Si el bien no requiere condiciones especiales, consignar "NO APLICA"',
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
              instruccion:
                'Precisar las características del envase considerando la naturaleza del producto, la normativa sanitaria aplicable y las condiciones de conservación durante el almacenamiento y transporte',
              columnas: ['Aspecto a precisar', 'Descripción'],
              minimo: 1,
            },
            {
              clase: 'redactado',
              id: 'embalaje',
              etiqueta: 'Embalaje',
              instruccion:
                'Indicar el tipo de embalaje y su detalle técnico, considerando la naturaleza de los bienes, el modo de envío y las condiciones climáticas durante el tránsito y en destino. Distinguir embalaje primario, secundario y terciario cuando corresponda',
              ejemplo:
                'Embalaje primario: cada pavo debe estar empacado individualmente en bolsas de polietileno de alta densidad, aptas para congelación, que eviten la entrada de aire y humedad. Las bolsas deben estar selladas herméticamente mediante selladora térmica.\n\nEmbalaje secundario: los pavos individuales se colocan en cajas de cartón corrugado resistentes, diseñadas para soportar bajas temperaturas y manipulación durante el transporte. Cada caja debe contener una cantidad definida de pavos para facilitar el control y distribución.',
              extension: 'varios_parrafos',
            },
            {
              clase: 'redactado',
              id: 'rotulado',
              etiqueta: 'Rotulado',
              instruccion:
                'Señalar el tipo de rotulado, su detalle técnico y la información que debe contener: características del producto, forma de elaboración, manipulación y conservación, propiedades, contenido, fecha de expiración y limitaciones a su comercialización',
              ejemplo:
                'Nombre del producto: Pavo congelado entero.\nPeso neto y bruto.\nFecha de producción y fecha de vencimiento.\nCondiciones de almacenamiento: "Mantener congelado a -18°C".\nIndicaciones de manipulación: "Producto perecible", "No romper la cadena de frío".\nCódigo de lote para trazabilidad.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'garantia_comercial',
          titulo: 'Garantía comercial',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'La garantía comercial, comprende contra defectos de diseño y/o fabricación, averías o fallas de funcionamiento, o pérdida total de los bienes contratados, ajenos al uso normal o habitual de los bienes y no detectables al momento que se otorgó la conformidad.',
              fundamento: 'Plantilla — alcance de la garantía',
            },
            {
              clase: 'fijo',
              texto:
                'Para la atención de la garantía, el contratista deberá contar con una línea telefónica fija o móvil para las coordinaciones que correspondan, cuyo horario de atención debe ser de lunes a viernes de 8:30 - 18:00 horas.',
            },
            {
              clase: 'fijo',
              texto:
                'El plazo máximo para la entrega de los bienes a reemplazar, serán dentro de cinco (5) días calendario computados a partir del día siguiente de la notificación al contratista. La notificación será efectuada por el comprador público a través de correo electrónico que fue autorizado por el contratista.',
            },
            {
              clase: 'fijo',
              texto:
                'Los bienes para remplazar deben ser nuevos y debe tener las mismas características del bien contratado. Todos los gastos deberán ser cubiertos por el contratista.',
            },
            {
              clase: 'parrafo',
              texto:
                'El período de garantía será de {{garantia_periodo}}, computado a partir del día siguiente del otorgamiento de la conformidad del bien.',
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
                    'El contrato se rige por un Esquema mixto, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando la entidad contratante puede utilizar más de una modalidad de pago en un mismo contrato.',
                },
                {
                  valor: 'costo_reembolsable',
                  texto:
                    'El contrato se rige por la modalidad de Costo reembolsable, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando la entidad contratante requiere reembolsar al contratista los costos reales en que incurre durante la ejecución del contrato.',
                },
              ],
            },
          ],
        },
        {
          id: 'plazo_entrega',
          titulo: 'Plazo de la entrega de los bienes',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'Los bienes o servicios materia de la presente convocatoria se entregan/prestan en el plazo de {{plazo_entrega}}, computado a partir del día siguiente de {{hito_inicio}}',
              campos: [
                {
                  clase: 'campo',
                  id: 'plazo_entrega',
                  etiqueta: 'Plazo de entrega',
                  ayuda: 'Consignar el plazo de entrega de bienes',
                  tipo: 'dias',
                  obligatorio: true,
                },
                {
                  clase: 'campo',
                  id: 'hito_inicio',
                  etiqueta: 'Hito desde el que se computa',
                  ayuda:
                    'La notificación de la orden de compra, el perfeccionamiento del contrato, o el cumplimiento de la condición de inicio que corresponda',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
          ],
        },
        {
          id: 'lugar_entrega',
          titulo: 'Lugar de entrega de los bienes',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'Los bienes materia de la presente convocatoria se entregan en el almacén de la entidad, ubicada en {{lugar_entrega}}, salvo días feriados. previa coordinación con el responsable de almacén.',
              campos: [
                {
                  clase: 'campo',
                  id: 'lugar_entrega',
                  etiqueta: 'Lugar de entrega',
                  ayuda:
                    'Consignar la dirección exacta donde será entregado el bien considerando distrito, provincia, departamento y horario de atención para la entrega de bienes',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'nota',
              texto:
                'En caso se establezca más de un lugar de entrega, se recomienda incorporar un cuadro de distribución de lugares de entrega.',
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
                'Señalar los documentos que el contratista debe entregar, la oportunidad y/o plazo de entrega y el medio de entrega',
              columnas: ['N°', 'Entregable', 'Plazo', 'Contenido'],
              minimo: 1,
            },
          ],
        },

        seccionPenalidades('larga'),

        {
          id: 'subcontratacion',
          titulo: 'Subcontratación',
          bloques: [
            {
              // Sin alternativa: en este procedimiento la plantilla no
              // ofrece la opción de permitirla.
              clase: 'fijo',
              texto: 'Se encuentra prohibida la subcontratación de las prestaciones objeto del contrato.',
              fundamento: 'Plantilla — comparación de precios',
            },
          ],
        },

        seccionControversias(true),

        {
          id: 'plazo_respuestas',
          titulo: 'Plazo para respuestas entre las partes',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'Los plazos para la respuesta de las partes sobre aspectos vinculados con la ejecución contractual que no han sido específicamente previstos en el reglamento, aplica el plazo máximo de respuesta establecido en el cuadro siguiente:',
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
              ejemplo:
                'Proveer al contratista el espacio físico acondicionado (cuartos limpios, electricidad regulada, acceso restringido).\nEntregar planos y permisos municipales para las obras civiles necesarias.\nProporcionar acceso al edificio y personal de supervisión durante la instalación.\nGarantizar que el lugar cumpla con las normas de seguridad para equipos eléctricos y manejo de agentes biológicos.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'conformidad',
          titulo: 'Órgano quien brindará la conformidad',
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
            {
              clase: 'nota',
              texto:
                'De manera excepcional se permite que el pago se realice de forma total o parcial al inicio de la vigencia contractual, siempre que se sustente que es una condición de mercado indispensable. En ese caso el contratista debe entregar previamente una garantía conforme al numeral de garantía de fiel cumplimiento, y el área usuaria emite una primera conformidad para efectos administrativos de pago y, después, la conformidad final.',
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
                'Precisar los recursos, medios, equipos, materiales, personal, licencias, autorizaciones o permisos que el contratista deberá proporcionar, así como sus responsabilidades durante la ejecución contractual, siempre que resulten objetivas, razonables y guarden relación con la naturaleza de la contratación',
              ejemplo:
                'Entregar los productos en las cantidades, lugares, fechas y horarios establecidos por la Entidad.\nGarantizar que los productos cumplan con las especificaciones técnicas, requisitos sanitarios, condiciones de inocuidad y vida útil exigidos en el requerimiento.\nUtilizar vehículos adecuados para el transporte, asegurando que los productos se conserven en óptimas condiciones hasta su entrega.\nAsumir los costos de transporte, carga, descarga y cualquier otro gasto necesario para la entrega de los bienes.\nReemplazar, sin costo adicional para la Entidad, los productos que presenten defectos, deterioro o incumplimiento de las especificaciones técnicas.',
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
          condicion: 'exige_experiencia',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Requisito de calificación facultativo. Una vez incorporado se considera obligatorio; deben eliminarse los que no se seleccionen.',
            },
            {
              clase: 'parrafo',
              texto:
                'El postor debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto}}, por la venta de bienes iguales o similares al objeto de la convocatoria, durante los diez años anteriores a la fecha de la presentación de ofertas que se computa desde la fecha de la conformidad o emisión del comprobante de pago, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto',
                  etiqueta: 'Monto facturado acumulado exigido',
                  ayuda:
                    'Consignar el monto de facturación en números y letras en la moneda de la convocatoria, monto que no podrá ser mayor a tres veces la cuantía de la contratación o del ítem',
                  tipo: 'moneda',
                  obligatorio: true,
                  validacion: 'experiencia_max',
                },
              ],
            },
            {
              clase: 'parrafo',
              texto:
                'Los postores que declaren en el Anexo N° 2 tener la condición de micro y pequeña empresa acreditan, con las mismas condiciones, una experiencia de {{experiencia_monto_mype}}, por la venta o prestación de {{objeto_experiencia}} iguales o similares al objeto de la convocatoria. Para consorcios, todos sus integrantes deben contar con la condición de micro y pequeña empresa.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto_mype',
                  etiqueta: 'Monto exigido a micro y pequeña empresa',
                  ayuda:
                    'Consignar el monto de facturación en números y letras en la moneda de la convocatoria, sin exceder el 25% de la cuantía de la contratación',
                  tipo: 'moneda',
                  obligatorio: true,
                  validacion: 'experiencia_mype',
                },
                {
                  clase: 'campo',
                  id: 'objeto_experiencia',
                  etiqueta: 'Objeto de la experiencia',
                  ayuda: 'Consignar bienes o servicios, según corresponda',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'parrafo',
              texto: 'Se consideran bienes similares a los siguientes {{bienes_similares}}.',
              campos: [
                {
                  clase: 'campo',
                  id: 'bienes_similares',
                  etiqueta: 'Bienes similares',
                  ayuda: 'Consignar los bienes o servicios similares al objeto convocado',
                  tipo: 'texto_largo',
                  obligatorio: true,
                },
              ],
            },
            {
              // Difiere del de Bienes en General: aquí el anexo es el
              // N° 10 y se admite "orden de compra o servicio".
              clase: 'fijo',
              texto:
                'La experiencia del postor en la especialidad se acredita con un máximo de veinte contrataciones, mediante copia simple de (i) contratos u órdenes de compra o servicio, y su respectiva conformidad o constancia de prestación; o (ii) comprobantes de pago cuya cancelación se acredite documental y fehacientemente, con constancia de depósito, nota de abono, reporte de estado de cuenta, cualquier otro documento emitido por entidad del sistema financiero que acredite el abono o mediante cancelación en el mismo comprobante de pago o comprobante de retención electrónico emitido por SUNAT por la retención del IGV. En caso el postor sustente su experiencia en la especialidad mediante contrataciones realizadas con privados, para acreditarla debe presentar de forma obligatoria lo indicado en el numeral (ii) del presente párrafo; no es posible que acredite su experiencia únicamente con la presentación de contratos u órdenes de compra o servicio con conformidad o constancia de prestación.',
              fundamento: 'Plantilla — acreditación de experiencia, texto invariable',
            },
            {
              clase: 'fijo',
              texto:
                'En caso los postores presenten varios comprobantes de pago para acreditar una sola contratación, se debe acreditar que corresponden a dicha contratación; de lo contrario, se asumirá que los comprobantes de pago acreditan contrataciones independientes, en ese caso solo se considerará, para su evaluación, las veinte (20) primeras contrataciones indicadas en el Anexo Nº 10 referido a la Experiencia del Postor en la Especialidad.',
            },
            {
              clase: 'fijo',
              texto:
                'En el caso de suministro, solo se considera como experiencia la parte del contrato que haya sido ejecutada durante los diez (10) años anteriores a la fecha de presentación de ofertas, debiendo adjuntarse copia de las conformidades o los respectivos comprobantes de pago cancelados correspondientes a tal parte.',
            },
            { clase: 'fijo', texto: EXPERIENCIA_TITULAR },
            {
              clase: 'fijo',
              texto:
                'Si el postor acredita experiencia de otra persona jurídica como consecuencia de una reorganización societaria, debe presentar el Anexo N° 11.',
            },
            {
              clase: 'fijo',
              texto:
                'Las personas jurídicas resultantes de un proceso de reorganización societaria no pueden acreditar como experiencia del postor en la especialidad que le hubiesen transmitido como parte de dicha reorganización las personas jurídicas sancionadas con inhabilitación vigente o definitiva.',
            },
            {
              clase: 'fijo',
              texto:
                'Cuando en los contratos, órdenes de compra o de servicio o comprobantes de pago el monto facturado se encuentre expresado en moneda extranjera, debe indicarse el tipo de cambio venta publicado por la Superintendencia de Banca, Seguros y AFP correspondiente a la fecha de suscripción del contrato, de emisión de la orden de compra o de servicio o de cancelación del comprobante de pago, según corresponda.',
            },
            {
              clase: 'fijo',
              texto:
                'Sin perjuicio de lo anterior, los postores deben llenar y presentar el Anexo Nº 10 referido a la Experiencia del Postor en la Especialidad.',
            },
          ],
        },
      ],
    },

    seccionSolicitante(),
  ],
};
