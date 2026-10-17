/**
 * Obras como «servicios similares» en una contratación de servicios.
 *
 * POR QUÉ
 *
 * Documento 14 de César (16/10/2026): las bases del servicio de
 * fabricación e instalación de estructura metálica y cobertura de la
 * Municipalidad Distrital de Socos definen como servicios similares «la
 * ejecución de obras en general o edificaciones u obras civiles de
 * recreación y deporte que hayan incluido componentes de instalación de
 * coberturas metálicas…». En una contratación de SERVICIOS eso es un
 * vicio, y la evaluación de bases y la del requerimiento tienen que
 * decirlo y pedir que se corrija.
 *
 * Es un control propio, y no una frase más en el prompt, porque el
 * modelo no lo veía: la revisión del capítulo lo leía como una
 * definición amplia de similares —que es facultad de la Entidad— y no
 * como un cambio de la naturaleza de la prestación.
 *
 * LO QUE DICEN LAS FUENTES QUE CITÓ CÉSAR (leídas en la biblioteca el
 * 16/10/2026, fragmento por fragmento):
 *
 *   · Resolución N° 5325-2026-TCP-S6 (27/05/2026, SUNAT, CP de servicios
 *     de mantenimiento correctivo de infraestructura): las bases
 *     integradas incluyeron en los servicios similares «obras de
 *     construcción, refacción, acondicionamiento, mantenimiento,
 *     mejoramiento, remodelación…». La Sala: las bases estándar de un
 *     concurso público de servicios circunscriben la experiencia a
 *     servicios iguales o similares; incluir obras introduce una
 *     categoría que no prevén, y no es una diferencia nominal —servicios
 *     y obras se acreditan con documentos distintos—. Vulnera el
 *     principio de transparencia (artículo 5 de la Ley) y el numeral 55.3
 *     del artículo 55 del Reglamento. Nulidad de oficio, retrotrae a la
 *     convocatoria previa reformulación de las bases.
 *   · Resolución N° 8067-2026-TCP-S3 (17/08/2026, Municipalidad
 *     Provincial de Ilo, CPA de servicios de carpeta asfáltica): las
 *     bases admitían como similar «la ejecución de obras de construcción,
 *     rehabilitación, mejoramiento… de infraestructura vial» que tuvieran
 *     carpeta asfáltica entre sus metas. La Sala: no es una precisión
 *     permitida sino una modificación de las bases estándar; vulnera el
 *     numeral 55.3 del artículo 55 del Reglamento, el numeral 6 de la
 *     Directiva N.° 0005-2025-EF/54.01 y el literal i) del numeral 5.1
 *     del artículo 5 de la Ley. Nulidad, retrotrae a la elaboración de
 *     las bases.
 *   · Resolución N° 7146-2026-TCP-S3 (13/07/2026, Gobierno Regional de
 *     Lima, CPA de servicio de mantenimiento de letreros): el vicio no es
 *     exactamente «obras», sino similares definidos por actividades o
 *     partidas de «servicios u obras de mayor alcance» —infraestructura
 *     vial, «mantenimiento en general»—. Las bases estándar exigen que la
 *     experiencia sea en servicios iguales o similares, no en partidas de
 *     prestaciones mayores. Mismas normas; nulidad.
 *   · Pronunciamiento N° 359-2026/OECE-DSAT (17/06/2026, Municipalidad
 *     Distrital de San Miguel, CP de servicios de reparación de calzada):
 *     un participante pidió que se aceptaran contratos de ejecución de
 *     obras viales como servicios similares; el OECE NO ACOGIÓ el
 *     cuestionamiento y respaldó a la Entidad, que los excluyó porque un
 *     contrato de obra no asegura que la actividad del servicio haya sido
 *     parte sustancial de la prestación. Respalda excluir las obras; no
 *     declara por sí mismo la nulidad de incluirlas.
 *
 * El criterio de cada una va abajo, resumido con esa fidelidad. Solo se
 * cita la que esté en la biblioteca en el momento de evaluar.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FuenteCitada } from './biblioteca';

/** Los precedentes que César señaló, con lo que de verdad resolvieron. */
export const PRECEDENTES_OBRAS_COMO_SIMILARES: Array<Omit<FuenteCitada, 'documentId'>> = [
  {
    tipo: 'resolucion_tce',
    numero: 'Resolución N° 5325-2026-TCP-S6',
    criterio:
      'En un concurso público de servicios, las bases estándar circunscriben la experiencia del postor a servicios iguales o similares al objeto de la convocatoria; incorporar obras de construcción, refacción, mantenimiento o mejoramiento de infraestructura en la definición de servicios similares introduce una categoría de experiencia que no prevén —con un régimen de acreditación distinto— y vulnera el principio de transparencia y el numeral 55.3 del artículo 55 del Reglamento. Declaró la nulidad y retrotrajo el procedimiento a la convocatoria, previa reformulación de las bases.',
  },
  {
    tipo: 'resolucion_tce',
    numero: 'Resolución N° 8067-2026-TCP-S3',
    criterio:
      'Admitir como servicio similar la ejecución de obras de construcción, rehabilitación o mejoramiento de infraestructura vial que incluyan el componente del servicio no es una precisión permitida, sino una modificación de las bases estándar: vulnera el numeral 55.3 del artículo 55 del Reglamento, el numeral 6 de la Directiva N.° 0005-2025-EF/54.01 y el literal i) del numeral 5.1 del artículo 5 de la Ley. Declaró la nulidad y retrotrajo a la elaboración de las bases.',
  },
  {
    tipo: 'resolucion_tce',
    numero: 'Resolución N° 7146-2026-TCP-S3',
    criterio:
      'La similitud no puede construirse a partir de actividades o partidas que forman parte de servicios u obras de mayor alcance: las bases estándar exigen que la experiencia esté referida a servicios iguales o similares al objeto de la convocatoria. Definir así los similares contraviene las bases estándar (numeral 55.3 del artículo 55 del Reglamento y numeral 6 de la Directiva N.° 0005-2025-EF/54.01) y el principio de transparencia; declaró la nulidad.',
  },
  {
    tipo: 'pronunciamiento',
    numero: 'Pronunciamiento N° 359-2026/OECE-DSAT',
    criterio:
      'En un concurso público de servicios, el OECE no acogió el pedido de aceptar contratos de ejecución de obras como servicios similares y respaldó a la Entidad, que los excluyó porque un contrato de obra no garantiza que la actividad del servicio haya sido parte sustancial de la prestación ejecutada.',
  },
];

/** Las bases estándar de servicios y consultorías en general: ninguna admite obras como similares. */
export const ESTANDARES_DE_SERVICIOS = new Set(['be-8', 'be-9', 'be-10', 'be-11', 'be-14', 'be-15', 'be-16']);

const plegar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Dónde empieza la definición de similares: «Se consideran servicios
 * similares a los siguientes:», «se considerará como servicio similar…».
 */
const RE_DEFINICION =
  /(?:se\s+consider(?:a|an|ara|aran)\s+(?:como\s+)?|consid[eé]rese\s+(?:como\s+)?|ser[aá]n?\s+considerad[oa]s?\s+(?:como\s+)?)(?:servicios?|prestaciones|consultor[ií]as?|experiencias?|trabajos)\s+(?:de\s+consultor[ií]a\s+)?(?:iguales\s+o\s+)?similar(?:es)?/gi;

/**
 * Lo que convierte a una obra en «similar»: ejecución de obras, obras en
 * general, obras civiles, contratos de obra, «servicios y/u obras»… Se
 * buscan expresiones de obra como PRESTACIÓN, no la palabra suelta: «mano
 * de obra» o «para la obra denominada…» (un servicio PARA una obra, como
 * en la Resolución 8067) no cuentan.
 */
const RE_OBRA = new RegExp(
  [
    'ejecucion\\s+de\\s+(?:la\\s+|las\\s+|una\\s+)?obras?\\b',
    '\\bobras?\\s+(?:en\\s+general|civiles?|publicas|privadas|de\\s+(?:construccion|edificacion|infraestructura|recreacion|rehabilitacion|mejoramiento|ampliacion|remodelacion|creacion|saneamiento|electrificacion|instalacion|reconstruccion|habilitacion))',
    '\\bcontratos?\\s+de\\s+(?:ejecucion\\s+de\\s+)?obras?\\b',
    '\\b(?:y|o|u)\\s*\\/?\\s*(?:y|o|u)?\\s+obras?\\b(?!\\s+(?:denominada|de\\s+la\\s+entidad))',
    '\\bedificaciones\\s+u?\\s*obras?\\b',
  ].join('|'),
  'g',
);

/** Lo que acredita una obra, no un servicio. */
const RE_ACREDITACION_DE_OBRA = /acta\s+de\s+recepcion\s+(?:de\s+(?:la\s+)?)?obra|liquidacion\s+de\s+(?:la\s+)?obra|recepcion\s+de\s+obra/;

export interface ObrasComoSimilares {
  /** Posición, en el texto recibido, de la frase con la obra. */
  inicio: number;
  fin: number;
  /** La frase de las bases, literal. */
  frase: string;
  /** Lo que la delata: «ejecución de obras en general». */
  expresion: string;
  /** Si además la acreditación pide actas de recepción de obra. */
  acreditaComoObra: boolean;
}

/** Hasta dónde llega la definición: la «Acreditación:» o el siguiente rótulo. */
function finDeLaDefinicion(plano: string, desde: number): number {
  const resto = plano.slice(desde, desde + 1800);
  const corte = resto.search(/\bacreditacion\s*:|\bimportante\b|\badvertencia\b|\b[a-h]\.\s+[a-z]{4,}\s+(?:del?|en)\s|\bpuntaje\s*\//);
  return desde + (corte > 40 ? corte : resto.length);
}

/**
 * Las definiciones de similares que meten obras. El texto se pliega para
 * buscar (sin tildes, en minúsculas) pero las posiciones son las del texto
 * recibido: plegar no cambia la longitud del texto en español —cada vocal
 * con tilde se descompone y su marca se quita, letra por letra—, y se
 * comprueba por si acaso.
 */
export function obrasComoSimilares(texto: string): ObrasComoSimilares[] {
  const plano = plegarConLongitud(texto);
  const salida: ObrasComoSimilares[] = [];
  for (const m of plano.matchAll(RE_DEFINICION)) {
    const desde = m.index ?? 0;
    const hasta = finDeLaDefinicion(plano, desde + m[0].length);
    const tramo = plano.slice(desde, hasta);
    const obra = [...tramo.matchAll(RE_OBRA)][0];
    if (!obra) continue;
    const pos = desde + (obra.index ?? 0);
    if (salida.some((s) => Math.abs(s.inicio - pos) < 1500)) continue;
    // La frase: desde el principio de la definición (o el punto anterior a
    // la obra, si la definición es larga) hasta el punto siguiente.
    let a = desde;
    if (pos - a > 500) {
      const punto = plano.lastIndexOf('.', pos);
      a = punto > desde ? punto + 1 : pos - 300;
    }
    let b = plano.indexOf('.', pos + obra[0].length);
    if (b < 0 || b - pos > 600) b = Math.min(plano.length, pos + 400);
    else b += 1;
    while (a < b && /\s/.test(texto[a])) a++;
    const acreditacion = plano.slice(hasta, hasta + 1500);
    salida.push({
      inicio: a,
      fin: b,
      frase: texto.slice(a, b).trim(),
      expresion: texto.slice(pos, pos + obra[0].length),
      acreditaComoObra: RE_ACREDITACION_DE_OBRA.test(acreditacion) || RE_ACREDITACION_DE_OBRA.test(tramo),
    });
  }
  return salida;
}

/**
 * Plegado que conserva la longitud: si algún carácter cambiara de largo
 * al quitarle la tilde, las posiciones dejarían de valer; en ese caso se
 * deja tal cual.
 */
function plegarConLongitud(texto: string): string {
  let salida = '';
  for (const c of texto) {
    const p = plegar(c);
    salida += p.length === c.length ? p : c;
  }
  return salida;
}

/**
 * Los precedentes de la lista que están hoy en la biblioteca. Se buscan
 * por su número exacto en `normative_documents` (nunca con un `ilike`
 * sobre `normative_chunks`, que agota el tiempo y devuelve vacío).
 */
export async function precedentesEnLaBiblioteca(cliente: SupabaseClient): Promise<FuenteCitada[]> {
  const numeros = PRECEDENTES_OBRAS_COMO_SIMILARES.map((p) => p.numero);
  const { data, error } = await cliente.from('normative_documents').select('id, number').in('number', numeros);
  if (error) {
    console.error('[bases] precedentes de obras como similares:', error.message);
    return [];
  }
  const porNumero = new Map(((data ?? []) as Array<{ id: string; number: string }>).map((d) => [d.number, d.id]));
  return PRECEDENTES_OBRAS_COMO_SIMILARES.filter((p) => porNumero.has(p.numero)).map((p) => ({
    ...p,
    documentId: porNumero.get(p.numero)!,
  }));
}

/** Las normas que esos precedentes aplican, con su forma completa. */
export const NORMA_OBRAS_COMO_SIMILARES =
  'Literal i) del numeral 5.1 del artículo 5 de la Ley N° 32069 (principio de transparencia y facilidad de uso); numeral 55.3 del artículo 55 del Reglamento aprobado por Decreto Supremo N° 009-2025-EF (uso obligatorio de las bases estándar); bases estándar aprobadas por el OECE — requisito de calificación «Experiencia del postor en la especialidad» (servicios iguales o similares al objeto de la convocatoria); numeral 6 de la Directiva N.° 0005-2025-EF/54.01';

/** El análisis de la observación, en las palabras de los precedentes. */
export function analisisObrasComoSimilares(o: ObrasComoSimilares, citadas: FuenteCitada[]): string {
  const res = citadas.filter((c) => c.tipo === 'resolucion_tce').map((c) => c.numero.replace(/^Resolución\s+/, ''));
  return (
    `El objeto de la convocatoria es un servicio, pero la definición de servicios similares admite como experiencia «${o.expresion}». ` +
    'Las bases estándar de servicios exigen que la experiencia del postor en la especialidad se acredite con servicios iguales o similares al objeto de la convocatoria: incorporar obras introduce una categoría de experiencia que el estándar no prevé, con un régimen de ejecución y acreditación distinto' +
    (o.acreditaComoObra ? ' —las propias bases piden, para acreditarla, documentos propios de obra como el acta de recepción—' : '') +
    ', y no constituye una precisión permitida sino una modificación de las bases estándar. ' +
    (res.length
      ? `El Tribunal ha declarado la nulidad de procedimientos con bases así (${res.length === 1 ? 'Resolución' : 'Resoluciones'} ${res.join(', ')}).`
      : 'Es un vicio que el Tribunal ha sancionado con la nulidad del procedimiento.')
  );
}
