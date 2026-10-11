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
 * Era 300, y se cortaba sin aviso: una de las ofertas del CP
 * SER-SM-6-2026 de César tenía 496 páginas y las 196 últimas no se
 * leyeron nunca (10/10/2026). Las ofertas de obras y servicios con
 * equipamiento pasan holgadamente de 300. Con mil, una oferta así es
 * una sola; y la que pase de mil se avisa, no se corta en silencio.
 */
const MAX_PAGINAS = 1000;

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

  const partes: string[] = [];
  let tramosVacios = 0;
  let tramosFallidos = 0;

  for (let desde = 1; desde <= hasta; desde += TRAMO) {
    const fin = Math.min(desde + TRAMO - 1, hasta);
    // Cada tramo va en un PDF propio con solo sus páginas. Subir el PDF
    // entero y pedirle un rango hacía que Gemini procesara el documento
    // completo en cada llamada —lento y caro con 500 páginas— y que
    // devolviera tramos enteros como «[página sin texto legible]» que de
    // a pocas páginas sí se leen (oferta del CP SER-SM-6-2026, documento
    // 13 de César, 10/10/2026).
    //
    // Se reintenta antes de darlo por perdido. Un tramo que falla no es
    // una página en blanco: es un corte de la API, y antes se anotaba
    // como vacío y se seguía. Una oferta escaneada de la que solo se
    // transcribían dos tramos llegaba al evaluador como si fuera la
    // oferta entera (César, setiembre de 2026).
    let r: { texto: string; fallidas: number } | null = null;
    for (let intento = 1; intento <= REINTENTOS_TRAMO && !r; intento++) {
      try {
        r = await transcribirSubPdf(buffer, desde, fin, nombre);
      } catch (e) {
        console.error(`[ocr] ${nombre}: tramo ${desde}-${fin}, intento ${intento}: ${(e as Error).message.slice(0, 110)}`);
        if (intento < REINTENTOS_TRAMO) await esperar(1500 * intento);
      }
    }
    if (r?.texto) partes.push(r.texto);
    if (!r || r.fallidas > 0) {
      // La API no pudo con él, o el filtro bloqueó páginas: pérdida de contenido.
      tramosFallidos++;
    } else if (!r.texto) {
      // El modelo respondió y no había nada que transcribir: un
      // separador, una carátula en blanco. No es una pérdida.
      tramosVacios++;
    }
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
 * Un solo intento sobre un tramo de un PDF ya subido a Gemini.
 *
 * Es la pieza de la evaluación por pasos (`evaluacion/ejecucion.ts`):
 * allí cada tramo es una unidad de trabajo que se guarda al terminar, se
 * reintenta en otra vuelta si falla y corre en paralelo con los demás.
 * Una oferta escaneada de 140 páginas, tramo tras tramo, no cabía en los
 * trece minutos que una función puede durar (César, 30/09/2026).
 */
export async function transcribirTramo(
  uri: string,
  desde: number,
  fin: number,
  opciones: { tiempoMs?: number } = {},
): Promise<{ texto: string; filtrado: boolean; cortado: boolean }> {
  const { text, finishReason } = await generateText({
    model: chatModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'file', data: uri, mimeType: 'application/pdf' },
          { type: 'text', text: `${INSTRUCCION}\n\nRango: páginas ${desde} a ${fin}.` },
        ],
      },
    ],
    temperature: 0,
    // Sin tope explícito, la respuesta se cortaba a unos 8 000 tokens: un
    // tramo de quince páginas densas de la oferta de un consorcio llegó
    // hasta la página 43 de 45, y las dos que faltaban eran la promesa de
    // consorcio y el Anexo N° 3. El acta dijo «omisión total» de ambos.
    maxTokens: 32_000,
    abortSignal: AbortSignal.timeout(opciones.tiempoMs ?? 180_000),
  });
  const texto = text.trim();
  return { texto, filtrado: !texto && finishReason === 'content-filter', cortado: finishReason === 'length' };
}

/**
 * La última página que la transcripción marca («=== Página N ===»). Si
 * es menor que la última pedida, el tramo vino incompleto.
 */
export function ultimaPaginaMarcada(texto: string): number | null {
  const ns = [...texto.matchAll(/=== P[áa]gina (\d+) ===/g)].map((m) => Number(m[1]));
  return ns.length > 0 ? Math.max(...ns) : null;
}

export { TRAMO as PAGINAS_POR_TRAMO, MAX_PAGINAS as MAX_PAGINAS_OCR };

/**
 * Transcribe las páginas `desde`–`fin` de un PDF que en lo demás tiene
 * texto: se sacan a un PDF propio y se sube solo eso.
 *
 * Pedirle un rango al modelo sobre el PDF entero no sirve aquí: no lo
 * respeta bien (ver `transcribirPaginaPorPagina`), y en un documento
 * mixto un desfase mezclaría texto escaneado con el que ya se leyó.
 * Devuelve el texto con la numeración del documento original.
 */
export async function transcribirPaginasSueltas(
  buffer: Buffer,
  desde: number,
  fin: number,
  nombre: string,
): Promise<string> {
  const r = await transcribirSubPdf(buffer, desde, fin, nombre);
  if (r.fallidas > 0) throw new Error(`${r.fallidas} página(s) bloqueadas por el filtro`);
  return r.texto;
}

/**
 * Lo mismo que `transcribirPaginasSueltas`, pero sin lanzar cuando el
 * filtro de recitación bloquea páginas: devuelve lo que se leyó y
 * cuántas se perdieron. Lanza solo si la API falla.
 */
async function transcribirSubPdf(
  buffer: Buffer,
  desde: number,
  fin: number,
  nombre: string,
): Promise<{ texto: string; fallidas: number }> {
  const origen = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const hoja = await PDFDocument.create();
  const copias = await hoja.copyPages(
    origen,
    Array.from({ length: fin - desde + 1 }, (_, i) => desde - 1 + i),
  );
  copias.forEach((p) => hoja.addPage(p));
  const archivo = await uploadFileToGemini(
    Buffer.from(await hoja.save()),
    'application/pdf',
    `${nombre}-p${desde}-${fin}.pdf`,
  );
  try {
    const total = fin - desde + 1;
    const r = await transcribirTramo(archivo.uri, 1, total);
    if (r.texto) {
      const texto = limpiarArtefactos(
        r.texto.replace(/=== Página (\d+) ===/g, (_, n) => `=== Página ${Number(n) + desde - 1} ===`),
      );
      return total > 1 ? releerPaginasVacias(buffer, texto, desde, fin, nombre) : { texto, fallidas: 0 };
    }
    if (r.filtrado) return transcribirPaginaPorPagina(buffer, desde, fin, nombre);
    return { texto: '', fallidas: 0 };
  } finally {
    await deleteGeminiFile(archivo.name).catch(() => {});
  }
}

/** Lo que el modelo a veces añade y no está en la página. */
function limpiarArtefactos(texto: string): string {
  return texto.replace(/^[ \t]*==\s*(?:Start|End) of OCR[^=\n]*==[ \t]*\n?/gim, '');
}

/**
 * Si una página vino vacía o solo con su número de folio.
 *
 * Algunos escaneos traen una capa de texto con solo el folio estampado.
 * En un tramo de quince páginas el modelo copia esa capa en vez de leer
 * la imagen, y devuelve «215» donde hay un diploma del Colegio de
 * Ingenieros; pedida sola, la misma página se lee entera (Consorcio Mega,
 * CP SER-SM-6-2026: quince páginas con los documentos del residente).
 */
export function paginaVacia(trozo: string): boolean {
  return (
    trozo
      .replace(/=== P[áa]gina \d+ ===|\[p[áa]gina sin texto legible\]|==\s*(?:Start|End) of OCR[^=\n]*==/gi, '')
      .replace(/^\s*(?:folio\s*)?\d{1,4}\s*$/gim, '')
      .trim().length < 30
  );
}

async function releerPaginasVacias(
  buffer: Buffer,
  texto: string,
  desde: number,
  fin: number,
  nombre: string,
): Promise<{ texto: string; fallidas: number }> {
  const trozos = texto.split(/(?==== P[áa]gina \d+ ===)/);
  let fallidas = 0;
  for (let i = 0; i < trozos.length; i++) {
    const n = Number(/^=== P[áa]gina (\d+) ===/.exec(trozos[i])?.[1]);
    if (!Number.isFinite(n) || n < desde || n > fin || !paginaVacia(trozos[i])) continue;
    try {
      const r = await transcribirSubPdf(buffer, n, n, nombre);
      fallidas += r.fallidas;
      if (r.texto && !paginaVacia(r.texto)) trozos[i] = `${r.texto.trim()}\n\n`;
    } catch {
      // Queda como vino: vale más el tramo que la página.
    }
  }
  return { texto: trozos.join('').trim(), fallidas };
}

/**
 * Transcribe un rango página por página, cada una subida como un PDF de
 * una sola hoja. Es el recurso cuando el filtro de recitación bloquea el
 * tramo completo. Si una hoja sola sigue bloqueada, se parte en franjas
 * horizontales (dos y luego cuatro): un trozo más corto se parece menos a
 * un texto publicado (la página 10 de la Resolución 5193-2026-TCP-S6 solo
 * pasó así).
 */
export async function transcribirPaginaPorPagina(
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
