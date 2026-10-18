/**
 * Disponibilidad o stock del BIEN que se contrata, exigido para calificar
 * (o para admitir) la oferta.
 *
 * POR QUÉ
 *
 * Documento 15 de César (17/10/2026), sobre las Bases Integradas de la
 * LP Abreviada para Bienes N° 005-2026-MDK/OC-2 (Municipalidad Distrital
 * de Kimbiri, material de afirmado). En «A. Capacidad legal» las bases
 * piden:
 *
 *   «Habilitación para la explotación y/o aprovechamiento de la cantera de
 *   donde provendrá el material, conforme a la normativa sectorial
 *   aplicable; asimismo, se deberá acreditar la disponibilidad del
 *   material para la ejecución de la prestación.»
 *
 * y la acreditan con «documento que demuestre la propiedad, posesión u
 * otro título jurídicamente válido que permita disponer del material». La
 * habilitación de la cantera sí puede pedirse; la disponibilidad del bien
 * objeto de la contratación, no: no es la del equipamiento estratégico,
 * sino la del propio bien. Ni la evaluación de bases ni la del
 * requerimiento lo advertían. La revisión del capítulo con el modelo lo
 * vio en una corrida del 17/10, pero mezclado con la habilitación —pedía
 * suprimir también la autorización de la cantera—, sin literal y sin más
 * norma que «el numeral 3.5.1 de las bases estándar»; en otras no lo ve.
 * Por eso es un control propio, como el de obras como servicios similares.
 *
 * LA NORMA, LEÍDA EN LA BIBLIOTECA EL 17/10/2026
 *
 *   · Reglamento de la Ley N° 32069 (D.S. N° 009-2025-EF), artículo 72:
 *     72.1 «Los requisitos de calificación permiten determinar si los
 *     postores cuentan con las capacidades y aptitudes para ejecutar el
 *     contrato»; 72.3 «son de cinco tipos: a) Capacidad legal: encontrarse
 *     apto para ejecutar la actividad económica materia de contratación,
 *     para lo cual se debe contar con las habilitaciones que corresponda
 *     conforme a la normativa que regule el objeto contractual. b)
 *     Capacidad técnica y profesional: comprende la experiencia y
 *     calificaciones del personal clave, así como el equipamiento
 *     estratégico y/o infraestructura estratégica del proveedor…» (los
 *     otros tres: experiencia del postor, consorcio, capacidad económica);
 *     72.4 «Las bases estándar determinan los tipos de requisitos de
 *     calificación a considerar…». Ninguno es la disponibilidad del bien.
 *   · Mismo Reglamento, numeral 272.3: SOLO en los catálogos electrónicos
 *     de acuerdos marco «se puede exigir al proveedor […] requisitos de
 *     calificación, el compromiso de mantener determinado stock mínimo».
 *   · Numeral 55.3: las bases estándar «son de uso obligatorio».
 *   · Ley N° 32069, literal h) del numeral 5.1 del artículo 5 (libertad de
 *     concurrencia): «evitando exigencias y formalidades innecesarias».
 *   · Bases estándar de bienes (LP, LPA, Vaso de Leche): la capacidad
 *     legal es «[…] LA HABILITACIÓN PARA LLEVAR A CABO LA ACTIVIDAD
 *     ECONÓMICA MATERIA DE LA CONTRATACIÓN […]»; los requisitos
 *     adicionales son solo personal clave (llave en mano) y consorcio —no
 *     hay equipamiento estratégico—; y en la admisión «no debe exigirse
 *     ningún documento vinculado a los requisitos de calificación […].
 *     Tampoco se puede incluir documentos referidos a cualquier tipo de
 *     equipamiento, infraestructura…».
 *   · Pronunciamiento N° 220-2026/OECE-DSAT (08/04/2026): los documentos
 *     que «no constituyen requisitos habilitantes» no deben formar parte de
 *     la «Capacidad legal» y «corresponde suprimir» ese requisito; pueden
 *     pedirse para el perfeccionamiento del contrato.
 *   · Pronunciamiento N° 505-2026/OECE-DSAT (19/08/2026): la «Declaración
 *     jurada mediante la cual se comprometa a suministrar dicho stock
 *     adicional» no acredita una característica del bien «sino […] una
 *     condición relacionada a la ejecución contractual; por lo que
 *     corresponde suprimir dicho documento de la admisión de la oferta».
 *   · Resolución N° 6746-2025-TCP-S5 (07/10/2025, Megantoni, La
 *     Convención, piedra de cantera): exigir como capacidad legal una
 *     autorización de explotación a nombre del postor es «un requisito
 *     restrictivo» que excluye a quien está habilitado para comercializar
 *     el bien (libertad de concurrencia, literal h) del numeral 5.1 del
 *     artículo 5 de la Ley); declaró la nulidad y ordenó reformular las
 *     bases.
 *
 * No se encontró en la biblioteca un pronunciamiento o resolución que
 * diga, con esas palabras, «no puede exigirse la disponibilidad del bien»:
 * el criterio sale de los cinco tipos del artículo 72 y de los dos
 * pronunciamientos. No se cita nada más.
 *
 * QUÉ NO SE DISPARA
 *
 * La disponibilidad del personal, del equipamiento o la infraestructura
 * estratégica, presupuestal, del terreno, «de servicios y repuestos» (un
 * factor de evaluación), el «pago por disponibilidad» de los contratos de
 * contingencia, ni la disponibilidad del material como obligación del
 * CONTRATISTA en la ejecución (el 6.4 de las mismas bases de Kimbiri): solo
 * cuenta lo que esté dentro de un bloque de requisitos de calificación o
 * de documentos para la admisión de la oferta.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FuenteCitada } from './fuentes';
import { plegarConLongitud } from './similares-obras';

export type DondeSeExige = 'calificacion' | 'admision';

export interface DisponibilidadDelBien {
  /** El requisito, en el texto recibido. */
  inicio: number;
  fin: number;
  /** La oración de las bases que lo exige, literal. */
  frase: string;
  /** Lo que la delata: «disponibilidad del material». */
  expresion: string;
  donde: DondeSeExige;
  /** «Capacidad legal», «Documentos para la admisión de la oferta». */
  requisito: string;
  /** «7.1», «3.5.1», «2.2.1.1»; vacío si no se halló. */
  numeral: string;
  /** «A.», «g)»; vacío si no se halló. */
  literal: string;
  /** Las demás oraciones del mismo requisito que piden acreditarla. */
  acreditacion: string[];
  /** Dónde termina la última de esas oraciones (o la frase): el tramo entero de la exigencia. */
  hasta: number;
  /**
   * La oración sin la exigencia —«Habilitación para la explotación…
   * aplicable.»—, si la exigencia es una cláusula añadida a otra cosa que
   * sí vale. `null` si toda la oración es la exigencia: se suprime entera.
   */
  propuesta: string | null;
}

/**
 * La disponibilidad del bien: «disponibilidad del material», «de los
 * bienes», «de los productos ofertados», «de la cantera», «de stock».
 * Sobre el texto plegado (minúsculas, sin tildes).
 */
const RE_DISPONIBILIDAD =
  /\bdisponibilidad\s+(?:(?:inmediata|fisica|real|efectiva|total|suficiente|permanente|plena|comercial|juridica)\s+)?(?:del|de\s+(?:la|las|los|el)|de)\s+((?:[a-z]+\s+){0,2}?)(material(?:es)?|bien(?:es)?|productos?|agregados?|insumos?|mercaderias?|existencias|stock|afirmado|hormigon|canteras?|cantidad(?:es)?\s+(?:requerida|solicitada|ofertada|convocada)s?)\b/g;

/** «Contar con stock», «declaración jurada de stock», «existencias suficientes». */
const RE_STOCK = /\b(?:stock|existencias)\b/g;

/** Lo que no es el bien: si aparece entre «disponibilidad» y el objeto, no cuenta. */
const NO_ES_EL_BIEN = /equip|maquin|vehicul|unidad|infraestructura|personal|profesional|presupuest|terreno|repuesto|servicio|local|almacen|planta/;

/** Lo que sigue al objeto y lo convierte en otra cosa: «bienes estratégicos». */
const DESPUES_NO_ES = /^\s*(?:estrategic|de\s+capital|inmuebles?|muebles\s+e\s+inmuebles|y\s+servicios\s+de\s+contingencia)/;

/** Contratos de contingencia (artículos 284 y 285 del Reglamento): ahí el stock es la prestación. */
const CONTINGENCIA = /contingencia|pago\s+por\s+disponibilidad|rotacion,?\s+stock/;

/** Lo que precede a un número cuando es una cita y no un rótulo. */
const CITA_PREVIA = /(?<!\p{L})(?:numeral|numerales|literal|literales|art[íi]culo|art\.|inciso|N[°º]|cap[íi]tulo|y|o|del|el|al|de)\s*$/iu;

interface Rotulo {
  pos: number;
  fin: number;
  numero: number[];
}

/**
 * Rótulos numerados: «7. REQUISITOS…», «3.5 REQUISITOS…», «2.2.1.1
 * Documentos…». Un número de un solo nivel necesita su punto («7.»): sin
 * él, «2 Und» o «15 días» no son rótulos.
 */
function rotulos(texto: string, desde: number, hasta: number): Rotulo[] {
  const salida: Rotulo[] = [];
  const re = /(?<![\d.,\p{L}°º/])([1-9]\d?(?:\.\d{1,2}){0,4})(\.?)\s+(?=[A-ZÁÉÍÓÚÑ¿“"«])/gu;
  const tramo = texto.slice(desde, hasta);
  for (const m of tramo.matchAll(re)) {
    const pos = desde + (m.index ?? 0);
    if (!m[1].includes('.') && !m[2]) continue;
    // «1.500 Soles», «20.10» no son numerales.
    if (/^\d{1,2}\.\d{3}$/.test(m[1])) continue;
    if (CITA_PREVIA.test(texto.slice(Math.max(0, pos - 14), pos))) continue;
    salida.push({ pos, fin: pos + m[0].length, numero: m[1].split('.').map(Number) });
  }
  return salida;
}

const desciende = (hijo: number[], padre: number[]) =>
  hijo.length > padre.length && padre.every((n, i) => hijo[i] === n);

function mayor(a: number[], b: number[]): boolean {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

interface Bloque {
  donde: DondeSeExige;
  /** Dónde empieza (el rótulo). */
  pos: number;
  numero: number[] | null;
}

const RE_ENCABEZADO =
  /(requisitos\s+de\s+calificaci[oó]n)|(documentos\s+(?:para|de)\s+(?:la\s+)?admisi[oó]n(?:\s+de\s+(?:la\s+)?ofertas?)?)/giu;

/** Hasta dónde se mira hacia atrás en busca del rótulo del bloque. */
const VENTANA = 15_000;

/**
 * El bloque —requisitos de calificación o documentos para la admisión—
 * en que cae una posición, o `null` si cae fuera de los dos.
 *
 * Un encabezado vale si es un rótulo: precedido de su número («7.
 * REQUISITOS DE CALIFICACIÓN», «2.2.1.1 Documentos para la admisión de la
 * oferta»), o escrito en mayúsculas y no a mitad de frase. «Incorporar los
 * documentos que acreditan los “Requisitos de Calificación”» no abre nada.
 * El bloque se cierra con el siguiente rótulo del mismo nivel o superior,
 * con un «CAPÍTULO» o con los «FACTORES DE EVALUACIÓN».
 */
export function bloqueEn(texto: string, posicion: number): Bloque | null {
  const desde = Math.max(0, posicion - VENTANA);
  const numerados = rotulos(texto, desde, posicion);
  let elegido: Bloque | null = null;
  let finDelEncabezado = 0;
  const tramo = texto.slice(desde, posicion);
  for (const m of tramo.matchAll(RE_ENCABEZADO)) {
    const pos = desde + (m.index ?? 0);
    const previo = numerados.filter((r) => r.fin <= pos && pos - r.fin <= 2).pop();
    const enMayusculas = m[0] === m[0].toUpperCase();
    const antes = texto.slice(Math.max(0, pos - 30), pos);
    const aMitadDeFrase = /[\p{Ll}“"«(,]\s*$/u.test(antes);
    if (!previo && !(enMayusculas && !aMitadDeFrase)) continue;
    elegido = { donde: m[1] ? 'calificacion' : 'admision', pos: previo?.pos ?? pos, numero: previo?.numero ?? null };
    finDelEncabezado = pos + m[0].length;
  }
  if (!elegido) return null;

  const entre = texto.slice(finDelEncabezado, posicion);
  if (/CAP[IÍ]TULO\s+(?:[IVX]+|\d+)\b|FACTORES\s+DE\s+EVALUACI[OÓ]N/.test(entre)) return null;
  for (const r of rotulos(texto, finDelEncabezado, posicion)) {
    if (!elegido.numero) return null;
    if (desciende(r.numero, elegido.numero)) continue;
    if (mayor(r.numero, elegido.numero)) return null;
  }
  if (!elegido.numero && posicion - finDelEncabezado > 6000) return null;
  return elegido;
}

/** El último rótulo numerado del bloque antes de la posición: «7.1». */
function numeralEn(texto: string, b: Bloque, posicion: number): string {
  if (!b.numero) return '';
  const propios = rotulos(texto, b.pos, posicion).filter(
    (r) => r.numero.join('.') === b.numero!.join('.') || desciende(r.numero, b.numero!),
  );
  return (propios.pop()?.numero ?? b.numero).join('.');
}

const RE_LITERAL_DE_REQUISITO =
  /(?<![\p{L}\d.])([A-H](?:\.\d{1,2}){0,2})(\.?)\s+(capacidad\s+legal|capacidad\s+t[eé]cnica\s+y\s+profesional|experiencia\s+del\s+postor(?:\s+en\s+la\s+especialidad)?|habilitaci[oó]n|equipamiento\s+estrat[eé]gico|infraestructura\s+estrat[eé]gica|experiencia\s+del\s+personal\s+clave|calificaciones\s+del\s+personal\s+clave|formaci[oó]n\s+acad[eé]mica|participaci[oó]n\s+en\s+consorcio|capacidad\s+econ[oó]mica)/giu;

/** «A. Capacidad legal» → { literal: «A.», requisito: «Capacidad legal» }. */
function requisitoEn(texto: string, b: Bloque, posicion: number): { literal: string; requisito: string } {
  if (b.donde === 'admision') {
    let literal = '';
    for (const m of texto.slice(b.pos, posicion).matchAll(/(?<=^|\s)([a-z])\)\s+(?=[A-ZÁÉÍÓÚÑ¿“"«])/g)) literal = `${m[1]})`;
    return { literal, requisito: 'Documentos para la admisión de la oferta' };
  }
  let ultimo: RegExpMatchArray | null = null;
  for (const m of texto.slice(b.pos, posicion).matchAll(RE_LITERAL_DE_REQUISITO)) {
    // «A.» necesita su punto; «B.1» puede ir sin él.
    if (!m[2] && !/\.\d/.test(m[1])) continue;
    ultimo = m;
  }
  if (!ultimo) return { literal: '', requisito: 'Requisitos de calificación' };
  const nombre = ultimo[3].replace(/\s+/g, ' ').toLowerCase();
  return { literal: `${ultimo[1].toUpperCase()}.`, requisito: nombre.charAt(0).toUpperCase() + nombre.slice(1) };
}

/** La oración que contiene la posición: de «:» o «.» a «.». */
function oracion(texto: string, pos: number): [number, number] {
  let a = pos;
  const tope = Math.max(0, pos - 700);
  while (a > tope) {
    const c = texto[a - 1];
    if ((c === '.' || c === ':') && /\s/.test(texto[a] ?? ' ') && !/\b(?:N|S\/|Nro|art|Ing|Sr|Sra)\.$/.test(texto.slice(Math.max(0, a - 5), a))) break;
    a--;
  }
  let b = pos;
  const fin = Math.min(texto.length, pos + 700);
  while (b < fin) {
    if (texto[b] === '.' && (b + 1 >= texto.length || /\s/.test(texto[b + 1]))) {
      b++;
      break;
    }
    b++;
  }
  while (a < b && /\s/.test(texto[a])) a++;
  return [a, b];
}

/** La oración sin la cláusula de la disponibilidad, si va añadida a otra cosa. */
function sinLaExigencia(frase: string, relativa: number): string | null {
  const antes = frase.slice(0, relativa);
  const cortes = [antes.lastIndexOf(';')];
  for (const m of antes.matchAll(/,\s*(?:asimismo|adem[aá]s|adicionalmente|debiendo|y\s+(?:se\s+)?deber[aá])\b/gi)) cortes.push(m.index ?? -1);
  for (const m of antes.matchAll(/\.\s+(?:Asimismo|Adem[aá]s|Adicionalmente)\b/g)) cortes.push(m.index ?? -1);
  const corte = Math.max(...cortes);
  if (corte < 30) return null;
  const principio = frase.slice(0, corte).trim().replace(/[,;:\s]+$/, '');
  // Lo que siga a la exigencia, tras otro «;», también se conserva.
  const despues = frase.slice(relativa);
  const otra = despues.indexOf(';');
  const resto = otra >= 0 ? despues.slice(otra + 1).trim() : '';
  return resto ? `${principio}; ${resto}` : `${principio}.`;
}

/**
 * Las exigencias de disponibilidad o stock del bien dentro de requisitos
 * de calificación o de documentos para la admisión. Una por requisito: las
 * oraciones de su acreditación van con ella.
 */
export function disponibilidadDelBien(texto: string): DisponibilidadDelBien[] {
  const plano = plegarConLongitud(texto);
  const marcas: Array<{ pos: number; fin: number; expresion: string }> = [];
  for (const m of plano.matchAll(RE_DISPONIBILIDAD)) {
    const pos = m.index ?? 0;
    if (NO_ES_EL_BIEN.test(m[1] ?? '')) continue;
    if (DESPUES_NO_ES.test(plano.slice(pos + m[0].length, pos + m[0].length + 40))) continue;
    if (CONTINGENCIA.test(plano.slice(Math.max(0, pos - 300), pos + 300))) continue;
    marcas.push({ pos, fin: pos + m[0].length, expresion: texto.slice(pos, pos + m[0].length) });
  }
  for (const m of plano.matchAll(RE_STOCK)) {
    const pos = m.index ?? 0;
    if (marcas.some((x) => pos >= x.pos && pos < x.fin)) continue;
    if (/repuesto/.test(plano.slice(Math.max(0, pos - 80), pos + 80))) continue;
    if (CONTINGENCIA.test(plano.slice(Math.max(0, pos - 300), pos + 300))) continue;
    marcas.push({ pos, fin: pos + m[0].length, expresion: texto.slice(pos, pos + m[0].length) });
  }
  marcas.sort((a, b) => a.pos - b.pos);

  const salida: DisponibilidadDelBien[] = [];
  const vistas = new Set<string>();
  for (const marca of marcas) {
    const bloque = bloqueEn(texto, marca.pos);
    if (!bloque) continue;
    const { literal, requisito } = requisitoEn(texto, bloque, marca.pos);
    const numeral = numeralEn(texto, bloque, marca.pos);
    const [a, b] = oracion(texto, marca.pos);
    const frase = texto.slice(a, b).trim();
    if (vistas.has(frase)) continue;
    vistas.add(frase);
    const clave = `${bloque.donde}|${numeral}|${literal}|${requisito}`;
    const previa = salida.find((s) => `${s.donde}|${s.numeral}|${s.literal}|${s.requisito}` === clave);
    if (previa) {
      previa.acreditacion.push(frase);
      previa.hasta = Math.max(previa.hasta, b);
      continue;
    }
    salida.push({
      inicio: a,
      fin: b,
      frase,
      expresion: marca.expresion,
      donde: bloque.donde,
      requisito,
      numeral,
      literal,
      acreditacion: [],
      hasta: b,
      propuesta: sinLaExigencia(frase, marca.pos - a),
    });
  }
  return salida;
}

/**
 * Lo que, dicho por el modelo sobre el mismo tramo, ya cubre el control:
 * la disponibilidad, el stock, la cantera, la capacidad legal.
 */
export const TEMA_DISPONIBILIDAD = /disponib|stock|existencias|cantera|capacidad legal/i;

/** Los precedentes que se citan, con lo que de verdad dicen (leídos el 17/10/2026). */
export const PRECEDENTES_DISPONIBILIDAD_DEL_BIEN: Array<Omit<FuenteCitada, 'documentId'>> = [
  {
    tipo: 'resolucion_tce',
    numero: 'Resolución N° 6746-2025-TCP-S5',
    criterio:
      'En la compra de piedra de cantera, exigir como «Capacidad legal» una autorización de explotación a nombre del postor es un requisito restrictivo que excluye a las empresas habilitadas para comercializar el bien sin explotarlo; vulnera la libertad de concurrencia (literal h) del numeral 5.1 del artículo 5 de la Ley). Declaró la nulidad del procedimiento y ordenó reformular las bases retirando ese requisito.',
  },
  {
    tipo: 'pronunciamiento',
    numero: 'Pronunciamiento N° 220-2026/OECE-DSAT',
    criterio:
      'La «Capacidad legal» (literal a) del numeral 72.3 del artículo 72 del Reglamento) solo comprende las habilitaciones que exige la normativa que regula el objeto contractual: los documentos que no constituyen requisitos habilitantes no deben formar parte de ese requisito y corresponde suprimirlos; si la Entidad los considera importantes, pueden pedirse para el perfeccionamiento del contrato.',
  },
  {
    tipo: 'pronunciamiento',
    numero: 'Pronunciamiento Nº 505-2026/OECE-DSAT',
    criterio:
      'La declaración jurada por la que el postor se compromete a suministrar un stock adicional no acredita una característica o requisito funcional del bien, sino una condición relacionada con la ejecución contractual; por ello el OECE dispuso suprimirla de los documentos para la admisión de la oferta.',
  },
];

/** Los precedentes de la lista que están hoy en la biblioteca, por su número exacto. */
export async function precedentesDeDisponibilidad(cliente: SupabaseClient): Promise<FuenteCitada[]> {
  const numeros = PRECEDENTES_DISPONIBILIDAD_DEL_BIEN.map((p) => p.numero);
  const { data, error } = await cliente.from('normative_documents').select('id, number').in('number', numeros);
  if (error) {
    console.error('[bases] precedentes de disponibilidad del bien:', error.message);
    return [];
  }
  const porNumero = new Map(((data ?? []) as Array<{ id: string; number: string }>).map((d) => [d.number, d.id]));
  return PRECEDENTES_DISPONIBILIDAD_DEL_BIEN.filter((p) => porNumero.has(p.numero)).map((p) => ({
    ...p,
    documentId: porNumero.get(p.numero)!,
  }));
}

/** Ley → Reglamento → bases estándar, en su forma completa. */
export function normaDeDisponibilidad(d: Pick<DisponibilidadDelBien, 'donde'>, basesEstandar?: string): string {
  return [
    'Literal h) del numeral 5.1 del artículo 5 de la Ley N° 32069 (principio de libertad de concurrencia)',
    'numerales 72.1, 72.3 y 72.4 del artículo 72 del Reglamento aprobado por Decreto Supremo N° 009-2025-EF (tipos de requisitos de calificación)',
    'numeral 272.3 del artículo 272 del mismo Reglamento (el compromiso de stock mínimo solo se prevé en los catálogos electrónicos de acuerdos marco)',
    'numeral 55.3 del artículo 55 del mismo Reglamento (uso obligatorio de las bases estándar)',
    `bases estándar${basesEstandar ? ` de ${basesEstandar}` : ''} aprobadas por el OECE — ${
      d.donde === 'admision'
        ? 'documentos para la admisión de la oferta («En este literal no debe exigirse ningún documento vinculado a los requisitos de calificación del postor»)'
        : 'requisito de calificación «Capacidad legal» (habilitación para llevar a cabo la actividad económica materia de la contratación)'
    }`,
  ].join('; ');
}

/** «…», sin el punto final: el punto va fuera de las comillas. */
const cita = (t: string) => {
  const sin = t.trim().replace(/\.$/, '');
  return `«${sin.length > 260 ? `${sin.slice(0, 260).trim()}…` : sin}»`;
};

/** «la disponibilidad del material», «el stock del bien». */
export function loExigido(d: Pick<DisponibilidadDelBien, 'expresion'>): string {
  const exp = d.expresion.replace(/\s+/g, ' ').trim().toLowerCase();
  if (exp.startsWith('disponibilidad')) return `la ${exp}`;
  return exp.startsWith('existencias') ? 'las existencias del bien' : 'el stock del bien';
}

/**
 * El análisis. `sinEquipamiento`: las bases estándar del procedimiento no
 * prevén el equipamiento estratégico (las de bienes).
 */
export function analisisDeDisponibilidad(
  d: DisponibilidadDelBien,
  precedentes: FuenteCitada[],
  opciones: { sinEquipamiento?: boolean } = {},
): string {
  const donde =
    d.donde === 'calificacion'
      ? `dentro del requisito de calificación «${d.requisito}»${d.literal ? ` (literal ${d.literal}${d.numeral ? ` del numeral ${d.numeral}` : ''})` : ''}`
      : `entre los documentos para la admisión de la oferta${d.literal ? ` (literal ${d.literal})` : ''}`;
  const partes = [
    `Las bases exigen, ${donde}, acreditar ${loExigido(d)} —el bien que se contrata—${d.acreditacion.length ? ` y prevén cómo acreditarla: ${d.acreditacion.map(cita).join('; ')}.` : '.'}`,
    'El numeral 72.3 del artículo 72 del Reglamento fija cinco tipos de requisitos de calificación; la capacidad legal es «encontrarse apto para ejecutar la actividad económica materia de contratación, para lo cual se debe contar con las habilitaciones que corresponda conforme a la normativa que regule el objeto contractual», y los únicos bienes con los que el postor debe contar son el equipamiento estratégico y/o la infraestructura estratégica de la capacidad técnica y profesional —que no son el bien objeto de la contratación—' +
      (opciones.sinEquipamiento ? ', que las bases estándar de bienes ni siquiera prevén.' : '.'),
    'El Reglamento solo permite exigir como requisito el compromiso de mantener un stock mínimo en los catálogos electrónicos de acuerdos marco (numeral 272.3), no en un procedimiento de selección. Pedir desde la oferta que el postor demuestre que ya dispone del bien —por propiedad, posesión o un contrato con su titular— deja fuera a quien lo adquiriría al obtener la buena pro y es una exigencia innecesaria que restringe la concurrencia (literal h) del numeral 5.1 del artículo 5 de la Ley).',
  ];
  if (/cantera/i.test(d.frase) || /habilitaci/i.test(d.frase)) {
    partes.push(
      'La habilitación que exige la normativa sectorial —aquí, la autorización vigente de la cantera o fuente de donde provendrá el material— sí puede pedirse como capacidad legal; lo que no corresponde es la disponibilidad del bien ni sus medios de acreditación.',
    );
  }
  const p220 = precedentes.some((p) => /220-2026/.test(p.numero));
  const p505 = precedentes.some((p) => /505-2026/.test(p.numero));
  if (p220 || p505) {
    partes.push(
      `El OECE ha dispuesto ${[
        p220 ? 'suprimir de la «Capacidad legal» los documentos que no son habilitantes (Pronunciamiento N° 220-2026/OECE-DSAT)' : '',
        p505 ? 'suprimir de la admisión la declaración de suministrar stock, por ser una condición de la ejecución contractual (Pronunciamiento N° 505-2026/OECE-DSAT)' : '',
      ]
        .filter(Boolean)
        .join(', y ')}.`,
    );
  }
  if (precedentes.some((p) => /6746-2025/.test(p.numero))) {
    partes.push(
      'El Tribunal declaró la nulidad de una compra de piedra de cantera cuyas bases exigían como capacidad legal más de lo que la normativa sectorial pide para comercializar el bien (Resolución N° 6746-2025-TCP-S5).',
    );
  }
  return partes.join(' ');
}

/** Lo que se pide al comité, con la redacción propuesta. */
export function solicitudDeDisponibilidad(d: DisponibilidadDelBien): string {
  const de =
    d.donde === 'calificacion'
      ? `del requisito de calificación «${d.requisito}»`
      : 'de los documentos para la admisión de la oferta';
  return (
    `Se solicita suprimir ${de} la exigencia de acreditar ${loExigido(d)}${d.acreditacion.length ? ' y los documentos previstos para acreditarla' : ''}, por no corresponder a ninguno de los tipos de requisitos de calificación del numeral 72.3 del artículo 72 del Reglamento ni a lo que permiten las bases estándar.` +
    (d.propuesta ? ` Redacción propuesta: «${d.propuesta}»` : ' Se pide suprimir la oración completa.')
  );
}

/** Lo que tiene que corregir la Entidad antes de publicar. */
export function correccionDeDisponibilidad(d: DisponibilidadDelBien): string {
  return (
    `Suprimir la exigencia de acreditar ${loExigido(d)}` +
    (d.propuesta ? ` (redacción: «${d.propuesta}»)` : ' (la oración completa)') +
    (d.acreditacion.length ? ` y las oraciones que la acreditan: ${d.acreditacion.map(cita).join('; ')}` : '') +
    '. Si se necesita asegurar el abastecimiento, regularlo como obligación del contratista durante la ejecución del contrato, no como requisito para calificar o admitir la oferta.'
  );
}
