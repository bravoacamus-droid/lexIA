/**
 * Leer un PDF escaneado, que es como llegan las ofertas de verdad.
 *
 * POR QUÉ EXISTE
 *
 * Al probar la evaluación de ofertas con las tres ofertas armadas que
 * hay en el repositorio salió esto: `OFERTAIVP2026.pdf` no tiene una
 * sola letra extraíble, y la de la Municipalidad de Pichari da 10 500
 * caracteres en 85 páginas —las portadas y poco más—. Son escaneos. El
 * postor imprime, firma, sella y escanea; eso es lo que sube al SEACE y
 * lo que recibe el comité.
 *
 * Hasta ahora LexIA lo detectaba y le decía al usuario que pasara el
 * documento por un OCR externo. Para un requerimiento de veinte páginas
 * es un incordio; para una oferta de trescientas, es que no se puede
 * usar.
 *
 * CÓMO
 *
 * El PDF se sube una sola vez a la Files API de Google y el modelo lo
 * lee nativamente, página a página: no hay OCR previo ni imágenes que
 * convertir. Comprobado con la oferta de TICSANI INGENIEROS E.I.R.L.:
 * transcribe los anexos, las firmas, los DNI y las cabeceras del
 * procedimiento.
 *
 * POR TRAMOS, Y NO POR CAPRICHO
 *
 * Una respuesta del modelo no da para trescientas páginas: se corta a la
 * mitad de una frase y nadie se entera. Se piden tramos de quince
 * páginas y se juntan. Cada tramo se marca con su número de página, así
 * que si falta uno se ve.
 */
import { generateText } from 'ai';
import { chatModel } from './gemini';
import { deleteGeminiFile, uploadFileToGemini } from './gemini-files';
import { extractPdfText } from './pdf';

/** Páginas por llamada. */
const TRAMO = 15;

/**
 * Tope de páginas que se transcriben.
 *
 * Una oferta larga son doscientas o trescientas páginas: catorce o
 * veinte llamadas. Más allá, el coste deja de compensar frente a pedirle
 * al usuario el documento en otro formato.
 */
const MAX_PAGINAS = 300;

export interface PdfTranscrito {
  texto: string;
  paginas: number;
  /** Páginas efectivamente transcritas. */
  transcritas: number;
  /** Tramos que no devolvieron nada, si los hubo. */
  tramosVacios: number;
}

const INSTRUCCION = `Transcribe literalmente el texto de este documento en el rango de páginas que se te indica.

REGLAS:
· Antes de cada página escribe exactamente: === Página N ===
· Transcribe lo que se lee: encabezados, cuerpo, tablas, sellos, firmas,
  nombres, números de documento, montos y fechas.
· Las tablas, en texto, fila por fila, separando las columnas con " | ".
· NO resumas, NO interpretes, NO comentes y NO añadas nada que no esté
  en la página. Si una página está en blanco o es ilegible, escribe
  "[página sin texto legible]" bajo su encabezado.
· No repitas páginas fuera del rango pedido.`;

/**
 * Transcribe un PDF escaneado.
 *
 * No lanza si un tramo falla: devuelve lo que haya podido leer y cuántos
 * tramos quedaron vacíos. Media oferta transcrita es más útil que un
 * error, siempre que quien la reciba sepa que está incompleta.
 */
export async function transcribirPdfEscaneado(
  entrada: Buffer | Uint8Array,
  opciones: { nombre?: string; maxPaginas?: number } = {},
): Promise<PdfTranscrito> {
  const { nombre = 'documento.pdf', maxPaginas = MAX_PAGINAS } = opciones;
  // Copia propia, y no por prudencia: pdf.js se queda con el ArrayBuffer
  // que se le pasa —lo transfiere— y al reutilizarlo después revienta con
  // "Cannot perform Construct on a detached ArrayBuffer". Cada lectura,
  // su copia.
  const buffer = Buffer.from(entrada);

  // Cuántas páginas tiene. Se lee sin exigir texto: justo no lo tiene.
  const { pages } = await extractPdfText(Buffer.from(buffer), { detectScanned: false });
  const hasta = Math.min(pages, maxPaginas);

  const archivo = await uploadFileToGemini(buffer, 'application/pdf', nombre);

  const partes: string[] = [];
  let tramosVacios = 0;

  try {
    for (let desde = 1; desde <= hasta; desde += TRAMO) {
      const fin = Math.min(desde + TRAMO - 1, hasta);
      try {
        const { text } = await generateText({
          model: chatModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'file', data: archivo.uri, mimeType: 'application/pdf' },
                { type: 'text', text: `${INSTRUCCION}\n\nRango: páginas ${desde} a ${fin}.` },
              ],
            },
          ],
          temperature: 0,
        });
        const limpio = text.trim();
        if (limpio.length > 0) partes.push(limpio);
        else tramosVacios++;
      } catch (e) {
        tramosVacios++;
        console.error(
          `[ocr] ${nombre}: falló el tramo ${desde}-${fin}: ${(e as Error).message.slice(0, 120)}`,
        );
      }
    }
  } finally {
    // El archivo se borra solo a las 48 h, pero la cuota es compartida.
    await deleteGeminiFile(archivo.name).catch(() => {});
  }

  return {
    texto: partes.join('\n\n'),
    paginas: pages,
    transcritas: hasta,
    tramosVacios,
  };
}
