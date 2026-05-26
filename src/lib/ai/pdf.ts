import { extractText, getDocumentProxy } from 'unpdf';

/**
 * Extrae texto plano de un PDF (Buffer o ArrayBuffer).
 * Devuelve todo el contenido concatenado.
 */
export async function extractPdfText(buffer: ArrayBuffer | Buffer): Promise<{
  text: string;
  pages: number;
}> {
  const data = buffer instanceof Buffer
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: true });
  return {
    text: String(result.text).trim(),
    pages: pdf.numPages,
  };
}
