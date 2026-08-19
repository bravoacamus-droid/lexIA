/**
 * Plantilla: REQUERIMIENTO — EJECUCIÓN DE OBRAS CON SISTEMA DE ENTREGA
 * DE SOLO CONSTRUCCIÓN
 *
 * Transcripción de "PROCEDIMIENTOS DE SELECCIÓN/4. EJECUCIÓN DE OBRAS/
 * 2. Ejecución de obras - Solo construcción.docx".
 *
 * VERSIÓN CORREGIDA POR CÉSAR EL 16/08/2026
 *
 * La primera versión tenía dos problemas que la auditoría destapó y que
 * César corrigió al señalárselos:
 *
 *  · El apartado "Sistema de entrega" describía Diseño y Construcción
 *    —decía que el contratista elabora el expediente técnico— y
 *    contradecía al resto del documento. Ahora dice que se contrata
 *    únicamente la ejecución física y que la Entidad responde por los
 *    errores del expediente que entrega.
 *  · Faltaban la responsabilidad por vicios ocultos y la cláusula
 *    antisoborno, presentes en el resto de formatos. Ya están.
 *
 * RASGOS PROPIOS DE OBRAS: tres tipos de adelanto (directo, para
 * materiales, por avance), incentivos —uno de ellos OBLIGATORIO en este
 * sistema: el de cumplimiento anticipado—, límite de indemnización a
 * partir de S/ 50 000 000, JPRD obligatoria sobre S/ 10 000 000, RNP
 * como ejecutor de obras, responsabilidad por vicios ocultos de no menos
 * de SIETE años, y experiencia acreditada por actas de recepción de obra
 * durante veinticinco años.
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
  VALIDACION_EXPERIENCIA_CONSULTORIA,
  VALIDACION_PENALIDADES,
} from './comunes';

export const PLANTILLA_OBRAS_SOLO_CONSTRUCCION: PlantillaRequerimiento = {
  id: 'ps-obras-solo-construccion',
  familia: 'procedimiento_seleccion',
  objeto: 'obras',
  encabezado: 'REQUERIMIENTO',
  subtitulo: 'EJECUCIÓN DE OBRAS CON SISTEMA DE ENTREGA DE SOLO CONSTRUCCIÓN',
  origen:
    'PROCEDIMIENTOS DE SELECCIÓN/4. EJECUCIÓN DE OBRAS/2. Ejecución de obras - Solo construcción.docx',

  validaciones: [
    VALIDACION_EXPERIENCIA_CONSULTORIA,
    VALIDACION_PENALIDADES,
    {
      id: 'indemnizacion_min',
      descripcion:
        'El límite de indemnización solo procede si el contrato original es igual o superior a S/ 50 000 000,00 o se trata de un contrato estandarizado de ingeniería y construcción de uso internacional, y no puede ser inferior al 20% del valor actualizado del contrato.',
      fundamento: 'Ley N° 32069, art. 69.2.f; Reglamento, art. 216.3',
    },
    {
      id: 'vicios_ocultos_min',
      descripcion:
        'En obras, el plazo de responsabilidad del contratista por vicios ocultos no puede ser menor de siete (7) años contados desde la recepción.',
      fundamento: 'Ley N° 32069, art. 69',
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
      'Indicar una breve descripción del requerimiento, mediante la denominación de la obra a ser ejecutada',
    ),
    seccionFinalidadPublica(),
    seccionObjetivo(),
    seccionAntecedentes(
      'Describir el motivo por el cual se efectúa el requerimiento de ejecución de obra, mencionando y adjuntando los documentos fuente: proyecto de inversión, IOARR, expediente técnico aprobado, estudios de preinversión u otros',
    ),

    {
      id: 'descripcion_general',
      titulo: 'DESCRIPCIÓN GENERAL DEL REQUERIMIENTO',
      bloques: [
        {
          clase: 'redactado',
          id: 'descripcion_general',
          etiqueta: 'Descripción general de la obra',
          instruccion:
            'Describir de manera general la obra objeto de la contratación, indicando su alcance, ubicación, componentes y las prestaciones que ejecutará el contratista',
          extension: 'varios_parrafos',
        },
      ],
    },

    {
      id: 'caracteristicas',
      titulo: 'CARACTERÍSTICAS Y CONDICIONES A CONTRATAR',
      bloques: [],
      subsecciones: [
        {
          id: 'metas_fisicas',
          titulo: 'Metas físicas',
          bloques: [
            { clase: 'fijo', texto: 'La contratación por ejecutar tiene como metas físicas las siguientes:' },
            {
              clase: 'redactado',
              id: 'metas_fisicas',
              etiqueta: 'Metas físicas',
              instruccion: 'Consignar las metas físicas de la obra',
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
                'Consignar la situación actual del proyecto de inversión, IOARR o actividad, el estado del Saneamiento Físico Legal (SFL) y la libre disponibilidad del área donde se desarrolla la obra. Para algunas tipologías de proyectos puede no ser necesario el SFL',
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
                'La documentación requerida debe ser objetiva, razonable y proporcional, y estar directamente vinculada con la naturaleza y alcance de la obra. No pueden solicitarse documentos que dupliquen información ya verificada durante el procedimiento de selección, salvo que resulten necesarios para el inicio de la ejecución contractual.',
            },
            {
              clase: 'tabla',
              id: 'documentacion_perfeccionamiento',
              etiqueta: 'Documentación para el perfeccionamiento',
              columnas: ['N.°', 'Documentación'],
              minimo: 1,
            },
          ],
        },
        {
          id: 'seguros',
          titulo: 'Seguros',
          bloques: [
            {
              clase: 'nota',
              texto:
                'Los seguros deben mantenerse vigentes durante el período que corresponda según su cobertura, siendo responsabilidad del contratista acreditar su contratación, renovación y vigencia. Las pólizas se presentan antes del inicio efectivo de la ejecución o dentro del plazo que fije la Entidad.',
            },
            {
              clase: 'fijo',
              texto:
                'Seguro Complementario de Trabajo de Riesgo (SCTR Salud y SCTR Pensiones) para el personal que participe en la ejecución de la obra.\nSeguro de Responsabilidad Civil Extracontractual que cubra daños personales y materiales ocasionados a terceros.\nSeguro Todo Riesgo Construcción (CAR), cuando corresponda por la naturaleza y magnitud de la obra.',
              fundamento: 'Plantilla — seguros mínimos en obras',
            },
            {
              clase: 'redactado',
              id: 'seguros',
              etiqueta: 'Condiciones de los seguros',
              instruccion:
                'Establecer los montos mínimos de cobertura, deducibles, condiciones particulares y demás requisitos aplicables a cada seguro',
              extension: 'parrafo',
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
                'Consignar si el contratista debe remitir informes de avance y con qué frecuencia (semanal, quincenal u otra razonable con la duración del proyecto), y el contenido mínimo de la presentación',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'metodologias_colaborativas',
          titulo: 'Empleo de metodologías colaborativas',
          condicion: 'usa_metodologias_colaborativas',
          bloques: [
            {
              clase: 'nota',
              texto:
                'La aplicación de metodologías colaborativas en obras bajo Solo Construcción es FACULTATIVA, salvo que una norma específica la haga obligatoria para la tipología de inversión. Si la Entidad exige BIM debe incorporar en los anexos técnicos los requisitos BIM, los usos BIM, el Plan de Ejecución BIM (BEP), los requisitos de información y las condiciones del Entorno de Datos Comunes (CDE). Si no se prevé, consignar "NO APLICA".',
            },
            {
              clase: 'fijo',
              texto:
                'Cuando la Entidad determine la aplicación de la metodología Building Information Modeling (BIM), el contratista deberá cumplir con los requerimientos establecidos en los documentos contractuales, la Guía Nacional BIM y demás disposiciones aplicables. En dicho supuesto, será obligatorio contar con un Entorno de Datos Comunes (CDE) operativo, accesible y actualizado, que permita la gestión, almacenamiento, intercambio y trazabilidad de la información del proyecto durante la ejecución de la obra.',
              fundamento: 'Guía Nacional BIM',
            },
          ],
        },
        {
          id: 'gestion_calidad',
          titulo: 'Gestión de la calidad',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'La ejecución de la obra deberá desarrollarse conforme a los estándares de calidad establecidos en el expediente técnico, las especificaciones técnicas, las normas técnicas nacionales e internacionales aplicables, el Reglamento Nacional de Edificaciones (RNE), las disposiciones sectoriales correspondientes y demás normativa vigente relacionada con el objeto de la contratación.',
              fundamento: 'Plantilla — gestión de la calidad',
            },
            {
              clase: 'fijo',
              texto:
                'El contratista es responsable de implementar, mantener y controlar los procedimientos necesarios para garantizar la calidad de los materiales, equipos, procesos constructivos y trabajos ejecutados durante toda la ejecución de la obra, asegurando el cumplimiento de los requisitos técnicos y funcionales previstos en el expediente técnico aprobado.',
            },
            {
              clase: 'fijo',
              texto:
                'La gestión de la calidad comprenderá como mínimo la planificación, aseguramiento, control y mejora de los procesos constructivos, así como la identificación y corrección oportuna de no conformidades que puedan afectar la calidad, seguridad, funcionalidad o vida útil de la infraestructura.',
            },
            {
              clase: 'nota',
              texto:
                'Si el expediente técnico ya contiene un Plan de Aseguramiento de la Calidad (PAC) o procedimientos específicos de control de calidad, basta con hacer referencia expresa a dichos documentos para evitar duplicidades. Si la Entidad no previó criterios específicos en la estrategia de contratación, consignar "NO APLICA".',
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
                'Precisar las medidas técnicas, operativas y administrativas para garantizar la continuidad de los servicios públicos, la seguridad de las personas, la protección de los bienes y la adecuada ejecución de la obra: continuidad de servicios, reubicación temporal, instalaciones provisionales, procedimientos de respuesta ante emergencias, medidas de seguridad y señalización, coordinación con autoridades y empresas prestadoras, y recursos asignados',
              extension: 'lista',
            },
            {
              clase: 'fijo',
              texto:
                'El contratista será responsable de implementar, mantener actualizado y ejecutar el Plan de Contingencia durante toda la ejecución de la obra, cuando este haya sido exigido por la Entidad.',
            },
          ],
        },
        {
          id: 'expediente_adicionales',
          titulo: 'Elaboración del expediente técnico de prestaciones adicionales',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'Cuando durante la ejecución de la obra resulte necesaria la ejecución de una prestación adicional, la elaboración del Expediente Técnico de Prestación Adicional estará a cargo de quien haya sido determinado en la estrategia de contratación, de conformidad con la normativa vigente.',
              fundamento: 'Plantilla — prestaciones adicionales',
            },
            {
              clase: 'opcion',
              id: 'responsable_adicionales',
              etiqueta: 'Responsable de la elaboración del expediente técnico de prestaciones adicionales',
              instruccion: 'Precisar expresamente quién será el responsable de su elaboración',
              opciones: [
                { valor: 'entidad', texto: 'Responsable de la elaboración: Entidad Contratante.' },
                { valor: 'contratista', texto: 'Responsable de la elaboración: Contratista Ejecutor de Obra.' },
                { valor: 'supervisor', texto: 'Responsable de la elaboración: Supervisor de Obra.' },
              ],
            },
            {
              clase: 'fijo',
              texto:
                'Cuando el Expediente Técnico de Prestación Adicional sea elaborado por el contratista o por el supervisor, este asumirá la responsabilidad técnica por la información, cálculos, planos, especificaciones técnicas, metrados, presupuesto, análisis de precios unitarios, cronogramas y demás documentos que lo integran.',
            },
          ],
        },
        {
          id: 'plan_trabajo',
          titulo: 'Plan de Trabajo',
          condicion: 'requiere_plan_trabajo',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'La aprobación del Plan de Trabajo no exime al contratista de su responsabilidad por la correcta ejecución de la obra, ni limita las facultades de dirección, control, supervisión y fiscalización de la Entidad y del supervisor de obra.',
              fundamento: 'Plantilla — plan de trabajo',
            },
            {
              clase: 'redactado',
              id: 'plan_trabajo',
              etiqueta: 'Plan de trabajo',
              instruccion:
                'Establecer el contenido mínimo del Plan de Trabajo, el plazo y medio para su presentación, y el plazo para su revisión y aprobación. Debe guardar concordancia con el expediente técnico, el calendario de avance de obra, el cronograma de ejecución y el programa de utilización de recursos',
              ejemplo:
                'El Plan de Trabajo deberá contener, como mínimo: objetivos y alcance de la obra; metodología constructiva; organización del proyecto y responsabilidades del personal clave; cronograma general de ejecución y programación de hitos contractuales; programación de recursos humanos, equipos, maquinaria y materiales; programa de abastecimiento de materiales e insumos críticos; plan de aseguramiento y control de la calidad; Plan de Seguridad y Salud en el Trabajo; Plan de Manejo Ambiental; identificación de riesgos y medidas de mitigación; procedimiento de coordinación con la Entidad y la supervisión; metodología para el seguimiento y control del avance físico; y plan de gestión de la información y metodologías colaborativas (BIM u otras), cuando corresponda.',
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
                'Incorporar todos los anexos que resulten necesarios: Expediente Técnico de Obra aprobado, especificaciones técnicas, planos, metrados, presupuesto, APU, fórmula polinómica, cronograma de ejecución, calendario de avance valorizado, calendario de adquisición de materiales, estudio de gestión de riesgos, estudios básicos, planes de seguridad y ambiental y protocolos de control de calidad',
              extension: 'lista',
            },
            {
              // Regla de publicidad: no admite matices, condiciona la
              // validez del procedimiento.
              clase: 'fijo',
              texto:
                'De conformidad con los principios de Publicidad, Transparencia y Facilidad de Uso, la Entidad deberá garantizar que todos los anexos técnicos que forman parte del procedimiento de selección se encuentren publicados íntegramente en el SEACE de la Pladicop, permitiendo el acceso oportuno de los potenciales postores.',
              fundamento: 'Principios de Publicidad y Transparencia',
            },
            {
              clase: 'fijo',
              texto:
                'No está permitida la sustitución de los anexos técnicos mediante enlaces externos, vínculos electrónicos o referencias a sitios web distintos del SEACE, salvo los supuestos expresamente autorizados por la normativa vigente.',
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
                'Consignar la modalidad de pago determinada en la estrategia de contratación, de conformidad con el artículo 161 del Reglamento',
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
                'El contrato se rige por el Sistema de Solo Construcción, de conformidad con los artículos 158 y 160 del Reglamento.',
              fundamento: 'Reglamento, arts. 158 y 160',
            },
            {
              clase: 'fijo',
              texto:
                'Bajo este sistema, se contrata únicamente la ejecución física de la obra, para lo cual la entidad entrega el expediente técnico debidamente aprobado. La responsabilidad del contratista se limita al componente que ejecuta, siendo la entidad contratante responsable por los errores o deficiencias que pudieran existir en dicho expediente técnico.',
              fundamento: 'Reglamento, arts. 158 y 160',
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
          id: 'plazo_ejecucion',
          titulo: 'Plazo de ejecución total',
          bloques: [
            {
              clase: 'tabla',
              id: 'plazo_ejecucion',
              etiqueta: 'Plazo por obligación',
              instruccion:
                'Detallar los días calendario por cada obligación: ejecución de obra (edificación o infraestructura, mobiliario, equipamiento, plan de contingencia) y puesta en servicio',
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
          bloques: [
            {
              clase: 'tabla',
              id: 'entregables',
              etiqueta: 'Entregables',
              instruccion:
                'Precisar la denominación del entregable, el plazo o período de presentación, el contenido mínimo y el medio de presentación. Pueden comprender plan de trabajo, informes de avance físico y financiero, valorizaciones, informes de control de calidad, protocolos de pruebas, informes de seguridad y salud, actas, dosieres de calidad, planos de replanteo, planos As Built, manuales de operación y liquidación del contrato',
              columnas: ['N°', 'Entregable', 'Plazo', 'Contenido'],
              minimo: 1,
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
          ],
          subsecciones: [
            {
              id: 'adelanto_directo',
              titulo: 'Adelanto directo',
              condicion: 'adelanto_directo',
              bloques: [
                {
                  clase: 'campo',
                  id: 'adelanto_directo_pct',
                  etiqueta: 'Porcentaje de adelanto directo',
                  ayuda: 'Porcentaje respecto del monto de la obra del contrato original',
                  tipo: 'numero',
                  obligatorio: true,
                },
                {
                  clase: 'fijo',
                  texto:
                    'Los porcentajes máximos de los adelantos y los plazos de entrega se encuentran establecidos en el numeral 178.3 del artículo 178 y en el artículo 179 del Reglamento, respectivamente. Vencido el plazo para solicitar el adelanto la solicitud se tiene por no presentada.',
                  fundamento: 'Reglamento, arts. 178.3 y 179',
                },
              ],
            },
            {
              id: 'adelanto_materiales',
              titulo: 'Adelanto para materiales e insumos, equipamiento y mobiliario',
              condicion: 'adelanto_materiales',
              bloques: [
                {
                  clase: 'campo',
                  id: 'adelanto_materiales_pct',
                  etiqueta: 'Porcentaje de adelanto para materiales',
                  ayuda: 'Porcentaje respecto del monto de la obra del contrato original',
                  tipo: 'numero',
                  obligatorio: true,
                },
                {
                  clase: 'campo',
                  id: 'adelanto_materiales_plazo',
                  etiqueta: 'Plazo de entrega del adelanto',
                  ayuda: 'Consignar días calendario',
                  tipo: 'dias',
                  obligatorio: true,
                },
                {
                  clase: 'fijo',
                  texto:
                    'De acuerdo con lo dispuesto en el artículo 181 del Reglamento, el contratista solicita el adelanto a la supervisión considerando el Calendario de Adquisición de Materiales, Insumos, Equipamientos y Mobiliario, el supervisor verifica la oportunidad y contenido técnico de la solicitud, considerando el plazo que la entidad contratante tomará para la entrega de adelanto referido en el cuadro superior.',
                  fundamento: 'Reglamento, art. 181',
                },
              ],
            },
            {
              id: 'adelanto_avance',
              titulo: 'Adelanto por avance',
              condicion: 'adelanto_avance',
              bloques: [
                {
                  clase: 'campo',
                  id: 'adelanto_avance_pct',
                  etiqueta: 'Porcentaje de adelanto por avance',
                  ayuda: 'Porcentaje respecto del monto de la obra del contrato original',
                  tipo: 'numero',
                  obligatorio: true,
                },
                {
                  clase: 'fijo',
                  texto:
                    'De acuerdo con lo señalado en el numeral 178.5 del artículo 178 del Reglamento, el contratista solicita el adelanto a la supervisión en cuanto exista un avance físico real de 60% en la obra y siempre que dicho avance sea igual o mayor al avance físico programado.',
                  fundamento: 'Reglamento, art. 178.5',
                },
              ],
            },
          ],
        },
        {
          id: 'incentivos',
          titulo: 'Aplicación de incentivos',
          bloques: [
            {
              // En Solo Construcción el incentivo por cumplimiento
              // anticipado es OBLIGATORIO, según las consideraciones
              // normativas del propio documento.
              clase: 'nota',
              texto:
                'En el sistema de Solo Construcción la Entidad tiene la OBLIGACIÓN legal de establecer un incentivo por el cumplimiento anticipado de la fecha de culminación. Los incentivos deben ser objetivos, verificables, razonables y estar directamente vinculados al cumplimiento eficiente de las obligaciones contractuales, conforme al artículo 162 del Reglamento.',
            },
            {
              clase: 'redactado',
              id: 'incentivo_anticipado',
              etiqueta: 'Incentivo por cumplimiento anticipado',
              instruccion:
                'Indicar las precisiones correspondientes y los componentes a los que sería aplicable el incentivo por cumplimiento anticipado de la fecha programada de culminación',
              extension: 'parrafo',
            },
            {
              clase: 'redactado',
              id: 'incentivo_ambiental',
              etiqueta: 'Incentivo por excelencia ambiental y de seguridad',
              instruccion:
                'Indicar las precisiones para la aplicación del incentivo, señalando los indicadores iniciales respecto de los cuales se considerará su cumplimiento, el porcentaje de bonificación (de hasta 1% del monto del contrato original) y la forma de acreditación y otorgamiento',
              extension: 'parrafo',
            },
          ],
        },
        {
          id: 'reajuste',
          titulo: 'Fórmula de reajuste',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'Los reajustes se calculan conforme lo indicado en el artículo 209 del Reglamento. Los reajustes no se computan dentro de los límites establecidos para las prestaciones adicionales. En la modalidad de pago de costos reembolsables, no se aplica fórmula de reajuste debido a que la entidad contratante reconoce el costo real incurrido por el contratista.',
              fundamento: 'Reglamento, art. 209',
            },
            {
              clase: 'parrafo',
              texto: 'Las fórmulas polinómicas y/o monómicas se detallan en {{documento_formulas}}',
              campos: [
                {
                  clase: 'campo',
                  id: 'documento_formulas',
                  etiqueta: 'Documento que contiene las fórmulas',
                  ayuda: 'Indicar documento o anexo que las contiene',
                  tipo: 'texto',
                  obligatorio: true,
                },
              ],
            },
            {
              clase: 'nota',
              texto:
                'Los reajustes sobre las fórmulas polinómicas se realizan aplicando lo dispuesto en el Decreto Supremo N° 011-79-VC hasta que se emita la directiva de la Dirección General de Abastecimiento, conforme al numeral 209.1 del artículo 209 y la Única Disposición Complementaria Derogatoria del Reglamento.',
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
                    'La primera penalidad es la sustitución de un mismo integrante del plantel técnico a partir de la segunda vez (numeral 189.3 del artículo 189 del Reglamento): el monto no puede ser mayor a 4 UIT cuando la cuantía es inferior a 535 UIT, ni menor o igual a 4 UIT ni mayor a 8 UIT en el resto de casos',
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
                'Solo procede cuando el monto del contrato original es igual o superior a S/ 50 000 000,00 o se trata de un contrato estandarizado de ingeniería y construcción de uso internacional. El porcentaje no puede ser inferior al 20% del valor actualizado del contrato y debe estar sustentado en la estrategia de contratación. Si no se cumplen esas condiciones, consignar "NO APLICA".',
            },
            {
              clase: 'campo',
              id: 'limite_indemnizacion',
              etiqueta: 'Límite máximo de indemnización',
              ayuda: 'Consignar porcentaje del monto del contrato original (no inferior al 20%)',
              tipo: 'numero',
              obligatorio: true,
              validacion: 'indemnizacion_min',
            },
            {
              clase: 'fijo',
              texto:
                'No estarán comprendidos dentro de dicho límite los daños y perjuicios ocasionados por dolo o culpa inexcusable, los cuales podrán ser reclamados sin restricción conforme a la normativa vigente.',
              fundamento: 'Ley N° 32069, art. 69.2.f; Reglamento, art. 216.3',
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
                'De haberse previsto en la estrategia de contratación, especificar si se requieren una o más recepciones parciales, los plazos de entrega desde el inicio de la ejecución para cada una y las secciones terminadas que se reciben parcialmente',
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
              clase: 'fijo',
              texto:
                'Para el caso del arbitraje, el postor ganador de la buena pro selecciona a uno de las siguientes Instituciones Arbitrales para administrarlo:',
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
              texto:
                'La liquidación se sujeta al artículo 215 del Reglamento. El contenido mínimo de la liquidación es el siguiente:',
              fundamento: 'Reglamento, art. 215',
            },
            {
              clase: 'redactado',
              id: 'liquidacion',
              etiqueta: 'Contenido de la liquidación',
              instruccion: 'Consignar los documentos a presentar',
              extension: 'lista',
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
          id: 'responsabilidades_entidad',
          titulo: 'Responsabilidades de la entidad contratante',
          bloques: [
            {
              clase: 'redactado',
              id: 'responsabilidades_entidad',
              etiqueta: 'Responsabilidades de la Entidad',
              instruccion:
                'Establecer las responsabilidades de la Entidad: garantizar la disponibilidad física del terreno; entregar el Expediente Técnico aprobado asumiendo la responsabilidad institucional por sus errores o deficiencias; ejecutar el plan de licencias, autorizaciones y permisos a su cargo; designar al Coordinador de Obra; administrar los riesgos asignados; absolver consultas sobre modificaciones al expediente; tramitar valorizaciones y pagos; designar al Comité de Recepción; monitorear la ejecución a través de la DEC; gestionar mecanismos de colaboración ágil; y emitir resoluciones sobre modificaciones contractuales',
              extension: 'lista',
            },
            {
              clase: 'nota',
              texto:
                'Consideraciones normativas adicionales: en este sistema la Entidad retiene el riesgo del diseño, por lo que debe responder ante el contratista por las deficiencias del expediente técnico proporcionado. El incentivo por cumplimiento anticipado es obligatorio. El coordinador designado por la Entidad debe contar con una experiencia mínima de dos (2) años en puestos similares.',
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
              clase: 'fijo',
              texto:
                'Respecto del componente ejecución de obra, la verificación del cumplimiento contractual se efectuará mediante la aprobación de valorizaciones, inspecciones, pruebas, recepción de obra y demás mecanismos de control previstos en la Ley, su Reglamento y los documentos contractuales, según corresponda.',
            },
            {
              clase: 'fijo',
              texto:
                'La conformidad de la prestación únicamente será emitida cuando las verificaciones efectuadas acrediten el cumplimiento integral de las obligaciones contractuales, sin perjuicio de la responsabilidad del contratista por errores, omisiones, deficiencias o vicios ocultos que pudieran detectarse con posterioridad, de conformidad con la normativa vigente.',
            },
          ],
        },
        {
          id: 'verificaciones',
          titulo: 'Verificaciones técnicas, validaciones o revisiones',
          bloques: [
            {
              clase: 'redactado',
              id: 'verificaciones',
              etiqueta: 'Verificaciones técnicas',
              instruccion:
                'Precisar las verificaciones técnicas, inspecciones in situ, pruebas de control de calidad, ensayos de materiales, validaciones operativas y revisiones documentarias que la Entidad realizará a través de la supervisión de obra',
              ejemplo:
                'La revisión y pronunciamiento sobre el Informe de Revisión del Expediente Técnico presentado por el contratista.\nLa verificación del control técnico, económico, administrativo y de seguridad de la ejecución física de la obra.\nLa validación de los metrados realmente ejecutados y el sustento documentario de las valorizaciones mensuales.\nLa revisión permanente de los registros y la absolución de consultas anotadas en el Cuaderno de Incidencias.\nLa verificación del cumplimiento de los protocolos de control de calidad, ensayos de materiales y pruebas operativas.\nEl seguimiento y control del cumplimiento del programa de ejecución de obra (ruta crítica).\nLa verificación de que la obra se ejecute en estricta conformidad con el Expediente Técnico aprobado.',
              extension: 'lista',
            },
            {
              clase: 'nota',
              texto:
                'El acto formal de recepción de la obra únicamente procede cuando las verificaciones del Comité de Recepción acrediten el cumplimiento integral de las obligaciones y el correcto funcionamiento de la infraestructura, sin perjuicio de la responsabilidad del contratista por vicios ocultos por un plazo NO MENOR DE SIETE (7) AÑOS, conforme al artículo 69 de la Ley.',
            },
          ],
        },
        {
          id: 'forma_pago',
          titulo: 'Forma y requisitos de pago',
          bloques: [
            {
              clase: 'fijo',
              texto: 'El pago se realiza de conformidad con lo establecido en el artículo 210 del Reglamento.',
              fundamento: 'Reglamento, art. 210',
            },
            { clase: 'fijo', texto: 'Las valorizaciones tienen las siguientes condiciones:' },
            {
              clase: 'tabla',
              id: 'valorizaciones',
              etiqueta: 'Condiciones de las valorizaciones',
              instruccion:
                'Precisar el periodo de valorización, la forma de cálculo (independiente o conjunta, según el numeral 210.1 del artículo 210) y el plazo para el pago del saldo de la liquidación',
              columnas: ['Concepto', 'Condición'],
              minimo: 1,
            },
            {
              clase: 'redactado',
              id: 'contenido_valorizaciones',
              etiqueta: 'Contenido mínimo de las valorizaciones',
              instruccion:
                'Consignar el contenido de las valorizaciones conforme a la directiva del registro de valorizaciones de obra en el SEACE, incluyendo los documentos que acreditan los pagos exigidos por la normativa (SENCICO, CONAFOVICER, entre otros)',
              extension: 'lista',
            },
            {
              clase: 'fijo',
              texto:
                'Las valorizaciones de obra se presentan a través del módulo de ejecución contractual del SEACE de la Pladicop.',
            },
          ],
        },

        {
          // Incorporadas por César el 16/08/2026, tras señalarle que
          // faltaban. El plazo de vicios ocultos en obras NO es libre:
          // no puede bajar de siete años.
          id: 'vicios_ocultos',
          titulo: 'Responsabilidad por vicios ocultos',
          bloques: [
            {
              clase: 'fijo',
              texto:
                'La recepción conforme de la obra otorgada por la Entidad no enerva su derecho a reclamar posteriormente por defectos o vicios ocultos, de conformidad con lo establecido en el literal b) del numeral 69.2 del artículo 69 de la Ley N° 32069 y el artículo 216 de su Reglamento.',
              fundamento: 'Ley N° 32069, art. 69.2.b; Reglamento, art. 216',
            },
            {
              clase: 'parrafo',
              texto:
                'El plazo de responsabilidad del contratista por vicios ocultos es de {{vicios_ocultos_plazo}}, contado a partir de la recepción total o parcial de la obra, según corresponda. Durante este periodo, el contratista es responsable por la calidad ofrecida y por los defectos que no eran detectables al momento de la recepción conforme.',
              campos: [
                {
                  clase: 'campo',
                  id: 'vicios_ocultos_plazo',
                  etiqueta: 'Plazo de responsabilidad por vicios ocultos',
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
      id: 'requisitos_contratista',
      titulo: 'REQUISITOS Y RECURSOS PROVISTOS POR EL CONTRATISTA',
      bloques: [],
      subsecciones: [
        {
          id: 'requisitos_proveedor',
          titulo: 'Requisitos del proveedor',
          bloques: [
            {
              // En obras se añade el RNP como ejecutor, que no aparece en
              // bienes ni servicios.
              clase: 'fijo',
              texto:
                'Contar con RUC activo y habido en la SUNAT.\nRealizar actividades en el objeto de la contratación.\nPersona natural y/o jurídica.\nNo debe tener impedimentos para contratar con el Estado.\nContar con inscripción vigente en el RNP como Ejecutor de Obras, con una capacidad libre de contratación suficiente para la ejecución de la obra objeto de contratación.',
              fundamento: 'Plantilla — requisitos del proveedor en obras',
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
                'Establecer las responsabilidades, recursos y obligaciones que asume el contratista: recursos humanos, equipos, maquinaria, herramientas, software especializado, infraestructura tecnológica, licencias, sistemas de gestión de información, metodologías colaborativas, laboratorios e instalaciones temporales',
              ejemplo:
                'Presentar el Informe de Revisión del Expediente Técnico a la Entidad y al supervisor dentro de los doce (12) días siguientes a la suscripción del contrato, para detectar tempranamente deficiencias, omisiones o riesgos.\nDesignar y mantener un Residente de Obra de modo permanente y exclusivo, profesional colegiado y habilitado.\nGestionar oportunamente los riesgos asignados al contratista en la matriz de gestión de riesgos.\nCoordinar permanentemente con la Entidad, la supervisión y demás actores involucrados.\nRegistrar diariamente los hechos relevantes y formular consultas técnicas al supervisor a través del Cuaderno de Incidencias digital.\nParticipar en las reuniones técnicas, sesiones de ingeniería concurrente (ICE) y comités de seguimiento.\nPresentar oportunamente las valorizaciones mensuales con el sustento de metrados, certificados de calidad y protocolos de prueba.\nGarantizar la calidad de los materiales y procesos constructivos, respondiendo por vicios ocultos por un plazo no menor de siete (7) años tras la recepción de la obra.',
              extension: 'lista',
            },
            {
              clase: 'nota',
              texto:
                'La responsabilidad del contratista se circunscribe al componente que ejecuta, siendo la Entidad la responsable de los errores o deficiencias del expediente técnico proporcionado.',
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
                'La Entidad debe verificar previamente si existe ficha de homologación aplicable que establezca los requisitos mínimos del personal clave. Como mínimo debe considerarse al Residente de Obra: profesional colegiado y habilitado, responsable de la conducción técnica, con función permanente y exclusiva en campo y experiencia mínima de dos (2) años en la especialidad de la obra. La colegiatura y habilitación se acreditan para el inicio de la participación efectiva, tanto para titulados en el Perú como en el extranjero.',
            },
            {
              clase: 'tabla',
              id: 'personal_clave',
              etiqueta: 'Personal clave',
              instruccion:
                'Precisar el cargo o función y las actividades principales de cada profesional clave',
              columnas: ['Cargo y/o responsabilidad', 'Actividades principales'],
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
                'La especialidad de la obra la determina la entidad conforme al artículo 157 del Reglamento y el listado aprobado por la Dirección General de Abastecimiento mediante Resolución Directoral N° 0016-2025-EF/54.01. No pueden consignarse subespecialidades "afines", equivalentes, similares o análogas, ni establecerse tipologías específicas de obras como requisito de calificación.',
            },
            {
              // En obras la experiencia se computa desde el ACTA DE
              // RECEPCIÓN, no desde la conformidad ni el comprobante.
              clase: 'parrafo',
              texto:
                'El postor debe acreditar un monto facturado acumulado equivalente a {{experiencia_monto}}, en la ejecución de obras en la especialidad y las subespecialidades correspondientes durante los veinticinco años anteriores a la fecha de la presentación de ofertas, que se computan desde la suscripción del acta de recepción de obra.',
              campos: [
                {
                  clase: 'campo',
                  id: 'experiencia_monto',
                  etiqueta: 'Monto facturado acumulado exigido',
                  ayuda:
                    'Consignar el monto de facturación expresado en números y letras en la moneda de la convocatoria, monto que no puede ser mayor a una vez la cuantía de la contratación o del ítem correspondiente',
                  tipo: 'moneda',
                  obligatorio: true,
                  validacion: 'experiencia_max',
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
            {
              clase: 'fijo',
              texto:
                'Cuando en los contratos, órdenes de servicio o comprobantes de pago el monto facturado se encuentre expresado en moneda extranjera, debe indicarse el tipo de cambio venta publicado por la Superintendencia de Banca, Seguros y AFP correspondiente a la fecha de suscripción del contrato, de emisión de la orden de compra o de cancelación del comprobante de pago, según corresponda.',
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
                'La entidad debe verificar si existe ficha de homologación del sector que establezca la experiencia del personal clave. Como requisito de calificación solo puede consignarse "grado de bachiller" o "título profesional". Como mínimo debe considerarse personal clave al residente de obra, atendiendo a los requisitos del artículo 177 del Reglamento.',
            },
            {
              clase: 'tabla',
              id: 'calificaciones_personal_clave',
              etiqueta: 'Calificaciones del personal clave',
              columnas: ['Cargo y/o responsabilidad', 'Profesión', 'Grado o título profesional requerido'],
              minimo: 1,
            },
            {
              clase: 'fijo',
              texto:
                'El postor debe señalar los nombres y apellidos, documento de identidad, el nombre de la universidad o institución educativa que expidió el grado o título profesional, y el grado o título profesional obtenido en el Anexo N° 19. En caso se declare estudios en el extranjero del personal clave, debe presentarse, adicionalmente, copia simple de la revalidación o reconocimiento del grado o título ante la SUNEDU.',
              fundamento: 'Plantilla — acreditación de calificaciones',
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
            {
              clase: 'fijo',
              texto:
                'La experiencia del personal clave, será considerado en todas las Especialidad y subespecialidades, indicadas previamente en el requisito de calificación “experiencia del postor en la especialidad”.',
            },
            {
              clase: 'fijo',
              texto:
                'El postor debe señalar la denominación del puesto, cargo y/o posición, y tiempo de experiencia del personal clave propuesto (años, meses y días) en el Anexo N° 19.',
            },
          ],
        },
      ],
    },

    seccionSolicitante(),
  ],
};
