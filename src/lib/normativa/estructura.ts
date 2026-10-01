/**
 * La estructura de una norma para el visor de la biblioteca.
 *
 * Documento 11 de César (30/09/2026): el índice «debe mostrar la
 * estructura jerárquica de la norma (Título → Capítulo → Subcapítulo →
 * Artículo), permitiendo desplegar y contraer niveles, buscar por artículo
 * o palabra clave y resaltar el artículo que se está leyendo».
 *
 * El texto llega en Markdown: el estructurado desde el PDF oficial
 * (scripts/texto-estructurado.py, con la convención # norma, ## título,
 * ### capítulo, #### subcapítulo, ##### artículo) o el que arma
 * formatForDisplay desde el texto plano. Aquí se parte en secciones —una
 * por encabezado— y se arma el árbol del índice. Cada sección se pinta
 * por separado, así un resaltado o un cambio de vista no obliga a volver
 * a armar un documento de 1,3 millones de caracteres.
 */

export interface Encabezado {
  id: string;
  nivel: number;
  /** Lo que dice el encabezado, completo. */
  texto: string;
  /** Lo que se muestra en el índice: «Art. 192 · Plazos aplicables…». */
  etiqueta: string;
  /** Es un artículo (o una disposición numerada). */
  esArticulo: boolean;
  /** «Artículo 192», para la navegación entre artículos. */
  articulo: string | null;
  padre: string | null;
  hijos: string[];
  /** La norma (primer nivel) a la que pertenece, para contar sus artículos. */
  parte: string | null;
}

export interface Seccion {
  id: string;
  encabezado: Encabezado | null;
  /** Markdown de la sección, sin la línea del encabezado. */
  cuerpo: string;
}

const RX_ENCABEZADO = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const RX_ARTICULO = /^(Art[íi]culo\s+(?:\d+[A-Za-z°º-]*|[IVXLC]+)\b)[.\-–:\s]*(.*)$/i;
const RX_DISPOSICION = /^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIMA|UND[ÉE]CIMA|DUOD[ÉE]CIMA|D[ÉE]CIMO\s+\w+|VIG[ÉE]SIMA(?:\s+\w+)?|[ÚU]NICA)\b[.\-–\s]*(.*)$/i;

function limpio(t: string): string {
  return t.replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ').trim();
}

function recortar(t: string, max: number): string {
  if (t.length <= max) return t;
  const c = t.slice(0, max);
  const k = c.lastIndexOf(' ');
  return `${(k > max * 0.6 ? c.slice(0, k) : c).trim()}…`;
}

function etiquetaDe(texto: string): { etiqueta: string; esArticulo: boolean; articulo: string | null } {
  const a = RX_ARTICULO.exec(texto);
  if (a) {
    const num = a[1].replace(/^Art[íi]culo\s+/i, '');
    const titulo = a[2].trim();
    return { etiqueta: titulo ? `Art. ${num} · ${recortar(titulo, 90)}` : `Art. ${num}`, esArticulo: true, articulo: `Artículo ${num}` };
  }
  const d = RX_DISPOSICION.exec(texto);
  if (d && texto.length < 220) {
    return { etiqueta: recortar(texto, 100), esArticulo: true, articulo: d[1] };
  }
  return { etiqueta: recortar(texto, 110), esArticulo: false, articulo: null };
}

/**
 * Parte el Markdown en secciones, una por encabezado. Lo que va antes del
 * primer encabezado es una sección sin encabezado (el preámbulo).
 */
export function dividirEnSecciones(md: string): { secciones: Seccion[]; encabezados: Encabezado[] } {
  const lineas = md.split('\n');
  const secciones: Seccion[] = [];
  const encabezados: Encabezado[] = [];
  const pila: Encabezado[] = [];
  let actual: Seccion = { id: 'sec-0', encabezado: null, cuerpo: '' };
  let cuerpo: string[] = [];
  let enTabla = false;
  let n = 0;

  const cerrar = () => {
    actual.cuerpo = cuerpo.join('\n').trim();
    if (actual.encabezado || actual.cuerpo) secciones.push(actual);
    cuerpo = [];
  };

  for (const linea of lineas) {
    // Un «#» dentro de una tabla no es un encabezado.
    if (/^\s*\|/.test(linea)) enTabla = true;
    else if (!linea.trim()) enTabla = false;
    const m = !enTabla ? RX_ENCABEZADO.exec(linea) : null;
    if (!m) {
      cuerpo.push(linea);
      continue;
    }
    cerrar();
    n += 1;
    const nivel = m[1].length;
    const texto = limpio(m[2]);
    while (pila.length && pila[pila.length - 1].nivel >= nivel) pila.pop();
    const padre = pila[pila.length - 1] ?? null;
    const { etiqueta, esArticulo, articulo } = etiquetaDe(texto);
    const e: Encabezado = {
      id: `sec-${n}`,
      nivel,
      texto,
      etiqueta,
      esArticulo,
      articulo,
      padre: padre?.id ?? null,
      hijos: [],
      parte: pila[0]?.id ?? (nivel === 1 ? `sec-${n}` : null),
    };
    if (padre) padre.hijos.push(e.id);
    encabezados.push(e);
    pila.push(e);
    actual = { id: e.id, encabezado: e, cuerpo: '' };
  }
  cerrar();
  return { secciones, encabezados };
}

/** Los antepasados de un encabezado, del más alto al más cercano. */
export function rutaDe(id: string, porId: Map<string, Encabezado>): Encabezado[] {
  const ruta: Encabezado[] = [];
  let e = porId.get(id) ?? null;
  while (e) {
    ruta.unshift(e);
    e = e.padre ? porId.get(e.padre) ?? null : null;
  }
  return ruta;
}

/** Minúsculas y sin tildes, para buscar sin que importe cómo se escribió. */
export function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
