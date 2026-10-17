/**
 * Dónde está cada hallazgo en las bases: numeral, literal y página.
 *
 * POR QUÉ
 *
 * Documento 14 de César (16/10/2026), sobre el formato descargado
 * «FORMULACIÓN DE CONSULTAS Y/U OBSERVACIONES» de la LP de reactivos de
 * gases del Hospital José Casimiro Ulloa: las columnas «Literal» y
 * «Página» salían vacías. Una observación sobre «los literales g), h), i)
 * y j) del numeral 2.2.1.1» no llenaba el literal, y ninguna decía en qué
 * página de las bases estaba lo observado. El comité absuelve buscando
 * por esas dos columnas; sin ellas, la formulación está incompleta.
 *
 * CÓMO
 *
 * Nada de esto lo decide el modelo. La cita literal de las bases que trae
 * cada hallazgo se busca en el texto, y su posición dice:
 *
 *   · la página, contando sobre el texto página por página que deja
 *     `leer.ts`. Se da el número IMPRESO en la hoja si las bases lo traen
 *     (`paginas.ts`); si no, el de la página del archivo PDF.
 *   · el literal, mirando hacia atrás desde la cita hasta el rótulo del
 *     numeral: el último «B. EXPERIENCIA DEL POSTOR…» o «g) Registro
 *     Sanitario…» que la precede. Si el propio análisis nombra los
 *     literales —«los literales g), h), i) y j)»— y existen en ese
 *     numeral, se usan esos.
 *   · el numeral, si el modelo no lo dio, igual: el último rótulo
 *     numerado antes de la cita.
 */
import { ubicarCita } from '@/lib/evaluacion/mejora/texto';
import { aplanarBases } from './cotejo';
import type { HallazgoBases } from './tipos';

export interface PaginasDeLasBases {
  /** Dónde empieza cada página en el texto preparado (`aplanarBases`). */
  inicios: number[];
  /** El número impreso de cada página, o `null`. */
  folios: Array<number | null>;
}

/**
 * Dónde empieza cada página dentro de `aplanarBases(paginas.join('\n'))`.
 *
 * Se aplana cada prefijo entero en vez de sumar páginas sueltas: el
 * aplanado colapsa espacios y quita llamadas de nota, y en la frontera
 * entre dos páginas eso no es aditivo. El prefijo termina en el salto que
 * las separa, así que el aplanado le da la misma longitud que tiene en el
 * texto completo.
 */
export function paginasDeLasBases(paginas: string[], folios?: Array<number | null>): PaginasDeLasBases {
  const inicios: number[] = [];
  let prefijo = '';
  for (let i = 0; i < paginas.length; i++) {
    inicios.push(i === 0 ? 0 : aplanarBases(prefijo).length);
    prefijo += `${paginas[i]}\n`;
  }
  return { inicios, folios: folios ?? paginas.map(() => null) };
}

/** La página en que cae una posición del texto preparado. */
export function paginaEn(p: PaginasDeLasBases, caracter: number): { archivo: number; impresa: number | null } {
  let lo = 0;
  let hi = p.inicios.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (p.inicios[m] <= caracter) lo = m;
    else hi = m - 1;
  }
  return { archivo: lo + 1, impresa: p.folios[lo] ?? null };
}

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Lo que precede a un número cuando es una cita y no un rótulo. */
const CITA_PREVIA = /(?<!\p{L})(?:numeral|numerales|literal|literales|art[íi]culo|art\.|inciso|N[°º]|cap[íi]tulo|y|o|del|el|al)\s*$/iu;

/**
 * Lo mismo para un literal. Más estrecho: «…vigente; y j) Declaración
 * jurada…» es el último literal de una lista, no una cita.
 */
const CITA_DE_LITERAL = /(?<!\p{L})(?:literal|literales|inciso|numeral|art[íi]culo)\s*$/iu;

/**
 * El último rótulo del numeral antes de `hasta`: «2.2.1.1. Documentos
 * para la admisión», no «conforme al numeral 2.2.1.1».
 */
function rotuloDelNumeral(texto: string, numeral: string, hasta: number): number | null {
  const n = numeral.replace(/\.$/, '');
  if (!/^\d{1,2}(?:\.\d{1,2}){0,4}$/.test(n)) return null;
  const re = new RegExp(`(?<![\\d.])${escapar(n)}\\.?\\s+(?=[A-ZÁÉÍÓÚÑ¿“"«])`, 'g');
  let ultimo: number | null = null;
  for (const m of texto.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > hasta) break;
    if (CITA_PREVIA.test(texto.slice(Math.max(0, i - 14), i))) continue;
    ultimo = i;
  }
  return ultimo;
}

/** El último rótulo numerado («3.5.1 », «2.3. ») antes de `hasta`. */
export function numeralAntes(texto: string, hasta: number, desde = 0): string {
  // El primer número no empieza en cero: «0.40 x monto» es una fórmula.
  const re = /(?<![\d.,\p{L}])([1-9]\d?(?:\.\d{1,2}){1,4})\.?\s+(?=[A-ZÁÉÍÓÚÑ])/gu;
  let ultimo = '';
  for (const m of texto.slice(desde, hasta).matchAll(re)) {
    const i = desde + (m.index ?? 0);
    if (CITA_PREVIA.test(texto.slice(Math.max(0, i - 14), i))) continue;
    // Un monto o una fecha no son un numeral: «1.500 Soles», «20.10».
    if (/^\d{1,2}\.\d{3}$/.test(m[1])) continue;
    ultimo = m[1];
  }
  return ultimo;
}

/**
 * En la proforma del contrato no hay numerales sino cláusulas: «CLÁUSULA
 * DECIMOSEGUNDA: PENALIDADES». Si no hay numeral, se cita la cláusula.
 */
function clausulaAntes(texto: string, hasta: number): { nombre: string; posicion: number } | null {
  let ultima: { nombre: string; posicion: number } | null = null;
  const re = /CL[ÁA]USULA\s+([A-ZÁÉÍÓÚ]{4,}|\[[^\]]{0,8}\])(?:\s*:?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{3,60}))?/g;
  for (const m of texto.slice(0, hasta).matchAll(re)) {
    // Las cláusulas opcionales del estándar no llevan número —«CLÁUSULA
    // […]: AUTORIZACIÓN DE DESCUENTO…»—: se nombran por su título.
    const titulo = (m[2] ?? '')
      .replace(/\s+(?:EL|LA|LOS|LAS)\s+[A-ZÁÉÍÓÚÑ ]*$/, '')
      .trim()
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase());
    if (m[1].startsWith('[') && !titulo) continue;
    const nombre = m[1].startsWith('[') ? `Cláusula «${titulo}»` : `Cláusula ${m[1].toLowerCase()}`;
    ultima = { nombre, posicion: m.index ?? 0 };
  }
  return ultima;
}

interface Marca {
  literal: string;
  posicion: number;
  mayuscula: boolean;
}

/**
 * Los rótulos de literal de un tramo de las bases.
 *
 *   · «A. CAPACIDAD LEGAL», «B.1 HABILITACIÓN», «F. GARANTÍA COMERCIAL»:
 *     letra mayúscula y título en mayúsculas detrás.
 *   · «g) Registro Sanitario…»: letra minúscula con paréntesis y una
 *     mayúscula detrás. «el literal m) únicamente…» no cuenta: detrás va
 *     minúscula, es una cita.
 */
function marcas(texto: string, desde: number, hasta: number): Marca[] {
  const tramo = texto.slice(desde, hasta);
  const salida: Marca[] = [];
  for (const m of tramo.matchAll(/(?<=^|[\s(])([A-Z](?:\.\d{1,2}){0,3})\.?\s+(?=[A-ZÁÉÍÓÚÑ]{3,}\b)/g)) {
    // «A.» necesita su punto; «B.1» puede ir sin él.
    if (!/\./.test(m[0]) && !/\.\d/.test(m[1])) continue;
    const previo = tramo.slice(Math.max(0, (m.index ?? 0) - 12), m.index ?? 0);
    if (CITA_DE_LITERAL.test(previo)) continue;
    salida.push({ literal: `${m[1]}.`, posicion: desde + (m.index ?? 0), mayuscula: true });
  }
  for (const m of tramo.matchAll(/(?<=^|\s)([a-z])\)\s+(?=[A-ZÁÉÍÓÚÑ¿“"«])/g)) {
    const previo = tramo.slice(Math.max(0, (m.index ?? 0) - 12), m.index ?? 0);
    if (CITA_DE_LITERAL.test(previo)) continue;
    salida.push({ literal: `${m[1]})`, posicion: desde + (m.index ?? 0), mayuscula: false });
  }
  return salida.sort((a, b) => a.posicion - b.posicion);
}

/** «g)», «G», «g.» → «g»; «B.1.» → «b.1». Para comparar literales. */
const claveLiteral = (l: string) => l.toLowerCase().replace(/[).\s]+$/g, '').replace(/^\(/, '');

/**
 * Los literales que el propio hallazgo nombra: «los literales g), h), i)
 * y j)». Se descartan los de una norma —«literal d) del numeral 87.1 del
 * artículo 87 de la Ley»—, que no son de las bases.
 */
export function literalesMencionados(texto: string): string[] {
  const salida: string[] = [];
  const re = /\bliteral(?:es)?\s+((?:\(?[a-zA-Z](?:\.\d{1,2}){0,3}[).]?(?:\s*,\s*|\s+y\s+|\s+e\s+|\s+al\s+)?)+)/g;
  for (const m of texto.matchAll(re)) {
    const detras = texto.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 60);
    if (/^\s*(?:del?\s+)?(?:numeral\s+\d+\.\d+\s+del\s+)?art[íi]culo|^\s*de\s+la\s+(?:Ley|Directiva)|^\s*del\s+Reglamento/i.test(detras)) continue;
    for (const l of m[1].split(/\s*,\s*|\s+y\s+|\s+e\s+|\s+al\s+/)) {
      const t = l.trim().replace(/^\(/, '');
      if (!/^[a-zA-Z](?:\.\d{1,2}){0,3}[).]?$/.test(t) || /^[yeo]$/i.test(t)) continue;
      // Forma única, como la rotulan las bases: «g)», «B.». El modelo
      // escribe a veces «literales g, h, i, j)» y otras «g), h) e i)»: el
      // 17/10/2026 salió «g, h, i, j), g), h) y i)».
      const base = t.replace(/[).]$/, '');
      salida.push(/^[a-z]$/.test(base) ? `${base})` : `${base}.`);
    }
  }
  // Sin repetidos y en el orden de las bases (a, b, c…).
  return [...new Set(salida)].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

/** «g), h), i) y j)». */
function enumerar(literales: string[]): string {
  if (literales.length <= 1) return literales[0] ?? '';
  return `${literales.slice(0, -1).join(', ')} y ${literales[literales.length - 1]}`;
}

export interface UbicacionCalculada {
  numeral: string;
  literal: string;
  pagina: string;
  paginaArchivo?: number;
}

/**
 * Numeral, literal y página de un hallazgo de la sección específica.
 *
 * `capitulo` es el texto del capítulo y `desde`, dónde empieza en el
 * texto preparado de las bases. Sin `paginas` (un Word) la página queda
 * vacía: un Word no tiene páginas fijas.
 */
export function ubicarEnCapitulo(args: {
  hallazgo: Pick<HallazgoBases, 'numeral' | 'enLasBases' | 'titulo' | 'analisis'> & { literal?: string; paraElProveedor?: { solicitud: string } };
  capitulo: string;
  desde: number;
  paginas?: PaginasDeLasBases;
  /**
   * Dónde está lo observado dentro de `capitulo`, si ya se sabe —el
   * cotejo de la Sección General lo sabe—. Si no, se busca la cita.
   */
  posicion?: number;
}): UbicacionCalculada {
  const { hallazgo: h, capitulo: texto } = args;
  const tramo =
    args.posicion !== undefined
      ? { inicio: args.posicion, fin: args.posicion + Math.max(1, h.enLasBases.length) }
      : h.enLasBases
        ? ubicarCita(texto, h.enLasBases)
        : null;

  // Sin cita (una omisión), el ancla es el rótulo del numeral, si está.
  const numeralDado = (h.numeral.match(/^\d{1,2}(?:\.\d{1,2}){0,4}/)?.[0] ?? '').replace(/\.$/, '');
  let ancla = tramo?.inicio ?? null;
  const rotulo = numeralDado ? rotuloDelNumeral(texto, numeralDado, ancla ?? texto.length) : null;
  if (ancla === null && rotulo !== null) ancla = rotulo;

  // Dentro de una cláusula de la proforma, el numeral es el de la cláusula
  // (o uno suyo); no el último que hubo antes de ella.
  const clausula = ancla !== null ? clausulaAntes(texto, ancla) : null;
  // Si la cita empieza por su propio numeral —«6. REGLAMENTOS TÉCNICOS…»—,
  // ese es, diga lo que diga el modelo (en la LP de reactivos puso «5»).
  const alInicio = h.enLasBases.match(/^\s*([1-9]\d?(?:\.\d{1,2}){0,4})\.?\s+(?=[A-ZÁÉÍÓÚÑ]{3,})/)?.[1];
  const numeral =
    alInicio ||
    h.numeral.trim() ||
    (ancla !== null ? numeralAntes(texto, ancla, clausula?.posicion ?? 0) || clausula?.nombre || '' : '');

  let literal = '';
  if (ancla !== null) {
    // El tramo donde buscar el literal: desde el rótulo del numeral (o
    // unas líneas atrás, si no se encontró) hasta el final de la cita.
    const inicio = rotulo ?? Math.max(0, ancla - 3000);
    const fin = tramo?.fin ?? ancla + 1;
    const delNumeral = marcas(texto, inicio, Math.min(texto.length, fin + 400));
    const claves = new Set(delNumeral.map((m) => claveLiteral(m.literal)));

    // Los literales que nombra el análisis pueden seguir a la cita —«los
    // literales g), h), i) y j)» con la cita en g)—: se comprueban en lo
    // que queda del numeral, no solo hasta la cita.
    const siguientes = new Set(
      marcas(texto, inicio, Math.min(texto.length, fin + 6000)).map((m) => claveLiteral(m.literal)),
    );
    const nombrados = literalesMencionados(`${h.titulo} ${h.analisis} ${h.paraElProveedor?.solicitud ?? ''}`).filter((l) => siguientes.has(claveLiteral(l)));
    const alPrincipio = h.enLasBases.match(/^\s*\(?([a-z]\)|[A-Z](?:\.\d{1,2}){0,3}\.)\s/)?.[1];
    const delModelo = (h.literal ?? '').trim();
    const previas = delNumeral.filter((m) => m.posicion <= ancla! + 2);
    const mayus = [...previas].reverse().find((m) => m.mayuscula);
    const minus = [...previas].reverse().find((m) => !m.mayuscula && (!mayus || m.posicion > mayus.posicion));

    const propio = alPrincipio ?? mayus?.literal ?? minus?.literal ?? '';
    // La lista nombrada vale si incluye el literal donde está la cita (o
    // si la cita no está en ninguno): si no, habla de otros literales.
    if (nombrados.length > 0 && (!propio || nombrados.some((l) => claveLiteral(l) === claveLiteral(propio)))) {
      literal = enumerar(nombrados);
    } else if (alPrincipio) literal = alPrincipio;
    else if (delModelo && claves.has(claveLiteral(delModelo))) literal = delModelo;
    else literal = propio;
  }

  let pagina = '';
  let paginaArchivo: number | undefined;
  if (args.paginas && ancla !== null) {
    const p = paginaEn(args.paginas, args.desde + ancla);
    pagina = String(p.impresa ?? p.archivo);
    paginaArchivo = p.archivo;
  } else if (args.paginas) {
    // Ni cita ni numeral: la página donde empieza el capítulo.
    const p = paginaEn(args.paginas, args.desde);
    pagina = String(p.impresa ?? p.archivo);
    paginaArchivo = p.archivo;
  }
  return { numeral, literal, pagina, ...(paginaArchivo ? { paginaArchivo } : {}) };
}
