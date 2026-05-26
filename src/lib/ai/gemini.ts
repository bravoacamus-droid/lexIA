import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// Modelo principal para chat (Flash es free, rápido, suficiente para RAG)
export const CHAT_MODEL_ID = 'gemini-2.0-flash-001';
export const FAST_MODEL_ID = 'gemini-2.0-flash-lite-001';

export const chatModel = google(CHAT_MODEL_ID);
export const fastModel = google(FAST_MODEL_ID);
