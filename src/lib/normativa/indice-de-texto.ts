/**
 * Posiciones dentro del texto ya pintado de una norma: la base de los
 * resaltados y de la búsqueda dentro del documento.
 *
 * El resaltado anterior buscaba el texto seleccionado en el Markdown y lo
 * envolvía en <mark>: marcaba TODAS las veces que aparecía la frase, no se
 * veía si la selección cruzaba una negrita o un numeral, y con cada
 * resaltado volvía a armar el documento entero. César lo vio en la Ley y
 * el Reglamento: «no funcionan con normalidad los botones de resaltado»
 * (documento 11, 30/09/2026).
 *
 * Aquí se recorre el texto del DOM una vez y se anota, para cada carácter
 * que no es espacio, en qué nodo y en qué posición está. Las posiciones se
 * cuentan sin espacios («compactas») porque entre párrafos el DOM no
 * tiene saltos y la selección del navegador sí: así una misma frase cae
 * en la misma posición venga de donde venga. Con eso:
 *   · una selección se guarda como [inicio, fin) compactos + su texto;
 *   · un resaltado guardado se vuelve un Range exacto (el mismo pasaje,
 *     no el primero que coincida), y se pinta con la API de resaltado
 *     del navegador (CSS.highlights) sin tocar el DOM.
 */
export class IndiceDeTexto {
  private nodos: Text[] = [];
  private nodoDe: Int32Array;
  private offsetDe: Int32Array;
  private posicionDeNodo = new Map<Text, number>();
  /** El texto sin espacios. */
  readonly compacto: string;
  /** El mismo, en minúsculas y sin tildes (misma longitud), para buscar. */
  readonly normal: string;

  constructor(contenedor: HTMLElement) {
    const caracteres: string[] = [];
    const nodosDe: number[] = [];
    const offsets: number[] = [];
    const recorrido = document.createTreeWalker(contenedor, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        (n.parentElement?.closest('[data-no-indexar]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n = recorrido.nextNode() as Text | null;
    while (n) {
      const indice = this.nodos.length;
      this.nodos.push(n);
      this.posicionDeNodo.set(n, caracteres.length);
      const datos = n.data;
      for (let i = 0; i < datos.length; i++) {
        const c = datos[i];
        if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === ' ' || /\s/.test(c)) continue;
        caracteres.push(c);
        nodosDe.push(indice);
        offsets.push(i);
      }
      n = recorrido.nextNode() as Text | null;
    }
    this.compacto = caracteres.join('');
    this.normal = caracteres.map((c) => c.normalize('NFD')[0].toLowerCase()).join('');
    this.nodoDe = Int32Array.from(nodosDe);
    this.offsetDe = Int32Array.from(offsets);
  }

  /** Posición compacta de un punto (nodo, offset) del DOM. */
  private compactoDe(nodo: Node, offset: number, alFinal: boolean): number | null {
    let texto: Text | null = null;
    let dentro = offset;
    if (nodo.nodeType === Node.TEXT_NODE) {
      texto = nodo as Text;
    } else {
      // El punto está entre hijos de un elemento: se toma el texto contiguo.
      const hijo = nodo.childNodes[alFinal ? Math.max(offset - 1, 0) : offset] ?? null;
      if (!hijo) return null;
      const recorrido = document.createTreeWalker(hijo, NodeFilter.SHOW_TEXT);
      let ultimo: Text | null = null;
      let t = recorrido.nextNode() as Text | null;
      if (!alFinal) {
        texto = t;
        dentro = 0;
      } else {
        while (t) {
          ultimo = t;
          t = recorrido.nextNode() as Text | null;
        }
        texto = ultimo;
        dentro = ultimo ? ultimo.data.length : 0;
      }
    }
    if (!texto) return null;
    const inicio = this.posicionDeNodo.get(texto);
    if (inicio === undefined) return null;
    let cuenta = 0;
    for (let i = 0; i < dentro && i < texto.data.length; i++) if (!/\s/.test(texto.data[i])) cuenta++;
    return inicio + cuenta;
  }

  /** Una selección del navegador como [inicio, fin) compactos. */
  desdeRango(rango: Range): { inicio: number; fin: number } | null {
    const inicio = this.compactoDe(rango.startContainer, rango.startOffset, false);
    const fin = this.compactoDe(rango.endContainer, rango.endOffset, true);
    if (inicio === null || fin === null || fin <= inicio) return null;
    return { inicio, fin };
  }

  /** [inicio, fin) compactos como un Range del DOM. */
  rango(inicio: number, fin: number): Range | null {
    if (inicio < 0 || fin > this.compacto.length || fin <= inicio) return null;
    const r = document.createRange();
    try {
      r.setStart(this.nodos[this.nodoDe[inicio]], this.offsetDe[inicio]);
      r.setEnd(this.nodos[this.nodoDe[fin - 1]], this.offsetDe[fin - 1] + 1);
    } catch {
      return null;
    }
    return r;
  }

  /**
   * Dónde está un pasaje guardado. Si la posición guardada todavía
   * coincide, esa; si no (resaltados hechos con el visor anterior, o un
   * texto que cambió), la aparición del texto más cercana a ella.
   */
  ubicar(texto: string, inicio?: number, fin?: number): { inicio: number; fin: number } | null {
    const buscado = texto.replace(/\s+/g, '');
    if (buscado.length < 2) return null;
    if (inicio !== undefined && fin !== undefined && this.compacto.slice(inicio, fin) === buscado) return { inicio, fin };
    let mejor = -1;
    let k = this.compacto.indexOf(buscado);
    while (k >= 0) {
      if (mejor < 0 || (inicio !== undefined && Math.abs(k - inicio) < Math.abs(mejor - inicio))) mejor = k;
      if (inicio === undefined) break;
      k = this.compacto.indexOf(buscado, k + 1);
    }
    return mejor >= 0 ? { inicio: mejor, fin: mejor + buscado.length } : null;
  }

  /** Todas las apariciones de una palabra o frase (sin tildes ni mayúsculas). */
  buscar(consulta: string, tope = 500): Array<{ inicio: number; fin: number }> {
    const q = consulta
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '');
    if (q.length < 2) return [];
    const out: Array<{ inicio: number; fin: number }> = [];
    let k = this.normal.indexOf(q);
    while (k >= 0 && out.length < tope) {
      out.push({ inicio: k, fin: k + q.length });
      k = this.normal.indexOf(q, k + q.length);
    }
    return out;
  }
}

/** ¿El navegador sabe pintar resaltados sin tocar el DOM? */
export function hayResaltadoNativo(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof (globalThis as { Highlight?: unknown }).Highlight === 'function';
}

/** Pinta un grupo de rangos con un nombre de resaltado (ver ::highlight en globals.css). */
export function pintar(nombre: string, rangos: Range[]) {
  if (!hayResaltadoNativo()) return;
  const registro = (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
  if (rangos.length === 0) {
    registro.delete(nombre);
    return;
  }
  const H = (globalThis as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight;
  registro.set(nombre, new H(...rangos));
}
