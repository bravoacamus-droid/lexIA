import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// Modelo principal para chat (Gemini 2.5 Flash — buen balance calidad/velocidad/cuota)
// Usamos los aliases "*-latest" para que Google nos mantenga en la versión estable
// más reciente sin que tengamos que cambiar código.
export const CHAT_MODEL_ID = 'gemini-flash-latest';
export const FAST_MODEL_ID = 'gemini-flash-lite-latest';

export const chatModel = google(CHAT_MODEL_ID);
export const fastModel = google(FAST_MODEL_ID);
