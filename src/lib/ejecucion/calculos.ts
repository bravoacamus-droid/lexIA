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
  vencimientoCalendario,
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
  /** Fecha de la liquidación presentada, si está en el expediente. */
  fechaLiquidacion?: string | null;
  /** Ya hay una resolución que se pronuncia en el expediente. */
  hayPronunciamiento?: boolean;
  hoy: string;
  /**
   * El régimen del contrato. En el anterior casi no se calcula nada (sus
   * plazos y porcentajes son otros); solo las «otras penalidades» y su
   * tope, que están verificados.
   */
  regimen?: 'ley_32069' | 'ley_30225' | 'por_determinar';
  /** Es un contrato menor (numeral 229.1: no se le aumenta el monto). */
  contratoMenor?: boolean;
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

/**
 * Las infracciones de «otras penalidades», una por renglón, como las
 * escribe César en su cuadro de cálculo: «Entrega tardía del plan de
 * seguridad: S/ 40.00 × 48», «Prendas excedentes: S/ 27.50 x 12», «Retraso
 * en guías: S/ 80.00 por 2», o un monto solo («S/ 330.00»).
 *
 * Lo que va en porcentaje de la UIT o del contrato no se convierte aquí:
 * falta el valor de la base y no se supone. Se devuelve aparte para que el
 * usuario lo escriba en soles.
 */
export function otrasPenalidades(texto: string | null | undefined): {
  infracciones: Array<{ descripcion: string; unitario: number; veces: number; total: number }>;
  sinLeer: string[];
} {
  const infracciones: Array<{ descripcion: string; unitario: number; veces: number; total: number }> = [];
  const sinLeer: string[] = [];
  const renglones = (texto ?? '')
    .split(/\n|;/)
    .map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)]|[a-z]\))\s+/i, '').trim())
    .filter(Boolean);
  for (const l of renglones) {
    if (/%|\bUIT\b/i.test(l)) {
      sinLeer.push(l);
      continue;
    }
    const m =
      l.match(/(?:S\/\.?\s*)([\d.,]+\d)\s*(?:[x×*]|por)\s*(\d+(?:[.,]\d+)?)/i) ??
      l.match(/([\d.,]*\d[.,]\d{2})\s*(?:[x×*]|por)\s*(\d+(?:[.,]\d+)?)/i);
    const solo = m ? null : l.match(/S\/\.?\s*([\d.,]+\d)/i);
    const unitario = aNumero(m ? m[1] : solo?.[1]);
    const veces = m ? aNumero(m[2]) : 1;
    if (unitario === null || veces === null) {
      sinLeer.push(l);
      continue;
    }
    const indice = (m ?? solo)!.index ?? 0;
    const descripcion = l.slice(0, indice).replace(/[:\-–—=]\s*$/, '').trim() || `Infracción N.° ${String(infracciones.length + 1).padStart(2, '0')}`;
    infracciones.push({ descripcion, unitario, veces, total: r2(unitario * veces) });
  }
  return { infracciones, sinLeer };
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
  const anterior = i.regimen === 'ley_30225';
  if (anterior && i.actuacion !== 'penalidad') return out;

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
      // Al contrato menor no se le aumenta el monto: sus modificaciones
      // «no aumenten el monto ni desnaturalicen el requerimiento».
      if (i.contratoMenor)
        out.push({
          concepto: 'Contrato menor',
          resultado: 'No admite prestaciones adicionales',
          detalle:
            'Las partes pueden modificar un contrato menor siempre que la modificación no aumente el monto ni desnaturalice el requerimiento, y se perfecciona por acta. Un adicional aumenta el monto: si la necesidad es mayor, corresponde una nueva contratación.',
          base: 'numeral 229.1 del artículo 229 del Reglamento',
          impide: true,
        });
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
      // Qué se calcula: mora, «otras penalidades» (las de la tabla de las
      // bases o del contrato) o ambas. Sin respuesta, la mora, como antes.
      const clase = R.tipo_penalidad ?? '';
      const conMora = !/^\s*otras/i.test(clase);
      const conOtras = /otras|ambas/i.test(clase);
      let mora: number | null = null;
      let otras: number | null = null;

      // La fórmula de la mora es la del Reglamento vigente; la del
      // anterior tiene otros valores de F y no se calcula aquí.
      const dias = aNumero(R.dias_atraso);
      const entregable = /entregable/i.test(R.entregable ?? '');
      const montoBase = entregable ? aNumero(R.monto_entregable) : vigente;
      const plazoBase = entregable ? aNumero(R.plazo_entregable) : plazo;
      if (conMora && !anterior && i.tipo && montoBase && plazoBase && dias !== null) {
        const F = factorF(i.tipo, plazoBase);
        const diaria = r2((0.1 * montoBase) / (F * plazoBase));
        mora = r2(diaria * dias);
        out.push({
          concepto: 'Penalidad por mora',
          resultado: soles(mora),
          detalle: `Penalidad diaria = 0.10 × ${soles(montoBase)} / (${F} × ${plazoBase} días) = ${soles(diaria)}. Por ${dias} ${dias === 1 ? 'día' : 'días'} de atraso: ${soles(mora)}.`,
          base: 'numerales 120.1 y 120.2 del artículo 120 del Reglamento',
          valores: [soles(montoBase), soles(diaria), soles(mora), String(F)],
        });
      }

      if (conOtras) {
        const { infracciones, sinLeer } = otrasPenalidades(R.otras_penalidades);
        if (infracciones.length) {
          otras = r2(infracciones.reduce((a, x) => a + x.total, 0));
          out.push({
            concepto: 'Otras penalidades',
            resultado: soles(otras),
            detalle: `${infracciones
              .map((x) => `${x.descripcion}: ${soles(x.unitario)}${x.veces !== 1 ? ` × ${x.veces}` : ''} = ${soles(x.total)}`)
              .join('; ')}.${sinLeer.length ? ` No se pudo leer, y no se sumó: «${sinLeer.join('»; «')}» (indica el monto en soles y las veces).` : ''}`,
            base: 'Tabla de otras penalidades del contrato o de las bases',
            valores: [soles(otras), ...infracciones.flatMap((x) => [soles(x.unitario), soles(x.total)])],
          });
        } else if (sinLeer.length) {
          out.push({
            concepto: 'Otras penalidades',
            resultado: 'No se pudo calcular',
            detalle: `No se entendió el monto de: «${sinLeer.join('»; «')}». Indica cada infracción con su monto en soles y las veces que ocurrió, p. ej. «Entrega tardía del plan de seguridad: S/ 40.00 × 48».`,
            base: 'Tabla de otras penalidades del contrato o de las bases',
          });
        }
      }

      // El tope y el acumulado del contrato: lo ya aplicado antes cuenta.
      if (vigente && (mora !== null || otras !== null)) {
        const tope = r2(vigente * 0.1);
        const moraPrevia = aNumero(R.mora_previa) ?? 0;
        const otrasPrevias = aNumero(R.otras_previas) ?? 0;
        const pctDe = (n: number) => porcentaje(r2((n / vigente) * 100));
        if (!anterior) {
          // Ley N.° 32069: la mora y las otras suman juntas un solo tope.
          const previas = r2(moraPrevia + otrasPrevias);
          const actual = r2((mora ?? 0) + (otras ?? 0));
          const acumulado = r2(previas + actual);
          const aplicable = r2(Math.max(0, Math.min(actual, tope - previas)));
          const alcanza = acumulado >= tope;
          out.push({
            concepto: 'Tope de penalidades',
            resultado: alcanza ? `Se alcanza el tope del 10 %: corresponde aplicar ${soles(aplicable)}` : `Dentro del tope: corresponde aplicar ${soles(actual)}`,
            detalle: `Penalidades aplicadas antes: ${soles(previas)}${previas ? ` (mora ${soles(moraPrevia)}; otras ${soles(otrasPrevias)})` : ''}. Penalidad actual: ${soles(actual)}. Acumulado: ${soles(acumulado)}, el ${pctDe(acumulado)} del monto vigente de ${soles(vigente)}. La suma de la penalidad por mora y las otras penalidades no puede exceder el 10 % (${soles(tope)}).`,
            base: 'numeral 119.2 del artículo 119 del Reglamento',
            valores: [soles(tope), soles(acumulado), soles(aplicable), soles(actual), pctDe(acumulado), pctDe(actual), pctDe(previas), soles(previas), soles(moraPrevia), soles(otrasPrevias)],
          });
          if (alcanza)
            out.push({
              concepto: 'Penalidad máxima',
              resultado: 'Se alcanzó el tope del 10 %',
              detalle: 'Alcanzado el monto máximo de penalidad, la Entidad puede resolver el contrato sin apercibimiento previo.',
              base: 'numeral 122.2 del artículo 122 del Reglamento',
            });
        } else if (otras !== null) {
          // Régimen anterior: cada tipo de penalidad tiene su propio tope
          // del 10 % (numeral 161.2 del Reglamento aprobado por D.S. N.°
          // 344-2018-EF, que recoge la Opinión N° D000035-2025-OECE-DTN).
          const acumulado = r2(otrasPrevias + otras);
          const aplicable = r2(Math.max(0, Math.min(otras, tope - otrasPrevias)));
          out.push({
            concepto: 'Tope de otras penalidades',
            resultado: acumulado >= tope ? `Se alcanza el tope del 10 %: corresponde aplicar ${soles(aplicable)}` : `Dentro del tope: corresponde aplicar ${soles(otras)}`,
            detalle: `Otras penalidades aplicadas antes: ${soles(otrasPrevias)}. Actual: ${soles(otras)}. Acumulado: ${soles(acumulado)}, el ${pctDe(acumulado)} del monto vigente de ${soles(vigente)}. En el régimen anterior la penalidad por mora y las otras penalidades tienen cada una su propio tope del 10 % (${soles(tope)}).`,
            base: 'Régimen anterior: cada tipo de penalidad tiene su tope del 10 % del monto vigente (Opinión N° D000035-2025-OECE-DTN)',
            valores: [soles(tope), soles(acumulado), soles(aplicable), pctDe(acumulado), pctDe(otras), pctDe(otrasPrevias), soles(otrasPrevias)],
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

    case 'liquidacion': {
      // El cuadro del numeral 215.6, confirmado por César (27/09/2026):
      // presentación, pronunciamiento y contestación. Son días calendario
      // porque el numeral 105.3 así cuenta los plazos de la ejecución
      // contractual, salvo que el Reglamento diga otra cosa.
      if (i.tipo !== 'obra' && i.tipo !== 'consultoria_obra') break;
      const obra = i.tipo === 'obra';
      const pres = obra ? 30 : 15;
      const pron = obra ? 50 : 30;
      const base = 'numerales 215.1, 215.3 y 215.6 del artículo 215 y numeral 105.3 del artículo 105 del Reglamento';
      const corrido = (c: boolean) => (c ? ' Como el último día era inhábil, vence el primer día hábil siguiente (inciso 5 del artículo 183 del Código Civil).' : '');
      const hito = fechaISO(i.fechaConformidad ?? null);
      const presentada = fechaISO(i.fechaLiquidacion ?? null);
      if (hito) {
        const p = vencimientoCalendario(hito, pres);
        const aTiempo = presentada ? presentada <= p.vence : null;
        out.push({
          // Sin liquidación presentada no hay oportunidad que evaluar:
          // solo el plazo que corre.
          concepto: presentada ? 'Oportunidad de la liquidación' : 'Plazo para presentar la liquidación',
          resultado:
            aTiempo === null
              ? `El contratista la presenta hasta el ${fechaLarga(p.vence)}`
              : aTiempo
                ? 'Presentada dentro de plazo'
                : 'Presentada fuera del plazo del contratista',
          detalle: `Desde el día siguiente de la conformidad o de la recepción (${fechaLarga(hito)}), el contratista tiene ${pres} días calendario: hasta el ${fechaLarga(p.vence)}.${corrido(p.corrido)}${
            presentada ? ` La liquidación es del ${fechaLarga(presentada)}.` : ''
          }${aTiempo === false ? ' Vencido ese plazo, desde el día siguiente corre el de la Entidad para presentarla, y los gastos son de cargo del contratista; si también vence el de la Entidad, cualquiera de las partes puede presentarla (numeral 215.2). Verifica si la Entidad ya presentó la suya.' : ''}`,
          base,
          // No la invalida: el numeral 215.2 abre el plazo de la Entidad y,
          // vencido este, deja presentarla a cualquiera. Es un riesgo.
          impide: false,
          valores: [fechaLarga(hito), fechaLarga(p.vence), ...(presentada ? [fechaLarga(presentada)] : [])],
        });
      }
      if (presentada) {
        const p = vencimientoCalendario(presentada, pron);
        const vencido = !i.hayPronunciamiento && i.hoy > p.vence;
        out.push({
          concepto: 'Plazo para pronunciarse sobre la liquidación',
          resultado: i.hayPronunciamiento
            ? `Vencía el ${fechaLarga(p.vence)}: hay un pronunciamiento en el expediente, verifica su fecha de notificación`
            : vencido
              ? 'Vencido sin pronunciamiento: la liquidación se considera consentida o aprobada'
              : `Vence el ${fechaLarga(p.vence)}`,
          detalle: `Quien recibe la liquidación (${fechaLarga(presentada)}) tiene ${pron} días calendario para notificar su conformidad u observaciones: hasta el ${fechaLarga(p.vence)}.${corrido(p.corrido)} Si no se pronuncia en plazo, queda consentida o aprobada; si observa, quien la presentó tiene quince días calendario para subsanar.`,
          base,
          // Vencido, la Entidad ya no puede observar; pero eso no impide la
          // actuación: favorece a quien la presentó, y el resultado lo dice.
          impide: false,
          valores: [fechaLarga(presentada), fechaLarga(p.vence)],
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
