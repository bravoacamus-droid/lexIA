/**
 * Volver a mirar la IMAGEN de unas páginas de la oferta antes de observar
 * algo que solo consta en la transcripción.
 *
 * POR QUÉ
 *
 * César, documento 15 (17/10/2026), LP Abreviada N° 005-2026-MDK/OC-2
 * (material de afirmado, Kimbiri). Tres observaciones nacieron de la
 * transcripción del escaneo, no del documento:
 *   · POZO HCJ: «TRESICIENTOS … SETECIENTOS CINCUENTA CUENTA CON 00/100»
 *     en el Anexo N° 6 (página 56). En la imagen dice «TRESCIENTOS
 *     CINCUENTA Y CUATRO MIL SETECIENTOS CINCUENTA CON 00/100 SOLES».
 *   · AGUILAR HUAYLLA: un RUC de diez dígitos («1041848088») que solo
 *     estaba en la transcripción de un sello; el Anexo N° 1 y el sello
 *     dicen 10418480888.
 *   · EDDU CONTRATISTAS: una conformidad que en la imagen apenas se lee
 *     y que la transcripción devolvió entera y nítida, con montos.
 * Una página escaneada se transcribe en un tramo de quince; mirada sola, y
 * con una pregunta concreta, se lee mejor. Esto no reemplaza la
 * transcripción: se usa solo para confirmar un defecto o un dato que
 * decide el resultado.
 */
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { deleteGeminiFile, uploadFileToGemini } from '@/lib/ai/gemini-files';
import { parseJsonLoose } from '@/lib/ai/json-suelto';

/**
 * Devuelve un PDF con solo las páginas pedidas (numeración del documento
 * original, «=== Página N ===»), en ese orden; null si no hay ninguna.
 */
export type LectorDePaginas = (paginas: number[]) => Promise<Buffer | null>;

/**
 * Las páginas del texto transcrito donde aparece lo buscado. Solo las de
 * la oferta principal: tras «=== TOMO n» la numeración vuelve a empezar y
 * el lector no sabe de qué archivo son.
 */
export function paginasDonde(texto: string, buscado: RegExp | string, maximo = 4): number[] {
  const principal = texto.split(/^=== TOMO \d+/m)[0];
  const rx = typeof buscado === 'string' ? null : buscado;
  const aguja = typeof buscado === 'string' ? normalizar(buscado) : '';
  const encontradas: number[] = [];
  for (const trozo of principal.split(/(?==== P[áa]gina \d+ ===)/)) {
    const n = Number(trozo.match(/^=== P[áa]gina (\d+) ===/)?.[1]);
    if (!Number.isFinite(n) || n <= 0) continue;
    const coincide = rx ? new RegExp(rx.source, rx.flags.replace('g', '')).test(trozo) : normalizar(trozo).includes(aguja);
    if (coincide && !encontradas.includes(n)) encontradas.push(n);
    if (encontradas.length >= maximo) break;
  }
  return encontradas;
}

function normalizar(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
}

/**
 * Hace una pregunta sobre la imagen de unas páginas y devuelve el JSON de
 * la respuesta, o null si no se pudo (sin lector, sin páginas, la API
 * falló). Quien llama decide qué hacer sin la respuesta: nunca se da por
 * confirmado lo que no se pudo mirar.
 */
export async function preguntarALasPaginas(args: {
  lector: LectorDePaginas | undefined;
  paginas: number[];
  sistema: string;
  pregunta: string;
  nombre?: string;
  maxTokens?: number;
}): Promise<Record<string, unknown> | null> {
  const { lector } = args;
  // En orden: el PDF que arma el lector las pone así, y así se le dice al modelo.
  const paginas = [...new Set(args.paginas)].sort((a, b) => a - b);
  if (!lector || paginas.length === 0) return null;
  let pdf: Buffer | null = null;
  try {
    pdf = await lector(paginas);
  } catch (e) {
    console.warn('[evaluacion] no se pudieron sacar las páginas para mirarlas:', (e as Error).message.slice(0, 160));
    return null;
  }
  if (!pdf) return null;
  const archivo = await uploadFileToGemini(pdf, 'application/pdf', `${args.nombre ?? 'oferta'}-p${paginas.join('-')}.pdf`).catch(
    () => null,
  );
  if (!archivo) return null;
  try {
    const { text } = await generateText({
      model: chatModel,
      system: args.sistema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'file', data: archivo.uri, mimeType: 'application/pdf' },
            {
              type: 'text',
              text: `Este PDF contiene ${paginas.length} hoja(s) de la oferta. Cita SIEMPRE la página de la oferta, no el número de hoja del PDF: ${paginas.map((n, i) => `hoja ${i + 1} = página ${n}`).join('; ')}.\n\n${args.pregunta}`,
            },
          ],
        },
      ],
      temperature: 0,
      maxTokens: args.maxTokens ?? 3000,
      abortSignal: AbortSignal.timeout(120_000),
    });
    return (parseJsonLoose(text) as Record<string, unknown> | null) ?? null;
  } catch (e) {
    console.warn('[evaluacion] lectura de la imagen omitida:', (e as Error).message.slice(0, 160));
    return null;
  } finally {
    await deleteGeminiFile(archivo.name).catch(() => {});
  }
}
