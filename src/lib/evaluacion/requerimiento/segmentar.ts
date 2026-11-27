/**
 * Parte un requerimiento en cláusulas: cada numeral y literal con su
 * página.
 *
 * POR QUÉ (Fase 1, reunión con César del 27/11/2026)
 *
 * El auditor general lee el documento entero y decide qué observar; lo que
 * no ve, no se contrasta con nada. Para que cada cláusula pase por la
 * biblioteca hay que poder tomarlas una por una y saber dónde está cada
 * una («¿qué página, qué numeral, qué literal?»). Aquí se hace por las
 * marcas del propio texto, sin modelo: «3.2.1 …», «a) …», «b. …», y las
 * marcas [[PÁGINA n]] que pone el procesador al leer el PDF.
 */

export interface Clausula {
  /** «7», o «Sin paginación (Word)» para un Word. */
  pagina: string;
  /** «3.2.1», o «No corresponde». */
  numeral: string;
  /** «b)», o «No corresponde». */
  literal: string;
  /** El rótulo del numeral más cercano hacia arriba («PENALIDADES»), si lo hay. */
  rotulo: string;
  texto: string;
}

const NO_CORRESPONDE = 'No corresponde';
const MARCA_DE_PAGINA = /^\[\[PÁGINA (\d+)\]\]$/;
// «3.2.1 Alcance», «3.2.1. Alcance», «10. PENALIDADES», «III. CONFORMIDAD»
const NUMERAL = /^\s*((?:\d{1,2}(?:\.\d{1,2}){0,4})\.?|[IVX]{1,5}\.)\s+(\S.{0,200})$/;
// «a) …», «b. …», «c.- …»
const LITERAL = /^\s*([a-zñ])(?:\)|\.-?|\s*-)\s+(\S.*)$/i;
const TOPE_POR_CLAUSULA = 3_000;

export function segmentarRequerimiento(texto: string, opciones: { conPaginas: boolean }): Clausula[] {
  const salida: Clausula[] = [];
  let pagina = opciones.conPaginas ? '1' : 'Sin paginación (Word)';
  let numeral = NO_CORRESPONDE;
  let rotulo = '';
  let literal = NO_CORRESPONDE;
  let actual: string[] = [];

  const cerrar = () => {
    const t = actual.join('\n').replace(/[ \t]+/g, ' ').trim();
    actual = [];
    if (t.length < 15) return;
    for (let i = 0; i < t.length; i += TOPE_POR_CLAUSULA) {
      salida.push({ pagina, numeral, literal, rotulo, texto: t.slice(i, i + TOPE_POR_CLAUSULA) });
    }
  };

  for (const linea of texto.split(/\r?\n/)) {
    const marca = MARCA_DE_PAGINA.exec(linea.trim());
    if (marca) {
      pagina = marca[1];
      continue;
    }
    const n = NUMERAL.exec(linea);
    // Un número suelto al inicio de una línea de una tabla («2 unidades»)
    // no es un numeral: se exige que lo siga texto con alguna letra.
    if (n && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(n[2]) && !/^\d+\s*(?:unid|und|%|soles|d[ií]as)/i.test(`${n[1]} ${n[2]}`)) {
      cerrar();
      numeral = n[1].replace(/\.$/, '');
      literal = NO_CORRESPONDE;
      rotulo = n[2].length <= 90 ? n[2].trim() : rotulo;
      actual.push(linea);
      continue;
    }
    const l = LITERAL.exec(linea);
    if (l && numeral !== NO_CORRESPONDE) {
      cerrar();
      literal = `${l[1].toLowerCase()})`;
      actual.push(linea);
      continue;
    }
    actual.push(linea);
  }
  cerrar();
  return salida;
}

/** «Pág. 7 · Numeral 3.2.1 · Literal b) — PENALIDADES». */
export function dondeEsta(c: Clausula): string {
  return `Pág. ${c.pagina} · Numeral ${c.numeral} · Literal ${c.literal}${c.rotulo ? ` — ${c.rotulo}` : ''}`;
}
