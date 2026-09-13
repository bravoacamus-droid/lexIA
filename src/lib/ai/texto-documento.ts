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

/**
 * ¿Este texto se puede leer, o es basura con forma de texto?
 *
 * Un PDF escaneado con una fuente incrustada rota SÍ tiene capa de
 * texto, así que nunca llega al OCR, y lo que entrega es esto:
 * «UKUMARU S SECURTIY S.A.C., rdenrifi.ado con oNLN' 70672569». El
 * evaluador leyó 26.422 caracteres así y concluyó que la oferta
 * «cumple cabalmente con todos los requisitos de admisibilidad».
 * Observación de César (setiembre de 2026): en esa parte debió haber
 * una observación, porque al postor le faltaba el acápite iv del
 * Anexo N° 3 —que nadie podía ver en ese amasijo—.
 *
 * Dos señales, medidas sobre los documentos de esa evaluación:
 *
 *                        palabras rotas   palabras comunes
 *   oferta ilegible          12,0 %            19,9 %
 *   oferta legible            0,8 %            37,1 %
 *   bases integradas          0,4 %            41,4 %
 *
 * «Palabra rota» es la que lleva puntuación o un símbolo en medio de
 * las letras —«rdenrifi.ado»—, que es lo que produce una fuente mal
 * incrustada y casi nunca el español. «Palabra común» es de una lista
 * corta de las que aparecen en cualquier documento en castellano: si
 * faltan, lo que hay no es prosa.
 */
const PALABRAS_COMUNES = new Set([
  'de', 'la', 'el', 'que', 'en', 'y', 'a', 'los', 'del', 'las', 'por', 'con', 'no',
  'una', 'un', 'para', 'es', 'se', 'su', 'al', 'lo', 'como', 'más', 'mas', 'o', 'sus',
  'le', 'ha', 'si', 'sin', 'sobre', 'este', 'ya', 'entre', 'cuando', 'todo', 'esta',
  'ser', 'son', 'dos', 'también', 'fue', 'hasta', 'desde', 'porque', 'sólo', 'solo',
  'han', 'hay', 'puede', 'todos', 'así', 'ni', 'parte', 'tiene', 'uno', 'donde',
  'bien', 'tiempo', 'mismo', 'cada', 'otro', 'después', 'otros', 'aunque', 'hace',
  'otra', 'tan', 'durante', 'siempre', 'tres', 'sido', 'según', 'segun', 'menos',
  'antes', 'contra', 'sino', 'forma', 'caso', 'hacer', 'general', 'otras', 'total',
  'tal', 'luego', 'medio', 'debe', 'conforme', 'numeral', 'artículo', 'articulo',
  'presente', 'señor', 'empresa', 'nombre', 'fecha',
]);

/** Cuánta basura se tolera antes de dar el texto por ilegible. */
const TOPE_PALABRAS_ROTAS = 0.05;
const MINIMO_PALABRAS_COMUNES = 0.25;

export function textoAprovechable(texto: string): boolean {
  const tokens = texto.split(/\s+/).filter(Boolean);
  // Un documento muy corto no da para juzgarlo; de eso se ocupa quien
  // llama, que sabe si esperaba treinta páginas o dos líneas.
  if (tokens.length < 200) return true;

  const rotas = tokens.filter(
    (w) =>
      /[A-Za-zÁÉÍÓÚÑáéíóúñ][^A-Za-zÁÉÍÓÚÑáéíóúñ\s][A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(w) &&
      !/^[\wÁÉÍÓÚÑáéíóúñ.'-]+$/.test(w),
  ).length;
  if (rotas / tokens.length > TOPE_PALABRAS_ROTAS) return false;

  const palabras = texto.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}/g) ?? [];
  if (palabras.length < 100) return true;
  const comunes = palabras.filter((p) => PALABRAS_COMUNES.has(p.toLowerCase())).length;
  return comunes / palabras.length >= MINIMO_PALABRAS_COMUNES;
}

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

export interface OpcionesExtraccion {
  /**
   * Leer con el modelo los PDF escaneados, en vez de rechazarlos.
   *
   * Va apagado por defecto y se enciende donde hace falta: transcribir
   * trescientas páginas son veinte llamadas al modelo, y no todos los
   * flujos quieren pagarlas sin avisar. Lo encienden la evaluación de
   * ofertas y la carga de proyectos, que es donde llegan escaneos.
   */
  ocr?: boolean;
  /** Para los avisos y para nombrar el archivo subido. */
  nombre?: string;
}

export interface TextoExtraido {
  texto: string;
  /** Para poder decírselo al usuario: "leí 12 páginas". */
  paginas?: number;
  origen: Clase;
  /** El texto se obtuvo transcribiendo un escaneo, no leyéndolo. */
  transcrito?: boolean;
  /** Tramos del escaneo que no se pudieron transcribir. */
  tramosVacios?: number;
}

export async function extraerTextoDocumento(
  archivo: File,
  opciones: OpcionesExtraccion = {},
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
    // La copia se guarda ANTES de leer: pdf.js transfiere el buffer que
    // recibe y, si el PDF resulta ser un escaneo, el OCR se encontraría
    // con un buffer vacío.
    const paraOcr = Buffer.from(buffer);
    try {
      const { text, pages } = await extractPdfText(buffer);
      const texto = text.trim();
      // Tener capa de texto no es tenerlo legible: si lo que sale es
      // un amasijo, se transcribe como si fuera un escaneo.
      if (!textoAprovechable(texto)) {
        console.warn('[texto] capa de texto ilegible, se intenta OCR', {
          nombre: opciones.nombre ?? archivo.name,
          caracteres: texto.length,
        });
        if (opciones.ocr) {
          const { transcribirPdfEscaneado } = await import('./ocr-pdf');
          const t = await transcribirPdfEscaneado(paraOcr, {
            nombre: opciones.nombre ?? archivo.name,
          });
          const limpio = t.texto.trim();
          if (t.tramosFallidos === 0 && limpio.length > 0 && textoAprovechable(limpio)) {
            return {
              texto: limpio,
              paginas: t.paginas,
              origen: 'pdf',
              transcrito: true,
              tramosVacios: t.tramosVacios,
            };
          }
        }
        throw new DocumentoIlegibleError(
          'El PDF tiene texto, pero ilegible: la fuente incrustada está rota y lo que se extrae no son palabras.',
          'Vuelve a exportarlo o escanéalo de nuevo: evaluar sobre un texto así da por cumplido lo que nadie puede leer.',
        );
      }
      return { texto, paginas: pages, origen: 'pdf' };
    } catch (e) {
      if (!(e instanceof PdfHasNoTextError)) throw e;

      // Es un escaneo. Así llegan las ofertas: el postor imprime, firma,
      // sella y escanea. Si quien llama lo permite, se transcribe.
      if (opciones.ocr) {
        const { transcribirPdfEscaneado } = await import('./ocr-pdf');
        const t = await transcribirPdfEscaneado(paraOcr, {
          nombre: opciones.nombre ?? archivo.name,
        });
        // Una transcripción incompleta NO es el documento. Si algún
        // tramo se perdió pese a los reintentos, decirlo y dejar que el
        // que llama lo trate como ilegible: en una evaluación de
        // ofertas, media oferta transcrita se dictamina como "ausencia
        // total de la propuesta" y descalifica a alguien que sí había
        // presentado sus documentos. Es preferible que el acta diga que
        // no se pudo leer.
        if (t.tramosFallidos > 0) {
          throw new DocumentoIlegibleError(
            `El PDF está escaneado y la transcripción quedó incompleta: ${t.tramosFallidos} tramo(s) de páginas no se pudieron leer, de ${t.transcritas} página(s) intentadas.`,
            'Vuelve a subirlo, o sube el Word original si lo tienes: evaluar sobre una transcripción parcial descarta ofertas que sí cumplen.',
          );
        }
        if (t.texto.trim().length > 0) {
          return {
            texto: t.texto.trim(),
            paginas: t.paginas,
            origen: 'pdf',
            transcrito: true,
            tramosVacios: t.tramosVacios,
          };
        }
      }

      throw new DocumentoIlegibleError(
        'El PDF no tiene texto: parece escaneado.',
        'Pásalo por OCR, o sube el Word original si lo tienes.',
      );
    }
  }

  const texto = buffer.toString('utf8').trim();
  if (!texto) {
    throw new DocumentoIlegibleError('El archivo está vacío.', 'Sube el documento con contenido.');
  }
  return { texto, origen: 'texto' };
}
