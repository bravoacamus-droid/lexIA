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
  'Este PDF está escaneado (sin texto seleccionable) y A-LexIA no puede leer ' +
  'imágenes todavía. Para resolverlo:\n\n' +
  '1. Adobe Acrobat: Herramientas → Reconocer texto → En este archivo, y ' +
  'guarda el PDF.\n' +
  '2. Online gratis: ilovepdf.com/es/ocr-pdf o smallpdf.com/es/ocr-pdf.\n' +
  '3. Word: abre el PDF directamente en Word — convierte el OCR automático ' +
  'y luego exporta como PDF.\n\n' +
  'Una vez convertido, vuelve a subirlo. Próximamente A-LexIA incluirá OCR ' +
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

/** El texto de cada página, por separado. */
export async function textoPorPagina(buffer: ArrayBuffer | Buffer): Promise<string[]> {
  const data =
    buffer instanceof Buffer
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : new Uint8Array(buffer);
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: false });
  return (result.text as unknown as string[]).map((t) => String(t));
}

/**
 * Las páginas que, dentro de un PDF con texto, son en realidad imágenes.
 *
 * Las Bases del CPA 004-2025-OEDI tienen texto, pero el Capítulo III —el
 * requerimiento y los requisitos de calificación, 41 páginas— está
 * escaneado: de cada hoja solo sale el encabezado que el sistema imprime
 * encima («CONCURSO PÚBLICO ABREVIADO DE SERVICIOS BASES INTEGRADAS…»,
 * 203 caracteres). El evaluador leyó «0 requisitos de calificación» y no
 * calificó a nadie (30/09/2026). Lo mismo pasa con las ofertas: anexos en
 * texto y constancias escaneadas.
 *
 * Se quita el comienzo que se repite en muchas páginas —el encabezado— y
 * se marca la página a la que no le queda casi nada. Devuelve números de
 * página empezando en 1.
 */
export function paginasSinTexto(paginas: string[]): number[] {
  const limpias = paginas.map((t) => t.replace(/\s+/g, ' ').trim());
  const prefijos = new Map<string, number>();
  for (const t of limpias) {
    if (t.length < 80) continue;
    const p = t.slice(0, 80);
    prefijos.set(p, (prefijos.get(p) ?? 0) + 1);
  }
  // Cada encabezado común, entero: lo que comparten todas las páginas que
  // empiezan igual (el número de página, al final, ya difiere).
  const encabezados = [...prefijos.entries()]
    .filter(([, n]) => n >= Math.max(3, paginas.length * 0.2))
    .map(([p]) => {
      let comun: string | null = null;
      for (const t of limpias) {
        if (!t.startsWith(p)) continue;
        if (comun === null) {
          comun = t;
          continue;
        }
        let k = 0;
        while (k < comun.length && k < t.length && comun[k] === t[k]) k++;
        comun = comun.slice(0, k);
      }
      return comun ?? p;
    });

  const marcadas: number[] = [];
  limpias.forEach((t, i) => {
    let resto = t;
    for (const e of encabezados) {
      if (resto.startsWith(e)) {
        resto = resto.slice(e.length).replace(/^\s*\d{1,4}\b/, '');
        break;
      }
    }
    if (resto.trim().length < 120) marcadas.push(i + 1);
  });
  return marcadas;
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
