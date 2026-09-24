/**
 * Encontrar un pasaje dentro del requerimiento y saber qué cambió.
 *
 * Todo lo que la versión mejorada toca pasa por aquí. El modelo copia un
 * pasaje del documento y propone otro; antes de tocar el Word hay que
 * encontrar ese pasaje de verdad —con las comillas tipográficas, los
 * espacios dobles y los saltos que el modelo no reproduce igual— y
 * decidir qué palabras cambian y cuáles no. Si no se encuentra, no se
 * toca: un cambio aplicado donde no era es peor que uno sin aplicar.
 */

/** Las diferencias que no cuentan: comillas, guiones y espacios. */
function plegar(c: string): string {
  if (/\s/.test(c)) return ' ';
  if (/[“”«»„"]/.test(c)) return '"';
  if (/[‘’‚']/.test(c)) return "'";
  if (/[–—‐‑]/.test(c)) return '-';
  return c;
}

export interface TextoNormalizado {
  /** El texto con los espacios colapsados y las comillas unificadas. */
  texto: string;
  /** Para cada carácter de `texto`, su posición en el original. */
  origen: number[];
}

/**
 * Normaliza guardando de dónde viene cada carácter, para poder volver al
 * original: lo que se encuentra en el texto normalizado se aplica en el
 * texto de verdad.
 */
export function normalizar(original: string): TextoNormalizado {
  let texto = '';
  const origen: number[] = [];
  let enEspacio = false;
  for (let i = 0; i < original.length; i++) {
    const c = plegar(original[i]);
    if (c === ' ') {
      if (enEspacio || texto.length === 0) continue;
      enEspacio = true;
    } else {
      enEspacio = false;
    }
    texto += c;
    origen.push(i);
  }
  if (texto.endsWith(' ')) {
    texto = texto.slice(0, -1);
    origen.pop();
  }
  return { texto, origen };
}

export interface Tramo {
  inicio: number;
  /** Exclusivo. */
  fin: number;
}

/**
 * Dónde está `aguja` dentro de `pajar`, en posiciones del pajar original.
 * Primero literal, después sin distinguir mayúsculas. `desde` limita la
 * búsqueda a partir de una posición, para elegir la aparición correcta
 * cuando el pasaje se repite.
 */
export function ubicar(pajar: string, aguja: string, desde = 0): Tramo | null {
  const p = normalizar(pajar);
  const a = normalizar(aguja).texto;
  if (!a) return null;
  const inicioNorm = p.origen.findIndex((o) => o >= desde);
  if (inicioNorm < 0) return null;
  let i = p.texto.indexOf(a, inicioNorm);
  if (i < 0) i = p.texto.toLowerCase().indexOf(a.toLowerCase(), inicioNorm);
  if (i < 0) return null;
  const inicio = p.origen[i];
  const fin = p.origen[i + a.length - 1] + 1;
  return { inicio, fin };
}

/** ¿Aparece más de una vez? Entonces no se sabe cuál tocar. */
export function apariciones(pajar: string, aguja: string): number {
  const p = normalizar(pajar).texto.toLowerCase();
  const a = normalizar(aguja).texto.toLowerCase();
  if (!a) return 0;
  let n = 0;
  for (let i = p.indexOf(a); i >= 0; i = p.indexOf(a, i + 1)) n++;
  return n;
}

/**
 * El pasaje que el auditor citó, dentro del documento.
 *
 * La cita del auditor no siempre es literal: abrevia con «…», o recorta
 * al principio y al final. Se prueba con el trozo más largo entre puntos
 * suspensivos y, si no aparece, con sus primeras y últimas palabras.
 */
export function ubicarCita(documento: string, cita: string): Tramo | null {
  const trozos = cita
    .split(/\.{3}|…|\(\s*…\s*\)|\[\s*…\s*\]/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 12)
    .sort((x, y) => y.length - x.length);
  for (const trozo of trozos) {
    const t = ubicar(documento, trozo);
    if (t) return t;
    const palabras = trozo.split(/\s+/);
    for (const n of [12, 8, 6]) {
      if (palabras.length <= n) continue;
      const principio = ubicar(documento, palabras.slice(0, n).join(' '));
      if (principio) return principio;
      const final = ubicar(documento, palabras.slice(-n).join(' '));
      if (final) return final;
    }
  }
  return null;
}

/**
 * Un tramo del documento alrededor de una posición, para dárselo al
 * modelo. Se corta en límites de palabra.
 */
export function pasajeAlrededor(documento: string, tramo: Tramo, margen = 1500): string {
  let a = Math.max(0, tramo.inicio - margen);
  let b = Math.min(documento.length, tramo.fin + margen);
  while (a > 0 && !/\s/.test(documento[a - 1])) a--;
  while (b < documento.length && !/\s/.test(documento[b])) b++;
  return documento.slice(a, b).trim();
}

// ── Comparación palabra a palabra ──────────────────────────────────

/**
 * Palabras, espacios y signos: la unidad que se marca como cambiada.
 *
 * Un hueco para el área usuaria —«[precisar el artículo]»— es una sola
 * pieza: si se comparara por dentro, «el artículo» del hueco casaría
 * con el «el artículo» del original y el hueco saldría partido, a medio
 * tachar y sin su color.
 */
export function trocear(texto: string): string[] {
  return texto.match(/\[[^\]\n]{1,200}\]|\s+|[\p{L}\p{N}]+(?:[.,/°º-][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu) ?? [];
}

export type Operacion =
  | { tipo: 'igual'; texto: string }
  | { tipo: 'borra'; texto: string }
  | { tipo: 'inserta'; texto: string };

const clave = (t: string) => (/^\s+$/.test(t) ? ' ' : [...t].map(plegar).join(''));

/**
 * Qué cambia de `antes` a `despues`, como lo marcaría el «Comparar» de
 * Word: las palabras comunes quedan, las demás se borran o se insertan.
 * Las diferencias de comillas o de espacios no cuentan como cambio.
 */
export function comparar(antes: string, despues: string): Operacion[] {
  const a = trocear(antes);
  const b = trocear(despues);
  const ka = a.map(clave);
  const kb = b.map(clave);
  // Tabla de la subsecuencia común más larga. Los pasajes son de unos
  // cientos de palabras: la tabla cabe de sobra.
  const n = a.length;
  const m = b.length;
  const lcs: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = ka[i] === kb[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const ops: Operacion[] = [];
  const empujar = (tipo: Operacion['tipo'], texto: string) => {
    const ultima = ops[ops.length - 1];
    if (ultima && ultima.tipo === tipo) ultima.texto += texto;
    else ops.push({ tipo, texto } as Operacion);
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (ka[i] === kb[j]) {
      empujar('igual', a[i]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      empujar('borra', a[i++]);
    } else {
      empujar('inserta', b[j++]);
    }
  }
  while (i < n) empujar('borra', a[i++]);
  while (j < m) empujar('inserta', b[j++]);
  return absorberEspacios(ops);
}

/**
 * Un espacio suelto que queda «igual» entre dos cambios parte una
 * corrección en dos marcas —«~~de~~ **la** ~~obra~~ **del servicio**»—.
 * Se funde con sus vecinos para que se lea como un solo cambio.
 */
function absorberEspacios(ops: Operacion[]): Operacion[] {
  const salida: Operacion[] = [];
  for (let k = 0; k < ops.length; k++) {
    const o = ops[k];
    const prev = salida[salida.length - 1];
    const sig = ops[k + 1];
    if (o.tipo === 'igual' && /^\s+$/.test(o.texto) && prev && prev.tipo !== 'igual' && sig && sig.tipo !== 'igual') {
      // El espacio pasa a borrarse y a insertarse: el texto final es el mismo.
      const borra = salida.findLast((x) => x.tipo === 'borra');
      const inserta = salida.findLast((x) => x.tipo === 'inserta');
      if (borra) borra.texto += o.texto;
      else salida.push({ tipo: 'borra', texto: o.texto });
      if (inserta) inserta.texto += o.texto;
      else salida.push({ tipo: 'inserta', texto: o.texto });
      continue;
    }
    const ultima = salida[salida.length - 1];
    if (ultima && ultima.tipo === o.tipo) ultima.texto += o.texto;
    else salida.push({ ...o });
  }
  // Tras fundir, agrupa en cada tramo de cambios los borrados antes que
  // las inserciones, que es como se lee una corrección.
  const ordenado: Operacion[] = [];
  let bloque: Operacion[] = [];
  const cerrar = () => {
    const b = bloque.filter((x) => x.tipo === 'borra').map((x) => x.texto).join('');
    const i = bloque.filter((x) => x.tipo === 'inserta').map((x) => x.texto).join('');
    if (b) ordenado.push({ tipo: 'borra', texto: b });
    if (i) ordenado.push({ tipo: 'inserta', texto: i });
    bloque = [];
  };
  for (const o of salida) {
    if (o.tipo === 'igual') {
      cerrar();
      ordenado.push(o);
    } else {
      bloque.push(o);
    }
  }
  cerrar();
  return ordenado;
}
