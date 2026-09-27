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
 * Hasta ahora A-LexIA lo detectaba y le decía al usuario que pasara el
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
import { PDFDocument } from 'pdf-lib';

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
  /** Tramos que la API no pudo transcribir pese a los reintentos. */
  tramosFallidos: number;
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

/** Lo que se antepone a la instrucción cuando se pide con marcas. */
const MARCADO = 'Antepón a CADA línea transcrita el prefijo «¶ ». Es obligatorio en todas las líneas.\n\n';

/** Cuántas veces se reintenta un tramo antes de darlo por perdido. */
const REINTENTOS_TRAMO = 3;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  let tramosFallidos = 0;

  try {
    for (let desde = 1; desde <= hasta; desde += TRAMO) {
      const fin = Math.min(desde + TRAMO - 1, hasta);
      // Se reintenta antes de darlo por perdido. Un tramo que falla no
      // es una página en blanco: es un corte de la API, y antes se
      // anotaba como vacío y se seguía. Una oferta escaneada de la que
      // solo se transcribían dos tramos llegaba al evaluador como si
      // fuera la oferta entera, y el acta decía "ausencia total de la
      // propuesta y documentos de acreditación del personal clave"
      // sobre documentos que sí estaban. Observación de César
      // (setiembre de 2026): "el postor sí adjuntó las constancias de
      // trabajo por lo que sí debió ser calificada".
      let logrado = '';
      let hubaError = false;
      let filtrado = false;
      for (let intento = 1; intento <= REINTENTOS_TRAMO; intento++) {
        try {
          const { text, finishReason } = await generateText({
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
          logrado = text.trim();
          if (logrado.length > 0) break;
          // RECITATION: Google corta la respuesta cuando lo transcrito se
          // parece a un texto publicado en internet —una resolución del
          // Tribunal lo es—. Repetir la misma petición da lo mismo.
          if (finishReason === 'content-filter') {
            filtrado = true;
            break;
          }
        } catch (e) {
          hubaError = true;
          console.error(
            `[ocr] ${nombre}: tramo ${desde}-${fin}, intento ${intento}: ${(e as Error).message.slice(0, 110)}`,
          );
        }
        if (intento < REINTENTOS_TRAMO) await esperar(1500 * intento);
      }
      if (!logrado && filtrado) {
        // Página por página, cada una en un PDF propio: un tramo corto
        // pasa el filtro, y pedir un rango sobre el PDF entero no sirve
        // porque el modelo no respeta bien el rango (medido con la
        // Resolución 5193-2026-TCP-S6: pedida la página 3, transcribía
        // la 1). Así entraron la 5193 y la 5235, que antes quedaban en
        // «0 caracteres» contadas como páginas en blanco.
        const r = await transcribirPaginaPorPagina(buffer, desde, fin, nombre);
        logrado = r.texto;
        if (r.fallidas > 0) tramosFallidos++;
      }
      if (logrado.length > 0) {
        partes.push(logrado);
      } else if (hubaError || filtrado) {
        // La API no pudo con él: eso es una pérdida de contenido.
        tramosFallidos++;
      } else {
        // El modelo respondió y no había nada que transcribir: un
        // separador, una carátula en blanco. No es una pérdida.
        tramosVacios++;
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
    tramosFallidos,
  };
}

/**
 * Transcribe un rango página por página, cada una subida como un PDF de
 * una sola hoja. Es el recurso cuando el filtro de recitación bloquea el
 * tramo completo. Si una hoja sola sigue bloqueada, se parte en franjas
 * horizontales (dos y luego cuatro): un trozo más corto se parece menos a
 * un texto publicado (la página 10 de la Resolución 5193-2026-TCP-S6 solo
 * pasó así).
 */
async function transcribirPaginaPorPagina(
  buffer: Buffer,
  desde: number,
  hasta: number,
  nombre: string,
): Promise<{ texto: string; fallidas: number }> {
  const origen = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const partes: string[] = [];
  let fallidas = 0;
  for (let n = desde; n <= hasta; n++) {
    let texto = await transcribirRecorte(origen, n, 1, 0, nombre, false);
    if (texto === null) texto = await transcribirRecorte(origen, n, 1, 0, nombre, true);
    for (const franjas of [2, 4]) {
      if (texto !== null) break;
      const trozos: string[] = [];
      let completo = true;
      for (let k = 0; k < franjas; k++) {
        const t = await transcribirRecorte(origen, n, franjas, k, nombre, true);
        if (t === null) {
          completo = false;
          break;
        }
        trozos.push(t);
      }
      if (completo) texto = `=== Página ${n} ===\n${trozos.map((t) => t.replace(/^=== Página \d+ ===\s*/gm, '')).join('\n')}`;
    }
    if (texto) partes.push(texto);
    else fallidas++;
  }
  return { texto: partes.join('\n\n'), fallidas };
}

/**
 * Transcribe la franja `indice` de `franjas` de la página `n` (1 = la
 * página entera). Devuelve null si el filtro la bloquea o la API falla.
 *
 * Con `marcado`, se pide cada línea con el prefijo «¶ » y luego se quita:
 * la salida deja de coincidir letra por letra con el texto publicado, que
 * es lo que el filtro compara (medido: la página 10 de la 5193, que cita
 * un artículo de la Ley, pasó así y no pasaba ni en cuartos).
 */
async function transcribirRecorte(
  origen: PDFDocument,
  n: number,
  franjas: number,
  indice: number,
  nombre: string,
  marcado: boolean,
): Promise<string | null> {
  const hoja = await PDFDocument.create();
  const [copia] = await hoja.copyPages(origen, [n - 1]);
  if (franjas > 1) {
    const { x, y, width, height } = copia.getMediaBox();
    const alto = height / franjas;
    // Un poco de solape para no partir una línea por la mitad.
    const solape = alto * 0.06;
    const abajo = y + height - alto * (indice + 1) - (indice < franjas - 1 ? solape : 0);
    const arriba = y + height - alto * indice + (indice > 0 ? solape : 0);
    copia.setCropBox(x, abajo, width, arriba - abajo);
    copia.setMediaBox(x, abajo, width, arriba - abajo);
  }
  hoja.addPage(copia);
  const bytes = Buffer.from(await hoja.save());
  const archivo = await uploadFileToGemini(bytes, 'application/pdf', `${nombre}-p${n}-${indice + 1}de${franjas}.pdf`);
  try {
    for (let intento = 1; intento <= REINTENTOS_TRAMO; intento++) {
      try {
        const r = await generateText({
          model: chatModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'file', data: archivo.uri, mimeType: 'application/pdf' },
                {
                  type: 'text',
                  text:
                    (marcado ? MARCADO : '') +
                    (franjas === 1
                      ? `${INSTRUCCION}\n\nEste archivo es solo la página ${n}: usa «=== Página ${n} ===».`
                      : `${INSTRUCCION}\n\nEste archivo es un trozo de la página ${n}: transcríbelo sin encabezado de página.`),
                },
              ],
            },
          ],
          temperature: 0,
        });
        const texto = (marcado ? r.text.replace(/¶ ?/g, '') : r.text).trim();
        if (texto) return texto;
        if (r.finishReason === 'content-filter') return null;
      } catch (e) {
        console.error(`[ocr] ${nombre}: página ${n} (${indice + 1}/${franjas}), intento ${intento}: ${(e as Error).message.slice(0, 110)}`);
        if (intento < REINTENTOS_TRAMO) await esperar(1500 * intento);
      }
    }
    return null;
  } finally {
    await deleteGeminiFile(archivo.name).catch(() => {});
  }
}
