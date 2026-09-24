/**
 * Cotejar unas bases con su bases estándar.
 *
 * Cada texto fijo del estándar —lo que la Entidad no puede quitar ni
 * cambiar— se busca en las bases. No se busca literal: las bases llegan
 * casi siempre en PDF, y el PDF parte las oraciones entre páginas, pega
 * la llamada de nota a la palabra («siguientes2:») y mete el texto de la
 * nota al pie en medio de la frase. Medido con las bases integradas del
 * CPA 008-2026: buscando literal, 296 de 832 oraciones «faltaban», y
 * estaban casi todas.
 *
 * Se busca así: las palabras del texto fijo, en orden, dentro de una
 * ventana de las bases que admite palabras intercaladas. Si están casi
 * todas, el texto está; si está una parte, está modificado —y se guarda
 * el tramo de las bases, para mostrar qué dice—; si no, falta.
 *
 * Es puro: no toca la base de datos ni el modelo.
 */

export type EstadoTexto = 'esta' | 'modificado' | 'falta';

export interface TextoFijo {
  t: string;
  a: string;
  c?: string;
  p: number;
  s: 'portada' | 'general' | 'especifica' | 'anexos';
  /** El capítulo de la sección específica o el anexo en que va. */
  k?: number;
}

export interface BasesEstandar {
  id: string;
  titulo: string;
  archivo: string;
  fijos: TextoFijo[];
}

export interface ResultadoTexto {
  fijo: TextoFijo;
  estado: EstadoTexto;
  /** La parte del estándar que se encontró, de 0 a 1. */
  cobertura: number;
  /** El tramo de las bases donde está, si se encontró algo. */
  enLasBases?: string;
  /** Dónde empieza en las bases, en palabras, si se encontró. */
  posicion?: number;
}

/** Palabras comparables: sin tildes de más, sin llamadas de nota pegadas. */
function palabras(texto: string): string[] {
  return (
    texto
      .toLowerCase()
      // «siguientes2:», «OFERTAS7»: la llamada de nota pegada a la palabra.
      .replace(/(\p{L})\d{1,2}(?=[\s:.,;)]|$)/gu, '$1')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

export interface BasesPreparadas {
  texto: string;
  palabras: string[];
  /** Inicio de cada palabra en `texto`, para recortar lo encontrado. */
  inicios: number[];
  /** Trigrama → posiciones donde empieza. */
  indice: Map<string, number[]>;
}

export function prepararBases(texto: string): BasesPreparadas {
  const plano = texto.replace(/\s+/g, ' ');
  const lista: string[] = [];
  const inicios: number[] = [];
  const re = /[\p{L}\p{N}]+/gu;
  // Se recorre el texto plano para saber dónde empieza cada palabra; la
  // normalización se aplica palabra a palabra, igual que en `palabras`.
  const limpio = plano.replace(/(\p{L})\d{1,2}(?=[\s:.,;)]|$)/gu, '$1 ');
  for (const m of limpio.matchAll(re)) {
    lista.push(m[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
    inicios.push(m.index ?? 0);
  }
  const indice = new Map<string, number[]>();
  for (let i = 0; i + 2 < lista.length; i++) {
    const k = `${lista[i]} ${lista[i + 1]} ${lista[i + 2]}`;
    const v = indice.get(k);
    if (v) v.push(i);
    else indice.set(k, [i]);
  }
  return { texto: limpio, palabras: lista, inicios, indice };
}

/** Longitud de la subsecuencia común más larga y dónde cae en `b`. */
function lcs(a: string[], b: string[]): { largo: number; desde: number; hasta: number } {
  const n = a.length;
  const m = b.length;
  let prev = new Uint16Array(m + 1);
  let cur = new Uint16Array(m + 1);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    [prev, cur] = [cur, prev];
    cur.fill(0);
  }
  const largo = prev[m];
  // Dónde cae: la primera y la última palabra de `b` que casan con `a`.
  const enA = new Set(a);
  let desde = 0;
  let hasta = m;
  while (desde < m && !enA.has(b[desde])) desde++;
  while (hasta > desde && !enA.has(b[hasta - 1])) hasta--;
  return { largo, desde, hasta };
}

/**
 * Los trozos fijos de un texto del estándar, sin sus huecos.
 *
 * «La entidad contratante» cuenta como hueco: las bases ponen ahí el
 * nombre de la Entidad —«el Ministerio de Economía y Finanzas debe
 * contar con la siguiente documentación»— y eso no es modificarlas.
 */
function trozosFijos(t: string): string[][] {
  return t
    .replace(/\b(?:la|a la|de la)\s+entidad(?:\s+contratante)?\b/gi, '[…]')
    .split('[…]')
    .map((x) => palabras(x))
    .filter((x) => x.length >= 3);
}

/**
 * Un trozo en tramos de unas diez palabras. Se buscan por separado: una
 * nota al pie o una cabecera metida en medio de la frase solo estropea
 * el tramo donde cae, no la frase entera.
 */
function tramos(w: string[]): string[][] {
  if (w.length <= 14) return [w];
  const salida: string[][] = [];
  for (let i = 0; i < w.length; i += 10) salida.push(w.slice(i, i + 10));
  const ultimo = salida[salida.length - 1];
  if (salida.length > 1 && ultimo.length < 5) {
    salida.pop();
    salida[salida.length - 1] = salida[salida.length - 1].concat(ultimo);
  }
  return salida;
}

const ESTA = 0.9;
const MODIFICADO = 0.55;

/** Números, cantidades y negaciones: lo que cambia el sentido de una norma. */
const CRITICAS = new Set([
  'no', 'ni', 'nunca', 'solo', 'unicamente', 'menos', 'mas', 'mayor', 'menor', 'maximo', 'minimo',
  'uno', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once',
  'doce', 'quince', 'veinte', 'treinta', 'cien', 'habiles', 'calendario', 'dias', 'meses', 'anos',
]);
const esCritica = (w: string) => CRITICAS.has(w) || /^\d+$/.test(w);

export function cotejarTexto(b: BasesPreparadas, fijo: TextoFijo): ResultadoTexto {
  const partes = trozosFijos(fijo.t).flatMap(tramos);
  const total = partes.reduce((s, x) => s + x.length, 0);
  if (total === 0) return { fijo, estado: 'esta', cobertura: 1 };

  let encontradas = 0;
  // Las palabras de las ventanas donde casó cada tramo, para comprobar
  // después que las críticas están.
  const vistas = new Map<string, number>();
  const posiciones: number[] = [];
  for (const w of partes) {
    // Candidatos: donde caen sus trigramas, corrido al inicio del tramo.
    const votos = new Map<number, number>();
    for (let i = 0; i + 2 < w.length; i++) {
      for (const pos of b.indice.get(`${w[i]} ${w[i + 1]} ${w[i + 2]}`) ?? []) {
        const inicio = Math.max(0, pos - i);
        const cubo = inicio - (inicio % 4);
        votos.set(cubo, (votos.get(cubo) ?? 0) + 1);
      }
    }
    const candidatos = [...votos.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, 3)
      .map(([c]) => c);
    let mejor = { largo: 0, desde: 0, hasta: 0, base: 0 };
    for (const c of candidatos) {
      const base = Math.max(0, c - 6);
      const ventana = b.palabras.slice(base, c + w.length * 2 + 12);
      const r = lcs(w, ventana);
      if (r.largo > mejor.largo) mejor = { ...r, base };
    }
    encontradas += mejor.largo;
    if (mejor.largo > 0) {
      for (const w2 of b.palabras.slice(mejor.base + mejor.desde, mejor.base + mejor.hasta)) {
        vistas.set(w2, (vistas.get(w2) ?? 0) + 1);
      }
    }
    if (mejor.largo >= w.length * 0.5) posiciones.push(mejor.base + mejor.desde, mejor.base + mejor.hasta);
  }
  const cobertura = encontradas / total;
  // Un plazo, un monto o una negación cambian el sentido con una palabra:
  // «no puede ser fijada en menos de tres días hábiles» → «puede ser
  // fijada en un día hábil» deja la cobertura por encima del 90 %. Si
  // falta una palabra crítica donde casó el texto, está modificado.
  const faltaCritica = (() => {
    const necesarias = new Map<string, number>();
    for (const w of partes.flat()) if (esCritica(w)) necesarias.set(w, (necesarias.get(w) ?? 0) + 1);
    for (const [w, n] of necesarias) if ((vistas.get(w) ?? 0) < n) return true;
    return false;
  })();
  const estado: EstadoTexto =
    cobertura >= ESTA && !faltaCritica ? 'esta' : cobertura >= MODIFICADO ? 'modificado' : 'falta';

  // Lo que dicen las bases en ese sitio: desde el tramo encontrado más
  // temprano, un poco más largo que el texto del estándar.
  let enLasBases: string | undefined;
  if (estado === 'modificado' && posiciones.length > 0) {
    posiciones.sort((x, y) => x - y);
    // La mediana, para que un tramo que casó lejos no estire el recorte.
    const centro = posiciones[Math.floor(posiciones.length / 2)];
    const desde = Math.max(0, Math.min(...posiciones.filter((x) => Math.abs(x - centro) < total * 3)));
    const hasta = Math.min(b.inicios.length - 1, desde + Math.round(total * 1.6) + 8);
    enLasBases = b.texto.slice(b.inicios[desde], b.inicios[hasta]).trim().slice(0, 1200);
  }
  // La posición: la mediana de donde casaron sus tramos, para que uno que
  // casó lejos —una frase común repetida en otra parte— no la arrastre.
  const orden = [...posiciones].sort((x, y) => x - y);
  const posicion = estado !== 'falta' && orden.length ? orden[Math.floor(orden.length / 2)] : undefined;
  return {
    fijo,
    estado,
    cobertura,
    ...(enLasBases ? { enLasBases } : {}),
    ...(posicion !== undefined ? { posicion } : {}),
  };
}

/**
 * Lo que distingue a cada estándar: sus textos fijos que están en muy
 * pocas de las diecinueve.
 *
 * Medir la parte del estándar presente en las bases no sirve: las
 * garantías, los consorcios y las firmas son iguales en todas, y ese
 * texto común favorece a las más cortas. Con las bases integradas de
 * una Licitación Pública Abreviada de Obras, así medido, ganaba la
 * Subasta Inversa Electrónica.
 */
const distintivos = new WeakMap<BasesEstandar[], Map<string, TextoFijo[]>>();
function textosDistintivos(estandares: BasesEstandar[]): Map<string, TextoFijo[]> {
  const hecho = distintivos.get(estandares);
  if (hecho) return hecho;
  const clave = (f: TextoFijo) => palabras(f.t).join(' ');
  const cuantas = new Map<string, number>();
  for (const e of estandares) {
    for (const k of new Set(e.fijos.map(clave))) cuantas.set(k, (cuantas.get(k) ?? 0) + 1);
  }
  const salida = new Map<string, TextoFijo[]>();
  for (const e of estandares) {
    salida.set(
      e.id,
      e.fijos.filter((f) => (cuantas.get(clave(f)) ?? 0) <= 2),
    );
  }
  distintivos.set(estandares, salida);
  return salida;
}

/** Qué bases estándar corresponde: la que tiene más texto distintivo presente. */
export function identificarEstandar(
  b: BasesPreparadas,
  estandares: BasesEstandar[],
): Array<{ estandar: BasesEstandar; parecido: number }> {
  const propios = textosDistintivos(estandares);
  return estandares
    .map((e) => {
      const muestra = propios.get(e.id) ?? [];
      let presentes = 0;
      for (const f of muestra) {
        const w = palabras(f.t.replace(/\[…\]/g, ' '));
        let hits = 0;
        let n = 0;
        for (let i = 0; i + 2 < w.length; i += 2) {
          n++;
          if (b.indice.has(`${w[i]} ${w[i + 1]} ${w[i + 2]}`)) hits++;
        }
        if (n > 0 && hits / n >= 0.6) presentes++;
      }
      return { estandar: e, parecido: muestra.length ? presentes / muestra.length : 0 };
    })
    .sort((x, y) => y.parecido - x.parecido);
}

export function cotejarBases(b: BasesPreparadas, estandar: BasesEstandar): ResultadoTexto[] {
  return estandar.fijos.map((f) => cotejarTexto(b, f));
}
