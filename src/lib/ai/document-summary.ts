/**
 * Generador de resúmenes ejecutivos de documentos normativos.
 *
 * Producción de un objeto estructurado con sub-secciones que se muestran
 * en el panel "Resumen IA" de la vista de detalle (imágenes 1-2 del
 * Observaciones.docx de César, 28/06/2026).
 *
 * Diseño:
 *   - Modelo: gemini-2.5-flash (suficiente para resúmenes; costo ~$0.0005
 *     por documento promedio de 30k tokens entrada / 200 tokens salida).
 *   - Forma de salida: JSON estricto via responseMimeType. Si Gemini
 *     emite JSON mal formado, hacemos un parseo permisivo (extraer
 *     primer objeto válido).
 *   - Sin streaming — el endpoint es one-shot, la UI muestra spinner.
 *   - Idempotente al nivel del endpoint: si ya existe ai_summary se
 *     devuelve sin regenerar (salvo force=true).
 */

import { generateText } from 'ai';
import { fastModel, FAST_MODEL_ID } from '@/lib/ai/gemini';

/**
 * Estructura del resumen — feedback César 02/07/2026: cada tipo de
 * documento debe tener sus propias preguntas en el panel del resumen,
 * no las 4 genéricas actuales.
 *
 * Nueva estructura v2 con array de preguntas.
 * Campos v1 (de_que_trata, etc.) se mantienen para retrocompatibilidad
 * con resúmenes ya generados en la BD (300+ docs).
 */
export interface SummaryQuestion {
  /** Etiqueta de la pregunta (ej: "¿Qué normativa aplica el Tribunal?"). */
  label: string;
  /** Respuesta redactada por la IA (1-3 oraciones cerradas con punto). */
  answer: string;
  /** Slug estable para persistir el orden y no depender del label exacto. */
  key: string;
}

export interface DocumentSummary {
  /** Preguntas del panel — nuevo formato v2 (una por cada tipo de doc). */
  questions?: SummaryQuestion[];
  temas: string[];

  // Formato v1 (retrocompat con resúmenes ya en BD)
  de_que_trata?: string;
  que_establece?: string;
  a_quien_afecta?: string;
  que_criterio_establece?: string;
}

export interface SummarizeInput {
  type: string;
  number: string | null;
  title: string;
  raw_text: string;
}

/**
 * Preguntas específicas por tipo de documento — feedback César 02/07/2026.
 * Cada set de preguntas se pensó para el propósito interpretativo del
 * documento (una opinión NO responde a lo mismo que una directiva).
 *
 * Si un tipo no está en el map, se usa DEFAULT_QUESTIONS.
 */
export const SUMMARY_QUESTIONS_BY_TYPE: Record<
  string,
  Array<{ key: string; label: string; hint: string }>
> = {
  opinion: [
    {
      key: 'asunto',
      label: '¿De qué trata el asunto?',
      hint: 'El tema central sobre el que trata la opinión (2-3 oraciones, 180-280 chars).',
    },
    {
      key: 'normativa_aplicada',
      label: '¿Qué normativa interpreta o aplica la opinión?',
      hint: 'Ley, Reglamento y artículos específicos que la opinión interpreta (1-2 oraciones).',
    },
    {
      key: 'consultas_formuladas',
      label: '¿Cuáles son las consultas formuladas?',
      hint: 'Preguntas concretas planteadas por la Entidad consultante (1-2 oraciones).',
    },
    {
      key: 'criterio',
      label: '¿Qué criterio establece?',
      hint: 'El razonamiento jurídico central que sustenta la respuesta (1-2 oraciones).',
    },
    {
      key: 'conclusion',
      label: '¿Cuál es la conclusión de la opinión?',
      hint: 'La respuesta final resumida en 1-2 oraciones prácticas.',
    },
  ],
  pronunciamiento: [
    {
      key: 'cuestionamientos',
      label: '¿Qué cuestionamientos fueron sometidos a revisión?',
      hint: 'Los cuestionamientos formales elevados al OECE (numeración y esencia de cada uno).',
    },
    {
      key: 'normativa_aplicada',
      label: '¿Qué normativa aplica el OECE para resolver los cuestionamientos?',
      hint: 'Ley, Reglamento y artículos citados por el OECE en su análisis.',
    },
    {
      key: 'decisiones',
      label: '¿Qué decisión adoptó el OECE respecto de cada cuestionamiento?',
      hint: 'Acogido / no acogido / parcialmente acogido y por qué (breve).',
    },
    {
      key: 'inconsistencias',
      label: '¿Qué inconsistencias identificó el OECE?',
      hint: 'Errores, contradicciones o vulneraciones detectadas en las Bases o el pliego.',
    },
    {
      key: 'modificaciones',
      label: '¿Qué modificaciones ordenó realizar?',
      hint: 'Cambios concretos que la Entidad debe implementar en las Bases integradas.',
    },
  ],
  resolucion_tce: [
    {
      key: 'sumilla',
      label: '¿Cuál es la sumilla de la Resolución?',
      hint: 'La sumilla oficial o la síntesis del pronunciamiento del Tribunal.',
    },
    {
      key: 'normativa_aplicada',
      label: '¿Qué normativa aplica el Tribunal para resolver la controversia?',
      hint: 'Ley, Reglamento y artículos citados por el Tribunal.',
    },
    {
      key: 'antecedentes',
      label: '¿Qué ocurrió antes del recurso?',
      hint: 'Resumen de los hechos: procedimiento, buena pro, incidencia previa.',
    },
    {
      key: 'puntos_controvertidos',
      label: '¿Cuáles son los puntos controvertidos?',
      hint: 'Los temas específicos en disputa que el Tribunal debe resolver.',
    },
    {
      key: 'criterio',
      label: '¿Qué criterio jurídico establece el Tribunal?',
      hint: 'El razonamiento clave y la interpretación normativa que fundamenta el fallo.',
    },
    {
      key: 'resolucion',
      label: '¿Qué resolvió el Tribunal?',
      hint: 'La parte resolutiva: fundado, infundado, nulidad, sanción, etc.',
    },
  ],
  directiva: [
    {
      key: 'de_que_trata',
      label: '¿De qué trata la Directiva?',
      hint: 'El objeto y alcance principal de la directiva (2-3 oraciones).',
    },
    {
      key: 'normativa_desarrolla',
      label: '¿Qué normativa desarrolla o complementa?',
      hint: 'Ley, Reglamento y artículos que la directiva desarrolla operativamente.',
    },
    {
      key: 'disposiciones',
      label: '¿Qué disposiciones o reglas establece?',
      hint: 'Las reglas concretas y procedimientos definidos por la directiva.',
    },
    {
      key: 'obligaciones',
      label: '¿Qué obligaciones impone a los actores involucrados?',
      hint: 'Deberes y responsabilidades específicos para Entidad, proveedores u otros.',
    },
    {
      key: 'conclusion',
      label: '¿Cuál es la conclusión o regla principal de la Directiva?',
      hint: 'La regla más importante que resume la directiva.',
    },
  ],
};

/** Preguntas genéricas usadas cuando no hay set específico para el tipo. */
export const DEFAULT_QUESTIONS: Array<{ key: string; label: string; hint: string }> = [
  {
    key: 'de_que_trata',
    label: '¿De qué trata?',
    hint: 'Objeto del documento con contexto suficiente (2-3 oraciones).',
  },
  {
    key: 'que_establece',
    label: '¿Qué establece?',
    hint: 'La regla o disposición principal (1-2 oraciones).',
  },
  {
    key: 'a_quien_afecta',
    label: '¿A quién afecta?',
    hint: 'Los destinatarios (Entidad, postores, contratistas, etc.).',
  },
  {
    key: 'que_criterio_establece',
    label: '¿Qué criterio establece?',
    hint: 'El criterio interpretativo o decisorio del documento.',
  },
];

export function getQuestionsForType(
  type: string,
): Array<{ key: string; label: string; hint: string }> {
  return SUMMARY_QUESTIONS_BY_TYPE[type] || DEFAULT_QUESTIONS;
}

/**
 * Tamaño máximo del raw_text a enviar al modelo. Los documentos muy
 * largos (Reglamento entero, sentencias TCE de 50 páginas) se truncan
 * porque las primeras 12k palabras suelen contener el grueso del
 * sentido. Truncamos por caracteres porque tokenización es más costosa.
 */
const MAX_CHARS = 24000;

const PROMPT_SYSTEM_BASE = `Eres un asistente legal experto en Contrataciones Públicas del Perú. Tu tarea es generar un RESUMEN EJECUTIVO estructurado en formato JSON de un documento normativo.

REGLAS ESTRICTAS:
1. Devuelve UN SOLO objeto JSON válido. Sin texto antes, sin texto después, sin comentarios, sin markdown.
2. Cada respuesta debe estar en español formal pero accesible.
3. NO inventes información que no esté en el documento.
4. Si una sección no aplica al documento, devuelve una string corta explicando por qué no aplica ("El documento no aborda este aspecto porque...").
5. CIERRE DE IDEA: cada respuesta DEBE terminar con punto final (.) o signo de cierre (?, !). PROHIBIDO terminar con puntos suspensivos, guiones, comas o conectivos huérfanos ("y", "de", etc.). Si tu redacción excedería el límite sin cerrar la idea, ACORTA la oración para cerrarla correctamente.
6. LONGITUD: cada respuesta entre 180 y 350 caracteres. La primera pregunta (la del tema principal) puede llegar hasta 400 caracteres si necesita más contexto.
7. Los "temas" son tags cortos (2-4 palabras cada uno) con la primera letra en mayúscula.`;

function buildUserPrompt(input: SummarizeInput): string {
  const cleanText = input.raw_text.slice(0, MAX_CHARS);
  const questions = getQuestionsForType(input.type);

  // Construir el esquema JSON dinámicamente según el tipo del documento
  const schemaLines = questions.map((q) => `  "${q.key}": "${q.hint}"`).join(',\n');
  const schema = `{\n${schemaLines},\n  "temas": ["3-6 tags cortos", "Ej: Subsanación", "Experiencia del postor"]\n}`;

  return `Documento normativo a resumir:

Tipo: ${input.type}
Número: ${input.number || 'sin número'}
Título: ${input.title}

Debes producir un JSON con las siguientes preguntas específicas para este tipo de documento:

${questions.map((q, i) => `${i + 1}. ${q.label}\n   Llave JSON: "${q.key}"\n   Instrucción: ${q.hint}`).join('\n\n')}

Adicionalmente, extrae 3-6 tags de "temas" (palabras clave que resumen el contenido).

ESQUEMA DEL JSON:
${schema}

CONTENIDO DEL DOCUMENTO (puede estar truncado para documentos extensos):
"""
${cleanText}
"""

Devuelve SOLO el JSON con las llaves ${questions.map((q) => `"${q.key}"`).join(', ')} y "temas". Nada más.`;
}

/**
 * Intenta parsear la salida del modelo como JSON. Si Gemini emite
 * texto extra al inicio/final (raro pero ocurre), busca el primer
 * bloque que parezca JSON (entre llaves balanceadas).
 */
function parseSummary(raw: string, docType: string): DocumentSummary | null {
  // Limpiar fences ```json ... ``` si los hay
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Primer intento: parseo directo
  try {
    const obj = JSON.parse(s);
    return validate(obj, docType);
  } catch {
    // continue
  }

  // Segundo intento: extraer primer bloque { ... } balanceado
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) return null;
  try {
    const obj = JSON.parse(s.slice(start, end));
    return validate(obj, docType);
  } catch {
    return null;
  }
}

function validate(obj: unknown, docType: string): DocumentSummary | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

  const questionsSchema = getQuestionsForType(docType);
  const questions: SummaryQuestion[] = [];
  for (const q of questionsSchema) {
    const raw = o[q.key];
    if (isString(raw)) {
      questions.push({
        key: q.key,
        label: q.label,
        answer: truncateAtSentence(raw, 400),
      });
    }
  }

  // Requiere al menos 3 respuestas válidas (permite que 1-2 no vengan)
  if (questions.length < 3) return null;

  const temas = Array.isArray(o.temas)
    ? o.temas.filter(isString).slice(0, 8)
    : [];

  return {
    questions,
    temas,
  };
}

/**
 * Trunca un texto al último final de oración (. ? !) dentro del límite.
 * Si no encuentra ninguno, corta en el último espacio y añade punto final.
 *
 * Fix reportado por César 01/07/2026: los resúmenes IA terminaban en "..."
 * o mid-palabra porque el sanitize hacía slice(0, N) sin respetar
 * puntuación. Ahora garantizamos que TODOS los campos cierren con "."
 * o el signo de cierre correspondiente.
 */
function truncateAtSentence(raw: string, maxLen: number): string {
  let text = raw.trim();
  // Normalizar puntos suspensivos comunes que el modelo podría emitir
  // aunque el prompt lo prohíba: ... … . .. — al final los sustituimos
  // por punto simple para no dejar "..." en la UI.
  text = text.replace(/[…]+\s*$/g, '.').replace(/\.{2,}\s*$/g, '.');
  // También al inicio (residuos "… texto")
  text = text.replace(/^[…]+\s*/g, '').replace(/^\.{2,}\s*/g, '');
  text = text.trim();

  if (text.length <= maxLen) {
    // Aún así aseguramos que termine en puntuación
    if (!/[.?!]$/.test(text)) text = text + '.';
    return text;
  }

  // Buscar el último . ? ! dentro del límite
  const slice = text.slice(0, maxLen);
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('.\n'),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('! '),
  );

  if (lastSentenceEnd > maxLen * 0.55) {
    // Cortar justo después del signo de cierre encontrado
    return slice.slice(0, lastSentenceEnd + 1).trim();
  }

  // Fallback: cortar en el último espacio y agregar punto final
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > 40 ? slice.slice(0, lastSpace) : slice;
  // Quitar puntuación y espacios sobrantes antes de añadir el punto final.
  // Regex atrapa: comas, punto y coma, dos puntos, guiones, comillas
  // sueltas, "y", "e", "o" al final (conectivos que quedaron colgados).
  return (
    cut
      .trim()
      .replace(/[,;:—\-"'"]+$/, '')
      .replace(/\s+(?:y|e|o|u|que|de|del|la|el|los|las|para|con|sin|por)\s*$/i, '')
      .trim() + '.'
  );
}

/**
 * Genera el resumen ejecutivo de un documento normativo.
 * Devuelve null si el modelo no logra producir un JSON válido en
 * ambos intentos (raro, pero el endpoint debe manejarlo).
 *
 * Tokens estimados para un pronunciamiento promedio:
 *   in:  ~7000 / out: ~250  → ~$0.0005 USD con gemini-flash-lite.
 */
export async function generateDocumentSummary(
  input: SummarizeInput,
): Promise<{ summary: DocumentSummary | null; model: string; latencyMs: number; tokens: { in: number; out: number } }> {
  const startedAt = Date.now();
  const { text, usage } = await generateText({
    model: fastModel,
    system: PROMPT_SYSTEM_BASE,
    prompt: buildUserPrompt(input),
    temperature: 0.2,
  });
  return {
    summary: parseSummary(text, input.type),
    model: FAST_MODEL_ID,
    latencyMs: Date.now() - startedAt,
    tokens: {
      in: usage?.promptTokens ?? 0,
      out: usage?.completionTokens ?? 0,
    },
  };
}

/**
 * Extrae las preguntas del resumen para renderizado, unificando el
 * formato v2 (nuevo array `questions`) y el v1 (campos individuales
 * de_que_trata/que_establece/etc).
 *
 * Los resúmenes ya generados en la BD (300+ docs) siguen con formato v1
 * hasta que sean regenerados. El componente SummaryPanel usa esta
 * función para renderizar SIEMPRE la misma estructura.
 */
export function normalizeSummaryQuestions(
  summary: DocumentSummary | null | undefined,
  docType: string,
): SummaryQuestion[] {
  if (!summary) return [];

  // v2: ya viene con questions
  if (summary.questions && summary.questions.length > 0) {
    return summary.questions;
  }

  // v1: convertir campos individuales a array usando el schema por tipo
  const schema = getQuestionsForType(docType);
  const mapping: Record<string, string | undefined> = {
    de_que_trata: summary.de_que_trata,
    asunto: summary.de_que_trata,
    que_establece: summary.que_establece,
    disposiciones: summary.que_establece,
    a_quien_afecta: summary.a_quien_afecta,
    obligaciones: summary.a_quien_afecta,
    que_criterio_establece: summary.que_criterio_establece,
    criterio: summary.que_criterio_establece,
    conclusion: summary.que_criterio_establece,
  };

  const questions: SummaryQuestion[] = [];
  for (const q of schema) {
    const answer = mapping[q.key];
    if (answer) {
      questions.push({ key: q.key, label: q.label, answer });
    }
  }

  // Si no hay match (documento tipo raro), devolver los campos v1 con labels default
  if (questions.length === 0) {
    if (summary.de_que_trata)
      questions.push({
        key: 'de_que_trata',
        label: '¿De qué trata?',
        answer: summary.de_que_trata,
      });
    if (summary.que_establece)
      questions.push({
        key: 'que_establece',
        label: '¿Qué establece?',
        answer: summary.que_establece,
      });
    if (summary.a_quien_afecta)
      questions.push({
        key: 'a_quien_afecta',
        label: '¿A quién afecta?',
        answer: summary.a_quien_afecta,
      });
    if (summary.que_criterio_establece)
      questions.push({
        key: 'que_criterio_establece',
        label: '¿Qué criterio establece?',
        answer: summary.que_criterio_establece,
      });
  }

  return questions;
}
