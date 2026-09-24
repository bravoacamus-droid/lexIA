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
  if (paginas.length < 4) return paginas.join('\n');
  const listas = paginas.map(palabrasDe);
  const umbral = Math.ceil(paginas.length * 0.6);
  const cabecera = rotulo(listas, umbral);
  const pie = rotulo(
    listas.map((l) => [...l].reverse()),
    umbral,
  );
  return listas
    .map((l) => {
      let inicio = 0;
      let fin = l.length;
      if (cabecera.n && clave(l.slice(0, cabecera.n)) === cabecera.clave) inicio = cabecera.n;
      if (pie.n && clave([...l].reverse().slice(0, pie.n)) === pie.clave) fin = l.length - pie.n;
      return l.slice(inicio, Math.max(inicio, fin)).join(' ');
    })
    .join('\n');
}
