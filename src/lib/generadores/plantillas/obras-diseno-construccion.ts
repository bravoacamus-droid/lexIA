/**
 * Plantilla: REQUERIMIENTO — EJECUCIÓN DE OBRAS CON SISTEMA DE ENTREGA
 * DE DISEÑO Y CONSTRUCCIÓN
 *
 * Transcripción de "PROCEDIMIENTOS DE SELECCIÓN/4. EJECUCIÓN DE OBRAS/
 * 1. Ejecución de obras - Diseño y construcción.docx", en la versión que
 * César corrigió el 16/08/2026 añadiendo vicios ocultos y antisoborno.
 *
 * QUÉ LA SEPARA DE SOLO CONSTRUCCIÓN
 *
 * Aquí el contratista asume LOS DOS COMPONENTES: elabora el expediente
 * técnico y ejecuta la obra. Eso cambia el documento de arriba abajo:
 *
 *  · La experiencia se acredita DOS VECES —una para ejecución de obras y
 *    otra para consultoría de obras—, cada una limitada a una vez la
 *    cuantía de su propio componente.
 *  · Los plazos, entregables y equipamiento estratégico se separan por
 *    componente.
 *  · La responsabilidad por vicios ocultos tiene DOS plazos: no menos de
 *    siete años por la obra ejecutada y no menos de tres por los errores
 *    del expediente técnico que él mismo elaboró.
 *  · Aparecen la flexibilidad presupuestal del 50% —el expediente puede
 *    aprobarse con un presupuesto hasta un 50% mayor sin que eso sea
 *    prestación adicional— y la metodología fast track.
 *  · En vez de metas físicas cerradas puede haber objetivos funcionales:
 *    se define el desempeño esperado, no una solución de diseño.
 */
import type { PlantillaRequerimiento } from '../plantilla-tipos';
import {
  seccionEncabezado,
  seccionFinalidadPublica,
  seccionObjetivo,
  seccionAntecedentes,
  seccionAnticorrupcion,
  seccionSolicitante,
  EJEMPLO_PROCEDIMIENTO_PENALIDADES,
  NOTA_PENALIDADES_CRITERIOS,
  PENALIDAD_MORA,
  EXPERIENCIA_TITULAR,
  VALIDACION_PENALIDADES,
} from './comunes';

export const PLANTILLA_OBRAS_DISENO_CONSTRUCCION: PlantillaRequerimiento = {
  id: 'ps-obras-diseno-construccion',
  familia: 'procedimiento_seleccion',
  objeto: 'obras',
  encabezado: 'REQUERIMIENTO',
  subtitulo: 'EJECUCIÓN DE OBRAS CON SISTEMA DE ENTREGA DE DISEÑO Y CONSTRUCCIÓN',
  origen:
    'PROCEDIMIENTOS DE SELECCIÓN/4. EJECUCIÓN DE OBRAS/1. Ejecución de obras - Diseño y construcción.docx',

  validaciones: [
    {
      // Se contrasta contra la cuantía del COMPONENTE, no del contrato
      // entero, así que el ensamblador solo puede avisar cuando el
      // usuario declara esa cuantía por separado.
      id: 'experiencia_max',
      descripcion:
        'La experiencia exigida en ejecución de obras no puede ser mayor a una vez la cuantía del componente de ejecución de obra; la de consultoría de obras, a una vez la cuantía del componente diseño.',
      fundamento: 'Plantilla — Requisitos de calificación, experiencia del postor',
      factor: 1,
    },
    VALIDACION_PENALIDADES,
    {
      id: 'vicios_ocultos_min',
      descripcion:
        'El plazo por vicios ocultos de la obra no puede ser menor de siete (7) años desde la recepción, y el de los errores del expediente técnico, menor de tres (3) años desde la conformidad de la obra.',
      fundamento: 'Ley N° 32069, art. 69.2.b y d; Reglamento, art. 216',
    },
    {
      id: 'incremento_expediente',
      descripcion:
        'El expediente técnico puede aprobarse con un presupuesto de hasta 50% más que el monto del contrato original para ese componente, sin que califique como prestación adicional, siempre que haya previsión presupuestal.',
      fundamento: 'Plantilla — flexibilidad presupuestal en Diseño y Construcción',
    },
    {
      id: 'jprd_obras',
      descripcion:
        'La JPRD es obligatoria si el monto contractual es igual o mayor a S/ 10 000 000,00 y facultativa desde S/ 5 000 000,00.',
      fundamento: 'Plantilla — solución de controversias en obras',
    },
  ],

  secciones: [
    seccionEncabezado(
      'Indicar una breve descripción del requerimiento, mediante la denominación de la obra a ser diseñada y ejecutada',
    ),
    seccionFinalidadPublica(),
    seccionObjetivo(),
    seccionAntecedentes(
      'Describir el motivo por el cual se efectúa el requerimiento, mencionando y adjuntando los documentos fuente: estudio de preinversión o ficha técnica de inversiones, proyecto de inversión, IOARR u otros',
    ),

    {
      id: 'descripcion_general',
      titulo: 'DESCRIPCIÓN GENERAL DEL REQUERIMIENTO',
      bloques: [
        {
          clase: 'redactado',
          id: 'descripcion_general',
          etiqueta: 'Descripción general',
          instruccion:
            'Describir de manera general la contratación, indicando su alcance, ubicación, componentes —diseño y ejecución— y las prestaciones que asumirá el contratista',
          extension: 'varios_parrafos',
        },
      ],
    },

    {
      id: 'caracteristicas',
      titulo: 'CARACTERÍSTICAS Y CONDICIONES DEL SERVICIO A CONTRATAR',
      bloques: [],
      subsecciones: [
        {
          id: 'alcance',
          titulo: 'Alcance',
          bloques: [
            {
              clase: 'redactado',
              id: 'alcance',
              etiqueta: 'Alcance del diseño y la obra',
              instruccion:
                'Consignar la información relevante para la ejecución del diseño y la obra, incluyendo la del estudio de preinversión o la ficha técnica de inversiones. Describir los objetivos funcionales conforme al numeral 154.3 del artículo 154 del Reglamento, así como los requerimientos de rendimiento o desempeño de la obra',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'metas_fisicas',
          titulo: 'Metas físicas u objetivos funcionales',
          bloques: [
            {
              // La diferencia de fondo con Solo Construcción: aquí puede
              // no haber metas físicas cerradas, porque el diseño aún no
              // existe. Se define el desempeño esperado.
              clase: 'nota',
              texto:
                'Cuando el requerimiento no cuente con metas físicas definidas o se requiera complementarlas, se establecen objetivos funcionales que detallen el alcance de los resultados esperados, en línea con el numeral 46.4 del artículo 46 de la Ley. Los objetivos funcionales establecen los resultados esperados de la infraestructura en términos de desempeño y operación, sin limitarse a una solución de diseño específica.',
            },
            {
              clase: 'nota',
              texto:
                'La elaboración del expediente técnico debe guardar coherencia con los objetivos, alcances y parámetros que sustentaron la viabilidad o aprobación de las inversiones, y se ciñe al Subcapítulo 2 del Capítulo III del Título V del Reglamento. Si el diseño corresponde a un saldo de obra, debe considerar las condiciones de la infraestructura existente.',
            },
            {
              clase: 'redactado',
              id: 'metas_fisicas',
              etiqueta: 'Metas físicas u objetivos funcionales',
              instruccion:
                'Consignar las metas físicas del proyecto o, cuando no estén definidas, los objetivos funcionales en términos de desempeño y operación',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'disponibilidad_terreno',
          titulo: 'Disponibilidad física del terreno',
          bloques: [
            {
              clase: 'redactado',
              id: 'disponibilidad_terreno',
              etiqueta: 'Situación del terreno',
              instruccion:
                'Consignar la situación actual del proyecto de inversión, IOARR o actividad, el estado del Saneamiento Físico Legal (SFL) y la libre disponibilidad del área donde se desarrolla la obra',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'documentacion_perfeccionamiento',
          titulo: 'Documentos adicionales para el perfeccionamiento de contrato',
          condicion: 'exige_documentacion_contrato',
          bloques: [
            {
              clase: 'nota',
              texto:
                'La documentación debe ser objetiva, razonable y proporcional, y estar directamente vinculada con la naturaleza y alcance de la obra. No pueden solicitarse documentos que dupliquen información ya verificada durante el procedimiento de selección.',
            },
            {
              clase: 'tabla',
              id: 'documentacion_perfeccionamiento',
              etiqueta: 'Documentación para el perfeccionamiento',
              columnas: ['Tipo de obra', 'Documentación'],
              minimo: 1,
            },
          ],
        },
        {
          id: 'seguros',
          titulo: 'Seguros',
          bloques: [
            {
              clase: 'redactado',
              id: 'seguros',
              etiqueta: 'Seguros exigidos',
              instruccion:
                'Establecer los seguros necesarios para cubrir los riesgos de la ejecución (SCTR salud y pensiones, responsabilidad civil extracontractual, Todo Riesgo Construcción), sus montos mínimos de cobertura, deducibles, vigencia y oportunidad de presentación',
              extension: 'varios_parrafos',
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
                'Precisar los requerimientos BIM u otras metodologías: niveles de información, estándares, protocolos, formatos de intercambio, responsabilidades y condiciones del Entorno Común de Datos (CDE). Si no se prevé, consignar "NO APLICA"',
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
                'Establecer los estándares de calidad aplicables al diseño y a la construcción, los procedimientos de aseguramiento y control, y los criterios de aceptación',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'plan_contingencia',
          titulo: 'Plan de contingencia',
          condicion: 'requiere_plan_contingencia',
          bloques: [
            {
              clase: 'redactado',
              id: 'plan_contingencia',
              etiqueta: 'Plan de contingencia',
              instruccion:
                'Precisar las medidas para garantizar la continuidad de los servicios públicos, la seguridad de las personas y la protección de los bienes durante la ejecución',
              ejemplo:
                'Aulas temporales debidamente equipadas.\nServicios higiénicos provisionales.\nSistemas temporales de energía eléctrica y abastecimiento de agua.',
              extension: 'lista',
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
                'Establecer el contenido mínimo del Plan de Trabajo, el plazo y medio de presentación y el plazo para su revisión y aprobación',
              ejemplo:
                'Objetivos y alcance del proyecto.\nCronograma general y cronogramas detallados de diseño y ejecución de obra.\nProgramación de hitos contractuales y entregables.\nRelación del personal clave y principales responsabilidades.\nProgramación de recursos, equipos y maquinaria.\nPlan de aseguramiento y control de calidad.\nIdentificación de riesgos y medidas de mitigación.\nPlan de seguridad y salud en el trabajo.\nEstrategia de gestión ambiental, de corresponder.\nMecanismos de coordinación y comunicación con la Entidad y la supervisión.',
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
                'Incorporar los anexos necesarios: objetivos funcionales y requerimientos de desempeño, levantamientos de información y estudios complementarios, condiciones técnicas mínimas para el diseño y construcción, requerimientos de equipamiento y mobiliario, condiciones del plan de contingencia y estándares de calidad con sus criterios de aceptación',
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
                'Consignar la modalidad determinada en la estrategia de contratación, de conformidad con el artículo 161 del Reglamento',
              opciones: [
                {
                  valor: 'suma_alzada',
                  texto:
                    'El contrato se rige por la modalidad de Suma Alzada, de conformidad con el artículo 161 del Reglamento. Es aplicable cuando las cantidades, magnitudes y calidades de la prestación están definidas en el requerimiento.',
                },
                {
                  valor: 'precios_unitarios',
                  texto:
                    'El contrato se rige por la modalidad de Precios Unitarios, de conformidad con el artículo 161 del Reglamento. Es aplicable cuando no puede conocerse con exactitud o precisión las cantidades o magnitudes requeridas.',
                },
                {
                  valor: 'esquema_mixto',
                  texto:
                    'El contrato se rige por un Esquema mixto, de conformidad con el artículo 161 del Reglamento. Para obras se precisa en el listado de actividades la modalidad de pago usada para cada especialidad, sección o componente del proyecto.',
                },
                {
                  valor: 'costo_reembolsable',
                  texto:
                    'El contrato se rige por la modalidad de Costo reembolsable, de conformidad con el artículo 161 del Reglamento. Es aplicable cuando la entidad contratante requiere reembolsar al contratista los costos reales en que incurre durante la ejecución del contrato.',
                },
              ],
            },
          ],
        },
        {
          id: 'sistema_entrega',
          titulo: 'Sistema de entrega',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'El contrato se rige por el Sistema de Entrega de Diseño y Construcción, de conformidad con los artículos 158 y 160 del Reglamento.',
              fundamento: 'Reglamento, arts. 158 y 160',
            },
            {
              clase: 'fijo',
              texto:
                'Bajo este sistema, el contratista es responsable tanto de la elaboración del expediente técnico como de la ejecución física de la obra, asumiendo la gestión integral de ambos componentes hasta el cumplimiento de las condiciones establecidas en el contrato.',
            },
          ],
        },
        {
          id: 'consideraciones_expediente',
          titulo: 'Consideraciones para la elaboración del expediente técnico',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Responsabilidad integral: el contratista es el responsable exclusivo de la elaboración del expediente técnico, que debe guardar estricta coherencia con los objetivos funcionales, alcances y parámetros que sustentaron la viabilidad o aprobación de la inversión. El diseño se ciñe al Subcapítulo 2 del Capítulo III del Título V del Reglamento (artículos 170 al 175).',
            },
            {
              clase: 'nota',
              texto:
                'Eficiencia y sostenibilidad: la elaboración del expediente técnico debe incluir OBLIGATORIAMENTE un análisis del proceso constructivo que contemple criterios de eficiencia constructiva y prácticas de sostenibilidad.',
            },
            {
              // Regla económica que no existe en ningún otro formato.
              clase: 'nota',
              texto:
                'Flexibilidad presupuestal: el expediente técnico puede ser aprobado con un presupuesto de obra que represente un incremento de hasta el cincuenta por ciento (50%) del monto considerado en el contrato original respecto a dicho componente, siempre que la Entidad cuente con la previsión presupuestal. Este incremento NO califica como prestación adicional.',
            },
            {
              clase: 'nota',
              texto:
                'Metodología Fast Track: de haberse establecido en la estrategia de contratación, el diseño puede ejecutarse mediante ejecución rápida, permitiendo la elaboración del expediente técnico en paralelo a la ejecución de la obra mediante entregables parciales.',
            },
            {
              clase: 'redactado',
              id: 'consideraciones_expediente',
              etiqueta: 'Indicaciones para el expediente técnico',
              instruccion:
                'Consignar las indicaciones y consideraciones necesarias para la elaboración del expediente técnico',
              extension: 'lista',
            },
          ],
        },
        {
          id: 'avances',
          titulo: 'Avances',
          condicion: 'exige_informes_avance',
          bloques: [
            {
              clase: 'redactado',
              id: 'avances',
              etiqueta: 'Informes de avance',
              instruccion:
                'Consignar si el contratista debe remitir informes de avance, con qué frecuencia y con qué contenido mínimo',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'subcontratacion',
          titulo: 'Subcontratación',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'El contratista puede subcontratar hasta un máximo del 40% del monto del contrato vigente de conformidad con lo dispuesto en el artículo 108 del Reglamento.',
              fundamento: 'Reglamento, art. 108',
            },
            {
              clase: 'fijo',
              texto:
                'No se considera subcontratación la adquisición de bienes o materiales, aun cuando dicha adquisición incluya actividades complementarias como el transporte y la colocación. El contratista mantiene la responsabilidad por la ejecución total del contrato frente a la entidad contratante.',
            },
          ],
        },
        {
          id: 'plazos',
          titulo: 'Plazo de prestación',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'El inicio del plazo de elaboración del Expediente Técnico se cuenta desde el día siguiente de cumplidas las condiciones establecidas en el numeral 176.2 del artículo 176 del Reglamento.',
              fundamento: 'Reglamento, art. 176.2',
            },
            {
              clase: 'tabla',
              id: 'plazo_ejecucion',
              etiqueta: 'Plazo de ejecución total',
              instruccion:
                'Detallar los días calendario de la elaboración del expediente técnico y de la ejecución de obra (edificación o infraestructura, mobiliario, equipamiento, plan de contingencia) y de la puesta en servicio',
              columnas: ['Obligaciones', 'Detalle', 'Días calendario'],
              minimo: 1,
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
                'De acuerdo con lo establecido en el numeral 192.2 del artículo 192 del Reglamento, cuando este no establezca un plazo específico para la respuesta de las partes durante la ejecución contractual, se aplica el plazo máximo de respuesta establecido en el cuadro siguiente:',
              fundamento: 'Reglamento, art. 192.2',
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
                'Antes del vencimiento de este plazo, las partes pueden acordar su prórroga para cada caso específico considerando la cláusula de notificaciones del contrato.',
            },
          ],
        },
        {
          id: 'entregables',
          titulo: 'Entregables',
          bloques: [],
          subsecciones: [
            {
              id: 'entregables_diseno',
              titulo: 'Entregables del componente diseño',
              bloques: [
                {
                  clase: 'tabla',
                  id: 'entregables_diseno',
                  etiqueta: 'Entregables del diseño',
                  instruccion:
                    'Precisar la denominación, el plazo de presentación, el contenido mínimo y el medio de presentación de cada entregable del expediente técnico',
                  columnas: ['N°', 'Entregable', 'Plazo', 'Contenido'],
                  minimo: 1,
                },
              ],
            },
            {
              id: 'entregables_obra',
              titulo: 'Entregables del componente ejecución de obra',
              bloques: [
                {
                  clase: 'tabla',
                  id: 'entregables_obra',
                  etiqueta: 'Entregables de la obra',
                  instruccion:
                    'Precisar la denominación, el plazo de presentación, el contenido mínimo y el medio de presentación de cada entregable de la ejecución',
                  columnas: ['N°', 'Entregable', 'Plazo', 'Contenido'],
                  minimo: 1,
                },
              ],
            },
          ],
        },
        {
          id: 'adelantos',
          titulo: 'Adelantos',
          condicion: 'otorga_adelanto',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Si la entidad ha previsto la entrega de adelantos debe regular el procedimiento conforme a los artículos 178, 179 y 181 del Reglamento. Caso contrario, consignar "NO APLICA".',
            },
            {
              clase: 'tabla',
              id: 'adelantos',
              etiqueta: 'Adelantos previstos',
              instruccion:
                'Detallar cada adelanto (directo; para materiales e insumos, equipamiento y mobiliario; por avance) con su porcentaje respecto del monto de la obra del contrato original y el plazo de entrega',
              columnas: ['Tipo de adelanto', 'Porcentaje', 'Plazo de entrega'],
              minimo: 1,
            },
            {
              clase: 'fijo',
              texto:
                'Los porcentajes máximos de los adelantos y los plazos de entrega se encuentran establecidos en el numeral 178.3 del artículo 178 y en el artículo 179 del Reglamento, respectivamente. Vencido el plazo para solicitar el adelanto la solicitud se tiene por no presentada.',
              fundamento: 'Reglamento, arts. 178.3 y 179',
            },
            {
              clase: 'fijo',
              texto:
                'De acuerdo con lo señalado en el numeral 178.5 del artículo 178 del Reglamento, el contratista solicita el adelanto a la supervisión en cuanto exista un avance físico real de 60% en la obra y siempre que dicho avance sea igual o mayor al avance físico programado.',
              fundamento: 'Reglamento, art. 178.5',
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
                'La aplicación de incentivos es facultativa y procede únicamente cuando haya sido prevista y sustentada en la estrategia de contratación, conforme al artículo 162 del Reglamento. Deben ser objetivos, verificables, razonables y estar directamente vinculados al cumplimiento eficiente de las obligaciones. Si no se prevén, consignar "NO APLICA".',
            },
            {
              clase: 'redactado',
              id: 'incentivos',
              etiqueta: 'Incentivos',
              instruccion:
                'Precisar los incentivos previstos —por cumplimiento anticipado de la culminación y por incorporación de excelencia en estándares ambientales y de seguridad—, los indicadores iniciales de referencia, el porcentaje de bonificación y la forma de acreditación y otorgamiento',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'reajuste',
          titulo: 'Fórmulas de reajuste',
          bloques: [
            {
              clase: 'redactado',
              id: 'reajuste',
              etiqueta: 'Fórmulas de reajuste',
              instruccion:
                'Indicar el documento o anexo que contiene las fórmulas polinómicas y/o monómicas, conforme al artículo 209 del Reglamento',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'herramientas_estimacion',
          titulo: 'Herramientas para estimación de cantidades y costos',
          condicion: 'usa_herramientas_estimacion',
          bloques: [
            {
              clase: 'nota',
              texto:
                'De aplicación OBLIGATORIA cuando la contratación contemple la ejecución rápida (Fast Track), conforme al numeral 204.3 del artículo 204 del Reglamento. En los demás casos su incorporación es facultativa y debe sustentarse en la estrategia de contratación.',
            },
            {
              clase: 'fijo',
              texto:
                'El contratista deberá presentar, conjuntamente con cada entregable del componente de diseño o con la periodicidad que establezca la Entidad, la actualización de las cantidades, metrados, costos directos, gastos generales y presupuesto del proyecto, empleando herramientas que permitan mantener información confiable, trazable y actualizada respecto de la evolución del diseño y su impacto económico.',
              fundamento: 'Reglamento, art. 204.3',
            },
            {
              clase: 'redactado',
              id: 'herramientas_estimacion',
              etiqueta: 'Herramientas exigidas',
              instruccion:
                'Precisar las herramientas a emplear: modelado de información de la construcción (BIM) para obtención y actualización de cantidades, software de metrados y presupuestos, bases de datos de costos referenciales y análisis de precios unitarios, y herramientas de estimación paramétrica',
              extension: 'lista',
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
              bloques: [{ clase: 'fijo', texto: PENALIDAD_MORA, fundamento: 'Reglamento, art. 120' }],
            },
            {
              id: 'otras_penalidades',
              titulo: 'Otras penalidades',
              bloques: [
                { clase: 'nota', texto: NOTA_PENALIDADES_CRITERIOS },
                {
                  clase: 'fijo',
                  texto: 'Adicionalmente a la penalidad por mora, se aplicarán las siguientes penalidades:',
                },
                {
                  clase: 'tabla',
                  id: 'otras_penalidades',
                  etiqueta: 'Otras penalidades',
                  instruccion:
                    'Incluir como mínimo la sustitución de un mismo integrante del plantel técnico a partir de la segunda vez (numeral 189.3 del artículo 189 del Reglamento)',
                  columnas: [
                    'N°',
                    'Supuestos de aplicación de penalidad',
                    'Forma de cálculo',
                    'Procedimiento y medios de verificación',
                  ],
                  minimo: 1,
                },
                {
                  clase: 'fijo',
                  texto:
                    'La suma de la aplicación de las penalidades por mora y otras penalidades no debe exceder el 10% del monto vigente del contrato o, de ser el caso, del componente o ítem correspondiente.',
                  fundamento: 'Plantilla — tope de penalidades en obras',
                },
                {
                  clase: 'redactado',
                  id: 'procedimiento_penalidades',
                  etiqueta: 'Procedimiento de notificación y descargos',
                  instruccion:
                    'Señalar el plazo y forma en que se notifica al contratista el supuesto incurrido para que remita sus descargos, y el plazo en que la entidad evalúa dicho descargo y emite una decisión',
                  ejemplo: EJEMPLO_PROCEDIMIENTO_PENALIDADES,
                  extension: 'varios_parrafos',
                },
              ],
            },
          ],
        },
        {
          id: 'limite_indemnizacion',
          titulo: 'Límites para la indemnización',
          condicion: 'tiene_limite_indemnizacion',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Solo procede cuando el monto del contrato original es igual o superior a S/ 50 000 000,00 o se trata de un contrato estandarizado de ingeniería y construcción de uso internacional. El porcentaje no puede ser inferior al 20% del valor actualizado del contrato. Si no se cumplen esas condiciones, consignar "NO APLICA".',
            },
            {
              clase: 'campo',
              id: 'limite_indemnizacion',
              etiqueta: 'Límite máximo de indemnización',
              ayuda: 'Consignar porcentaje del monto del contrato original (no inferior al 20%)',
              tipo: 'numero',
              obligatorio: true,
            },
          ],
        },
        {
          id: 'recepcion',
          titulo: 'Recepción de la obra',
          bloques: [
            {
              clase: 'fijo',
              texto: 'La recepción de obra se sujeta a las condiciones establecidas en el artículo 212 del Reglamento.',
              fundamento: 'Reglamento, art. 212',
            },
            {
              clase: 'redactado',
              id: 'recepcion_parcial',
              etiqueta: 'Recepciones parciales',
              instruccion:
                'De haberse previsto en la estrategia de contratación, especificar si se requieren recepciones parciales, sus plazos y las secciones terminadas que se reciben',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'controversias',
          titulo: 'Solución de controversias desde el perfeccionamiento del contrato',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'Las controversias que surjan entre las partes durante la ejecución del contrato se resuelven mediante conciliación, cuando se haya pactado, y arbitraje.',
              fundamento: 'Plantilla — controversias',
            },
            {
              clase: 'tabla',
              id: 'instituciones_arbitrales',
              etiqueta: 'Instituciones arbitrales',
              instruccion:
                'Señalar en orden alfabético el listado de TRES Instituciones Arbitrales propuestas por la entidad contratante',
              columnas: ['N.º', 'Instituciones Arbitrales', 'RUC'],
              minimo: 3,
            },
            {
              clase: 'nota',
              texto:
                'La entidad contempla la JPRD OBLIGATORIAMENTE si el monto contractual es igual o mayor a S/ 10 000 000,00 y facultativamente si es igual o mayor a S/ 5 000 000,00. En ese caso debe proponerse el listado de tres Centros de Administración de JPRD, en orden alfabético.',
            },
            {
              clase: 'tabla',
              id: 'centros_jprd',
              etiqueta: 'Centros de administración de JPRD',
              columnas: ['N.º', 'Centros de Administración de JPRD', 'RUC'],
              minimo: 0,
            },
          ],
        },
        {
          id: 'liquidacion',
          titulo: 'Liquidación del contrato',
          bloques: [
            {
              clase: 'fijo',
              // Dos artículos, no uno: aquí se liquidan dos componentes.
              texto:
                'La liquidación se sujeta a los artículos 213 y 215 del Reglamento. El contenido mínimo de la liquidación es el siguiente:',
              fundamento: 'Reglamento, arts. 213 y 215',
            },
            {
              clase: 'redactado',
              id: 'liquidacion_diseno',
              etiqueta: 'Componente Diseño (elaboración del expediente técnico)',
              instruccion: 'Consignar los documentos a presentar para la liquidación del componente diseño',
              extension: 'lista',
            },
            {
              clase: 'redactado',
              id: 'liquidacion_obra',
              etiqueta: 'Componente Ejecución de Obra',
              instruccion: 'Consignar los documentos a presentar para la liquidación del componente ejecución',
              extension: 'lista',
            },
          ],
        },
        {
          // Añadido por César el 16/08/2026. Los DOS plazos son la
          // consecuencia directa de que aquí el contratista también
          // diseña.
          id: 'vicios_ocultos',
          titulo: 'Responsabilidad por vicios ocultos',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'La recepción conforme de la obra otorgada por la Entidad no enerva su derecho a reclamar posteriormente por errores, deficiencias o vicios ocultos, de conformidad con lo establecido en los literales b) y d) del numeral 69.2 del artículo 69 de la Ley N° 32069 y el artículo 216 de su Reglamento.',
              fundamento: 'Ley N° 32069, art. 69.2.b y d; Reglamento, art. 216',
            },
            {
              clase: 'parrafo',
              texto:
                'El plazo de responsabilidad del contratista por los vicios ocultos de la obra ejecutada es de {{vicios_ocultos_plazo}}, contado a partir de la recepción de la obra. Asimismo, el contratista es responsable por los errores o deficiencias en el expediente técnico elaborado, los cuales pueden ser reclamados por la Entidad en un plazo no menor de tres (3) años después de la conformidad de la obra. Durante estos periodos, el contratista es responsable por la integridad técnica del diseño y la calidad de la construcción ofrecida.',
              campos: [
                {
                  clase: 'campo',
                  id: 'vicios_ocultos_plazo',
                  etiqueta: 'Plazo de responsabilidad por vicios ocultos de la obra',
                  ayuda: 'Consignar el tiempo, no menor de siete (7) años',
                  tipo: 'texto',
                  obligatorio: true,
                  validacion: 'vicios_ocultos_min',
                },
              ],
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
          id: 'responsabilidades_entidad',
          titulo: 'Responsabilidades de la entidad contratante',
          bloques: [
            {
              clase: 'redactado',
              id: 'responsabilidades_entidad',
              etiqueta: 'Responsabilidades de la Entidad',
              instruccion:
                'Establecer las responsabilidades de la Entidad: disponibilidad física del terreno, entrega de la información de preinversión, ejecución del plan de licencias y permisos a su cargo, designación del Coordinador de Obra, gestión de los riesgos que le corresponden, aprobación del expediente técnico, tramitación de valorizaciones y pagos, designación del Comité de Recepción y monitoreo a través de la DEC',
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
              clase: 'redactado',
              id: 'conformidad_detalle',
              etiqueta: 'Verificaciones para la conformidad',
              instruccion:
                'Precisar cómo se verifica el cumplimiento de cada componente: para el diseño, la revisión y aprobación del expediente técnico; para la obra, la aprobación de valorizaciones, inspecciones, pruebas y recepción',
              extension: 'varios_parrafos',
            },
          ],
        },
        {
          id: 'forma_pago',
          titulo: 'Forma y requisitos de pago',
          bloques: [
            {
              clase: 'redactado',
              id: 'forma_pago',
              etiqueta: 'Forma y requisitos de pago',
              instruccion:
                'Precisar el periodo de valorización, la forma de cálculo, el contenido mínimo de las valorizaciones y el plazo para el pago del saldo de la liquidación, distinguiendo el componente diseño del componente obra',
              extension: 'varios_parrafos',
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
            },
          ],
        },
        {
          id: 'responsabilidades_contratista',
          titulo: 'Responsabilidades del contratista',
          bloques: [
            {
              clase: 'redactado',
              id: 'responsabilidades_contratista',
              etiqueta: 'Responsabilidades y recursos del contratista',
              instruccion:
                'Establecer los recursos humanos, equipos, maquinaria, software especializado, licencias, metodologías colaborativas y demás medios que el contratista debe proporcionar para ambos componentes, así como sus obligaciones',
              ejemplo:
                'Gestionar oportunamente los riesgos derivados de modificaciones, incompatibilidades o cambios de diseño que puedan afectar la ejecución de la obra.\nCoordinar permanentemente con la Entidad, la supervisión y demás actores involucrados.\nRegistrar diariamente los hechos relevantes y formular consultas técnicas a través del Cuaderno de Incidencias digital.\nPresentar oportunamente las valorizaciones con el sustento de metrados, certificados de calidad y protocolos de prueba.\nResponder por la integridad técnica del expediente técnico que elabora y por la calidad de la construcción.',
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
                'La Entidad debe verificar previamente si existe ficha de homologación aplicable. El personal clave debe cubrir ambos componentes: la elaboración del expediente técnico y la ejecución de la obra. La colegiatura y habilitación se acreditan para el inicio de la participación efectiva del profesional, tanto para titulados en el Perú como en el extranjero.',
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
          id: 'equipamiento_no_estrategico',
          titulo: 'Equipamiento no estratégico',
          condicion: 'exige_equipamiento',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'No corresponde solicitar como equipamiento que el postor cuente con oficinas, locales u otros espacios físicos. Asimismo, no se puede requerir características, años de antigüedad y demás condiciones del equipamiento que no consten en el expediente técnico o estructura de costos.',
              fundamento: 'Plantilla — prohibición expresa',
            },
            {
              clase: 'tabla',
              id: 'equipamiento_no_estrategico',
              etiqueta: 'Equipamiento no estratégico',
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
                'La especialidad de la obra la determina la entidad conforme al artículo 157 del Reglamento y el listado aprobado mediante Resolución Directoral N° 0016-2025-EF/54.01. No pueden consignarse subespecialidades "afines" ni tipologías específicas.',
            },
            {
              // Dos experiencias distintas, cada una contra la cuantía de
              // su propio componente. Es la consecuencia de contratar
              // diseño y obra en un solo contrato.
              clase: 'parrafo',
              texto:
                'El postor debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto}}, en la ejecución de obras en la especialidad y las subespecialidades correspondientes durante los veinticinco años anteriores a la fecha de la presentación de ofertas, que se computan desde la suscripción del acta de recepción de obra.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto',
                  etiqueta: 'Experiencia exigida en ejecución de obras',
                  ayuda:
                    'Consignar el monto de facturación expresado en números y letras en la moneda de la convocatoria, monto que no puede ser mayor a una vez la cuantía del componente de ejecución de obra del procedimiento de selección o del ítem correspondiente',
                  tipo: 'moneda',
                  obligatorio: true,
                  validacion: 'experiencia_max',
                },
              ],
            },
            {
              clase: 'parrafo',
              texto:
                'Asimismo, debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto_diseno}}, en la ejecución de consultoría de obras de la especialidad y las subespecialidades, durante los veinticinco años anteriores a la fecha de la presentación de ofertas, que se computan desde la conformidad de la prestación.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto_diseno',
                  etiqueta: 'Experiencia exigida en consultoría de obras',
                  ayuda:
                    'Consignar el monto de facturación expresado en números y letras en la moneda de la convocatoria, monto que no es mayor a una vez la cuantía del componente diseño del procedimiento de selección o del ítem',
                  tipo: 'moneda',
                  obligatorio: true,
                },
              ],
            },
            { clase: 'fijo', texto: 'Se considera la siguiente especialidad y subespecialidades como experiencia del postor:' },
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
                'La experiencia del postor en la especialidad se acredita con copia simple de: (i) contratos y sus respectivas actas de recepción de obra; (ii) contratos y sus respectivas resoluciones de liquidación; o (iii) contratos y sus respectivas constancias de prestación o cualquier otra documentación de la cual se desprenda fehacientemente que la obra fue concluida, así como el monto total que implicó su ejecución; correspondientes a un máximo de veinte (20) contrataciones.',
              fundamento: 'Plantilla — acreditación de experiencia, texto invariable',
            },
            {
              clase: 'fijo',
              texto:
                'En caso el postor sustente su experiencia en la especialidad mediante contrataciones realizadas con privados, para acreditarla debe presentar de forma obligatoria comprobantes de pago cuya cancelación se acredite documental y fehacientemente con constancia de depósito, nota de abono, reporte de estado de cuenta, cualquier otro documento emitido por entidad del sistema financiero que acredite el abono o mediante cancelación en el mismo comprobante de pago, o comprobante de retención electrónico emitido por SUNAT por la retención del IGV. No es posible que acredite su experiencia únicamente con la presentación de contratos u órdenes de compra con conformidad o constancia de prestación o valorizaciones.',
            },
            {
              clase: 'fijo',
              texto:
                'Los postores deben llenar y presentar el Anexo N° 11 referido a la Experiencia del Postor en la Especialidad.',
            },
            { clase: 'fijo', texto: EXPERIENCIA_TITULAR },
            {
              clase: 'fijo',
              texto:
                'Si el postor acredita experiencia de otra persona jurídica como consecuencia de una reorganización societaria, debe presentar adicionalmente el Anexo N° 15. Las personas jurídicas resultantes de un proceso de reorganización societaria no pueden acreditar como experiencia del postor en la especialidad que le hubiesen transmitido como parte de dicha reorganización las personas jurídicas sancionadas con inhabilitación vigente o definitiva.',
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
                'La entidad debe verificar si existe ficha de homologación del sector que establezca la experiencia del personal clave. Como requisito de calificación solo puede consignarse "grado de bachiller" o "título profesional".',
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
              instruccion:
                'El tiempo de experiencia mínimo debe ser razonable y congruente con el periodo en el que el personal ejecuta las actividades y con la cuantía de la contratación',
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
              clase: 'nota',
              texto:
                'Consignar el equipamiento requerido para elaborar el expediente técnico y para ejecutar la obra, según la especialidad y subespecialidad del proyecto.',
            },
            {
              clase: 'fijo',
              texto:
                'No corresponde solicitar como equipamiento que el postor cuente con oficinas, locales u otros espacios físicos. Asimismo, no se puede requerir características, años de antigüedad y demás condiciones del equipamiento que no consten en el expediente técnico o estructura de costos.',
              fundamento: 'Plantilla — prohibición expresa',
            },
            {
              clase: 'tabla',
              id: 'equipamiento_diseno',
              etiqueta: 'Equipamiento estratégico — componente Diseño',
              columnas: ['Equipamiento estratégico', 'Cant.', 'Características mínimas del equipamiento'],
              minimo: 1,
            },
            {
              clase: 'tabla',
              id: 'equipamiento_construccion',
              etiqueta: 'Equipamiento estratégico — componente Construcción',
              columnas: ['Equipamiento estratégico', 'Cant.', 'Características mínimas del equipamiento'],
              minimo: 1,
            },
            {
              clase: 'fijo',
              texto:
                'Copia simple de los documentos que sustenten la propiedad, la posesión, el compromiso de compraventa o alquiler, u otro documento que acredite que la maquinaria y/o equipamiento estará disponible para la ejecución del proyecto.',
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
            {
              clase: 'parrafo',
              texto:
                'El porcentaje mínimo de participación en la ejecución del contrato, para el integrante del consorcio que acredite mayor experiencia, es de {{consorcio_pct_experiencia}}.',
              campos: [
                {
                  clase: 'campo',
                  id: 'consorcio_pct_experiencia',
                  etiqueta: 'Participación mínima del consorciado con mayor experiencia',
                  ayuda:
                    'Consignar el porcentaje mínimo de participación en las obligaciones del integrante del consorcio que acredite la mayor experiencia',
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
