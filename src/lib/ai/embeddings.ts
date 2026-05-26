/**
 * Embeddings via Google Gemini (gemini-embedding-001).
 * Salida en 1024 dimensiones para coincidir con el schema vector(1024) de la BD.
 *
 * Endpoints:
 *   - POST /v1beta/models/gemini-embedding-001:embedContent     (single)
 *   - POST /v1beta/models/gemini-embedding-001:batchEmbedContents (batch)
 *
 * taskType:
 *   - RETRIEVAL_QUERY    para queries del usuario al buscar
 *   - RETRIEVAL_DOCUMENT para los chunks que se almacenan
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIM = 1024;

export type EmbedTaskType =
  | 'RETRIEVAL_QUERY'
  | 'RETRIEVAL_DOCUMENT'
  | 'SEMANTIC_SIMILARITY'
  | 'CLASSIFICATION';

function getApiKey(): string {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY no configurado');
  return key;
}

export async function embedOne(
  text: string,
  taskType: EmbedTaskType = 'RETRIEVAL_QUERY',
): Promise<number[]> {
  const apiKey = getApiKey();
  const url = `${GEMINI_API_BASE}/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: EMBEDDING_DIM,
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini embed ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { embedding: { values: number[] } };
  return json.embedding.values;
}

export async function embed(
  texts: string[],
  taskType: EmbedTaskType = 'RETRIEVAL_DOCUMENT',
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const apiKey = getApiKey();

  // batchEmbedContents soporta hasta 100 items
  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    const url = `${GEMINI_API_BASE}/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: slice.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: EMBEDDING_DIM,
        })),
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini batch embed ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as {
      embeddings: Array<{ values: number[] }>;
    };
    for (const e of json.embeddings) results.push(e.values);
  }

  return results;
}
