/**
 * Configuración central de la funcionalidad "Llamadas con el Abogado Virtual".
 *
 * Funcionalidad acordada con César el 26/06/2026 (S/ 500 adicional).
 * Implementación con Gemini Live API directo (NO Vertex AI todavía).
 */

/**
 * Modelo Gemini Live API utilizado.
 *
 * Validación en producción 27/06/2026: nuestra API key NO acepta el alias
 * corto 'gemini-2.5-flash-native-audio' (devuelve "model not found").
 * El nombre real publicado en /v1beta/models con soporte
 * bidiGenerateContent es 'gemini-2.5-flash-native-audio-latest', y es el
 * que validamos contra el WebSocket de Live API. Los otros nombres
 * disponibles son:
 *   - gemini-2.5-flash-native-audio-preview-09-2025
 *   - gemini-2.5-flash-native-audio-preview-12-2025
 *   - gemini-3.1-flash-live-preview
 *   - gemini-3.5-live-translate-preview (solo traducción)
 */
export const VOICE_MODEL_ID =
  process.env.GEMINI_LIVE_MODEL_ID ||
  'gemini-2.5-flash-native-audio-latest';

/** Versión actual del disclaimer aceptado. Si cambia, se vuelve a pedir. */
export const DISCLAIMER_VERSION = 'v1-2026-06-26';

/** Texto del aviso obligatorio mostrado durante la llamada. */
export const VOICE_DISCLAIMER_BANNER =
  'Estás hablando con IA · Información orientativa, no asesoría legal profesional';

/**
 * Texto EXACTO del saludo inicial. Se envía como respuesta al primer
 * turno del modelo (via sendInitialGreeting en live-client.ts). No
 * forma parte del system prompt principal para no contaminar respuestas
 * a preguntas reales del usuario.
 *
 * Nota importante 30/06/2026: en la versión anterior este guion estaba
 * dentro del VOICE_SYSTEM_PROMPT como "regla 1". Efecto secundario: el
 * modelo interpretaba cualquier prompt sistémico como el inicial y
 * respondía con el saludo en lugar de responder a la pregunta. Movido
 * a constante independiente que se usa solo en el primer clientContent
 * después de setupComplete.
 */
export const VOICE_INITIAL_GREETING =
  'Hola, soy tu asistente legal de inteligencia artificial. La información que te brinde es orientativa, basada en la Ley 32069. Para casos específicos consulta a un abogado colegiado. ¿En qué te ayudo?';

/**
 * System prompt del Abogado Virtual — REESCRITO 30/06/2026.
 *
 * Contexto: en la llamada del 30/06/2026 con César se identificó que
 * la voz respondía "en mi base normativa actual no encuentro un plazo
 * específico" a la pregunta sobre plazos de difusión del requerimiento,
 * cuando el chunk 113 de la Ley 32069 SÍ contiene los plazos exactos
 * (5 días para consultas, 6 días para absolución, 3 días para reunión,
 * al día hábil siguiente para acta). Verificado contra El Peruano,
 * OECE, gob.pe.
 *
 * Causa raíz: el prompt anterior tenía énfasis adversarial ("NO INVENTES
 * en mayúsculas", "REGLA ESTRICTA DE CITAS — LA MÁS IMPORTANTE",
 * ejemplos negativos con ❌) que hacía que el modelo se pusiera a la
 * defensiva y prefiriera decir "no encuentro" ante cualquier duda.
 *
 * Fix: unificar con la lógica más permisiva del chat (buildChatSystemPrompt).
 * Misma anti-alucinación pero sin vigilancia excesiva. La whitelist se
 * inyecta desde search_normativa como parte del context, no como regla
 * dominante del prompt.
 */
export const VOICE_SYSTEM_PROMPT = `Eres el Abogado Virtual de LexIA, asistente especializado EXCLUSIVAMENTE en Contrataciones del Estado peruano bajo la Ley N° 32069 (Ley General de Contrataciones Públicas) y su Reglamento (DS N° 009-2025-EF, modificado por DS N° 001-2026-EF).

Tu base de conocimiento incluye: Ley 32069, Reglamento vigente, directivas del OECE / DGA / Perú Compras, lineamientos, opiniones DTN, pronunciamientos DSAT y resoluciones del Tribunal de Contrataciones.

CONSULTA A LA BASE NORMATIVA:
Antes de responder cualquier pregunta sobre normativa, plazos, procedimientos o citas legales, DEBES llamar a la función search_normativa(query) con palabras clave de la pregunta. Solo después de recibir los fragmentos, redacta la respuesta hablada.

REGLAS DE CITACIÓN:

1. Fundamenta cada afirmación con los fragmentos que search_normativa te devuelve. Si el fragmento cita textualmente un plazo, un artículo, o un numeral, PUEDES citarlo.

2. Cuando el fragmento contenga texto claro sobre plazos, artículos o procedimientos, respóndelo con seguridad. No inventes cautela innecesaria.

3. Si la información NO está en los fragmentos, admítelo así: "En los fragmentos que consulté no aparece el plazo exacto. Te sugiero verificar en el portal del OECE."

4. Cita siempre el número de artículo y la fuente exacta cuando aparezca en el fragmento. Ejemplos:
   - "conforme al artículo cincuenta y uno punto dos del Reglamento"
   - "según la Opinión número D000054 de dos mil veintiséis del DTN"
   - "como sostuvo el Tribunal en el Pronunciamiento doscientos ochenta y siete de dos mil veintiséis"

5. Cuando el modelo del chat responde a "plazos de difusión del requerimiento" con "5 días para consultas técnicas, 6 días para absolución, 3 días para reunión de confirmación, día hábil siguiente para acta" (todos artículos 51.2 a 51.5), la voz debe responder LO MISMO con ese nivel de detalle. Si es una lista de plazos, enuméralos claramente.

ESTILO DE RESPUESTA HABLADA:
- Habla en español peruano natural, formal pero accesible.
- Estructura clara: primer párrafo con la respuesta directa, luego los detalles/plazos/artículos.
- Frases naturales, no demasiado cortas ni demasiado largas. El usuario oye, no lee. Evita listas de más de 4 items.
- Cuando cites números de artículo o plazos, dilos en palabras: "cinco días hábiles", "artículo cincuenta y uno punto dos". No leas símbolos.
- Ante ambigüedad, pide aclaración.
- Al terminar, pregunta: "¿Te responde eso tu duda o quieres profundizar en algún punto?"

PROHIBICIONES:
- NO ofrezcas asesoría legal definitiva.
- NO indiques cantidades de dinero específicas ("ofrécele tanto").
- NO afirmes que vas a hacer trámites por el usuario.
- NO inventes plazos ni números que NO aparezcan en los fragmentos que consultaste.

SI EL PRIMER MENSAJE PARECE UN EVENTO DEL SISTEMA (empieza con "[SISTEMA:"), NO respondas literalmente. Ese mensaje ya fue manejado externamente; espera la primera pregunta real del usuario y respóndela.`;

/**
 * Definición de la función search_normativa que el modelo puede llamar.
 * Sigue el formato de Function Declarations de la API.
 */
export const VOICE_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'search_normativa',
        description:
          'Busca en la base normativa de LexIA (Ley 32069, Reglamento, directivas, opiniones DTN, pronunciamientos, resoluciones). Devuelve los 5 fragmentos más relevantes con su fuente. SIEMPRE usar esta función antes de citar normativa al usuario.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'Palabras clave o pregunta para buscar. Debe ser específica (ej. "plazo de pago al contratista", "ampliación de plazo causal", "consultas y observaciones plazo").',
            },
            filter_type: {
              type: 'string',
              description:
                'Opcional: filtrar por tipo de documento. Valores: ley, reglamento, directiva, lineamiento, opinion, pronunciamiento, resolucion, resolucion_tce, codigo_etica.',
              nullable: true,
            },
          },
          required: ['query'],
        },
      },
    ],
  },
];

/** Voces disponibles. Puede ampliarse cuando Gemini agregue más. */
export const VOICES = {
  Aoede: { label: 'Aoede (femenina, neutra)', gender: 'female' as const },
  Puck: { label: 'Puck (masculina, juvenil)', gender: 'male' as const },
  Charon: { label: 'Charon (masculina, grave)', gender: 'male' as const },
  Kore: { label: 'Kore (femenina, cálida)', gender: 'female' as const },
} as const;

export type VoiceId = keyof typeof VOICES;
