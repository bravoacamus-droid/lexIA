/**
 * Criterios predefinidos que cada generador aplica automáticamente.
 *
 * Estos textos se MUESTRAN al usuario en la pantalla del generador para que
 * sepa qué evaluará LexIA sin tener que escribir prompts. Es el cambio
 * principal pedido por César en la reunión del 26/06/2026:
 *
 *   > "yo no debería cargar las fuentes normativas. Eso debería estar
 *      ya cargado. El prompt no es que yo lo voy a escribir, sino que
 *      ya esté incorporado. (...) Cuanto más específico el prompt,
 *      más acertada es la respuesta."
 *
 * El usuario PUEDE agregar instrucciones adicionales en el campo opcional
 * "Algo específico que quieras enfatizar", pero NO está obligado a hacerlo:
 * sin texto adicional, LexIA igual aplica todos los criterios listados aquí.
 *
 * Cada item de la lista debe estar redactado en lenguaje claro y accionable
 * (verbos en infinitivo o tercera persona), no en jerga jurídica oscura.
 */

export interface GeneratorCriteria {
  /** Encabezado del panel mostrado al usuario. */
  title: string;
  /** Lo que LexIA evalúa/produce automáticamente. */
  items: string[];
  /** Documentos que el usuario debe subir como contexto del caso. */
  documents_required: string[];
  /** Ejemplos de instrucciones adicionales que el usuario podría agregar. */
  example_additional_prompts?: string[];
}

export const CRITERIA_BY_SLUG: Record<string, GeneratorCriteria> = {
  consultas_observaciones: {
    title: 'Qué evaluará LexIA automáticamente',
    items: [
      'Direccionamiento a marca, modelo o procedencia específica',
      'Requisitos de calificación desproporcionados o ajenos al objeto',
      'Equipamiento estratégico innecesario o excesivo',
      'Definición restrictiva de "servicios" o "bienes similares"',
      'Factores de evaluación subjetivos o no medibles',
      'Plazos de ejecución manifiestamente insuficientes',
      'Especificaciones técnicas ambiguas o contradictorias',
      'Exigencias de experiencia del personal incongruentes con el cargo',
      'Vulneración a los principios del Art. 46 de la Ley 32069',
    ],
    documents_required: [
      'Bases del procedimiento (PDF descargado de SEACE — capítulos 3 y 4 de la Sección Específica)',
    ],
    example_additional_prompts: [
      'Verifica si hay incongruencias entre el plazo de ejecución y el cronograma valorizado.',
      'Pon especial énfasis en que el residente exigido es desproporcionado para un mantenimiento vial menor.',
      'Compara la experiencia exigida con la Opinión N° 023-2024/DTN.',
    ],
  },

  pliego_absolucion: {
    title: 'Qué hará LexIA automáticamente',
    items: [
      'Leer cada consulta/observación recibida y agruparla por tema',
      'Redactar la absolución fundamentada con sustento normativo preciso',
      'Identificar cuáles deben aceptarse y modificar el numeral correspondiente de las Bases',
      'Identificar cuáles deben rechazarse y explicar técnicamente el por qué',
      'Generar el texto integrado para Bases Integradas',
      'Citar opiniones DTN y pronunciamientos OECE aplicables',
    ],
    documents_required: [
      'Bases del procedimiento (PDF de SEACE)',
      'Pliego de consultas y observaciones recibidas (PDF)',
    ],
    example_additional_prompts: [
      'En la observación N° 5 sobre el residente, mantén la exigencia: el proyecto requiere experiencia específica.',
      'Reformula el requisito del numeral 12.3 sin perder la calidad técnica.',
    ],
  },

  apelaciones: {
    title: 'Qué evaluará y redactará LexIA',
    items: [
      'Identificar la causal de impugnación pertinente',
      'Verificar el plazo de 8 días hábiles desde notificación del acto',
      'Calcular el monto de la garantía (3% del valor referencial)',
      'Determinar competencia: Tribunal de Contrataciones del Estado',
      'Estructurar el recurso conforme al Art. 49 de la Ley 32069',
      'Citar pronunciamientos y resoluciones aplicables',
      'Redactar petitorio claro y específico',
    ],
    documents_required: [
      'Acto administrativo impugnado (resolución, comunicación, otorgamiento de buena pro, etc.)',
      'Bases del procedimiento (opcional pero recomendado)',
    ],
    example_additional_prompts: [
      'Hacer énfasis en la vulneración al principio de transparencia.',
      'La impugnación es contra la descalificación por experiencia: verifica si la entidad consideró el contrato N° XXX que sí cumple.',
    ],
  },

  armado_oferta: {
    title: 'Qué hará LexIA automáticamente',
    items: [
      'Generar todos los formatos y anexos exigidos por las Bases',
      'Producir la declaración jurada de no impedimentos (Art. 51 Ley 32069)',
      'Estructurar la experiencia del postor con la evidencia ordenada',
      'Armar el cuadro de personal clave con sus requisitos',
      'Generar la oferta económica con detalle por ítem',
      'Verificar que la oferta cumpla los requisitos mínimos del Cap. 3',
      'Generar índice y carátula conforme al estándar OECE',
    ],
    documents_required: [
      'Bases Integradas (PDF de SEACE)',
      '(Opcional) Hojas de vida del personal clave',
      '(Opcional) Constancias de experiencia de la empresa',
    ],
    example_additional_prompts: [
      'En la experiencia del residente, considera también el contrato con MTC N° 42-2023.',
      'La oferta económica debe respetar el límite del 90 % del valor referencial.',
    ],
  },

  bases_estandar: {
    title: 'Qué hará LexIA automáticamente',
    items: [
      'Cargar la plantilla oficial DGA del tipo de procedimiento elegido',
      'Rellenar Capítulo I (Generalidades) con datos de la entidad',
      'Rellenar Capítulo II (Procedimiento de selección) con cronograma',
      'Estructurar Capítulo III (Requerimiento) con tu objeto',
      'Estructurar Capítulo IV (Factores de evaluación) por categoría',
      'Verificar coherencia entre requisitos del Cap. 3 y factores del Cap. 4',
      'Generar todos los anexos obligatorios',
    ],
    documents_required: [
      '(Opcional) Términos de referencia o EETT ya redactados',
      '(Opcional) Estrategia de contratación aprobada',
    ],
    example_additional_prompts: [
      'El procedimiento es para una entidad municipal; usa lenguaje aplicable.',
      'Incluir factor de evaluación por sostenibilidad ambiental.',
    ],
  },

  // ─── Generadores adicionales (placeholder para futuros pilotos) ──
  cambio_personal_clave: {
    title: 'Qué hará LexIA automáticamente',
    items: [
      'Redactar la solicitud formal de sustitución de personal clave',
      'Verificar que el reemplazo cumpla con el perfil exigido',
      'Sustentar la causal de sustitución (Art. 168 Reglamento)',
      'Generar el cuadro comparativo entre titular y reemplazo',
    ],
    documents_required: [
      'Contrato vigente o sus extractos',
      'Hoja de vida del personal reemplazante',
    ],
    example_additional_prompts: [
      'Indica que la sustitución es por enfermedad acreditada con certificado médico.',
    ],
  },

  resolucion_contrato: {
    title: 'Qué hará LexIA automáticamente',
    items: [
      'Redactar la carta notarial de resolución de contrato',
      'Identificar la causal aplicable (Art. 165 Reglamento)',
      'Calcular el procedimiento (apercibimiento previo si aplica)',
      'Estructurar los hechos con cronología documentada',
      'Citar la cláusula contractual incumplida',
    ],
    documents_required: [
      'Contrato',
      '(Opcional) Cartas de apercibimiento previas',
    ],
    example_additional_prompts: [
      'La resolución es por incumplimiento de plazo: ya hay 30 días de retraso.',
    ],
  },

  descargo_penalidades: {
    title: 'Qué hará LexIA automáticamente',
    items: [
      'Redactar el descargo formal por aplicación de penalidad por mora',
      'Verificar la fórmula aplicada por la entidad (Art. 164 Reglamento)',
      'Identificar causales eximentes (caso fortuito, hechos no imputables)',
      'Estructurar la cronología de la prestación con evidencias',
      'Solicitar la dejación sin efecto de la penalidad',
    ],
    documents_required: [
      'Notificación de aplicación de penalidad',
      'Contrato',
    ],
    example_additional_prompts: [
      'Hubo demora por desabastecimiento del proveedor del componente X.',
    ],
  },

  solicitud_sancion: {
    title: 'Qué hará LexIA automáticamente',
    items: [
      'Redactar la solicitud de sanción ante el Tribunal',
      'Identificar la causal del Art. 50 Ley 32069 aplicable',
      'Estructurar los hechos como una cronología documentada',
      'Citar las pruebas y su valor probatorio',
      'Redactar el petitorio: inhabilitación o multa',
    ],
    documents_required: [
      'Documentación del incumplimiento',
      'Comunicaciones previas con el contratista',
    ],
    example_additional_prompts: [],
  },

  cambio_bienes: {
    title: 'Qué hará LexIA automáticamente',
    items: [
      'Redactar la solicitud de equivalencia técnica',
      'Comparar especificaciones del bien original vs el sustituto',
      'Sustentar que la sustitución no afecta el objeto contractual',
      'Generar el cuadro de equivalencia técnica',
    ],
    documents_required: [
      'Especificaciones técnicas originales (EETT)',
      'Ficha técnica del bien sustituto',
    ],
    example_additional_prompts: [
      'La marca original ya no se fabrica desde marzo 2025.',
    ],
  },

  tdr_eett: {
    title: 'Qué hará LexIA automáticamente',
    items: [
      'Estructurar los TDR / EETT conforme al Anexo de Bases Estándar',
      'Detectar y reformular direccionamientos a marca',
      'Verificar coherencia entre objeto y características técnicas',
      'Sugerir factores de evaluación apropiados',
      'Validar plazos contra estándares del sector',
    ],
    documents_required: [
      '(Opcional) Solicitud del área usuaria',
      '(Opcional) Estudio de mercado',
    ],
    example_additional_prompts: [
      'Incluir requisitos ambientales mínimos para impresoras.',
    ],
  },

  estrategia_contratacion: {
    title: 'Qué hará LexIA automáticamente',
    items: [
      'Cargar el formato oficial xlsx de Estrategia de Contratación (DGA)',
      'Rellenar la justificación del tipo de procedimiento',
      'Estructurar el análisis del mercado',
      'Sugerir la modalidad de contratación apropiada',
      'Generar el sustento de valor referencial',
    ],
    documents_required: [
      'Estudio de mercado',
      '(Opcional) TDR / EETT ya aprobados',
    ],
    example_additional_prompts: [],
  },
};

/**
 * Devuelve los criterios para un slug. Si no hay criterios definidos,
 * devuelve null para que la UI pueda omitir el panel.
 */
export function getCriteriaFor(slug: string): GeneratorCriteria | null {
  return CRITERIA_BY_SLUG[slug] || null;
}
