/**
 * Plantilla: REQUERIMIENTO — BIENES A TRAVÉS DE SUBASTA INVERSA ELECTRÓNICA
 *
 * Transcripción de "PROCEDIMIENTOS DE SELECCIÓN/1. BIENES/
 * 2. Bienes Estandarizados.docx".
 *
 * LO QUE LA DISTINGUE: el bien está definido por una Ficha Técnica de
 * Perú Compras, así que el área usuaria NO redacta características
 * técnicas —le está prohibido reproducirlas o modificarlas—, y no se
 * exige experiencia del postor. A cambio aparecen envase, embalaje y
 * rotulado desarrollados, y requisitos de habilitación que no pueden ir
 * más allá de la ficha.
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
  VALIDACION_JPRD,
} from './comunes';

export const PLANTILLA_BIENES_ESTANDARIZADOS: PlantillaRequerimiento = {
  id: 'ps-bienes-estandarizados',
  familia: 'procedimiento_seleccion',
  objeto: 'bienes',
  encabezado: 'REQUERIMIENTO',
  subtitulo: 'BIENES A TRAVÉS DE SUBASTA INVERSA ELECTRÓNICA',
  origen: 'PROCEDIMIENTOS DE SELECCIÓN/1. BIENES/2. Bienes Estandarizados.docx',

  validaciones: [VALIDACION_ADELANTO, VALIDACION_JPRD],

  secciones: [
    seccionEncabezado(
      'Indicar una breve descripción del requerimiento, mediante la denominación del (los) bien(es) a ser contratado(s)',
    ),

    seccionFinalidadPublica(
      'La contratación tiene por finalidad garantizar el abastecimiento oportuno de arroz destinado a los Comedores Populares administrados por la Entidad, contribuyendo a la atención alimentaria de la población en situación de vulnerabilidad',
    ),

    seccionObjetivo(
      'Adquirir arroz pilado superior para abastecer a los Comedores Populares de la jurisdicción, asegurando la continuidad del servicio alimentario.',
      'Garantizar el suministro oportuno del arroz requerido por los Comedores Populares.\nContribuir a la adecuada preparación de las raciones alimentarias destinadas a los beneficiarios.',
    ),

    seccionAntecedentes(
      'Explicar de manera general el motivo por el cual se efectúa el requerimiento de la contratación del bien. En caso de existir documentos fuente de la contratación, mencionarlos y adjuntarlos',
      'La Entidad requiere abastecer de manera permanente a los Comedores Populares con arroz pilado superior, a fin de asegurar la continuidad del servicio de alimentación que se brinda a la población beneficiaria, conforme a la programación institucional y a las especificaciones establecidas en la Ficha Técnica aprobada para Subasta Inversa Electrónica.',
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
            'Describir de manera general los bienes objeto de la contratación, indicando las cantidades requeridas y su unidad de medida. La denominación debe corresponder a la de la Ficha Técnica',
          columnas: ['N.°', 'Cantidad', 'Unidad de medida', 'Denominación del bien según la Ficha Técnica'],
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
      ],
    },

    {
      id: 'caracteristicas',
      titulo: 'CARACTERÍSTICA Y CONDICIONES DE LOS BIENES A CONTRATAR',
      bloques: [],
      subsecciones: [
        {
          id: 'caracteristicas_tecnicas',
          titulo: 'Características técnicas del bien',
          bloques: [
            {
              // Texto invariable, y por una razón de fondo: el área
              // usuaria tiene PROHIBIDO redactar aquí. Por eso no hay un
              // bloque `redactado` en esta sección, a diferencia del
              // resto de plantillas de bienes.
              clase: 'fijo',
              texto:
                'Las características técnicas de los bienes estandarizados objeto de contratación mediante Subasta Inversa Electrónica se encuentran establecidas en las Fichas Técnicas aprobadas y publicadas por la Central de Compras Públicas - Perú Compras. En consecuencia, el área usuaria no deberá reproducir ni modificar dichas características en el presente requerimiento, siendo suficiente identificar el bien y adjuntar la Ficha Técnica correspondiente como anexo, la cual forma parte integrante de este requerimiento.',
              fundamento: 'Plantilla — subasta inversa electrónica',
            },
          ],
        },
        {
          id: 'vida_util',
          titulo: 'Vida útil del producto',
          condicion: 'tiene_vida_util',
          bloques: [
            {
              clase: 'nota',
              texto:
                'El período que se consigne para la fecha de vencimiento será calculado a partir de la fecha de entrega y en función a las características del producto. La entidad contratante debe solicitar al proveedor productos que gocen de una duración operativa adecuada para sus propósitos, en función al tiempo estimado que se requiera para su almacenamiento.',
            },
            {
              clase: 'redactado',
              id: 'vida_util',
              etiqueta: 'Vida útil exigida',
              instruccion:
                'Precisar la vida útil mínima del producto, contada desde la entrega, y cómo se verificará su cumplimiento',
              ejemplo:
                'El producto Aceite vegetal comestible, en presentación de botella de 900 ml, deberá contar con una vida útil mínima de doce (12) meses, computada a partir de la fecha de entrega en el almacén de la Entidad, considerando las características propias del producto y el tiempo estimado para su almacenamiento y consumo.\n\nLa Entidad verificará el cumplimiento de este requisito mediante la revisión de la fecha de producción y la fecha de vencimiento consignadas en el rotulado del producto al momento de la entrega.',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'envase_embalaje',
          titulo: 'Envase, embalaje y rotulado',
          condicion: 'requiere_envase',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Excepcionalmente, y siempre que la ficha técnica lo prevea, la Entidad puede incluir otra información sobre el rotulado, el embalaje y las características del envase. La información adicional NO puede modificar las características del bien descritas en la ficha técnica. Se debe tener en cuenta el Decreto Supremo N° 007-98-SA, la Resolución Ministerial N° 451-2006-MINSA y demás normas pertinentes.',
            },
          ],
          subsecciones: [
            {
              id: 'envase',
              titulo: 'Envase',
              bloques: [
                {
                  clase: 'tabla',
                  id: 'envase',
                  etiqueta: 'Características del envase',
                  instruccion:
                    'Precisar las características del envase considerando la naturaleza del producto, la normativa sanitaria aplicable y las condiciones de conservación durante el almacenamiento y transporte',
                  columnas: ['Aspecto a precisar', 'Descripción'],
                  minimo: 1,
                },
                {
                  clase: 'nota',
                  texto:
                    'El peso neto, el tipo y material del envase, así como el sistema de cerrado, cuando sean requeridos, deberán corresponder a la información autorizada en el Registro Sanitario del producto. Las exigencias deberán encontrarse debidamente sustentadas y no restringir la libre concurrencia de proveedores.',
                },
              ],
            },
            {
              id: 'embalaje',
              titulo: 'Embalaje',
              bloques: [
                {
                  clase: 'tabla',
                  id: 'embalaje',
                  etiqueta: 'Características del embalaje',
                  instruccion:
                    'Precisar las características del embalaje cuando por la naturaleza del bien resulte necesario agrupar varias unidades para su transporte, manipulación y almacenamiento',
                  columnas: ['Aspecto a precisar', 'Descripción'],
                  minimo: 1,
                },
                {
                  clase: 'nota',
                  texto:
                    'Las características del embalaje deberán ser las estrictamente necesarias para garantizar la protección, conservación e inocuidad del producto. El diseño y material deberán ser inocuos y aptos para uso alimentario, cuando corresponda.',
                },
              ],
            },
            {
              id: 'rotulado',
              titulo: 'Rotulado',
              bloques: [
                {
                  clase: 'tabla',
                  id: 'rotulado',
                  etiqueta: 'Información del rotulado',
                  instruccion:
                    'Precisar la información que deberá consignarse en el rotulado, de conformidad con la normativa sanitaria aplicable',
                  columnas: ['Aspecto a precisar', 'Descripción'],
                  minimo: 1,
                },
                {
                  clase: 'nota',
                  texto:
                    'La información consignada en el rotulado deberá cumplir con la normativa sanitaria vigente y encontrarse en idioma español. La información adicional no podrá modificar las características técnicas del bien ni restringir la libre concurrencia de proveedores.',
                },
              ],
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
                'Señalar el medio de transporte, las características mínimas de los vehículos, el personal mínimo para carga y descarga, y las medidas que aseguren la entrega en las condiciones requeridas',
              ejemplo:
                'El transporte de los productos estará a cargo del contratista, quien deberá garantizar que los bienes sean trasladados hasta el almacén de la Entidad en condiciones que preserven su calidad e inocuidad.\n\nLos productos deberán transportarse en vehículos autorizados para el traslado de alimentos, limpios, cerrados y en buen estado de conservación, evitando la exposición a humedad, polvo, contaminación o cualquier otra condición que pueda afectar el producto.\n\nEl vehículo deberá contar con la documentación necesaria para su circulación y cumplir con las disposiciones sanitarias aplicables al transporte de alimentos. Las labores de carga y descarga serán responsabilidad del contratista y no deberán generar costo adicional para la Entidad.',
              extension: 'varios_parrafos',
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
                'Precisar el alcance de la garantía, las condiciones de atención —teléfono, horario, plazo de reemplazo— y el período de vigencia',
              ejemplo:
                'Alcance de la garantía: La garantía comercial comprende el reemplazo de los productos que, con posterioridad a la conformidad de la entrega, presenten defectos de fabricación, alteraciones en su composición, contaminación, envases deteriorados o con pérdida de hermeticidad, rotulado incorrecto, vencimiento anticipado o cualquier otra condición que los haga no aptos para el consumo humano, siempre que dichas situaciones no sean atribuibles a un almacenamiento o manipulación inadecuados por parte de la Entidad.\n\nCondiciones de la garantía: El contratista deberá contar con un teléfono y/o correo electrónico para atender las solicitudes relacionadas con la garantía. En caso la Entidad detecte productos que incumplan las especificaciones técnicas o presenten defectos, el contratista deberá reemplazarlos, sin costo adicional, dentro de los cinco (5) días calendario siguientes a la notificación.\n\nPeríodo de garantía: La garantía comercial del producto se extenderá hasta la fecha de vencimiento consignada en el envase, siempre que el producto haya sido almacenado conforme a las condiciones establecidas por el fabricante.',
              extension: 'varios_parrafos',
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
                    'El contrato se rige por la modalidad de Suma Alzada, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando las cantidades, magnitudes y calidades de la prestación están definidas en el requerimiento.',
                },
                {
                  valor: 'precios_unitarios',
                  texto:
                    'El contrato se rige por la modalidad de Precios Unitarios, de conformidad con el artículo 130 del Reglamento. Es aplicable cuando no puede conocerse con exactitud o precisión las cantidades o magnitudes requeridas.',
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
          titulo: 'Plazo de entrega',
          bloques: [
            {
              clase: 'parrafo',
              texto:
                'Los bienes materia de la presente convocatoria se entregan en el plazo de {{plazo_entrega}}, contado a partir del día siguiente de la notificación de la orden de compra o de la suscripción del contrato, según corresponda.',
              campos: [
                {
                  clase: 'campo',
                  id: 'plazo_entrega',
                  etiqueta: 'Plazo de entrega',
                  ayuda: 'Consignar el plazo de entrega',
                  tipo: 'dias',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'nota',
              texto:
                'En el caso de suministro de bienes, consignar el cronograma de entregas, señalando la periodicidad de acuerdo con el objeto de la convocatoria (fechas fijas, semanales, quincenales o mensuales).',
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
        {
          id: 'adelanto_directo',
          titulo: 'Adelanto directo',
          condicion: 'otorga_adelanto',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Este numeral aplica únicamente cuando, por la naturaleza, complejidad o características del bien, corresponda otorgar adelantos directos y dicha condición haya sido prevista y sustentada en la estrategia de contratación, conforme al artículo 137 del Reglamento. En caso contrario, consignar "NO APLICA".',
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

        seccionPenalidades('larga'),

        {
          id: 'subcontratacion',
          titulo: 'Subcontratación',
          bloques: [
            {
              clase: 'opcion',
              id: 'subcontratacion',
              etiqueta: 'Subcontratación',
              instruccion:
                'La entidad contratante, a propuesta del área usuaria y previa validación durante la estrategia de contratación, incluye solo uno de los siguientes supuestos en las bases',
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
              clase: 'nota',
              texto:
                'Solo se incluye en el caso de ejecución periódica de bienes, a propuesta del área usuaria y previa validación durante la estrategia de contratación. Cuando se trate de bienes sujetos a cotización internacional no se aplica la limitación del Índice de Precios al Consumidor.',
            },
            {
              clase: 'redactado',
              id: 'reajuste',
              etiqueta: 'Fórmula de reajuste',
              instruccion:
                'Consignar las fórmulas de reajuste correspondientes y el procedimiento, de acuerdo con lo previsto en el numeral 136.2 del artículo 136 del Reglamento',
              ejemplo:
                'En la contratación del suministro de combustible (gasohol y diésel B5 S-50) para las unidades vehiculares de la Entidad, cuyo precio se encuentra influenciado por la cotización internacional del petróleo y sus derivados, no corresponderá aplicar una fórmula de reajuste basada en el Índice de Precios al Consumidor (IPC).\n\nEl reajuste de la contraprestación estará determinado por la variación del precio de venta vigente al momento de la entrega o del pago, según corresponda, la cual será acreditada mediante la publicación oficial del Organismo Supervisor de la Inversión en Energía y Minería (OSINERGMIN) u otra fuente oficial prevista en las Especificaciones Técnicas o en el contrato.',
              extension: 'varios_parrafos',
            },
          ],
        },

        (() => {
          const s = seccionControversias(true);
          s.bloques.push({
            clase: 'nota',
            texto:
              'La entidad contratante puede contemplar la JPRD como medio de solución de controversias únicamente si el objeto contractual es el suministro de bienes y el monto contractual es mayor a S/ 10 000 000,00 (diez millones y 00/100 soles).',
          });
          return s;
        })(),

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
          id: 'muestreo',
          titulo: 'Métodos de muestreo, ensayos o pruebas, certificados y otros',
          condicion: 'requiere_muestreo',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Solo se incluye si está previsto en los documentos de información complementaria de la ficha técnica y así se determinó en la estrategia de contratación. Estos documentos NO se pueden solicitar en ningún caso para la presentación de ofertas. En el caso de medicamentos y productos farmacéuticos es obligatorio incluir lo indicado en los documentos de información complementaria.',
            },
            {
              clase: 'redactado',
              id: 'muestreo',
              etiqueta: 'Métodos de muestreo y certificados',
              instruccion:
                'Consignar el método de muestreo, ensayos o pruebas para comprobar la calidad de los bienes, así como el tipo y oportunidad de presentación de los certificados de conformidad o de inspección previstos en los documentos de información complementaria',
              extension: 'parrafo',
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

        seccionViciosOcultos(),
        seccionAnticorrupcion(true),

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
                'Indicar la relación de los anexos que se adjuntan al requerimiento, tales como las fichas técnicas',
              extension: 'lista',
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
          titulo: 'Recursos u obligaciones del contratista',
          bloques: [
            {
              clase: 'redactado',
              id: 'recursos_contratista',
              etiqueta: 'Recursos y obligaciones del contratista',
              instruccion:
                'Precisar los recursos, medios, equipos, materiales, personal, licencias, autorizaciones o permisos que el contratista deberá proporcionar, así como sus responsabilidades durante la ejecución contractual, siempre que resulten objetivas, razonables y guarden relación con la naturaleza de la contratación',
              ejemplo:
                'Entregar los productos en las cantidades, lugares, fechas y horarios establecidos por la Entidad.\nGarantizar que los productos cumplan con las especificaciones técnicas, requisitos sanitarios, condiciones de inocuidad y vida útil exigidos en el requerimiento.\nUtilizar vehículos adecuados para el transporte de alimentos, asegurando que los productos se conserven en óptimas condiciones hasta su entrega.\nAsumir los costos de transporte, carga, descarga y cualquier otro gasto necesario para la entrega de los bienes.\nReemplazar, sin costo adicional para la Entidad, los productos que presenten defectos, deterioro o incumplimiento de las especificaciones técnicas.\nCumplir con la normativa sanitaria y demás disposiciones legales aplicables durante la ejecución contractual.',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'verificacion_calidad',
          titulo: 'Documentación para la verificación de la calidad del producto',
          condicion: 'requiere_certificados',
          bloques: [
            {
              clase: 'redactado',
              id: 'verificacion_calidad',
              etiqueta: 'Certificados exigidos en cada entrega',
              instruccion:
                'Indicar los certificados que el contratista debe presentar en cada entrega para verificar el cumplimiento de las especificaciones técnicas (certificado de conformidad o calidad, certificado de inspección, informe de ensayo)',
              extension: 'parrafo',
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
          bloques: [
            {
              clase: 'nota',
              texto:
                'La entidad contratante NO puede incluir requisitos de habilitación adicionales o diferentes a los contemplados en la ficha técnica o en los documentos de información complementaria, salvo que la normativa específica que regula el objeto exija algún requisito obligatorio. No debe exigirse documentación para acreditar requisitos que no deriven de una norma aplicable al objeto, como la inscripción en el RUC, en el RNP o la vigencia de poder.',
            },
            {
              clase: 'redactado',
              id: 'capacidad_legal_requisito',
              etiqueta: 'Requisitos',
              instruccion:
                'Incluir los requisitos de habilitación para la actividad económica materia de la contratación previstos en los documentos de información complementaria aprobados por Perú Compras',
              extension: 'parrafo',
            },
            {
              clase: 'redactado',
              id: 'capacidad_legal_acreditacion',
              etiqueta: 'Acreditación',
              instruccion: 'Incluir el documento con el que se acredita el requisito de habilitación del postor',
              extension: 'parrafo',
            },
            {
              clase: 'tabla',
              id: 'habilitacion_adicional',
              etiqueta: 'Requisitos de habilitación adicionales',
              instruccion: 'Solo si se determina que corresponden requisitos de habilitación adicionales',
              columnas: [
                'Nº',
                'Requisito de Habilitación Adicional',
                'Acreditación',
                'Base Legal',
                'Fecha de Publicación',
              ],
              minimo: 0,
            },
          ],
        },
        {
          id: 'consorcio',
          titulo: 'Participación en consorcio',
          condicion: 'exige_consorcio',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Requisito de calificación facultativo. Una vez incorporado, se considera obligatorio; deben eliminarse los que no se seleccionen.',
            },
            // Van como dos requisitos separados, no como un párrafo: en
            // el original son B.1 y B.2, y la entidad puede exigir uno
            // sin el otro.
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
