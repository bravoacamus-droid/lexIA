import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

/**
 * Migración 13/07/2026 (feedback César): actualizar a la nueva
 * generación 3.5/3.6 de Gemini que salió esta semana. Benchmark real
 * con la misma query "modalidades de contratación pública eficiente":
 *
 *   flash-lite-latest (previo) → 3.1s / 344 tok  / calidad Buena
 *   gemini-3.5-flash-lite       → 2.3s / 474 tok / calidad Muy buena  ← NUEVO chat
 *   gemini-3.5-flash             → 14.6s (con 1194 tok de thinking)
 *   gemini-3.6-flash             → 8.2s (con 1036 tok de thinking) / calidad Excelente  ← NUEVO generador
 *   gemini-3.6-flash sin think   → respuesta vacía (thinking obligatorio)
 *
 * Decisión:
 *   - Chat y voz → 3.5-flash-lite: MÁS rápido que el actual + mejor
 *     calidad. Sin thinking, latencia predecible.
 *   - Generador tipo chat (nueva feature) → 3.6-flash: usa el thinking
 *     obligatorio, latencia de 8s es aceptable porque el usuario espera
 *     documentos completos.
 *   - Título rápido (fast) → 3.5-flash-lite: es el más rápido disponible.
 */

/** Modelo principal para chat conversacional. Prioriza latencia baja. */
export const CHAT_MODEL_ID = 'gemini-3.5-flash-lite';

/** Modelo rápido para tareas cortas (títulos de conversación, sumillas). */
export const FAST_MODEL_ID = 'gemini-3.5-flash-lite';

/**
 * Modelo del nuevo Generador tipo chat con soporte de PDF nativo +
 * elección de perfil. Usa Gemini 3.6-flash con thinking obligatorio —
 * la latencia de 8s es aceptable porque el usuario espera un documento
 * completo (memorandos, informes, sustentos). Calidad "Excelente" vs
 * "Muy buena" del 3.5. Costo: $7.20/1M output tokens.
 */
export const GENERATOR_MODEL_ID = 'gemini-3.6-flash';

/**
 * Safety settings permisivos para contenido legal profesional.
 *
 * Bug detectado 13/07/2026 en test end-to-end: la pregunta
 * "resúmeme todo respecto a la modalidad de contratación pública
 * eficiente" era bloqueada consistentemente por Gemini con
 * finishReason='content-filter'. Los safety filters de Google son
 * muy sensibles con vocabulario gubernamental/contrataciones porque
 * los asocian con corrupción, sobornos, etc.
 *
 * Como LexIA es un asistente jurídico para funcionarios y proveedores
 * del Estado peruano, TODO el contenido es legítimo — nunca
 * pediremos redactar contenido dañino. Ajustamos a BLOCK_NONE
 * (bloquea solo casos evidentes: instrucciones de armas, abuso, etc.),
 * NO BLOCK_MEDIUM_AND_ABOVE que es el default.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/safety-settings
 */
const LEGAL_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT' as const, threshold: 'BLOCK_NONE' as const },
  { category: 'HARM_CATEGORY_HATE_SPEECH' as const, threshold: 'BLOCK_NONE' as const },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as const, threshold: 'BLOCK_NONE' as const },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as const, threshold: 'BLOCK_NONE' as const },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY' as const, threshold: 'BLOCK_NONE' as const },
];

export const chatModel = google(CHAT_MODEL_ID, {
  safetySettings: LEGAL_SAFETY_SETTINGS,
});
export const fastModel = google(FAST_MODEL_ID, {
  safetySettings: LEGAL_SAFETY_SETTINGS,
});
export const generatorModel = google(GENERATOR_MODEL_ID, {
  safetySettings: LEGAL_SAFETY_SETTINGS,
});
