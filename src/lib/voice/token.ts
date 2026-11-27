import { VOICE_MODEL_ID } from '@/lib/ai/voice-config';

/**
 * Tokens efímeros de Gemini Live para la voz.
 *
 * El navegador abre la sesión de Gemini Live directamente. Antes lo hacía
 * con la API key del servidor (auditoría del 26/11/2026, S2); ahora con un
 * token de un solo uso que fija el modelo, el prompt, la voz y la
 * herramienta: el `setup` que mande el navegador no los puede cambiar
 * (probado el 26/11/2026: con un prompt distinto en el `setup`, el modelo
 * siguió respondiendo como A-LexIA).
 *
 * Se pide por REST y no con `authTokens.create` de @google/genai porque
 * el SDK (2.10) arma la máscara de campos con `tools.0`, que la API
 * rechaza («field_mask is invalid for BidiGenerateContentSetup»); sin
 * máscara bloquea también `sessionResumption` y las reconexiones pierden
 * la conversación.
 *
 * Reanudar una sesión con el mismo token SÍ cuenta como uso (en contra de
 * lo que dice la documentación), así que cada reconexión pide un token
 * nuevo (`session-config` con `renovar`). La reanudación con un token
 * nuevo conserva la conversación (probado el 26/11/2026).
 */

/** La herramienta con la que el modelo consulta la biblioteca durante la llamada. */
export const HERRAMIENTAS_DE_VOZ = [
  {
    functionDeclarations: [
      {
        name: 'search_normativa',
        // En gemini-3.8-live las funciones corren en segundo plano por
        // defecto y el modelo sigue hablando sin esperar el resultado.
        // Aquí debe esperar: responde con lo que trae.
        behavior: 'BLOCKING',
        description:
          'Busca en la base normativa de A-LexIA. Devuelve los fragmentos más relevantes con su cita. USAR ANTES de citar cualquier norma.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Palabras clave o pregunta específica',
            },
            filter_type: {
              type: 'string',
              description:
                'Opcional: ley, reglamento, directiva, opinion, pronunciamiento, resolucion, resolucion_tce, acuerdo_sala_plena, informe_vicio_nulidad, dictamen, lineamiento',
              nullable: true,
            },
          },
          required: ['query'],
        },
      },
    ],
  },
];

/**
 * Los campos del `setup` que quedan fijados. Todo lo demás (en la práctica,
 * `sessionResumption`) lo puede poner el navegador.
 */
const CAMPOS_FIJADOS = [
  'model',
  'generationConfig.responseModalities',
  'generationConfig.speechConfig',
  'systemInstruction',
  'tools',
  'inputAudioTranscription',
  'outputAudioTranscription',
  'contextWindowCompression',
].join(',');

/**
 * El `setup` de la sesión. Debe coincidir con el que manda el navegador
 * en `src/lib/voice/live-client.ts` (`openSocket`).
 */
export function setupDeVoz(opciones: { voiceId: string; systemInstruction: string }) {
  return {
    model: `models/${VOICE_MODEL_ID}`,
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: opciones.voiceId } },
        languageCode: 'es-US',
      },
    },
    systemInstruction: { parts: [{ text: opciones.systemInstruction }] },
    tools: HERRAMIENTAS_DE_VOZ,
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    // Sin compresión, una sesión de solo audio muere a los 15 minutos.
    contextWindowCompression: { slidingWindow: {}, triggerTokens: 80000 },
  };
}

/** Pide un token de un solo uso que vence en `vence`. Lanza si Gemini no lo da. */
export async function crearTokenDeVoz(opciones: {
  voiceId: string;
  systemInstruction: string;
  vence: Date;
}): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) throw new Error('missing_api_key');
  const vence = opciones.vence.toISOString();
  const res = await fetch('https://generativelanguage.googleapis.com/v1alpha/auth_tokens', {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      uses: 1,
      expireTime: vence,
      newSessionExpireTime: vence,
      bidiGenerateContentSetup: setupDeVoz(opciones),
      fieldMask: CAMPOS_FIJADOS,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const cuerpo = (await res.json().catch(() => null)) as { name?: string; error?: { message?: string } } | null;
  if (!res.ok || !cuerpo?.name) {
    throw new Error(`auth_tokens ${res.status}: ${cuerpo?.error?.message?.slice(0, 200) ?? 'sin detalle'}`);
  }
  return cuerpo.name;
}
