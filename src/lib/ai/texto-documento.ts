/**
 * Saca el texto de un archivo que sube el usuario.
 *
 * Word con mammoth, PDF con el extractor de la ingesta, y texto plano
 * tal cual. Es lo que necesita cualquier función que lea un documento
 * del usuario en vez de mandárselo a Gemini: la carga de un proyecto de
 * requerimiento, y lo que venga después.
 *
 * Un .docx NO es texto: es un zip. Leerlo como cadena da basura, y ese
 * es exactamente el fallo que rompió el chat del generador en julio
 * —se declaraba un mime que no correspondía al contenido y la API
 * devolvía INVALID_ARGUMENT—. Aquí el tipo se decide por el mime y, si
 * no viene, por la extensión.
 */
import { extractPdfText, PdfHasNoTextError } from './pdf';

export class DocumentoIlegibleError extends Error {
  constructor(
    message: string,
    /** Sugerencia concreta para el usuario, no un código. */
    readonly sugerencia: string,
  ) {
    super(message);
    this.name = 'DocumentoIlegibleError';
  }
}

export const MIMES_TEXTO_ACEPTADOS = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const;

/** Extensiones que aceptamos, para el atributo `accept` del formulario. */
export const EXTENSIONES_TEXTO = '.pdf,.docx,.txt,.md';

type Clase = 'pdf' | 'docx' | 'texto';

function clasificar(nombre: string, mime: string): Clase | null {
  const ext = nombre.toLowerCase().split('.').pop() ?? '';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    return 'docx';
  }
  if (mime.startsWith('text/') || ext === 'txt' || ext === 'md') return 'texto';
  // El .doc antiguo no lo lee mammoth; se rechaza con una salida clara
  // en vez de devolver caracteres sueltos.
  if (mime === 'application/msword' || ext === 'doc') return null;
  return null;
}

export interface TextoExtraido {
  texto: string;
  /** Para poder decírselo al usuario: "leí 12 páginas". */
  paginas?: number;
  origen: Clase;
}

export async function extraerTextoDocumento(
  archivo: File,
): Promise<TextoExtraido> {
  const clase = clasificar(archivo.name, archivo.type || '');
  if (!clase) {
    throw new DocumentoIlegibleError(
      `Tipo de archivo no soportado: ${archivo.name}`,
      'Sube el documento en PDF, Word (.docx) o texto. El formato .doc antiguo hay que guardarlo antes como .docx.',
    );
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());

  if (clase === 'docx') {
    const mammoth = (await import('mammoth')).default;
    const { value } = await mammoth.extractRawText({ buffer });
    const texto = (value || '').trim();
    if (!texto) {
      throw new DocumentoIlegibleError(
        'El Word no contiene texto extraíble.',
        'Comprueba que el documento no sea solo imágenes escaneadas.',
      );
    }
    return { texto, origen: 'docx' };
  }

  if (clase === 'pdf') {
    try {
      const { text, pages } = await extractPdfText(buffer);
      return { texto: text.trim(), paginas: pages, origen: 'pdf' };
    } catch (e) {
      if (e instanceof PdfHasNoTextError) {
        throw new DocumentoIlegibleError(
          'El PDF no tiene texto: parece escaneado.',
          'Pásalo por OCR, o sube el Word original si lo tienes.',
        );
      }
      throw e;
    }
  }

  const texto = buffer.toString('utf8').trim();
  if (!texto) {
    throw new DocumentoIlegibleError('El archivo está vacío.', 'Sube el documento con contenido.');
  }
  return { texto, origen: 'texto' };
}
