import { LIMITE_CUERPO_BYTES } from '@/lib/subidas/limites';
/**
 * Helper para Gemini Files API — sube PDFs y otros documentos a
 * Google para que el modelo los procese NATIVAMENTE (sin OCR previo,
 * sin base64 inline). Los archivos quedan disponibles hasta 48h.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/document-processing
 *
 * Ventajas vs base64 inline:
 *   - Un archivo se sube 1 vez y se referencia en múltiples turnos.
 *   - Sin overhead de re-transmitir el PDF completo en cada request.
 *   - Cache de contexto puede aplicarse automáticamente.
 *
 * Cuota: 20 GB total por API key (gratis). Archivos se auto-borran
 * en 48h. Si el usuario vuelve después de 48h, hay que re-subir.
 */

const GEMINI_UPLOAD_URL =
  'https://generativelanguage.googleapis.com/upload/v1beta/files';
const GEMINI_FILES_URL =
  'https://generativelanguage.googleapis.com/v1beta/files';

export interface GeminiFile {
  /** Ej: "files/abc123def456". Se usa como fileUri en el fileData. */
  name: string;
  /** URI que se pasa en el prompt: "https://.../files/xxx" */
  uri: string;
  mimeType: string;
  sizeBytes: number;
  /** ISO string de expiración (48h después de upload). */
  expiresAt: string;
  /** Nombre original del archivo (display name). */
  displayName?: string;
}

function apiKey(): string {
  const k = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!k) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY no configurado');
  return k;
}

/**
 * Sube un archivo a Gemini Files API usando el protocolo "resumable"
 * (2 requests: iniciar + subir bytes).
 *
 * @param buffer - contenido binario del archivo (Node Buffer o Uint8Array)
 * @param mimeType - "application/pdf", "text/plain", etc.
 * @param displayName - nombre mostrable del archivo (opcional)
 */
export async function uploadFileToGemini(
  buffer: Buffer | Uint8Array,
  mimeType: string,
  displayName?: string,
): Promise<GeminiFile> {
  const key = apiKey();
  const numBytes = buffer.byteLength;

  // Paso 1: iniciar upload resumable — Google devuelve upload URL
  const startRes = await fetch(`${GEMINI_UPLOAD_URL}?key=${key}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(numBytes),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: displayName ? { displayName } : {},
    }),
  });
  if (!startRes.ok) {
    throw new Error(
      `Gemini upload start ${startRes.status}: ${await startRes.text()}`,
    );
  }
  const uploadUrl = startRes.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) {
    throw new Error('Gemini upload no devolvió upload URL');
  }

  // Paso 2: subir bytes
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(numBytes),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: buffer as unknown as BodyInit,
  });
  if (!uploadRes.ok) {
    throw new Error(
      `Gemini upload bytes ${uploadRes.status}: ${await uploadRes.text()}`,
    );
  }
  const j = (await uploadRes.json()) as {
    file: {
      name: string;
      uri: string;
      mimeType: string;
      sizeBytes: string;
      expirationTime: string;
      displayName?: string;
    };
  };
  const f = j.file;
  return {
    name: f.name,
    uri: f.uri,
    mimeType: f.mimeType,
    sizeBytes: Number(f.sizeBytes),
    expiresAt: f.expirationTime,
    displayName: f.displayName,
  };
}

/**
 * Obtiene metadata de un archivo previamente subido. Útil para
 * verificar que aún no expiró (48h TTL) antes de reutilizarlo.
 * Retorna null si el archivo ya no existe.
 */
export async function getGeminiFile(
  fileName: string,
): Promise<GeminiFile | null> {
  const key = apiKey();
  const res = await fetch(`${GEMINI_FILES_URL}/${fileName.replace(/^files\//, '')}?key=${key}`);
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) {
    throw new Error(`Gemini get file ${res.status}: ${await res.text()}`);
  }
  const f = (await res.json()) as {
    name: string;
    uri: string;
    mimeType: string;
    sizeBytes: string;
    expirationTime: string;
    displayName?: string;
  };
  return {
    name: f.name,
    uri: f.uri,
    mimeType: f.mimeType,
    sizeBytes: Number(f.sizeBytes),
    expiresAt: f.expirationTime,
    displayName: f.displayName,
  };
}

/**
 * Elimina un archivo de Gemini Files API. Los archivos se auto-borran
 * en 48h de todos modos, pero llamamos delete cuando el usuario
 * remueve el archivo de la conversación para liberar cuota.
 */
export async function deleteGeminiFile(fileName: string): Promise<void> {
  const key = apiKey();
  const res = await fetch(
    `${GEMINI_FILES_URL}/${fileName.replace(/^files\//, '')}?key=${key}`,
    { method: 'DELETE' },
  );
  if (!res.ok && res.status !== 404 && res.status !== 403) {
    throw new Error(`Gemini delete file ${res.status}: ${await res.text()}`);
  }
}

/**
 * Construye la parte `fileData` que se pasa al modelo dentro de un
 * `parts` array. Cada parte referencia un archivo previamente subido.
 */
export function fileDataPart(file: { uri: string; mimeType: string }) {
  return {
    fileData: {
      fileUri: file.uri,
      mimeType: file.mimeType,
    },
  };
}

/** Límites que aplicamos en el generador para controlar costos. */
export const GENERATOR_FILE_LIMITS = {
  MAX_FILES_PER_CONVERSATION: 5,
  /**
   * El que de verdad deja pasar la plataforma.
   *
   * Antes decía 10 MB, y la pantalla se lo prometía al usuario: "adjunta
   * hasta 5 archivos × 10 MB". Un archivo de entre cuatro y diez megas
   * no llegaba nunca al servidor —lo corta la plataforma antes— y la
   * pantalla mostraba un error de JSON que no explicaba nada. Prometer
   * un tope que no se cumple es peor que no ponerlo.
   */
  MAX_FILE_SIZE_BYTES: LIMITE_CUERPO_BYTES,
  ACCEPTED_MIME_TYPES: [
    'application/pdf',
    'text/plain',
    'text/markdown',
    // Word (pedido César 27/07/2026). OJO: Gemini NO procesa .docx
    // nativamente — el route extrae el texto con mammoth y sube
    // text/plain a la Files API. Este mime solo pasa la validación
    // de entrada.
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ] as const,
};
