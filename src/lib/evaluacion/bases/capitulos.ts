/**
 * Las bases, partidas por los capítulos de su sección específica.
 *
 * Para revisar el Capítulo IV de unas bases contra el Capítulo IV del
 * estándar hay que saber dónde empieza y dónde acaba en las bases.
 *
 * La pista es el rótulo, pero con tres trampas que se midieron en las
 * cuatro bases integradas de César:
 *
 *   · «CAPÍTULO I» sale tres veces: en el índice, en la Sección General
 *     y en la Específica. La de la Específica es la última.
 *   · El texto cita capítulos —«conforme al Capítulo II de la Sección
 *     General de las presentes bases»—. Un rótulo es «CAPÍTULO N» en
 *     mayúsculas con su título en mayúsculas detrás; una cita, no.
 *   · El estándar trae variantes de un mismo capítulo —la Licitación
 *     Pública Abreviada de Obras tiene dos Capítulo III, uno por sistema
 *     de entrega— y las bases llevan una. Se elige la que más casa.
 */
import type { BasesPreparadas, ResultadoTexto } from './cotejo';

export interface CapituloEstandar {
  rotulo: string;
  titulo: string;
  texto: string;
}

export interface CapituloDeLasBases {
  numero: number;
  rotulo: string;
  titulo: string;
  /** El texto del estándar para ese capítulo. */
  estandar: string;
  /** El texto de las bases para ese capítulo. */
  bases: string;
}

const ROMANOS: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };
const ROMANO = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const RE_ROTULO = /CAP[IÍ]TULO\s+(VII|VI|V|IV|III|II|I)\b[\s.:–-]*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ,]{4,})/g;
const RE_ANEXOS = /\bANEXOS?\b(?:\s+N[°º.]*\s*0?1\b)?/g;

/** La palabra en que cae una posición del texto. */
function palabraEn(b: BasesPreparadas, caracter: number): number {
  let lo = 0;
  let hi = b.inicios.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (b.inicios[m] <= caracter) lo = m;
    else hi = m - 1;
  }
  return lo;
}

export function partirEnCapitulos(
  b: BasesPreparadas,
  cotejo: ResultadoTexto[],
  capitulos: CapituloEstandar[],
): CapituloDeLasBases[] {
  // Lo que tiene que decir el título detrás de cada rótulo, según el
  // estándar: «REQUERIMIENTO», «EVALUACIÓN», «PROFORMA». Así no cuenta
  // un «[…] CAPÍTULO III DE LA SECCIÓN ESPECÍFICA DE LAS BASES]» que un
  // anexo escribe en mayúsculas.
  const plegar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const titulosEsperados = new Map<number, string[]>();
  for (const c of capitulos) {
    const n = ROMANOS[c.rotulo.replace(/^CAP[IÍ]TULO\s+/i, '').trim().toUpperCase()];
    const primera = plegar(c.titulo).match(/[A-Z]{3,}/)?.[0];
    if (n && primera) titulosEsperados.set(n, [...(titulosEsperados.get(n) ?? []), primera]);
  }

  // Los rótulos candidatos: con su título, y que no sean una referencia
  // —«CAPÍTULO III REQUERIMIENTO DE LA SECCIÓN ESPECÍFICA DE LAS BASES]»
  // lo escribe un anexo en mayúsculas—.
  const candidatos: Array<{ numero: number; caracter: number }> = [];
  for (const m of b.texto.matchAll(RE_ROTULO)) {
    const n = ROMANOS[m[1]];
    if (!n) continue;
    const esperado = titulosEsperados.get(n);
    const titulo = plegar(m[2]);
    if (esperado && !esperado.some((e) => titulo.includes(e))) continue;
    const detras = plegar(b.texto.slice(m.index ?? 0, (m.index ?? 0) + 90));
    if (/\]|DE LA SECCION|DE LAS BASES|DE LA PRESENTE/.test(detras)) continue;
    candidatos.push({ numero: n, caracter: m.index ?? 0 });
  }
  if (candidatos.length === 0) return [];

  // La cadena de rótulos más larga con números y posiciones crecientes,
  // y entre las igual de largas la más tardía: el índice y la Sección
  // General van antes que la Específica.
  const orden = [...candidatos].sort((x, y) => x.caracter - y.caracter);
  const largo = orden.map(() => 1);
  const previo = orden.map(() => -1);
  for (let i = 0; i < orden.length; i++) {
    for (let j = 0; j < i; j++) {
      if (orden[j].numero < orden[i].numero && largo[j] + 1 >= largo[i]) {
        largo[i] = largo[j] + 1;
        previo[i] = j;
      }
    }
  }
  let fin = 0;
  for (let i = 1; i < orden.length; i++) if (largo[i] >= largo[fin]) fin = i;
  const arranques: Array<{ numero: number; caracter: number }> = [];
  for (let i = fin; i >= 0; i = previo[i]) arranques.unshift(orden[i]);

  // Dónde empiezan los anexos: la primera mención en mayúsculas tras el
  // último capítulo.
  const ultimo = arranques[arranques.length - 1].caracter;
  let anexos = b.texto.length;
  for (const m of b.texto.matchAll(RE_ANEXOS)) {
    if ((m.index ?? 0) > ultimo + 500) {
      anexos = m.index ?? anexos;
      break;
    }
  }

  // Cuánto casa cada capítulo del estándar, para elegir entre variantes.
  const casan = new Map<number, number>();
  for (const r of cotejo) {
    if (r.fijo.k !== undefined && r.estado !== 'falta') casan.set(r.fijo.k, (casan.get(r.fijo.k) ?? 0) + 1);
  }

  const salida: CapituloDeLasBases[] = [];
  arranques.forEach((a, k) => {
    const fin = k + 1 < arranques.length ? arranques[k + 1].caracter : anexos;
    const variantes = capitulos
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => ROMANOS[c.rotulo.replace(/^CAP[IÍ]TULO\s+/i, '').trim().toUpperCase()] === a.numero);
    if (variantes.length === 0) return;
    const mejor = variantes.sort((x, y) => (casan.get(y.i) ?? 0) - (casan.get(x.i) ?? 0))[0];
    salida.push({
      numero: a.numero,
      rotulo: `CAPÍTULO ${ROMANO[a.numero]}`,
      titulo: mejor.c.titulo,
      estandar: mejor.c.texto,
      bases: b.texto.slice(a.caracter, fin).trim(),
    });
  });
  void palabraEn;
  return salida;
}
