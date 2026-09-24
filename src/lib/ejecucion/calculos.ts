/**
 * Las cuentas que no se le dejan al modelo.
 *
 * Porcentajes de adicionales y reducciones, la penalidad por mora, el
 * plazo del apercibimiento, si una solicitud de ampliación llegó a
 * tiempo o si la Entidad ya no puede pronunciarse. Son aritmética y
 * calendario: si las hiciera el modelo, la auditoría no tendría contra
 * qué comprobarlas. Cada resultado lleva su artículo y los valores que
 * el documento puede citar.
 */
import type { Actuacion, TipoContratacion } from './catalogo';
import {
  AVISO_DIAS_HABILES,
  diasEntre,
  fechaISO,
  fechaLarga,
  sumarDiasCalendario,
  sumarDiasHabiles,
} from './regimen';
import type { Calculo, Ficha } from './tipos';

export interface Insumos {
  actuacion: Actuacion;
  tipo: TipoContratacion | null;
  sistemaEntrega: string | null;
  ficha: Ficha;
  respuestas: Record<string, string>;
  /** Fecha de la solicitud del contratista, si está en el expediente. */
  fechaSolicitud?: string | null;
  fechaConformidad?: string | null;
  /** Ya hay una resolución que se pronuncia en el expediente. */
  hayPronunciamiento?: boolean;
  hoy: string;
}

/** «S/ 1'410,000.00», «1 410 000,50», «240000» → número. */
export function aNumero(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = v.replace(/[^\d.,]/g, '');
  if (!s) return null;
  const ultimoPunto = s.lastIndexOf('.');
  const ultimaComa = s.lastIndexOf(',');
  // El separador decimal es el último y va seguido de una o dos cifras.
  const decimal = Math.max(ultimoPunto, ultimaComa);
  if (decimal >= 0 && s.length - decimal - 1 <= 2 && s.length - decimal - 1 > 0) {
    s = s.slice(0, decimal).replace(/[.,]/g, '') + '.' + s.slice(decimal + 1);
  } else {
    s = s.replace(/[.,]/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function soles(n: number): string {
  return `S/ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function porcentaje(n: number): string {
  return `${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function montoOriginal(f: Ficha): number | null {
  return aNumero(f.monto_original?.valor) ?? aNumero(f.monto_vigente?.valor);
}

function montoVigente(f: Ficha): number | null {
  return aNumero(f.monto_vigente?.valor) ?? aNumero(f.monto_original?.valor);
}

function plazoDias(f: Ficha): number | null {
  const n = aNumero(f.plazo_dias?.valor);
  return n && n > 0 ? Math.round(n) : null;
}

/** El límite de adicionales y quién lo aprueba, según el tipo y el porcentaje. */
export function limiteDeAdicionales(
  tipo: TipoContratacion | null,
  sistemaEntrega: string | null,
  pct: number,
): { organo: string; base: string; excede: boolean; tope: number } {
  if (tipo === 'obra') {
    if (/dise[ñn]o/i.test(sistemaEntrega ?? '')) {
      const base = 'literal b) del numeral 195.1 del artículo 195 del Reglamento';
      if (pct <= 20) return { organo: 'Autoridad de la gestión administrativa', base, excede: false, tope: 20 };
      if (pct <= 40) return { organo: 'Titular de la Entidad', base, excede: false, tope: 40 };
      if (pct <= 50)
        return { organo: 'Titular de la Entidad, previa autorización de la Contraloría General de la República', base, excede: false, tope: 50 };
      return { organo: 'Ninguno: se supera el límite y corresponde resolver el contrato', base: 'literal c) del numeral 195.1 del artículo 195 del Reglamento', excede: true, tope: 50 };
    }
    const base = 'numerales 64.2 y 64.3 del artículo 64 de la Ley';
    if (pct <= 15) return { organo: 'Autoridad de la gestión administrativa', base, excede: false, tope: 15 };
    if (pct <= 30) return { organo: 'Titular de la Entidad', base, excede: false, tope: 30 };
    if (pct <= 50)
      return { organo: 'Titular de la Entidad, previa autorización de la Contraloría General de la República', base, excede: false, tope: 50 };
    return { organo: 'Ninguno: se supera el 50 % y corresponde resolver el contrato', base: 'numeral 194.5 del artículo 194 del Reglamento', excede: true, tope: 50 };
  }
  const base = 'numeral 64.1 del artículo 64 de la Ley';
  if (pct <= 25) return { organo: 'Autoridad de la gestión administrativa', base, excede: false, tope: 25 };
  return { organo: 'Ninguno: se supera el 25 % del monto del contrato original', base, excede: true, tope: 25 };
}

/** El factor F de la fórmula de penalidad (numeral 120.1). */
export function factorF(tipo: TipoContratacion, plazo: number): number {
  if (tipo === 'obra') return plazo <= 60 ? 0.4 : plazo <= 120 ? 0.25 : 0.15;
  if (tipo === 'consultoria_obra') return plazo <= 60 ? 0.4 : 0.25;
  return 0.4;
}

/**
 * El plazo del apercibimiento (literal a del numeral 122.1): no menor del
 * 10 % ni mayor del 15 % del plazo vigente; los decimales cuentan como
 * día completo; tres días si el plazo es menor de treinta; quince días
 * en la ejecución de obras de más de sesenta.
 */
export function plazoDeApercibimiento(tipo: TipoContratacion | null, plazo: number): { minimo: number; maximo: number; fijo?: number } {
  if (tipo === 'obra' && plazo > 60) return { minimo: 15, maximo: 15, fijo: 15 };
  if (plazo < 30) return { minimo: 3, maximo: 3, fijo: 3 };
  return { minimo: Math.ceil(plazo * 0.1), maximo: Math.ceil(plazo * 0.15) };
}

export function calcular(i: Insumos): Calculo[] {
  const out: Calculo[] = [];
  const original = montoOriginal(i.ficha);
  const vigente = montoVigente(i.ficha);
  const plazo = plazoDias(i.ficha);
  const R = i.respuestas;

  switch (i.actuacion) {
    case 'ampliacion_plazo': {
      if (/entidad/i.test(R.origen ?? '')) {
        out.push({
          concepto: 'Origen de la ampliación',
          resultado: 'La ampliación de plazo no se otorga de oficio',
          detalle:
            'La ampliación se autoriza «previa solicitud sustentada del contratista». Si el atraso lo identificó la Entidad y no hay solicitud, la figura no es una ampliación de plazo: puede corresponder una suspensión, una modificación por hecho sobreviniente o la calificación del retraso como justificado para no penalizar.',
          base: 'numeral 142.1 del artículo 142 y numeral 198.1 del artículo 198 del Reglamento',
          impide: true,
        });
      }
      const fin = fechaISO(R.fecha_fin_hecho);
      const sol = fechaISO(i.fechaSolicitud ?? null);
      if (fin && sol) {
        const limite = sumarDiasHabiles(fin, 10);
        const conProrroga = sumarDiasHabiles(fin, 20);
        const aTiempo = sol <= limite;
        const enProrroga = !aTiempo && sol <= conProrroga;
        out.push({
          concepto: 'Oportunidad de la solicitud',
          resultado: aTiempo
            ? 'Presentada dentro de plazo'
            : enProrroga
              ? 'Presentada dentro de la prórroga (solo vale si el contratista la pidió a tiempo)'
              : 'Extemporánea: se tiene por no presentada',
          detalle: `El hecho terminó el ${fechaLarga(fin)}. El plazo de diez días hábiles vencía el ${fechaLarga(limite)} (con la prórroga de diez días hábiles, el ${fechaLarga(conProrroga)}). La solicitud es del ${fechaLarga(sol)}.`,
          aviso: AVISO_DIAS_HABILES,
          base:
            i.tipo === 'obra'
              ? 'literal a) del numeral 200.1 del artículo 200 del Reglamento'
              : i.tipo === 'consultoria_obra'
                ? 'literal a) del numeral 199.1 del artículo 199 del Reglamento'
                : 'numeral 142.3 del artículo 142 del Reglamento',
          impide: !aTiempo && !enProrroga,
          valores: [fechaLarga(fin), fechaLarga(limite), fechaLarga(conProrroga), fechaLarga(sol)],
        });
      }
      if (sol && !i.hayPronunciamiento) {
        const dias = i.tipo === 'obra' ? 15 : 12;
        const vence = sumarDiasHabiles(sol, dias);
        const vencido = i.hoy > vence;
        out.push({
          concepto: 'Plazo de la Entidad para pronunciarse',
          resultado: vencido ? 'Vencido: la solicitud podría tenerse por aprobada' : `Vence el ${fechaLarga(vence)}`,
          detalle:
            i.tipo === 'obra'
              ? `El supervisor tiene cinco días hábiles para opinar y la Entidad diez días hábiles desde esa opinión o desde que venció su plazo: contados desde la solicitud del ${fechaLarga(sol)}, el pronunciamiento debería notificarse a más tardar el ${fechaLarga(vence)}. Sin pronunciamiento, se tiene por aprobado lo informado por el supervisor o, si no opinó, lo solicitado.`
              : `La autoridad de la gestión administrativa resuelve y notifica en doce días hábiles desde el día siguiente de recibida la solicitud del ${fechaLarga(sol)}: vence el ${fechaLarga(vence)}. Sin pronunciamiento, la solicitud se tiene por aprobada, salvo que el contratista no haya cumplido estrictamente el procedimiento.`,
          aviso: AVISO_DIAS_HABILES,
          base:
            i.tipo === 'obra'
              ? 'literales b) y d) del numeral 200.1 del artículo 200 del Reglamento'
              : i.tipo === 'consultoria_obra'
                ? 'literal b) del numeral 199.1 del artículo 199 del Reglamento'
                : 'numeral 142.5 del artículo 142 del Reglamento',
          valores: [fechaLarga(vence), fechaLarga(sol)],
        });
      }
      break;
    }

    case 'adicional': {
      const monto = aNumero(R.monto_adicional);
      const previos = aNumero(R.adicionales_previos) ?? 0;
      if (original && monto !== null) {
        const acumulado = monto + previos;
        const pct = r2((acumulado / original) * 100);
        const lim = limiteDeAdicionales(i.tipo, i.sistemaEntrega, pct);
        out.push({
          concepto: 'Porcentaje acumulado de adicionales',
          resultado: `${porcentaje(pct)} del monto del contrato original`,
          detalle: `Adicional de ${soles(monto)}${previos ? ` más ${soles(previos)} de adicionales anteriores netos de deductivos` : ''}: ${soles(acumulado)} sobre ${soles(original)}. Aprueba: ${lim.organo}.`,
          base: lim.base,
          impide: lim.excede,
          valores: [soles(monto), soles(acumulado), soles(original), porcentaje(pct), ...(previos ? [soles(previos)] : [])],
        });
      }
      break;
    }

    case 'reduccion': {
      const monto = aNumero(R.monto_reduccion);
      if (original && monto !== null) {
        const pct = r2((monto / original) * 100);
        out.push({
          concepto: 'Porcentaje de la reducción',
          resultado: `${porcentaje(pct)} del monto del contrato original`,
          detalle: `Reducción de ${soles(monto)} sobre ${soles(original)}. El límite es el 25 %. El nuevo monto vigente sería ${soles(r2((vigente ?? original) - monto))}.`,
          base: 'numeral 64.1 del artículo 64 de la Ley y numeral 109.1 del artículo 109 del Reglamento',
          impide: pct > 25,
          valores: [soles(monto), soles(original), porcentaje(pct), soles(r2((vigente ?? original) - monto))],
        });
      }
      break;
    }

    case 'complementario': {
      const monto = aNumero(R.monto_complementario);
      if (original && monto !== null) {
        const pct = r2((monto / original) * 100);
        out.push({
          concepto: 'Porcentaje del complementario',
          resultado: `${porcentaje(pct)} del monto del contrato original`,
          detalle: `${soles(monto)} sobre ${soles(original)}. El límite es el 30 %.`,
          base: 'literal i) del numeral 146.1 del artículo 146 del Reglamento',
          impide: pct > 30,
          valores: [soles(monto), soles(original), porcentaje(pct)],
        });
      }
      const fin = fechaISO(i.ficha.fecha_fin?.valor);
      if (fin) {
        const [a, m, d] = fin.split('-').map(Number);
        const tres = new Date(Date.UTC(a, m - 1 + 3, d));
        const limite = `${tres.getUTCFullYear()}-${String(tres.getUTCMonth() + 1).padStart(2, '0')}-${String(tres.getUTCDate()).padStart(2, '0')}`;
        const quinceAntes = sumarDiasCalendario(fin, -15);
        const vencido = i.hoy > limite;
        out.push({
          concepto: 'Plazo para la contratación complementaria',
          resultado: vencido ? 'Vencido: pasaron más de tres meses desde la culminación' : `Hasta el ${fechaLarga(limite)}`,
          detalle: `El plazo de ejecución culmina el ${fechaLarga(fin)}. La contratación complementaria cabe dentro de los tres meses posteriores (hasta el ${fechaLarga(limite)}) o, excepcionalmente, desde quince días antes (${fechaLarga(quinceAntes)}), con inicio posterior a la culminación.`,
          base: 'numerales 146.1 y 146.4 del artículo 146 del Reglamento',
          impide: vencido,
          valores: [fechaLarga(fin), fechaLarga(limite), fechaLarga(quinceAntes)],
        });
      }
      break;
    }

    case 'penalidad': {
      const dias = aNumero(R.dias_atraso);
      const entregable = /entregable/i.test(R.entregable ?? '');
      const montoBase = entregable ? aNumero(R.monto_entregable) : vigente;
      const plazoBase = entregable ? aNumero(R.plazo_entregable) : plazo;
      if (i.tipo && montoBase && plazoBase && dias !== null) {
        const F = factorF(i.tipo, plazoBase);
        const diaria = r2((0.1 * montoBase) / (F * plazoBase));
        const total = r2(diaria * dias);
        const tope = vigente ? r2(vigente * 0.1) : null;
        const aplicada = tope !== null ? Math.min(total, tope) : total;
        out.push({
          concepto: 'Penalidad por mora',
          resultado: `${soles(aplicada)}${tope !== null && total > tope ? ' (tope del 10 %)' : ''}`,
          detalle: `Penalidad diaria = 0.10 × ${soles(montoBase)} / (${F} × ${plazoBase} días) = ${soles(diaria)}. Por ${dias} ${dias === 1 ? 'día' : 'días'} de atraso: ${soles(total)}.${tope !== null ? ` El tope del 10 % del monto vigente es ${soles(tope)}.` : ''}`,
          base: 'numerales 120.1 y 120.2 del artículo 120 y numeral 119.2 del artículo 119 del Reglamento',
          valores: [soles(montoBase), soles(diaria), soles(total), soles(aplicada), String(F), ...(tope !== null ? [soles(tope)] : [])],
        });
        if (tope !== null && total >= tope) {
          out.push({
            concepto: 'Penalidad máxima',
            resultado: 'Se alcanzó el tope del 10 %',
            detalle: 'Alcanzado el monto máximo de penalidad, la Entidad puede resolver el contrato sin apercibimiento previo.',
            base: 'numeral 122.2 del artículo 122 del Reglamento',
          });
        }
      }
      break;
    }

    case 'resolucion': {
      if (plazo) {
        const p = plazoDeApercibimiento(i.tipo, plazo);
        out.push({
          concepto: 'Plazo del apercibimiento',
          resultado: p.fijo ? `${p.fijo} días` : `Entre ${p.minimo} y ${p.maximo} días`,
          detalle: p.fijo
            ? `Con un plazo de ejecución de ${plazo} días, el plazo para cumplir bajo apercibimiento es de ${p.fijo} días.`
            : `Con un plazo de ejecución de ${plazo} días, el plazo razonable no puede ser menor del 10 % (${p.minimo} días) ni mayor del 15 % (${p.maximo} días); los decimales cuentan como día completo. Si el incumplimiento es de un entregable, el porcentaje se calcula sobre el plazo de ese entregable.`,
          base: 'literal a) del numeral 122.1 del artículo 122 del Reglamento',
          valores: [String(plazo), String(p.minimo), String(p.maximo)],
        });
      }
      break;
    }

    case 'reconocimiento_pago': {
      const conf = fechaISO(i.fechaConformidad ?? null);
      if (conf && !/sin contrato|fuera/i.test(R.origen_obligacion ?? '')) {
        const vence = sumarDiasHabiles(conf, 10);
        const prorroga = sumarDiasHabiles(conf, 15);
        const vencido = i.hoy > prorroga;
        out.push({
          concepto: 'Plazo de pago',
          resultado: vencido ? `Vencido desde el ${fechaLarga(prorroga)}` : `Vence el ${fechaLarga(vence)}`,
          detalle: `La conformidad es del ${fechaLarga(conf)}. El pago debía realizarse hasta el ${fechaLarga(vence)} (diez días hábiles), prorrogable con justificación hasta el ${fechaLarga(prorroga)}.${vencido ? ` Al ${fechaLarga(i.hoy)} el retraso genera intereses legales a cargo de la Entidad.` : ''}`,
          aviso: AVISO_DIAS_HABILES,
          base: 'numerales 67.3 y 67.5 del artículo 67 de la Ley',
          valores: [fechaLarga(conf), fechaLarga(vence), fechaLarga(prorroga)],
        });
      }
      break;
    }

    default:
      break;
  }

  if (vigente && original && vigente !== original) {
    out.push({
      concepto: 'Variación del monto contractual',
      resultado: `${porcentaje(r2(((vigente - original) / original) * 100))} respecto del original`,
      detalle: `Monto original ${soles(original)}; monto vigente ${soles(vigente)}.`,
      base: 'numeral 64.1 del artículo 64 de la Ley',
      valores: [soles(original), soles(vigente)],
    });
  }
  return out;
}

/** Cuántos días calendario van de una fecha a otra, para el documento. */
export { diasEntre };
