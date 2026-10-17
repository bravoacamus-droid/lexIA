/**
 * El texto de un PDF de bases sin sus cabeceras ni pies de página.
 *
 * Cada página de unas bases lleva arriba el nombre del procedimiento y de
 * la Entidad —«CONCURSO PÚBLICO ABREVIADO DE SERVICIOS MINISTERIO DE
 * ECONOMÍA Y FINANZAS Concurso Público Abreviado N° 008-2026-EF/43 – …
 * BASES INTEGRADAS 8»—. Pegado al texto corrido, ese rótulo cae en medio
 * de las frases que cruzan de una página a otra y las hace parecer
 * modificadas.
 *
 * Se quita lo que se repite al principio o al final de la mayoría de las
 * páginas, contando las palabras e ignorando los números —el de página
 * cambia en cada una—, y solo en las páginas que lo llevan: la portada
 * no tiene cabecera y no pierde nada.
 */

const palabrasDe = (t: string) => t.split(/\s+/).filter(Boolean);
const clave = (ws: string[]) => ws.map((w) => w.replace(/\d+/g, '#')).join(' ');

/** El rótulo más largo que se repite en al menos `umbral` páginas. */
function rotulo(listas: string[][], umbral: number): { n: number; clave: string } {
  let mejor = { n: 0, clave: '' };
  for (let n = 1; n <= 80; n++) {
    const cuenta = new Map<string, number>();
    for (const l of listas) {
      if (l.length <= n) continue;
      const k = clave(l.slice(0, n));
      cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
    }
    let top = { k: '', c: 0 };
    for (const [k, c] of cuenta) if (c > top.c) top = { k, c };
    if (top.c < umbral) break;
    mejor = { n, clave: top.k };
  }
  // Menos de cuatro palabras no es un rótulo: es casualidad.
  return mejor.n >= 4 ? mejor : { n: 0, clave: '' };
}

export function sinCabeceras(paginas: string[]): string {
  return paginasSinCabeceras(paginas).paginas.join('\n');
}

export interface PaginasLimpias {
  /** El texto de cada página, sin su cabecera ni su pie. */
  paginas: string[];
  /**
   * El número de página IMPRESO en cada hoja, cuando las bases lo traen;
   * `null` si no se pudo saber. Es el que el participante cita en la
   * columna «Página» del formato de consultas y observaciones: el comité
   * busca por el número que ve impreso, no por el del visor de PDF.
   */
  folios: Array<number | null>;
}

/**
 * Lo mismo que `sinCabeceras`, pero página por página y con el número
 * impreso de cada una.
 *
 * El número de página casi siempre viaja dentro de la cabecera o del
 * pie: en las bases del Hospital José Casimiro Ulloa (LP 05-2026-HEJCU-1)
 * la cabecera termina en «… N° 05-2026-HEJCU-1 39» y esa es la página 41
 * del archivo —la portada y la simbología no se numeran—. Por eso se
 * busca, en las primeras y en las últimas palabras de cada hoja, la
 * posición cuyo número avanza de uno en uno con la página del archivo.
 * Las bases de la Municipalidad de Socos no traen número impreso en su
 * capa de texto: ahí `folios` sale en `null` y se cita la página del
 * archivo.
 */
export function paginasSinCabeceras(paginas: string[]): PaginasLimpias {
  const listas = paginas.map(palabrasDe);
  const folios = foliosImpresos(listas);
  if (paginas.length < 4) return { paginas: listas.map((l) => l.join(' ')), folios };
  const umbral = Math.ceil(paginas.length * 0.6);
  const cabecera = rotulo(listas, umbral);
  const pie = rotulo(
    listas.map((l) => [...l].reverse()),
    umbral,
  );
  return {
    paginas: listas.map((l) => {
      let inicio = 0;
      let fin = l.length;
      if (cabecera.n && clave(l.slice(0, cabecera.n)) === cabecera.clave) inicio = cabecera.n;
      if (pie.n && clave([...l].reverse().slice(0, pie.n)) === pie.clave) fin = l.length - pie.n;
      return l.slice(inicio, Math.max(inicio, fin)).join(' ');
    }),
    folios,
  };
}

/** Cuántas palabras del principio y del final de la hoja se miran. */
const VENTANA_FOLIO = 40;

/**
 * El número impreso de cada página, si las bases lo llevan.
 *
 * Una «ranura» es la k-ésima palabra desde el principio o desde el final
 * de la hoja. Se elige la ranura y el desfase (número impreso menos
 * página del archivo) que más páginas comparten; tiene que ser al menos
 * un 40 % de ellas, y el número tiene que avanzar —un «2026» fijo en la
 * cabecera comparte ranura en todas las hojas, pero no avanza—. Las
 * hojas sin número (la portada, un anexo escaneado) heredan el desfase
 * si les toca un número positivo.
 */
function foliosImpresos(listas: string[][]): Array<number | null> {
  const total = listas.length;
  const nulos = listas.map(() => null);
  if (total < 3) return nulos;
  const cuenta = new Map<string, number>();
  listas.forEach((l, i) => {
    const vistas = new Set<string>();
    for (let k = 0; k < Math.min(VENTANA_FOLIO, l.length); k++) {
      for (const [lado, w] of [
        ['i', l[k]],
        ['f', l[l.length - 1 - k]],
      ] as const) {
        if (!/^\d{1,4}$/.test(w)) continue;
        const llave = `${lado}${k}:${Number(w) - (i + 1)}`;
        if (vistas.has(llave)) continue;
        vistas.add(llave);
        cuenta.set(llave, (cuenta.get(llave) ?? 0) + 1);
      }
    }
  });
  let mejor = { llave: '', n: 0 };
  for (const [llave, n] of cuenta) if (n > mejor.n) mejor = { llave, n };
  if (mejor.n < Math.max(3, Math.ceil(total * 0.4))) return nulos;
  const desfase = Number(mejor.llave.split(':')[1]);
  return listas.map((_, i) => {
    const n = i + 1 + desfase;
    return n >= 1 ? n : null;
  });
}
