/**
 * La evaluación por etapas, hecha por pasos que se guardan.
 *
 * POR QUÉ
 *
 * César subió dos ofertas escaneadas de 140 páginas (30/09/2026). Cada
 * una son diez tramos de transcripción, y la ruta los hacía uno tras otro
 * y oferta tras oferta: pasaba de los trece minutos que puede durar una
 * función, Vercel la cortaba y la fila se quedaba en «processing» para
 * siempre. Al recargar, nada que retomar: había que empezar de cero.
 *
 * CÓMO
 *
 * El trabajo se parte en unidades —leer una parte de un documento,
 * transcribir un tramo de quince páginas, leer qué exigen las Bases,
 * evaluar una etapa de un postor— que corren en paralelo y se guardan en
 * `evaluations.progreso` en cuanto terminan. Cada vuelta trabaja hasta un
 * plazo y devuelve el turno; la siguiente sigue donde quedó. Si una vuelta
 * muere a la mitad, se pierde solo lo que estaba en el aire.
 *
 * El resultado es el mismo de antes (`version: 'etapas-1'`), así que la
 * pantalla del resultado y el acta no cambian.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { paginasSinTexto, textoPorPagina } from '@/lib/ai/pdf';
import { textoAprovechable } from '@/lib/ai/texto-documento';
import { deleteGeminiFile, uploadFileToGemini } from '@/lib/ai/gemini-files';
import {
  MAX_PAGINAS_OCR,
  PAGINAS_POR_TRAMO,
  transcribirPaginaPorPagina,
  transcribirPaginasSueltas,
  transcribirTramo,
  ultimaPaginaMarcada,
} from '@/lib/ai/ocr-pdf';
import { cerrarEtapa, cerrarPostor, evaluarEtapa, leerBases, type LecturaBases } from './motor';
import { bloqueDeIdentificacion, identificarPostor, type IdentificacionPostor } from './identificacion';
import { contrastarFicha, fichasAContrastar } from './jurisprudencia';
import { claseDeVerificacion, verificarFicha } from './verificacion';
import { revisarCertificaciones } from './certificaciones';
import { etapasFinales, leerOfertaEconomica, type EtapasFinales, type OfertaEconomica } from './economica';
import {
  NOMBRE_TIPO_RONDA,
  aplicarRevision,
  revisarNegociacion,
  revisarRechazo,
  revisarSubsanacion,
  sinSubsanar,
  type RevisionPostor,
  type TipoDocumentoRonda,
} from './ronda';
import {
  ETAPAS,
  NOMBRE_ETAPA,
  avanza,
  ordenarPorPuntaje,
  type Etapa,
  type ResultadoEtapa,
  type ResultadoPostor,
} from './etapas';
import { construirActa } from './acta';
import { razonSocialDeLaOferta } from './postor';

/** Cuántas unidades corren a la vez. */
const PARALELO = 8;
/** Intentos de una unidad antes de darla por perdida. */
const INTENTOS = 3;
/** Vueltas antes de rendirse: una evaluación que no termina no puede girar sin fin. */
const MAX_VUELTAS = 25;
/** Gemini borra los archivos a las 48 h; pasado esto, se vuelve a subir. */
const VIDA_ARCHIVO_MS = 40 * 3600_000;
/** Lo que dura el turno sin renovarse. */
export const TURNO_SEGUNDOS = 300;

type LecturaParte =
  | { tipo: 'texto'; texto: string; paginas: number }
  | {
      tipo: 'ocr';
      paginas: number;
      /** Las páginas a transcribir, en tramos [desde, hasta]. */
      rangos: Array<[number, number]>;
      /**
       * Solo en un PDF mixto —con texto, salvo algunas páginas
       * escaneadas—: el texto de cada página. Las de `rangos` se
       * reemplazan por su transcripción.
       */
      textoPaginas?: string[];
      /** El PDF entero subido a Gemini, cuando es un escaneo completo. */
      uri?: string;
      archivo?: string;
      subido?: string;
      /** Texto de cada tramo, por su primera página. '' = tramo sin texto. */
      tramos: Record<string, string>;
    };

interface Documento {
  /** «anexo»: un documento de la segunda evaluación (subsanación, rechazo, negociación). */
  rol: 'bases' | 'oferta' | 'anexo';
  nombre: string;
  partes: string[];
  lecturas: Array<LecturaParte | null>;
  /** «fusionado»: era otro tomo de la oferta de otro documento y se evalúa junto con ella. */
  estado: 'leyendo' | 'listo' | 'ilegible' | 'fusionado';
  /** Si se fusionó: en qué documento (índice en `documentos`). */
  fusionadoEn?: number;
  texto?: string;
  transcrito?: boolean;
  motivo?: string;
  postor?: string;
  /** Quién presenta la oferta, leído de la promesa de consorcio (`identificacion.ts`). */
  identificacion?: IdentificacionPostor | null;
  /** El monto de su oferta económica (`economica.ts`); null si no se pudo leer. */
  ofertaEconomica?: OfertaEconomica | null;
}

export interface LineaResumen {
  texto: string;
  estado: 'hecho' | 'en_curso' | 'pendiente' | 'error';
}

/** Lo que ve la pantalla mientras se evalúa. */
export interface ResumenProgreso {
  paso: string;
  porcentaje: number;
  lineas: LineaResumen[];
  actualizado: string;
}

export interface Progreso {
  version: 1;
  /** Ya se buscaron tomos de una misma oferta entre los archivos (`fusionarTomos`). */
  tomosRevisados?: boolean;
  vueltas: number;
  documentos: Documento[];
  lectura?: LecturaBases;
  /** Etapas de cada oferta, en el orden de `documentos.slice(1)`. */
  etapas: ResultadoEtapa[][];
  fallos: Record<string, number>;
  errores: Record<string, string>;
  resumen?: ResumenProgreso;
  /** Segunda evaluación: solo los documentos nuevos (`ronda.ts`). */
  ronda?: EstadoRonda;
  /** Cuándo empezó esta evaluación (o esta ronda), para el reloj de la pantalla. */
  iniciada?: string;
}

interface EstadoRonda {
  numero: number;
  /** Cada documento nuevo: su lugar en `documentos`, de qué postor es y de qué tipo. */
  documentos: Array<{ indice: number; postor: string; tipo: TipoDocumentoRonda }>;
  noSubsanaron: string[];
  /** La revisión de cada postor afectado; null si no pudo hacerse. */
  revisados: Record<string, RevisionPostor | null>;
}

/** Lo que se guardó de la primera evaluación. */
interface ResultadoGuardado {
  version: string;
  bases: LecturaBases;
  postores: ResultadoPostor[];
  finales?: EtapasFinales;
  rondas?: Array<Record<string, unknown>>;
  [clave: string]: unknown;
}

const afectadosDe = (r: EstadoRonda) => [...new Set([...r.documentos.map((d) => d.postor), ...r.noSubsanaron])];

/**
 * El progreso de una segunda evaluación, listo para que el ejecutor lo
 * recorra. Lo llama la ruta que recibe los documentos.
 */
export function prepararRonda(args: {
  numero: number;
  documentos: Array<{ postor: string; tipo: TipoDocumentoRonda; nombre: string; path: string; partes?: string[] }>;
  noSubsanaron: string[];
}): Progreso {
  return {
    version: 1,
    vueltas: 0,
    iniciada: new Date().toISOString(),
    tomosRevisados: true,
    documentos: args.documentos.map((d) => {
      const partes = d.partes?.length ? d.partes : [d.path];
      return { rol: 'anexo', nombre: d.nombre, partes, lecturas: partes.map(() => null), estado: 'leyendo' };
    }),
    etapas: [],
    fallos: {},
    errores: {},
    ronda: {
      numero: args.numero,
      documentos: args.documentos.map((d, indice) => ({ indice, postor: d.postor, tipo: d.tipo })),
      noSubsanaron: args.noSubsanaron,
      revisados: {},
    },
  };
}

/** La revisión de un postor en la segunda evaluación, con lo que cambió. */
async function revisarPostorRonda(
  previo: ResultadoGuardado,
  nombre: string,
  documentos: Array<{ doc: Documento; tipo: TipoDocumentoRonda }>,
  ronda: EstadoRonda,
): Promise<RevisionPostor> {
  const postor = previo.postores.find((x) => x.postor === nombre);
  if (!postor) throw new Error(`No hay un postor «${nombre}» en la primera evaluación`);
  const rev: RevisionPostor = { cambios: [] };
  const texto = (tipo: TipoDocumentoRonda) =>
    documentos
      .filter((x) => x.tipo === tipo && x.doc.estado === 'listo')
      .map((x) => `=== ${x.doc.nombre} ===\n${x.doc.texto}`)
      .join('\n\n');
  for (const x of documentos.filter((x) => x.doc.estado === 'ilegible')) {
    rev.cambios.push(`No se pudo leer «${x.doc.nombre}» (${NOMBRE_TIPO_RONDA[x.tipo]}): ${x.doc.motivo ?? ''}`);
  }

  const anteriores = new Map(postor.etapas.flatMap((e) => e.fichas.map((f) => [f.id, f] as const)));
  if (ronda.noSubsanaron.includes(nombre)) {
    rev.fichas = sinSubsanar(postor);
  }
  const subsanacion = texto('subsanacion');
  if (subsanacion) {
    rev.fichas = { ...(rev.fichas ?? {}), ...(await revisarSubsanacion({ postor, textoDocumento: subsanacion })) };
  }
  for (const [id, f] of Object.entries(rev.fichas ?? {})) {
    const antes = anteriores.get(id);
    rev.cambios.push(
      `«${f.requisito}»: ${antes ? ETIQUETA_FICHA[antes.resultado] : '—'} → ${ETIQUETA_FICHA[f.resultado]}. ${f.hallazgo.split(' (Observación original')[0]}`,
    );
  }
  const rechazo = texto('rechazo');
  if (rechazo) {
    rev.rechazo = await revisarRechazo({ postor, textoDocumento: rechazo, cuantia: previo.bases.procedimiento.cuantiaMonto });
    rev.cambios.push(`Oferta económica ${rev.rechazo.rechazada ? 'RECHAZADA' : 'no rechazada'}: ${rev.rechazo.fundamento}`);
  }
  const negociacion = texto('negociacion');
  if (negociacion) {
    rev.negociacion = await revisarNegociacion({ postor, textoDocumento: negociacion });
    rev.cambios.push(
      `Negociación: ${rev.negociacion.acepta ? 'acepta' : 'no acepta'}${rev.negociacion.monto ? ` (monto ${rev.negociacion.monto.toLocaleString('es-PE')})` : ''}. ${rev.negociacion.fundamento}`,
    );
  }
  return rev;
}

const ETIQUETA_FICHA: Record<string, string> = {
  cumple: 'cumple',
  subsanable: 'sujeto a subsanación',
  no_cumple: 'no cumple',
  revision_humana: 'para revisión del comité',
};

interface Fila {
  bases_file_path: string | null;
  bases_partes: string[] | null;
  offer_files: Array<{ name: string; path: string; partes?: string[] }> | null;
  progreso: Progreso | null;
  result: ResultadoGuardado | null;
}

export type Desenlace =
  | { estado: 'done' }
  | { estado: 'failed'; motivo: string }
  | { estado: 'continuar'; paso: string };

function inicial(f: Fila): Progreso {
  const doc = (rol: Documento['rol'], nombre: string, partes: string[]): Documento => ({
    rol,
    nombre,
    partes,
    lecturas: partes.map(() => null),
    estado: 'leyendo',
  });
  const ofertas = f.offer_files ?? [];
  return {
    version: 1,
    vueltas: 0,
    documentos: [
      doc('bases', 'Bases Integradas', f.bases_partes?.length ? f.bases_partes : [f.bases_file_path ?? '']),
      ...ofertas.map((o) => doc('oferta', o.name, o.partes?.length ? o.partes : [o.path])),
    ],
    etapas: ofertas.map(() => []),
    fallos: {},
    errores: {},
  };
}

function nombreDesdeArchivo(nombre: string): string {
  return (
    nombre
      .replace(/\.(pdf|docx?|txt)$/i, '')
      .replace(/^oferta[_\s-]+/i, '')
      .replace(/^[A-Z0-9]{1,2}[_\s-]+/i, '')
      .replace(/_/g, ' ')
      .trim()
      .slice(0, 80) || nombre
  );
}

type LecturaOcr = Extract<LecturaParte, { tipo: 'ocr' }>;

/** Tramos de hasta quince páginas sobre una lista de páginas (ordenada). */
function enTramos(paginas: number[]): Array<[number, number]> {
  const rangos: Array<[number, number]> = [];
  for (const n of paginas.slice(0, MAX_PAGINAS_OCR)) {
    const ultimo = rangos[rangos.length - 1];
    if (ultimo && n === ultimo[1] + 1 && n - ultimo[0] < PAGINAS_POR_TRAMO) ultimo[1] = n;
    else rangos.push([n, n]);
  }
  return rangos;
}

/**
 * Cada tramo se guarda por su rango completo, «16-30». Por su primera
 * página no alcanza: una página que se reintenta sola puede ser la
 * primera de su tramo (la 16 de 16-30) y compartiría la clave.
 */
const claveRango = (r: [number, number]) => `${r[0]}-${r[1]}`;
const paginasDe = (l: LecturaOcr) => {
  const vistas = new Set<number>();
  for (const [a, b] of l.rangos) for (let n = a; n <= b; n++) vistas.add(n);
  return vistas.size;
};

/** Las páginas de un texto transcrito, por su marca «=== Página N ===». */
function paginasDelTexto(t: string, destino: Map<number, string>, sueltos: string[]) {
  for (const trozo of t.split(/(?==== P[áa]gina \d+ ===)/)) {
    const n = Number(/=== P[áa]gina (\d+) ===/.exec(trozo)?.[1]);
    if (!Number.isFinite(n)) {
      if (trozo.trim()) sueltos.push(trozo.trim());
      continue;
    }
    const previo = destino.get(n);
    if (!previo || trozo.trim().length > previo.length) destino.set(n, trozo.trim());
  }
}

/**
 * Si un tramo vino incompleto —la respuesta se cortó antes de la última
 * página pedida—, lo que falta se pide como un tramo nuevo en vez de
 * perderse. La última página marcada se descarta y se vuelve a pedir:
 * puede haber quedado a medias. Documento 13 de César: la promesa de
 * consorcio y el Anexo N° 3 de un postor estaban en las dos páginas que
 * se perdieron así, y el acta dijo «omisión total».
 */
/**
 * Las páginas que un tramo devolvió «en blanco» se piden otra vez, de a
 * una.
 *
 * Cuando la transcripción de un tramo falla, el modelo a veces rellena
 * sus páginas con «[página sin texto legible]». En el CP SER-SM-6-2026
 * pasó con tramos enteros de quince páginas —16-30, 46-60, 76-90 de una
 * oferta—, y con ellos se fueron el Anexo N° 3 y la promesa de consorcio
 * de un postor, que el acta dio por omitidos (documento 13 de César).
 * Pedidas de a tres seguían perdiéndose; de a una salieron todas salvo
 * las que de verdad eran separadores. Así que: lo que el tramo sí leyó se
 * queda, y cada página en blanco se vuelve a pedir sola. Una página sola
 * que vuelve en blanco se acepta: puede ser una foto o una hoja vacía.
 */
function reintentarPaginasEnBlanco(l: LecturaOcr, rango: [number, number], texto: string): string {
  const [desde, fin] = rango;
  if (fin <= desde) return texto;
  const paginas = texto.split(/(?==== P[áa]gina \d+ ===)/);
  const enBlanco: number[] = [];
  const quedan = paginas.filter((x) => {
    const n = Number(/=== P[áa]gina (\d+) ===/.exec(x)?.[1]);
    // Vacía también la que trae solo el número de folio, a veces envuelto
    // en «==Start of OCR for page 5== 215 ==End of OCR for page 5==»: así
    // vinieron quince páginas del Consorcio Mega con el diploma y los
    // certificados del residente, y el acta dijo que no los presentó.
    const vacia =
      Number.isFinite(n) &&
      x
        .replace(/=== P[áa]gina \d+ ===|\[p[áa]gina sin texto legible\]|==\s*(?:Start|End) of OCR[^=\n]*==/gi, '')
        .replace(/^\s*(?:folio\s*)?\d{1,4}\s*$/gim, '')
        .trim().length < 30;
    if (vacia && n >= desde && n <= fin) enBlanco.push(n);
    return !vacia;
  });
  if (enBlanco.length === 0) return texto;
  for (const n of enBlanco) {
    if (!l.rangos.some((r) => r[0] === n && r[1] === n)) l.rangos.push([n, n]);
  }
  console.warn(`[evaluacion] tramo ${desde}-${fin}: ${enBlanco.length} página(s) en blanco, se piden de a una`);
  return quedan.join('').trim();
}

/** Devuelve el texto que queda y el rango al que corresponde (puede achicarse). */
function completarTramo(
  l: LecturaOcr,
  rango: [number, number],
  texto: string,
): { texto: string; rango: [number, number] } {
  const [desde, fin] = rango;
  const ultima = ultimaPaginaMarcada(texto);
  if (ultima === null || ultima >= fin || ultima <= desde) return { texto, rango };
  const corte = texto.search(new RegExp(`=== P[áa]gina ${ultima} ===`));
  const i = l.rangos.findIndex((r) => r[0] === desde && r[1] === fin);
  if (i < 0) return { texto, rango };
  const nuevo: [number, number] = [desde, ultima - 1];
  l.rangos.splice(i, 1, nuevo, [ultima, fin]);
  console.warn(`[evaluacion] tramo ${desde}-${fin} llegó hasta la página ${ultima}: se piden ${ultima}-${fin} aparte`);
  return { texto: corte > 0 ? texto.slice(0, corte).trim() : texto, rango: nuevo };
}

/**
 * Los PDF ya descargados en esta vuelta: cada tramo necesita el PDF de su
 * parte para sacar sus páginas, y bajarlo de nuevo por cada tramo serían
 * gigas por oferta. Se guardan los últimos pocos.
 */
const PDF_EN_MEMORIA = new Map<string, Promise<Buffer>>();
function descargarUnaVez(cliente: SupabaseClient, path: string): Promise<Buffer> {
  let p = PDF_EN_MEMORIA.get(path);
  if (!p) {
    p = descargar(cliente, path);
    p.catch(() => PDF_EN_MEMORIA.delete(path));
    PDF_EN_MEMORIA.set(path, p);
    while (PDF_EN_MEMORIA.size > 6) PDF_EN_MEMORIA.delete(PDF_EN_MEMORIA.keys().next().value!);
  }
  return p;
}

async function descargar(cliente: SupabaseClient, path: string): Promise<Buffer> {
  const { data, error } = await cliente.storage.from('uploads').download(path);
  if (error || !data) throw new Error(`No se pudo descargar el archivo: ${error?.message ?? 'sin datos'}`);
  return Buffer.from(await data.arrayBuffer());
}

/** Lee una parte: su texto si lo tiene; si es un escaneo, la deja lista para transcribir. */
async function leerParte(cliente: SupabaseClient, d: Documento, k: number): Promise<LecturaParte> {
  const path = d.partes[k];
  const buffer = await descargar(cliente, path);

  if (/\.docx$/i.test(path)) {
    const mammoth = (await import('mammoth')).default;
    const { value } = await mammoth.extractRawText({ buffer });
    const texto = (value || '').trim();
    if (!texto) throw new Error('El Word no contiene texto extraíble.');
    return { tipo: 'texto', texto, paginas: 0 };
  }

  // pdf.js se queda con el búfer que recibe: cada lectura, su copia.
  const textos = await textoPorPagina(Buffer.from(buffer));
  const paginas = textos.length;
  const todo = textos.join('\n\n').trim();
  const sinTexto = paginasSinTexto(textos);

  // Con texto en (casi) todas las páginas, y legible —una fuente rota da
  // un amasijo que también hay que transcribir—, se usa tal cual.
  if (sinTexto.length === 0 && todo.length >= 100 && textoAprovechable(todo)) {
    return { tipo: 'texto', texto: todo, paginas };
  }

  // Mixto: se transcriben solo las páginas escaneadas.
  const conTexto = textos
    .filter((_, i) => !sinTexto.includes(i + 1))
    .join('\n\n');
  if (sinTexto.length < paginas * 0.7 && textoAprovechable(conTexto)) {
    return { tipo: 'ocr', paginas, rangos: enTramos(sinTexto), textoPaginas: textos, tramos: {} };
  }

  // Escaneo completo: se transcribe por tramos, cada uno desde un PDF con
  // solo sus páginas (`transcribirPaginasSueltas`). Antes se subía el PDF
  // entero una vez y se pedía cada tramo por rango: Gemini procesa el
  // archivo COMPLETO en cada llamada —una oferta de 500 páginas son más de
  // cien mil tokens de entrada por tramo, y por cada página reintentada—.
  // Así se agotó el crédito prepago en una prueba (10/10/2026), y los
  // tramos además volvían en blanco con más frecuencia.
  return {
    tipo: 'ocr',
    paginas,
    rangos: enTramos(Array.from({ length: paginas }, (_, i) => i + 1)),
    tramos: {},
  };
}

/** ¿Ya se resolvió esta parte? Leída, y si es escaneo, con todos sus tramos hechos o perdidos. */
function parteResuelta(p: Progreso, di: number, k: number): boolean {
  const l = p.documentos[di].lecturas[k];
  if (!l) return (p.fallos[`leer:${di}:${k}`] ?? 0) >= INTENTOS;
  if (l.tipo === 'texto') return true;
  return l.rangos.every(
    (r) => l.tramos[claveRango(r)] !== undefined || (p.fallos[`tramo:${di}:${k}:${claveRango(r)}`] ?? 0) >= INTENTOS,
  );
}

/** Cierra los documentos que ya tienen todas sus partes: arma su texto o los da por ilegibles. */
function cerrarDocumentos(p: Progreso): Documento[] {
  const cerrados: Documento[] = [];
  p.documentos.forEach((d, di) => {
    if (d.estado !== 'leyendo') return;
    if (!d.partes.every((_, k) => parteResuelta(p, di, k))) return;
    cerrados.push(d);

    const perdidaLectura = d.partes.findIndex((_, k) => !d.lecturas[k]);
    if (perdidaLectura >= 0) {
      d.estado = 'ilegible';
      d.motivo = p.errores[`leer:${di}:${perdidaLectura}`] ?? 'No se pudo leer el archivo.';
      return;
    }

    let perdidos = 0;
    let intentadas = 0;
    let transcrito = false;
    let desplazamiento = 0;
    const trozos: string[] = [];
    d.lecturas.forEach((l, k) => {
      if (!l) return;
      if (l.tipo === 'texto') {
        trozos.push(l.texto);
      } else {
        transcrito = true;
        intentadas += paginasDe(l);
        perdidos += l.rangos.filter((r) => l.tramos[claveRango(r)] === undefined).length;
        // Cuando el PDF se partió para subirlo, cada parte numera
        // desde 1: se devuelve la numeración del documento original.
        const renumerar = (t: string) =>
          desplazamiento
            ? t.replace(/=== Página (\d+) ===/g, (_, n) => `=== Página ${Number(n) + desplazamiento} ===`)
            : t;
        if (!l.textoPaginas) {
          // Por número de página: una página reintentada sola llega en su
          // propio tramo, después del tramo del que salió.
          const porPagina = new Map<number, string>();
          const sueltos: string[] = [];
          for (const r of l.rangos) {
            const t = l.tramos[claveRango(r)];
            if (t) paginasDelTexto(t, porPagina, sueltos);
          }
          const ordenado = [...porPagina.entries()].sort((a, b) => a[0] - b[0]).map((x) => x[1]);
          const unido = [...sueltos, ...ordenado].join('\n\n');
          if (unido) trozos.push(renumerar(unido));
        } else {
          // Mixto: página por página, la transcripción en el lugar de
          // las escaneadas y el texto en las demás.
          const textoPaginas = l.textoPaginas;
          const transcritas = new Map<number, string>();
          const sueltos: string[] = [];
          for (const r of l.rangos) {
            const t = l.tramos[claveRango(r)];
            if (t) paginasDelTexto(t, transcritas, sueltos);
          }
          if (sueltos.length) trozos.push(renumerar(sueltos.join('\n\n')));
          for (let n = 1; n <= l.paginas; n++) {
            const enRango = l.rangos.some(([a, b]) => n >= a && n <= b);
            if (enRango) {
              const t = transcritas.get(n);
              if (t) trozos.push(renumerar(t));
              continue;
            }
            const t = textoPaginas[n - 1]?.trim();
            if (t) trozos.push(renumerar(`=== Página ${n} ===\n${t}`));
          }
        }
      }
      desplazamiento += l.paginas;
    });

    // Una transcripción incompleta NO es el documento: media oferta se
    // dictaminaría como ausencia de la propuesta (ver texto-documento.ts).
    if (perdidos > 0) {
      d.estado = 'ilegible';
      d.motivo =
        `El PDF está escaneado y la transcripción quedó incompleta: ${perdidos} tramo(s) de páginas no se pudieron leer, de ${intentadas} página(s) intentadas. ` +
        'Vuelve a subirlo, o sube el Word original si lo tienes: evaluar sobre una transcripción parcial descarta ofertas que sí cumplen.';
      return;
    }
    const texto = trozos.join('\n\n').trim();
    // Lo transcrito lo escribió el modelo: no tiene el problema de la
    // fuente rota que mide `textoAprovechable`, y esa medida rechazaba
    // ofertas con muchas tablas, montos y números de documento (la de
    // VICCRIS CLEAN SERVICE pasó en una prueba y no en la siguiente). Lo
    // que sí indica un fallo es que salga casi nada por página.
    if (!texto || (transcrito && texto.length < 30 * Math.max(1, intentadas))) {
      d.estado = 'ilegible';
      d.motivo = transcrito
        ? 'El PDF está escaneado y no se obtuvo texto legible al transcribirlo.'
        : 'El documento no tiene texto legible.';
      return;
    }
    d.texto = texto;
    d.transcrito = transcrito;
    d.estado = 'listo';
    console.info(`[evaluacion] ${d.nombre}: ${texto.length} caracteres${transcrito ? `, ${intentadas} página(s) transcritas` : ''}`);
    if (d.rol === 'oferta') {
      const razon = razonSocialDeLaOferta(texto);
      if (!razon) console.warn('[evaluador] sin razón social en la oferta, se usa el archivo', { archivo: d.nombre });
      d.postor = razon ?? nombreDesdeArchivo(d.nombre);
    }
  });
  return cerrados;
}

/**
 * Junta los archivos que son tomos de una misma oferta.
 *
 * En el CP SER-SM-6-2026 un consorcio presentó su oferta en dos PDF
 * («tomo 01» y «tomo 02») y se subieron como dos ofertas: el sistema
 * evaluó dos postores, uno sin los anexos de admisión —que estaban en el
 * otro tomo— y otro sin el equipamiento —que estaba en el segundo—
 * (documento 13 de César, 10/10/2026). Cuando dos archivos identifican al
 * mismo postor —el mismo consorcio, o los mismos integrantes por RUC—, el
 * segundo se suma al primero y se evalúan como una sola oferta.
 *
 * Se hace una vez, cuando ya están identificados todos.
 */
function fusionarTomos(p: Progreso): void {
  if (p.tomosRevisados) return;
  // Una evaluación que ya empezó a evaluar etapas no se rehace.
  if (p.etapas.some((e) => e && e.length > 0)) {
    p.tomosRevisados = true;
    return;
  }
  const ofertas = p.documentos.slice(1);
  const pendientes = ofertas.some(
    (d) => d.estado === 'leyendo' || (d.estado === 'listo' && d.identificacion === undefined),
  );
  if (pendientes) return;
  // Dos claves por archivo: el nombre y, si los hay, los RUC. Un tomo
  // puede traer la promesa con los RUC y el otro solo el nombre del
  // consorcio en sus carátulas (los dos tomos de CONSORCIO MEGA en el CP
  // SER-SM-6-2026): basta con que coincida una.
  const claves = (d: Documento): string[] => {
    const id = d.identificacion;
    if (!id) return [];
    const salida = [
      `nombre:${id.nombre
        .toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Z0-9]/g, '')}`,
    ];
    const rucs = id.integrantes.map((x) => (x.ruc ?? '').replace(/\D/g, '')).filter((x) => x.length === 11);
    if (id.esConsorcio && rucs.length >= 2) salida.push(`ruc:${rucs.sort().join('+')}`);
    if (!id.esConsorcio && id.ruc && id.ruc.replace(/\D/g, '').length === 11) salida.push(`ruc:${id.ruc.replace(/\D/g, '')}`);
    return salida;
  };
  const primero = new Map<string, number>();
  ofertas.forEach((d, i) => {
    if (d.estado !== 'listo') return;
    const ks = claves(d);
    if (ks.length === 0) return;
    const indice = i + 1;
    const destino = ks.map((k) => primero.get(k)).find((x) => x !== undefined);
    if (destino === undefined) {
      for (const k of ks) primero.set(k, indice);
      return;
    }
    const principal = p.documentos[destino];
    // Cada tomo numera sus páginas desde 1: la «página 96» del segundo
    // tomo no es la del primero. Se le dice al modelo, para que cite el
    // tomo junto con la página (César citó «folio 96 del tomo 2»).
    const tomo = (principal.texto?.match(/^=== TOMO \d+/gm)?.length ?? 0) + 2;
    principal.texto = `${principal.texto}

=== TOMO ${tomo}: ${d.nombre} — desde aquí la numeración de páginas vuelve a empezar; cita estas páginas como «tomo ${tomo}, página N» ===

${d.texto}`;
    principal.transcrito = principal.transcrito || d.transcrito;
    // Si el principal no traía la composición del consorcio y este sí, se la queda.
    if (!principal.identificacion?.esConsorcio && d.identificacion?.esConsorcio) {
      principal.identificacion = { ...d.identificacion, nombre: principal.identificacion?.nombre ?? d.identificacion.nombre };
    }
    for (const k of ks) if (!primero.has(k)) primero.set(k, destino);
    d.estado = 'fusionado';
    d.fusionadoEn = destino;
    console.info(`[evaluacion] ${d.nombre} es otro tomo de la oferta de ${principal.postor}: se evalúan juntos`);
  });
  p.tomosRevisados = true;
}

interface Unidad {
  clave: string;
  correr: () => Promise<void>;
}

function exigenciasDe(lectura: LecturaBases, etapa: Etapa) {
  return etapa === 'admision' ? lectura.admision : etapa === 'calificacion' ? lectura.calificacion : lectura.factores;
}

/** Lo que se puede hacer ahora, en orden de prioridad. */
function unidades(p: Progreso, cliente: SupabaseClient, previo: ResultadoGuardado | null): Unidad[] {
  const lista: Unidad[] = [];
  const agotada = (clave: string) => (p.fallos[clave] ?? 0) >= INTENTOS;
  const bases = p.documentos[0];

  // Las Bases primero: sin ellas no hay nada que evaluar.
  if (!p.ronda && bases.estado === 'listo' && !p.lectura && !agotada('lectura')) {
    lista.push({
      clave: 'lectura',
      correr: async () => {
        p.lectura = await leerBases(bases.texto!);
      },
    });
  }

  p.documentos.forEach((d, di) => {
    if (d.estado !== 'leyendo') return;
    d.partes.forEach((_, k) => {
      const l = d.lecturas[k];
      if (!l) {
        const clave = `leer:${di}:${k}`;
        if (!agotada(clave)) {
          lista.push({
            clave,
            correr: async () => {
              d.lecturas[k] = await leerParte(cliente, d, k);
            },
          });
        }
        return;
      }
      if (l.tipo !== 'ocr') return;
      for (const rango of [...l.rangos]) {
        const [desde, fin] = rango;
        const kr = claveRango(rango);
        const clave = `tramo:${di}:${k}:${kr}`;
        if (l.tramos[kr] !== undefined || agotada(clave)) continue;
        lista.push({
          clave,
          correr: async () => {
            const guardar = (t: string) => {
              const c = completarTramo(l, rango, t);
              l.tramos[claveRango(c.rango)] = reintentarPaginasEnBlanco(l, c.rango, c.texto);
            };
            if (!l.uri) {
              // Mixto: solo esas páginas, en un PDF propio.
              guardar(await transcribirPaginasSueltas(Buffer.from(await descargarUnaVez(cliente, d.partes[k])), desde, fin, d.nombre));
              return;
            }
            if (!l.subido || Date.now() - Date.parse(l.subido) > VIDA_ARCHIVO_MS) {
              const nuevo = await uploadFileToGemini(await descargar(cliente, d.partes[k]), 'application/pdf', d.nombre);
              Object.assign(l, { uri: nuevo.uri, archivo: nuevo.name, subido: new Date().toISOString() });
            }
            const r = await transcribirTramo(l.uri, desde, fin);
            if (r.texto) {
              guardar(r.texto);
            } else if (r.filtrado) {
              // El filtro de recitación corta el tramo entero; hoja por
              // hoja suele pasar (ver ocr-pdf.ts).
              const hojas = await transcribirPaginaPorPagina(await descargar(cliente, d.partes[k]), desde, fin, d.nombre);
              if (hojas.fallidas > 0) throw new Error(`${hojas.fallidas} página(s) bloqueadas por el filtro`);
              l.tramos[kr] = hojas.texto;
            } else {
              // El modelo respondió y no había nada: una carátula en blanco.
              l.tramos[kr] = '';
            }
          },
        });
      }
    });
  });

  // Segunda evaluación: cada postor afectado, cuando sus documentos están leídos.
  if (p.ronda && previo) {
    const ronda = p.ronda;
    for (const nombre of afectadosDe(ronda)) {
      if (ronda.revisados[nombre] !== undefined) continue;
      const suyos = ronda.documentos
        .filter((x) => x.postor === nombre)
        .map((x) => ({ doc: p.documentos[x.indice], tipo: x.tipo }));
      if (suyos.some((x) => x.doc.estado === 'leyendo')) continue;
      const clave = `revisar:${nombre}`;
      if (agotada(clave)) {
        ronda.revisados[nombre] = null;
        continue;
      }
      lista.push({
        clave,
        correr: async () => {
          ronda.revisados[nombre] = await revisarPostorRonda(previo, nombre, suyos, ronda);
        },
      });
    }
  }

  // Quién es cada postor, antes de evaluarlo: el nombre del consorcio y
  // sus integrantes salen de la promesa (documento 13 de César).
  if (!p.ronda) p.documentos.slice(1).forEach((d, i) => {
    if (d.estado !== 'listo' || d.identificacion !== undefined) return;
    const clave = `identificar:${i}`;
    if (agotada(clave)) {
      d.identificacion = null;
      return;
    }
    lista.push({
      clave,
      correr: async () => {
        const id = await identificarPostor(d.texto!);
        if (!id) throw new Error('sin identificación');
        d.identificacion = id;
        d.postor = id.nombre;
      },
    });
  });

  // Cada postor recorre sus etapas en orden; los postores, a la vez.
  if (p.lectura && !p.ronda) {
    const lectura = p.lectura;
    p.documentos.slice(1).forEach((d, i) => {
      if (d.estado !== 'listo') return;
      // Sin saber aún si es consorcio, no se evalúa: la admisión depende de
      // ello. Y no hasta que estén identificadas TODAS: dos archivos pueden
      // ser tomos de la misma oferta y hay que juntarlos antes (ver
      // `fusionarTomos`).
      if (d.identificacion === undefined || !p.tomosRevisados) return;
      const hechas = (p.etapas[i] ??= []);
      if (hechas.length >= ETAPAS.length) return;
      const etapa = ETAPAS[hechas.length];
      const clave = `etapa:${i}:${etapa}`;
      if (agotada(clave)) {
        // La API no pudo con esta etapa: queda para el comité, como
        // cuando el modelo devuelve un JSON roto (motor.ts).
        hechas.push({
          etapa,
          fichas: [],
          resultado: 'revision_humana',
          puntaje: etapa === 'evaluacion' ? 0 : undefined,
          subsanaciones: [],
          fundamento: 'El análisis automático no pudo completarse para esta etapa. Queda pendiente de revisión del comité.',
        });
        return;
      }
      lista.push({
        clave,
        correr: async () => {
          const identificacion = bloqueDeIdentificacion(d.identificacion);
          const provisional = await evaluarEtapa({
            etapa,
            exigencias: exigenciasDe(lectura, etapa),
            textoOferta: d.texto!,
            nombrePostor: d.postor!,
            textoBases: bases.texto!,
            identificacion,
          });
          // Equipamiento, personal clave e infraestructura, ítem por ítem
          // (verificacion.ts): en una sola ficha el modelo daba un «cumple»
          // general sin mirar cada máquina ni cada certificado.
          const verificadas =
            etapa === 'calificacion'
              ? await Promise.all(
                  provisional.fichas.map(async (f) => {
                    const clase = claseDeVerificacion(f.requisito, f.reglaBases);
                    if (!clase) return f;
                    try {
                      return await verificarFicha({
                        clase,
                        ficha: f,
                        textoOferta: d.texto!,
                        nombrePostor: d.postor!,
                        identificacion,
                        propios: d.identificacion?.integrantes.map((x) => x.nombre),
                        textoBases: bases.texto!,
                      });
                    } catch (e) {
                      console.warn(`[evaluacion] verificación de «${f.requisito}» omitida:`, (e as Error).message.slice(0, 160));
                      return f;
                    }
                  }),
                )
              : provisional.fichas;
          // Contraste con la guía de César y con la biblioteca: Ley,
          // Reglamento, bases estándar, Tribunal y OECE (jurisprudencia.ts).
          const aContrastar = new Set(fichasAContrastar(etapa, verificadas).map((f) => f.id));
          const contrastadas = await Promise.all(
            verificadas.map(async (f) =>
              aContrastar.has(f.id)
                ? (await contrastarFicha({ cliente, etapa, ficha: f, nombrePostor: d.postor!, identificacion })).ficha
                : f,
            ),
          );
          // Factores de certificación (ISO): si la ficha no dio el puntaje
          // y los certificados están en la oferta, se vuelven a puntuar con
          // la regla de las Bases (certificaciones.ts).
          const fichas =
            etapa === 'evaluacion'
              ? await revisarCertificaciones(
                  contrastadas,
                  d.texto!,
                  d.identificacion?.esConsorcio && d.identificacion.integrantes.length
                    ? d.identificacion.integrantes.map((x) => x.nombre)
                    : [d.postor!],
                  bases.texto ?? '',
                ).catch(() => contrastadas)
              : contrastadas;
          const r = cerrarEtapa({ ...provisional, fichas });
          if (hechas.length !== ETAPAS.indexOf(etapa)) return;
          hechas.push(r);
          if (!avanza(r.resultado)) {
            const motivo = `No se evalúa: la oferta no superó la etapa de ${etapa}.`;
            for (const siguiente of ETAPAS.slice(hechas.length)) {
              hechas.push({
                etapa: siguiente,
                omitida: true,
                motivoOmision: motivo,
                fichas: [],
                resultado: 'no_cumple',
                subsanaciones: [],
                fundamento: motivo,
              });
            }
          }
        },
      });
    });
  }

  // Etapa 4: el monto de la oferta económica de quien sigue en carrera,
  // en cuanto termina su evaluación técnica.
  if (!p.ronda) p.documentos.slice(1).forEach((d, i) => {
    if (d.estado !== 'listo' || d.ofertaEconomica !== undefined) return;
    const hechas = p.etapas[i] ?? [];
    if (hechas.length < ETAPAS.length) return;
    if (hechas.some((e) => !e.omitida && e.resultado === 'no_cumple' && e.etapa !== 'evaluacion')) return;
    const clave = `monto:${i}`;
    if (agotada(clave)) {
      d.ofertaEconomica = null;
      return;
    }
    lista.push({
      clave,
      correr: async () => {
        d.ofertaEconomica = await leerOfertaEconomica(d.texto!);
      },
    });
  });

  // Primero lo que destraba más: leer las Bases y evaluar a un postor
  // cuya oferta ya está lista (así su evaluación corre mientras se
  // transcriben las demás); después, leer y transcribir.
  const orden = (u: Unidad) =>
    u.clave === 'lectura' || u.clave.startsWith('identificar:') || u.clave.startsWith('revisar:')
      ? 0
      : u.clave.startsWith('etapa:')
        ? 1
        : u.clave.startsWith('leer:')
          ? 2
          : 3;
  return lista.sort((x, y) => orden(x) - orden(y));
}

function terminado(p: Progreso): boolean {
  if (p.ronda) return afectadosDe(p.ronda).every((n) => p.ronda!.revisados[n] !== undefined);
  if (!p.lectura) return false;
  return p.documentos.slice(1).every((d, i) => {
    if (d.estado === 'ilegible' || d.estado === 'fusionado') return true;
    if (d.estado !== 'listo') return false;
    const hechas = p.etapas[i] ?? [];
    if (hechas.length < ETAPAS.length) return false;
    const cortado = hechas.some((e) => !e.omitida && e.resultado === 'no_cumple' && e.etapa !== 'evaluacion');
    // Quien sigue en carrera necesita su monto leído (o el intento agotado).
    return cortado || d.ofertaEconomica !== undefined;
  });
}

function resumir(p: Progreso, enCurso: Set<string>): ResumenProgreso {
  const lineas: LineaResumen[] = [];
  let paso = '';
  // Peso de cada parte del trabajo en la barra: leer documentos (que es
  // casi todo cuando hay escaneos), leer las Bases y evaluar.
  let avanceDocs = 0;

  p.documentos.forEach((d, di) => {
    let hechos = 0;
    let total = 0;
    let paginasTotales = 0;
    let paginasLeidas = 0;
    d.partes.forEach((_, k) => {
      const l = d.lecturas[k];
      total += 1;
      if (!l) return;
      hechos += 1;
      if (l.tipo === 'ocr') {
        total += l.rangos.length;
        // Las páginas reintentadas solas se cuentan una vez, por la página.
        const leidas = new Set<number>();
        const todas = new Set<number>();
        for (const r of l.rangos) {
          for (let n = r[0]; n <= r[1]; n++) todas.add(n);
          if (l.tramos[claveRango(r)] !== undefined) {
            hechos += 1;
            for (let n = r[0]; n <= r[1]; n++) leidas.add(n);
          }
        }
        paginasTotales += todas.size;
        paginasLeidas += leidas.size;
      }
    });
    const fraccion = d.estado === 'leyendo' ? hechos / Math.max(1, total) : 1;
    avanceDocs += fraccion;
    const deRonda = p.ronda?.documentos.find((x) => x.indice === di);
    const titulo =
      d.rol === 'bases'
        ? 'Bases Integradas'
        : deRonda
          ? `${NOMBRE_TIPO_RONDA[deRonda.tipo]} de ${deRonda.postor} (${d.nombre})`
          : `Oferta ${di}: ${d.postor ?? nombreDesdeArchivo(d.nombre)}`;
    if (d.estado === 'fusionado') {
      const otro = typeof d.fusionadoEn === 'number' ? p.documentos[d.fusionadoEn] : null;
      lineas.push({
        texto: `${d.nombre} — es otro tomo de la oferta de ${otro?.postor ?? otro?.nombre ?? 'otro postor'}: se evalúa junto con ella`,
        estado: 'hecho',
      });
    } else if (d.estado === 'listo') {
      lineas.push({ texto: `${titulo}${d.transcrito ? ' — escaneo transcrito' : ' — leída'}`, estado: 'hecho' });
    } else if (d.estado === 'ilegible') {
      lineas.push({ texto: `${titulo} — no se pudo leer`, estado: 'error' });
    } else {
      const texto = paginasTotales
        ? `${titulo} — transcribiendo las páginas escaneadas: ${paginasLeidas} de ${paginasTotales}`
        : `${titulo} — leyendo`;
      lineas.push({ texto, estado: hechos > 0 || [...enCurso].some((c) => c.startsWith(`leer:${di}:`)) ? 'en_curso' : 'pendiente' });
      if (!paso) paso = texto;
    }
  });

  // Segunda evaluación: los documentos ya están arriba; aquí, cada postor.
  if (p.ronda) {
    const afectados = afectadosDe(p.ronda);
    let revisados = 0;
    for (const n of afectados) {
      const r = p.ronda.revisados[n];
      if (r !== undefined) revisados++;
      const enMarcha = enCurso.has(`revisar:${n}`);
      const texto =
        r === undefined
          ? `${n} — ${enMarcha ? 'evaluando' : 'por evaluar'} lo presentado sobre lo observado en la primera acta`
          : r === null
            ? `${n} — no se pudo evaluar: queda a cargo del comité`
            : `${n} — evaluado`;
      lineas.push({ texto, estado: r === undefined ? (enMarcha ? 'en_curso' : 'pendiente') : r === null ? 'error' : 'hecho' });
      if (enMarcha && !paso) paso = texto;
    }
    const porcentaje = Math.round(
      100 * (0.6 * (avanceDocs / Math.max(1, p.documentos.length)) + 0.4 * (revisados / Math.max(1, afectados.length))),
    );
    return { paso: paso || 'Armando el resultado', porcentaje: Math.min(99, porcentaje), lineas, actualizado: new Date().toISOString() };
  }

  const bases = p.documentos[0];
  if (p.lectura) {
    lineas.push({
      texto: `Requisitos de las Bases — ${p.lectura.admision.length} de admisión, ${p.lectura.calificacion.length} de calificación, ${p.lectura.factores.length} factores`,
      estado: 'hecho',
    });
  } else {
    lineas.push({
      texto: 'Requisitos de las Bases — identificando admisión, calificación y factores',
      estado: enCurso.has('lectura') ? 'en_curso' : bases.estado === 'ilegible' ? 'error' : 'pendiente',
    });
    if (enCurso.has('lectura') && !paso) paso = 'Identificando los requisitos de las Bases';
  }

  let etapasHechas = 0;
  let etapasTotales = 0;
  p.documentos.slice(1).forEach((d, i) => {
    if (d.estado === 'ilegible' || d.estado === 'fusionado') return;
    const hechas = p.etapas[i] ?? [];
    etapasTotales += ETAPAS.length;
    etapasHechas += hechas.length;
    const nombre = d.postor ?? nombreDesdeArchivo(d.nombre);
    if (hechas.length >= ETAPAS.length) {
      const final = cerrarPostor(nombre, hechas);
      lineas.push({ texto: `Postor ${nombre} — ${final.resultadoFinal.toLowerCase()}`, estado: 'hecho' });
    } else if (hechas.length > 0 || enCurso.has(`etapa:${i}:${ETAPAS[0]}`)) {
      const etapa = ETAPAS[hechas.length];
      const texto = `Postor ${nombre} — evaluando ${NOMBRE_ETAPA[etapa].toLowerCase()}`;
      lineas.push({ texto, estado: 'en_curso' });
      if (!paso) paso = texto;
    } else {
      lineas.push({ texto: `Postor ${nombre} — admisión, calificación y evaluación`, estado: 'pendiente' });
    }
  });

  const porcentaje = Math.round(
    100 *
      (0.6 * (avanceDocs / Math.max(1, p.documentos.length)) +
        0.1 * (p.lectura ? 1 : 0) +
        0.3 * (etapasTotales ? etapasHechas / etapasTotales : 0)),
  );
  return {
    paso: paso || 'Armando el resultado',
    porcentaje: Math.min(99, porcentaje),
    lineas,
    actualizado: new Date().toISOString(),
  };
}

function borrarArchivosGemini(d: Documento) {
  for (const l of d.lecturas) {
    if (l?.tipo === 'ocr' && l.archivo) void deleteGeminiFile(l.archivo).catch(() => {});
  }
}

/**
 * El cierre de una segunda evaluación: aplica las revisiones sobre el
 * resultado guardado, recalcula económica, prelación y acta, y anota la
 * ronda en el historial. Las ofertas no se vuelven a leer.
 */
async function cerrarRonda(
  cliente: SupabaseClient,
  id: string,
  p: Progreso,
  previo: ResultadoGuardado,
  cola: Promise<void>,
): Promise<Desenlace> {
  const ronda = p.ronda!;
  const postores = previo.postores.map((x) => {
    const rev = ronda.revisados[x.postor];
    return rev ? aplicarRevision(x, rev) : x;
  });
  ordenarPorPuntaje(postores);
  const montos = new Map(postores.map((x) => [x.postor, x.ofertaEconomica ?? null] as const));
  const finales = etapasFinales(postores, montos, previo.bases);
  const rondas = [
    ...(previo.rondas ?? []),
    {
      numero: ronda.numero,
      fecha: new Date().toISOString(),
      documentos: ronda.documentos.map((x) => ({
        postor: x.postor,
        tipo: x.tipo,
        archivo: p.documentos[x.indice]?.nombre,
      })),
      noSubsanaron: ronda.noSubsanaron,
      cambios: afectadosDe(ronda).map((n) => ({
        postor: n,
        cambios: ronda.revisados[n]?.cambios ?? ['No se pudo completar la revisión de este postor: queda a cargo del comité.'],
      })),
    },
  ];
  const acta = construirActa({ bases: previo.bases, postores, finales, rondas: rondas as never });
  const resultado = { ...previo, postores, finales, acta, rondas, generado: new Date().toISOString() };
  p.documentos.forEach(borrarArchivosGemini);
  const resumen = { ...resumir(p, new Set()), porcentaje: 100, paso: 'Segunda evaluación terminada' };
  await cola;
  const { error: e } = await cliente
    .from('evaluations')
    .update({
      status: 'done',
      result: resultado,
      completed_at: new Date().toISOString(),
      progreso: { version: 1, resumen },
      corriendo_hasta: null,
    })
    .eq('id', id);
  if (e) throw new Error(`No se pudo guardar el resultado de la segunda evaluación: ${e.message}`);
  return { estado: 'done' };
}

/** Una espera que se puede cancelar: si no, cada vuelta del bucle deja un temporizador vivo. */
function dormir(ms: number): { promesa: Promise<void>; cancelar: () => void } {
  let t: ReturnType<typeof setTimeout> | undefined;
  const promesa = new Promise<void>((r) => {
    t = setTimeout(r, Math.max(0, ms));
  });
  return { promesa, cancelar: () => clearTimeout(t) };
}

/**
 * Una vuelta: trabaja hasta `plazoMs` y guarda. Quien llama tiene que
 * tener el turno (`tomar_turno_evaluacion`).
 *
 * `plazoMs` es hasta cuándo se empiezan unidades nuevas; `cierreMs`,
 * hasta cuándo se espera a las que están en el aire. Lo que no termine
 * para entonces se rehace en la vuelta siguiente.
 */
export async function avanzarEvaluacion(
  cliente: SupabaseClient,
  id: string,
  { plazoMs, cierreMs }: { plazoMs: number; cierreMs: number },
): Promise<Desenlace> {
  const inicio = Date.now();
  const { data, error } = await cliente
    .from('evaluations')
    .select('bases_file_path, bases_partes, offer_files, progreso, result')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) throw new Error(`No se encontró la evaluación: ${error?.message ?? id}`);
  const fila = data as Fila;
  // Al terminar, el progreso se reduce a su resumen: sin documentos, se
  // empieza de nuevo.
  const p: Progreso =
    fila.progreso?.version === 1 && Array.isArray(fila.progreso.documentos) ? fila.progreso : inicial(fila);
  p.vueltas += 1;

  const enCurso = new Map<string, Promise<void>>();
  let cola = Promise.resolve();
  const guardar = (extra: Record<string, unknown> = {}) => {
    p.resumen = resumir(p, new Set(enCurso.keys()));
    // Copia en el momento: lo que se guarda es este estado, aunque una
    // unidad lo cambie mientras la escritura viaja.
    const foto = JSON.parse(JSON.stringify(p));
    cola = cola.then(async () => {
      // Con cinco ofertas transcritas el progreso pesa varios megabytes, y
      // Supabase a veces responde un 520 de Cloudflare a la primera (medido
      // con el CP SER-SM-6-2026). Si el que falla es el guardado final, la
      // evaluación terminada se perdería: se reintenta.
      for (let intento = 1; intento <= 3; intento++) {
        const { error: e } = await cliente
          .from('evaluations')
          .update({
            progreso: foto,
            corriendo_hasta: new Date(Date.now() + TURNO_SEGUNDOS * 1000).toISOString(),
            ...extra,
          })
          .eq('id', id);
        if (!e) return;
        console.error(`[evaluacion] no se pudo guardar el avance (intento ${intento})`, e.message.slice(0, 120));
        if (intento < 3) await new Promise((r) => setTimeout(r, 2000 * intento));
      }
    });
    return cola;
  };

  const fallar = async (motivo: string, codigo: string): Promise<Desenlace> => {
    await Promise.allSettled([...enCurso.values()]);
    p.documentos.forEach(borrarArchivosGemini);
    await guardar({
      status: 'failed',
      result: { error: motivo, error_code: codigo, failed_at: new Date().toISOString() },
    });
    return { estado: 'failed', motivo };
  };

  if (p.vueltas > MAX_VUELTAS) {
    return fallar('La evaluación no pudo completarse tras varios intentos. Vuelve a intentarlo.', 'sin_terminar');
  }
  await guardar({ status: 'processing' });

  let vueltasEnVacio = 0;
  for (;;) {
    for (const d of cerrarDocumentos(p)) {
      if (d.estado !== 'leyendo') borrarArchivosGemini(d);
    }
    fusionarTomos(p);
    const bases = p.documentos[0];
    if (!p.ronda && bases.estado === 'ilegible') {
      return fallar(`No se pudieron leer las Bases Integradas. ${bases.motivo ?? ''}`.trim(), 'bases_ilegibles');
    }
    if (!p.lectura && (p.fallos.lectura ?? 0) >= INTENTOS) {
      return fallar(`No se pudo identificar qué exigen las Bases. ${p.errores.lectura ?? ''}`.trim(), 'lectura_bases');
    }
    const ofertas = p.documentos.slice(1);
    if (!p.ronda && ofertas.length > 0 && ofertas.every((d) => d.estado === 'ilegible')) {
      return fallar(ofertas.map((d) => `${d.nombre}: ${d.motivo}`).join(' · '), 'ofertas_ilegibles');
    }
    if (terminado(p)) break;

    const ahora = Date.now();
    if (ahora - inicio < plazoMs) {
      for (const u of unidades(p, cliente, fila.result)) {
        if (enCurso.size >= PARALELO) break;
        if (enCurso.has(u.clave)) continue;
        const promesa = u
          .correr()
          .catch((e) => {
            p.fallos[u.clave] = (p.fallos[u.clave] ?? 0) + 1;
            p.errores[u.clave] = (e as Error).message.slice(0, 300);
            console.error(`[evaluacion] ${u.clave} falló (intento ${p.fallos[u.clave]}):`, (e as Error).message.slice(0, 200));
          })
          .finally(() => enCurso.delete(u.clave));
        enCurso.set(u.clave, promesa);
      }
    }
    if (enCurso.size === 0) {
      // Nada en el aire y nada que empezar: o se acabó el plazo, o no
      // queda trabajo posible. Antes de darlo por fallido se mira otra
      // vez: armar la lista también avanza el estado (una etapa agotada
      // se anota para revisión del comité sin lanzar nada).
      if (Date.now() - inicio >= plazoMs) break;
      if (++vueltasEnVacio <= 2) continue;
      return fallar('La evaluación se detuvo sin poder continuar.', 'sin_trabajo');
    }
    vueltasEnVacio = 0;
    const restante = cierreMs - (Date.now() - inicio);
    if (restante <= 0) break;
    // Se despierta al menos cada minuto para guardar y renovar el turno:
    // una llamada larga al modelo, sola, lo dejaría vencer y otra vuelta
    // entraría a trabajar a la vez.
    const espera = dormir(Math.min(restante, 60_000));
    await Promise.race([...enCurso.values(), espera.promesa]);
    espera.cancelar();
    await guardar();
  }

  if (!terminado(p)) {
    await guardar();
    await cola;
    return { estado: 'continuar', paso: p.resumen?.paso ?? '' };
  }

  if (p.ronda) return cerrarRonda(cliente, id, p, fila.result!, cola);

  const lectura = p.lectura!;
  const ofertas = p.documentos.slice(1);
  const postores = ofertas
    .map((d, i) => {
      if (d.estado !== 'listo') return null;
      const postor = cerrarPostor(d.postor!, p.etapas[i]);
      if (d.identificacion?.esConsorcio) {
        postor.consorcio = d.identificacion.integrantes.map((x) => ({
          nombre: x.nombre,
          participacion: x.participacion,
        }));
      }
      return postor;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  ordenarPorPuntaje(postores);
  // Etapas 4 a 7: económica, rechazo, negociación y buena pro.
  const montos = new Map<string, OfertaEconomica | null>();
  ofertas.forEach((d) => {
    if (d.estado === 'listo' && d.postor) montos.set(d.postor, d.ofertaEconomica ?? null);
  });
  const finales = etapasFinales(postores, montos, lectura);
  const acta = construirActa({ bases: lectura, postores, finales });
  const resultado = {
    version: 'etapas-1',
    generado: new Date().toISOString(),
    bases: lectura,
    postores,
    finales,
    acta,
    transcritas: ofertas.filter((d) => d.estado === 'listo' && d.transcrito).map((d) => d.postor!),
    ilegibles: ofertas.filter((d) => d.estado === 'ilegible').map((d) => ({ nombre: d.nombre, motivo: d.motivo ?? '' })),
    tomos: ofertas
      .filter((d) => d.estado === 'fusionado' && typeof d.fusionadoEn === 'number')
      .map((d) => ({ archivo: d.nombre, postor: p.documentos[d.fusionadoEn!].postor ?? p.documentos[d.fusionadoEn!].nombre })),
  };

  // El progreso pesa (lleva los textos completos); hecho el resultado, se
  // queda solo el resumen.
  p.documentos.forEach(borrarArchivosGemini);
  const resumen = { ...resumir(p, new Set()), porcentaje: 100, paso: 'Evaluación terminada' };
  await cola;
  const { error: e } = await cliente
    .from('evaluations')
    .update({
      status: 'done',
      result: resultado,
      completed_at: new Date().toISOString(),
      progreso: { version: 1, resumen },
      // Los textos leídos se conservan aparte (migración 0085): la segunda
      // evaluación y cualquier revisión los necesitan, y volver a
      // transcribir cuesta minutos y no da el mismo texto.
      textos: {
        bases: p.documentos[0]?.texto ?? null,
        ofertas: p.documentos
          .slice(1)
          .filter((d) => d.estado === 'listo')
          .map((d) => ({ archivo: d.nombre, postor: d.postor ?? null, texto: d.texto ?? '' })),
      },
      corriendo_hasta: null,
    })
    .eq('id', id);
  if (e) throw new Error(`No se pudo guardar el resultado: ${e.message}`);
  return { estado: 'done' };
}
