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

export interface DocumentSummary {
  de_que_trata: string;
  que_establece: string;
  a_quien_afecta: string;
  que_criterio_establece: string;
  temas: string[];
}

export interface SummarizeInput {
  type: string;
  number: string | null;
  title: string;
  raw_text: string;
}

/**
 * Tamaño máximo del raw_text a enviar al modelo. Los documentos muy
 * largos (Reglamento entero, sentencias TCE de 50 páginas) se truncan
 * porque las primeras 12k palabras suelen contener el grueso del
 * sentido. Truncamos por caracteres porque tokenización es más costosa.
 */
const MAX_CHARS = 24000;

const PROMPT_SYSTEM = `Eres un asistente legal experto en Contrataciones Públicas del Perú.
Tu tarea es generar un RESUMEN EJECUTIVO estructurado en formato JSON de un documento normativo.

REGLAS ESTRICTAS:
1. Devuelve UN SOLO objeto JSON válido. Sin texto antes, sin texto después, sin comentarios, sin markdown.
2. Las llaves son EXACTAMENTE: "de_que_trata", "que_establece", "a_quien_afecta", "que_criterio_establece", "temas".
3. Todos los textos en español formal pero accesible.
4. NO inventes información que no esté en el documento.
5. Si una sección no aplica (ej. el doc no establece un criterio claro), devuelve un string corto explicando que el documento no aborda ese aspecto.
6. IMPORTANTE (feedback César 30/06/2026): "de_que_trata" debe tener entre 2 y 3 oraciones (aprox 180-280 caracteres), con contexto sustantivo. NO una línea genérica de 60 caracteres. Debe transmitir el objeto del documento, su alcance principal, y el ámbito de aplicación.

ESQUEMA DEL JSON:
{
  "de_que_trata": "2-3 oraciones (180-280 caracteres). Describe el OBJETO del documento con contexto suficiente para que un lector entienda de qué trata sin abrir el documento.",
  "que_establece": "1-2 oraciones. La regla o disposición principal.",
  "a_quien_afecta": "1 oración. Quiénes son los destinatarios (entidades, postores, comités, contratistas, etc.).",
  "que_criterio_establece": "1-2 oraciones. El criterio interpretativo o decisorio (especialmente útil para opiniones, pronunciamientos y resoluciones).",
  "temas": ["3-6 tags cortos en mayúsculas iniciales", "Ej: Subsanación", "Experiencia del postor", "Calificación", "Apelación"]
}`;

function buildUserPrompt(input: SummarizeInput): string {
  const cleanText = input.raw_text.slice(0, MAX_CHARS);
  return `Documento normativo a resumir:

Tipo: ${input.type}
Número: ${input.number || 'sin número'}
Título: ${input.title}

CONTENIDO (puede estar truncado para documentos extensos):
"""
${cleanText}
"""

Devuelve el JSON con las 5 llaves del esquema. Nada más.`;
}

/**
 * Intenta parsear la salida del modelo como JSON. Si Gemini emite
 * texto extra al inicio/final (raro pero ocurre), busca el primer
 * bloque que parezca JSON (entre llaves balanceadas).
 */
function parseSummary(raw: string): DocumentSummary | null {
  // Limpiar fences ```json ... ``` si los hay
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Primer intento: parseo directo
  try {
    const obj = JSON.parse(s);
    return validate(obj);
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
    return validate(obj);
  } catch {
    return null;
  }
}

function validate(obj: unknown): DocumentSummary | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
  if (!isString(o.de_que_trata)) return null;
  if (!isString(o.que_establece)) return null;
  if (!isString(o.a_quien_afecta)) return null;
  if (!isString(o.que_criterio_establece)) return null;
  const temas = Array.isArray(o.temas)
    ? o.temas.filter(isString).slice(0, 8)
    : [];
  return {
    de_que_trata: o.de_que_trata.slice(0, 350),
    que_establece: o.que_establece.slice(0, 500),
    a_quien_afecta: o.a_quien_afecta.slice(0, 300),
    que_criterio_establece: o.que_criterio_establece.slice(0, 500),
    temas,
  };
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
    system: PROMPT_SYSTEM,
    prompt: buildUserPrompt(input),
    temperature: 0.2,
  });
  return {
    summary: parseSummary(text),
    model: FAST_MODEL_ID,
    latencyMs: Date.now() - startedAt,
    tokens: {
      in: usage?.promptTokens ?? 0,
      out: usage?.completionTokens ?? 0,
    },
  };
}
