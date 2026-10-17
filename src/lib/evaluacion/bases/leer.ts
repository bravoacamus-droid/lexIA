/**
 * Leer las bases que subió el usuario.
 *
 * Del PDF, página a página, para quitar las cabeceras que se repiten
 * (`paginas.ts`) y para saber en qué página está cada cosa: la columna
 * «Página» del formato de consultas y observaciones la pide (documento
 * 14 de César, 16/10/2026). Del Word, con mammoth: trae los párrafos y
 * las tablas en orden y sin cabeceras de página —un Word no tiene
 * páginas fijas, así que de él no sale número de página—.
 *
 * ## Las páginas escaneadas
 *
 * Las bases del CPA 04-2026-MDS/C-2 de la Municipalidad de Socos
 * (estructura metálica) tienen texto en quince de sus 41 páginas; las
 * páginas 9 a 34 —el Capítulo III, con el requerimiento y la definición
 * de servicios similares— están escaneadas y de cada una solo sale la
 * cabecera. La evaluación de bases revisaba un Capítulo III vacío y no
 * podía ver que esas bases aceptaban OBRAS como servicios similares,
 * que es justo lo que César pidió detectar. Esas páginas se transcriben
 * con el modelo (`transcribirPaginasSueltas`, el mismo de la evaluación
 * de ofertas) y la transcripción se guarda en la evaluación, para que
 * una reevaluación o el pliego de consultas no la repitan.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';
import { assertHasExtractableText, paginasSinTexto } from '@/lib/ai/pdf';
import { transcribirPaginasSueltas } from '@/lib/ai/ocr-pdf';
import { paginasSinCabeceras } from './paginas';

export interface BasesLeidas {
  texto: string;
  origen: 'docx' | 'pdf';
  paginas?: number;
  /**
   * El texto de cada página, ya sin cabeceras. `texto` es exactamente
   * `textoPaginas.join('\n')`: así una posición del texto dice su página.
   */
  textoPaginas?: string[];
  /** El número impreso de cada página, o `null` si no se supo. */
  folios?: Array<number | null>;
  /** Páginas (desde 1) que se leyeron transcribiendo la imagen. */
  transcritas?: number[];
  /** Páginas escaneadas que no se pudieron transcribir. */
  ilegibles?: number[];
}

/** Lo que la evaluación necesita de la lectura (`evaluarBases`). */
export function camposDeLaLectura(l: BasesLeidas) {
  return {
    texto: l.texto,
    origen: l.origen,
    textoPaginas: l.textoPaginas,
    folios: l.folios,
    transcritas: l.transcritas,
    ilegibles: l.ilegibles,
  };
}

/** Más de esto escaneado no cabe en el tiempo de una evaluación de bases. */
const MAX_ESCANEADAS = 120;
/** Páginas por llamada al modelo. Tramos cortos y en paralelo: acaba antes. */
const TRAMO = 8;

/** «=== Página 12 ===\n…» → mapa página → texto. */
function porPagina(transcrito: string): Map<number, string> {
  const salida = new Map<number, string>();
  for (const trozo of transcrito.split(/(?==== P[áa]gina \d+ ===)/)) {
    const n = Number(/=== P[áa]gina (\d+) ===/.exec(trozo)?.[1]);
    if (!n) continue;
    const t = trozo.replace(/=== P[áa]gina \d+ ===/, '').replace(/\[p[áa]gina sin texto legible\]/gi, '').trim();
    salida.set(n, `${salida.get(n) ?? ''} ${t}`.trim());
  }
  return salida;
}

function enTramos(paginas: number[]): Array<[number, number]> {
  const rangos: Array<[number, number]> = [];
  for (const n of paginas) {
    const ultimo = rangos[rangos.length - 1];
    if (ultimo && n === ultimo[1] + 1 && n - ultimo[0] < TRAMO) ultimo[1] = n;
    else rangos.push([n, n]);
  }
  return rangos;
}

/**
 * Dónde se guarda lo transcrito: página (desde 1) → texto.
 *
 * Va en la columna `textos` de la evaluación (migración 0085, que ya
 * tiene la RLS del dueño). En el almacenamiento no se puede: el bucket
 * `uploads` solo admite PDF, imágenes y Word.
 */
export interface CacheDeTranscripcion {
  leer: () => Promise<Record<string, string> | null>;
  guardar: (transcritas: Record<string, string>) => Promise<void>;
}

/** La caché en la fila de la evaluación de bases. */
export function cacheEnEvaluacion(cliente: SupabaseClient, evaluacionId: string): CacheDeTranscripcion {
  return {
    leer: async () => {
      const { data } = await cliente.from('evaluations').select('textos').eq('id', evaluacionId).maybeSingle();
      const t = (data as { textos: { basesTranscritas?: Record<string, string> } | null } | null)?.textos;
      return t?.basesTranscritas ?? null;
    },
    guardar: async (transcritas) => {
      const { error } = await cliente
        .from('evaluations')
        .update({ textos: { basesTranscritas: transcritas } } as never)
        .eq('id', evaluacionId);
      if (error) console.error('[bases] no se guardó la transcripción:', error.message);
    },
  };
}

/**
 * Transcribe las páginas escaneadas que falten y devuelve todas las que
 * se tengan. Lo transcrito se guarda aunque una parte falle.
 */
async function transcribirEscaneadas(
  ruta: string,
  buffer: Buffer,
  escaneadas: number[],
  cache?: CacheDeTranscripcion,
): Promise<Map<number, string>> {
  const guardadas = { ...((await cache?.leer().catch(() => null)) ?? {}) };
  const faltan = escaneadas.filter((n) => !guardadas[String(n)]);
  if (faltan.length > 0) {
    const nombre = (ruta.split('/').pop() ?? 'bases.pdf').replace(/\.pdf$/i, '');
    const resultados = await Promise.all(
      enTramos(faltan).map(async ([desde, fin]) => {
        for (let intento = 1; intento <= 2; intento++) {
          try {
            return await transcribirPaginasSueltas(buffer, desde, fin, nombre);
          } catch (e) {
            console.error(`[bases] transcripción ${desde}-${fin}, intento ${intento}:`, (e as Error).message.slice(0, 120));
          }
        }
        return '';
      }),
    );
    let nuevas = 0;
    for (const r of resultados) {
      for (const [n, t] of porPagina(r)) {
        if (t.length < 20) continue;
        guardadas[String(n)] = t;
        nuevas++;
      }
    }
    if (nuevas > 0) await cache?.guardar(guardadas);
  }
  return new Map(Object.entries(guardadas).map(([k, v]) => [Number(k), v]));
}

export async function leerBases(
  admin: SupabaseClient,
  ruta: string,
  opciones: {
    cache?: CacheDeTranscripcion;
    /**
     * `false`: no transcribir nada nuevo, usar solo lo guardado. Para
     * ubicar hallazgos ya hechos (el pliego de una evaluación anterior),
     * donde basta saber dónde empieza cada página.
     */
    transcribir?: boolean;
  } = {},
): Promise<BasesLeidas> {
  const { cache, transcribir = true } = opciones;
  const { data, error } = await admin.storage.from('uploads').download(ruta);
  if (error || !data) throw new Error(`No se pudieron descargar las bases: ${error?.message ?? 'sin datos'}`);
  const buffer = Buffer.from(await data.arrayBuffer());

  if (/\.docx$/i.test(ruta)) {
    const mammoth = (await import('mammoth')).default;
    const { value } = await mammoth.extractRawText({ buffer });
    return { texto: value, origen: 'docx' };
  }

  // Una copia: pdf.js se queda con el búfer que recibe.
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const crudas = ((await extractText(pdf, { mergePages: false })).text as string[]).map(String);

  const escaneadas = paginasSinTexto(crudas);
  const transcritas: number[] = [];
  let ilegibles: number[] = [];
  if (escaneadas.length > 0 && escaneadas.length <= MAX_ESCANEADAS) {
    const leidas = transcribir
      ? await transcribirEscaneadas(ruta, Buffer.from(buffer), escaneadas, cache)
      : new Map(Object.entries((await cache?.leer().catch(() => null)) ?? {}).map(([k, v]) => [Number(k), v]));
    for (const n of escaneadas) {
      const t = leidas.get(n);
      if (t) {
        // Se conserva lo que traía la capa de texto —la cabecera— delante:
        // así la cabecera se sigue quitando igual que en las demás hojas.
        crudas[n - 1] = `${crudas[n - 1]}\n${t}`;
        transcritas.push(n);
      } else {
        ilegibles.push(n);
      }
    }
  } else if (escaneadas.length > MAX_ESCANEADAS) {
    ilegibles = escaneadas;
  }

  const { paginas, folios } = paginasSinCabeceras(crudas);
  const texto = paginas.join('\n');
  // Un escaneo sin capa de texto que tampoco se pudo transcribir no se
  // puede cotejar: mejor decirlo.
  assertHasExtractableText(texto, pdf.numPages);
  return {
    texto,
    origen: 'pdf',
    paginas: pdf.numPages,
    textoPaginas: paginas,
    folios,
    ...(transcritas.length ? { transcritas } : {}),
    ...(ilegibles.length ? { ilegibles } : {}),
  };
}
