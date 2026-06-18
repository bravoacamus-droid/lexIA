import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// Modelo principal para chat. Originalmente 'gemini-flash-latest', cambiado
// temporalmente a 'gemini-flash-lite-latest' (2025-06-16) porque el primero
// está experimentando sobrecarga global de Google (HTTP 503 "high demand"),
// mientras que el lite responde perfecto. La pérdida de calidad es marginal
// para uso jurídico con RAG, ya que el contexto normativo viene de los
// chunks recuperados y no del conocimiento del modelo. Revertir a flash-latest
// cuando se confirme que Google estabilizó el modelo.
export const CHAT_MODEL_ID = 'gemini-flash-lite-latest';
export const FAST_MODEL_ID = 'gemini-flash-lite-latest';

export const chatModel = google(CHAT_MODEL_ID);
export const fastModel = google(FAST_MODEL_ID);
