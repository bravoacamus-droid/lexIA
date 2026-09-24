/**
 * Qué normativa rige el contrato, y las fechas en días hábiles.
 *
 * El régimen no es el de hoy: es el de la convocatoria. La Cuarta
 * Disposición Complementaria Transitoria de la Ley N.° 32069 dice que
 * «los procedimientos de selección iniciados antes de la vigencia de la
 * presente ley se rigen por las normas vigentes al momento de su
 * convocatoria». La Ley entró en vigor a los noventa días calendario de
 * publicado su Reglamento (Vigésima Novena Disposición Complementaria
 * Final); el Reglamento se publicó el 22 de enero de 2025, así que rige
 * desde el 22 de abril de 2025 —la biblioteca guarda las preguntas
 * frecuentes de la Ley N.° 30225 como «régimen vigente hasta el
 * 21-04-2025»—.
 *
 * Los dos modelos de carta notarial de César (Gobierno Regional de
 * Ayacucho, julio de 2024) citan el TUO de la Ley N.° 30225 y el
 * artículo 165 de su Reglamento: un contrato de entonces se sigue
 * ejecutando con esas normas, y un informe que le aplique la Ley N.°
 * 32069 está mal desde el primer párrafo.
 */
import type { Ficha } from './tipos';

export const VIGENCIA_LEY_32069 = '2025-04-22';

export interface Regimen {
  clave: 'ley_32069' | 'ley_30225' | 'por_determinar';
  texto: string;
  base: string;
  /** Por qué se decidió así, en una frase. */
  razon: string;
}

const BASE = 'Cuarta Disposición Complementaria Transitoria de la Ley N.° 32069';

export const TEXTO_REGIMEN = {
  ley_32069:
    'Ley N.° 32069, Ley General de Contrataciones Públicas, y su Reglamento, aprobado por Decreto Supremo N.° 009-2025-EF',
  ley_30225:
    'Texto Único Ordenado de la Ley N.° 30225, Ley de Contrataciones del Estado, aprobado por Decreto Supremo N.° 082-2019-EF, y su Reglamento, aprobado por Decreto Supremo N.° 344-2018-EF',
  por_determinar: 'Por determinar',
} as const;

/** «2025-03-14» o «14/03/2025» a AAAA-MM-DD; si no se entiende, null. */
export function fechaISO(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

export function determinarRegimen(ficha: Ficha): Regimen {
  const convocatoria = fechaISO(ficha.fecha_convocatoria?.valor);
  if (convocatoria) {
    const nueva = convocatoria >= VIGENCIA_LEY_32069;
    return {
      clave: nueva ? 'ley_32069' : 'ley_30225',
      texto: nueva ? TEXTO_REGIMEN.ley_32069 : TEXTO_REGIMEN.ley_30225,
      base: BASE,
      razon: `El procedimiento se convocó el ${fechaLarga(convocatoria)}, ${nueva ? 'con' : 'antes de'} la vigencia de la Ley N.° 32069 (22 de abril de 2025).`,
    };
  }
  const suscripcion = fechaISO(ficha.fecha_suscripcion?.valor);
  // Un contrato suscrito antes del 22/04/2025 viene de una convocatoria
  // anterior: no hay duda. Uno suscrito después puede venir de una
  // convocatoria de antes, y eso lo decide solo la fecha de convocatoria.
  if (suscripcion && suscripcion < VIGENCIA_LEY_32069) {
    return {
      clave: 'ley_30225',
      texto: TEXTO_REGIMEN.ley_30225,
      base: BASE,
      razon: `El contrato se suscribió el ${fechaLarga(suscripcion)}, antes de la vigencia de la Ley N.° 32069: su convocatoria es anterior.`,
    };
  }
  return {
    clave: 'por_determinar',
    texto: TEXTO_REGIMEN.por_determinar,
    base: BASE,
    razon: suscripcion
      ? `El contrato se suscribió el ${fechaLarga(suscripcion)}, pero el régimen depende de la fecha de convocatoria del procedimiento, que no figura en los documentos.`
      : 'El régimen depende de la fecha de convocatoria del procedimiento, que no figura en los documentos.',
  };
}

// ── Fechas ───────────────────────────────────────────────────────────

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

function aISO(f: Date): string {
  return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`;
}

function desdeISO(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

/** Domingo de Pascua (algoritmo de Meeus). */
function pascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/**
 * Los feriados nacionales del Perú, con los que se añadieron en los
 * últimos años —7 de junio, 23 de julio, 6 de agosto y 9 de diciembre—,
 * que rigen todos desde 2024. No incluye los días no laborables que el
 * Ejecutivo declara cada año para el sector público: eso se advierte en
 * el cálculo.
 */
function feriados(anio: number): Set<string> {
  const fijos = ['01-01', '05-01', '06-29', '07-28', '07-29', '08-30', '10-08', '11-01', '12-08', '12-25'];
  if (anio >= 2024) fijos.push('06-07', '07-23', '08-06', '12-09');
  const set = new Set(fijos.map((f) => `${anio}-${f}`));
  const p = pascua(anio);
  for (const delta of [-3, -2]) {
    const f = new Date(p.getTime() + delta * 86400000);
    set.add(aISO(f));
  }
  return set;
}

export function esDiaHabil(iso: string): boolean {
  const f = desdeISO(iso);
  const dia = f.getUTCDay();
  if (dia === 0 || dia === 6) return false;
  return !feriados(f.getUTCFullYear()).has(iso);
}

/** El día hábil número `n` contado desde el día siguiente de `desde`. */
export function sumarDiasHabiles(desde: string, n: number): string {
  let f = desdeISO(desde);
  let cuenta = 0;
  while (cuenta < n) {
    f = new Date(f.getTime() + 86400000);
    if (esDiaHabil(aISO(f))) cuenta++;
  }
  return aISO(f);
}

export function sumarDiasCalendario(desde: string, n: number): string {
  return aISO(new Date(desdeISO(desde).getTime() + n * 86400000));
}

/** Días calendario entre dos fechas (b − a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((desdeISO(b).getTime() - desdeISO(a).getTime()) / 86400000);
}

export function hoyISO(): string {
  // La hora de Lima: a las 20:00 del 23 en Lima ya es 24 en UTC.
  return aISO(new Date(Date.now() - 5 * 3600000));
}

export const AVISO_DIAS_HABILES =
  'El cómputo descuenta sábados, domingos y feriados nacionales, pero no los días no laborables que el Poder Ejecutivo declare para el sector público: verifícalo.';
