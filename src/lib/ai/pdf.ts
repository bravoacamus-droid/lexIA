import { extractText, getDocumentProxy } from 'unpdf';

/**
 * Error específico cuando el PDF no tiene texto extraíble — típicamente
 * porque es escaneado sin OCR previo. El handler de la API debe capturarlo
 * y devolver al cliente un mensaje accionable con los pasos para resolverlo.
 */
export class PdfHasNoTextError extends Error {
  code = 'PDF_HAS_NO_TEXT';
  pages: number;
  charsExtracted: number;
  charsPerPage: number;

  constructor(pages: number, charsExtracted: number) {
    const charsPerPage = pages > 0 ? Math.round(charsExtracted / pages) : 0;
    super(
      `PDF sin texto extraíble: ${charsExtracted} caracteres en ${pages} ` +
        `páginas (${charsPerPage} char/pág). Probablemente escaneado, requiere OCR.`,
    );
    this.name = 'PdfHasNoTextError';
    this.pages = pages;
    this.charsExtracted = charsExtracted;
    this.charsPerPage = charsPerPage;
  }
}

/** Mensaje en español listo para mostrar al usuario final. */
export const PDF_OCR_INSTRUCTIONS =
  'Este PDF está escaneado (sin texto seleccionable) y LexIA no puede leer ' +
  'imágenes todavía. Para resolverlo:\n\n' +
  '1. Adobe Acrobat: Herramientas → Reconocer texto → En este archivo, y ' +
  'guarda el PDF.\n' +
  '2. Online gratis: ilovepdf.com/es/ocr-pdf o smallpdf.com/es/ocr-pdf.\n' +
  '3. Word: abre el PDF directamente en Word — convierte el OCR automático ' +
  'y luego exporta como PDF.\n\n' +
  'Una vez convertido, vuelve a subirlo. Próximamente LexIA incluirá OCR ' +
  'automático integrado.';

interface ExtractOptions {
  /**
   * Si true (default), lanza PdfHasNoTextError cuando detecta que el PDF
   * probablemente es escaneado. Si false, devuelve el texto vacío o ínfimo
   * sin lanzar nada (útil para casos donde quieres procesar y filtrar luego).
   */
  detectScanned?: boolean;
}

/**
 * Extrae texto plano de un PDF (Buffer o ArrayBuffer).
 * Devuelve todo el contenido concatenado.
 *
 * Si `detectScanned` está activo (default), lanza PdfHasNoTextError cuando
 * el PDF tiene muy poco texto por página, lo que casi siempre indica que
 * es un PDF escaneado que necesita OCR previo.
 */
export async function extractPdfText(
  buffer: ArrayBuffer | Buffer,
  options: ExtractOptions = {},
): Promise<{ text: string; pages: number }> {
  const { detectScanned = true } = options;

  const data =
    buffer instanceof Buffer
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : new Uint8Array(buffer);
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: true });
  const text = String(result.text).trim();
  const pages = pdf.numPages;

  if (detectScanned) {
    assertHasExtractableText(text, pages);
  }

  return { text, pages };
}

/**
 * Heurística para detectar PDFs sin texto extraíble.
 *
 * Umbrales:
 *   - < 100 caracteres totales: PDF vacío o casi vacío
 *   - < 50 caracteres por página (promedio): probablemente escaneado
 *
 * La heurística NO es perfecta — un PDF con muchas páginas que son solo
 * portadas con un título corto puede caer en este umbral aunque sea
 * "nativo". Por eso solo se usa antes del flujo principal de procesamiento;
 * en ningún caso se borra contenido.
 */
export function assertHasExtractableText(text: string, pages: number): void {
  if (pages === 0) {
    throw new PdfHasNoTextError(0, text.length);
  }

  // Caso 1: prácticamente vacío
  if (text.length < 100) {
    throw new PdfHasNoTextError(pages, text.length);
  }

  // Caso 2: muy poco texto por página → casi seguro escaneado
  const charsPerPage = text.length / pages;
  if (charsPerPage < 50) {
    throw new PdfHasNoTextError(pages, text.length);
  }
}
