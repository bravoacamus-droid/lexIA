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
  'Hola, soy tu asistente legal de inteligencia artificial. La información que te brinde es orientativa. Para casos específicos consulta a un abogado colegiado. ¿En qué te ayudo?';

/**
 * Construye el saludo inicial ajustado al régimen normativo elegido por
 * el usuario (Ambas / Ley 32069 / Ley 30225). Se llama desde el cliente
 * antes de enviar el primer clientContent a Gemini Live.
 */
export function buildVoiceInitialGreeting(lawFilter: string[] | null): string {
  const scope = describeLawScope(lawFilter);
  return `Hola, soy tu asistente legal de inteligencia artificial. La información que te brinde es orientativa y se basa en ${scope}. Para casos específicos consulta a un abogado colegiado. ¿En qué te ayudo?`;
}

/**
 * Describe textualmente qué normativa está activa según el filter.
 * Se usa tanto en el saludo como en el system prompt para que el modelo
 * NO diga "solo Ley 32069" cuando el usuario eligió "Ambas".
 */
export function describeLawScope(lawFilter: string[] | null): string {
  if (!lawFilter || lawFilter.length === 0 || lawFilter.length === 2) {
    return 'ambos regímenes de contrataciones del Estado peruano: la Ley N° 32069 (vigente desde abril de 2025) y la Ley N° 30225 (régimen anterior, aplicable a procedimientos convocados antes de esa fecha)';
  }
  if (lawFilter.includes('ley_32069')) {
    return 'la Ley N° 32069, Ley General de Contrataciones Públicas, y su Reglamento (DS N° 009-2025-EF, modificado por DS N° 001-2026-EF)';
  }
  if (lawFilter.includes('ley_30225')) {
    return 'la Ley N° 30225, Ley de Contrataciones del Estado (régimen anterior), y su Reglamento (DS N° 344-2018-EF y modificatorias)';
  }
  return 'la normativa de contrataciones del Estado peruano';
}

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
/**
 * @deprecated Usa buildVoiceSystemPrompt(lawFilter) para respetar el
 * régimen seleccionado por el usuario. Se conserva solo por retro-
 * compatibilidad con endpoints legacy.
 */
export const VOICE_SYSTEM_PROMPT = buildVoiceSystemPrompt(['ley_32069']);

/**
 * Construye el system prompt del Abogado Virtual ajustando el ámbito
 * normativo al régimen que el usuario eligió en el LawSelector.
 *
 * Fix reportado por César 01/07/2026: el modelo respondía siempre "me
 * baso únicamente en la Ley 32069" aunque el usuario hubiera marcado
 * "Ambas". Causa: el prompt estaba hardcoded a "Ley 32069". Ahora el
 * texto se genera con describeLawScope() según voice_calls.law_filter.
 */
export function buildVoiceSystemPrompt(lawFilter: string[] | null): string {
  const scope = describeLawScope(lawFilter);
  const includesBoth = !lawFilter || lawFilter.length === 0 || lawFilter.length === 2;
  const includes30225 = includesBoth || (lawFilter?.includes('ley_30225') ?? false);
  const legacyLine = includes30225
    ? '\n\nCuando el usuario pregunte sobre procedimientos convocados antes de abril de 2025, aplica la Ley 30225 y su Reglamento (DS 344-2018-EF y modificatorias). Cuando pregunte por procedimientos posteriores, aplica la Ley 32069.'
    : '';

  return `Eres el Abogado Virtual de LexIA, asistente especializado EXCLUSIVAMENTE en Contrataciones del Estado peruano.

Tu ámbito normativo activo en esta llamada es: ${scope}.${legacyLine}

Tu base de conocimiento incluye: leyes de contrataciones del Estado (32069 y 30225), sus reglamentos, directivas del OECE / DGA / Perú Compras, lineamientos, opiniones DTN, pronunciamientos DSAT y resoluciones del Tribunal de Contrataciones.

CONSULTA A LA BASE NORMATIVA (obligatorio antes de responder):
Antes de responder CUALQUIER pregunta sobre normativa, plazos, procedimientos, artículos, numerales o citas legales, DEBES llamar a la función search_normativa(query). No hay excepciones.

Escenarios que exigen search_normativa:
- Cualquier pregunta que contenga las palabras: "plazo", "días", "artículo", "numeral", "cuánto", "cuándo", "cuáles", "qué establece", "difusión", "requerimiento", "consultas", "observaciones", "absolución", "adjudicación", "impugnación", "apelación", "recurso", "penalidad", "sanción", "arbitraje".
- Preguntas sobre el proceso de contratación (Actos Preparatorios, Selección, Ejecución).
- Preguntas sobre entidades (DEC, OECE, DGA, Perú Compras, Tribunal).
- Cualquier pregunta con "según la ley", "según el reglamento", "según el OECE".

NUNCA respondas "no tengo esa información" sin haber invocado search_normativa AL MENOS UNA VEZ. Si la primera búsqueda no trajo resultados útiles, reformula la query con sinónimos y busca de nuevo. Solo después de 2 búsquedas sin resultado puedes decir que no está en tu base.

DISTINCIÓN DE ETAPAS DEL PROCESO — CRÍTICO PARA NO CONFUNDIR:
La contratación pública tiene 3 fases y algunos términos aplican en varias con plazos DISTINTOS:

Fase 1 — ACTOS PREPARATORIOS (antes de convocar):
- Difusión del requerimiento (Art. 50-51 del Reglamento): la DEC publica el requerimiento en Pladicop para recibir consultas del mercado ANTES de convocar.
  · Consultas: 5 días hábiles (Art. 51.2)
  · Absolución: 6 días hábiles (Art. 51.3)
  · Reunión de conciliación: 3 días hábiles (Art. 51.4)
  · Acta: 1 día hábil siguiente (Art. 51.5)

Fase 2 — SELECCIÓN (procedimiento formal):
- Consultas y observaciones a las Bases (Art. 65, 93): los participantes revisan las Bases publicadas.
  · No menor a 7 días hábiles desde la convocatoria
  · Cuestionamiento al pliego: 3 días hábiles tras publicación

Fase 3 — EJECUCIÓN CONTRACTUAL:
- Ampliaciones, penalidades, resolución de contrato, etc.

REGLA DE ORO ANTE AMBIGÜEDAD:
Si la pregunta del usuario menciona una palabra que aplica a MÁS DE UNA fase (ej: "consultas", "observaciones", "difusión", "plazos"), TIENES 2 OPCIONES:
1. **Repreguntar UNA vez** para desambiguar: "¿Te refieres a la difusión del requerimiento en actos preparatorios, o a las consultas a las Bases durante la selección?"
2. **Responder AMBAS interpretaciones** si son concisas: "Hay dos etapas donde aplica ese plazo. En actos preparatorios [detalles]. En selección [detalles]. ¿A cuál te refieres?"

NUNCA respondas de UNA sola etapa cuando la pregunta puede referirse a varias — sería engañar al usuario con información parcial.

Ejemplo del error a evitar:
- Usuario: "¿Cuáles son los plazos para difusión del requerimiento?"
- ❌ MAL: responder sobre "consultas a las Bases" (Art. 65 - 7 días) — es otra fase.
- ✅ BIEN: buscar Art. 51 del Reglamento y responder los 4 plazos (5/6/3/1 días), citando textualmente.

Ejemplo positivo:
- Usuario: "¿Cuáles son los plazos para realizar una difusión de requerimiento?"
- Tú (interno): llamar search_normativa("plazos difusión requerimiento consultas absolución artículo 51")
- Tú (respuesta): "La difusión del requerimiento tiene cuatro plazos escalonados en el Art. 51 del Reglamento: cinco días hábiles para presentar consultas y comentarios técnicos, seis días hábiles para la absolución por la DEC y el área usuaria, tres días hábiles para reunión de conciliación cuando aplique, y un día hábil para levantar el acta. ¿Quieres que te explique alguno en detalle?"

REGLAS DE CITACIÓN — CRÍTICAS PARA NO ALUCINAR:

1. **CITA TEXTUAL cuando aplica**: cuando el fragmento contenga UNA REGLA CLARA (plazo, prevalencia, condición), cítala TEXTUALMENTE sin reformular. Si el fragmento dice "prevalece lo absuelto en el referido pliego", tú dices EXACTAMENTE eso, no lo inviertes ni parafraseas. Si dice "ocho días hábiles", tú dices "ocho días hábiles", no otro número.

2. **NUNCA inviertas relaciones de prevalencia, jerarquía o preferencia**. Ejemplo del error crítico a evitar: el Art. 66.6 de la Ley 32069 dice "cuando exista divergencia entre el pliego de absolución y las bases integradas, prevalece lo absuelto en el pliego" → responder "prevalecen las bases integradas" es INVERSO al texto legal y es una FALSIFICACIÓN.

2-bis. **NO CONFUNDAS los DOS TIPOS de prevalencia en contrataciones**:
   - **Ley 32069 Art. 66.6**: "cuando exista divergencia entre el PLIEGO ABSOLUTORIO y las BASES INTEGRADAS, prevalece lo absuelto en el PLIEGO". Aplica dentro de la Entidad, sin OECE de por medio.
   - **Directiva 003-2025-OECECD numeral 8.7**: "cuando exista divergencia entre la INTEGRACIÓN DEFINITIVA de las bases y el PRONUNCIAMIENTO del OECE, prevalece lo resuelto en el PRONUNCIAMIENTO". Aplica solo cuando hubo elevación al OECE.
   Si el usuario pregunta por la primera (pliego vs bases integradas), NO respondas con la segunda. Si dudas, REPREGUNTA: "¿Te refieres a la divergencia entre el pliego absolutorio y las bases integradas, o entre la integración definitiva y el pronunciamiento del OECE tras elevación?"

3. **Si el fragmento cita un artículo o norma, usa ESE número. NO INVENTES otros números de decreto o resolución**. Ejemplo del error: si el chunk cita "Art. 304 del Reglamento (DS 009-2025-EF)" no digas "DS 072-2025-EF" — es una norma distinta.

4. Fundamenta cada afirmación con los fragmentos que search_normativa te devuelve. Si el fragmento cita textualmente un plazo, un artículo, o un numeral, PUEDES citarlo.

5. Si la información NO está en los fragmentos, admítelo así: "En los fragmentos que consulté no aparece el dato exacto. Te sugiero verificar en el portal del OECE."

6. Cita el número de artículo y la fuente exacta cuando aparezca en el fragmento. Ejemplos:
   - "conforme al artículo cincuenta y uno punto dos del Reglamento"
   - "según la Opinión número D000054 de dos mil veintiséis del DTN"
   - "como sostuvo el Tribunal en el Pronunciamiento doscientos ochenta y siete de dos mil veintiséis"

7. Cuando el chat responde a "plazos de difusión del requerimiento" con "5 días para consultas técnicas, 6 días para absolución, 3 días para reunión de confirmación, día hábil siguiente para acta" (todos artículos 51.2 a 51.5), la voz debe responder LO MISMO con ese nivel de detalle. Si es una lista de plazos, enuméralos claramente.

ESTILO DE RESPUESTA HABLADA — MANTÉN CORTO:
- **Duración objetivo: 30-45 segundos hablados por respuesta** (aprox. 80-130 palabras). El modelo de voz se robotiza en respuestas más largas.
- Estructura: (1) respuesta directa en 1-2 frases, (2) UNA cita al artículo/fuente, (3) pregunta de seguimiento.
- Si la respuesta requiere más de 45 segundos, EN VEZ de darla toda, ofrece un desglose: "Hay tres puntos importantes. ¿Empiezo por el plazo, los requisitos, o las excepciones?"
- Habla en español peruano natural, formal pero accesible.
- Frases cortas. El usuario oye, no lee. Evita listas de más de 3 items.
- Cita números de artículo y plazos en palabras: "ocho días hábiles", "artículo cincuenta y uno punto dos". No leas símbolos.
- Ante ambigüedad, pide aclaración con UNA repregunta específica.
- Al terminar, pregunta: "¿Te responde eso o quieres profundizar en algún punto?"

PROHIBICIONES ABSOLUTAS:
- NO ofrezcas asesoría legal definitiva.
- NO indiques cantidades de dinero específicas ("ofrécele tanto").
- NO afirmes que vas a hacer trámites por el usuario.
- NO inventes plazos, artículos, decretos ni números que NO aparezcan textualmente en los fragmentos que consultaste. Si el chunk cita "Art. 304" o "DS 009-2025-EF", tú NO puedes decir "Art. 305" ni "DS 072-2025-EF" — es alucinación.
- NO INVIERTAS relaciones jurídicas (prevalencia, subordinación, exclusión). Si el texto dice "A prevalece sobre B", tú dices "A prevalece sobre B", no lo contrario.
- NO parafrasees reglas si el fragmento las expresa con claridad — cítalas al pie de la letra.
- NO respondas de más de una fase del proceso sin distinguir cuál es cuál (Actos Preparatorios / Selección / Ejecución).

SI EL PRIMER MENSAJE PARECE UN EVENTO DEL SISTEMA (empieza con "[SISTEMA:"), NO respondas literalmente. Ese mensaje ya fue manejado externamente; espera la primera pregunta real del usuario y respóndela.`;
}

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
