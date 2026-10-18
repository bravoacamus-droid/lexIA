/**
 * Las etapas que siguen a la evaluación técnica: económica, rechazo,
 * negociación y otorgamiento de la buena pro.
 *
 * POR QUÉ
 *
 * César, documento 13 (10/10/2026): «Al realizar una evaluación se sigue
 * las siguientes etapas: 1. Admisión, 2. Calificación, 3. Evaluación
 * técnica, 4. Evaluación económica, 5. Rechazo de oferta, en caso
 * corresponda, 6. Negociación, en caso corresponda y 7. Otorgamiento de
 * la buena pro». El evaluador se detenía en la tercera y el acta decía
 * «falta la evaluación económica, que asigna el comité».
 *
 * QUÉ DICE LA NORMA (Reglamento, DS N° 009-2025-EF)
 *
 *   · Art. 74: la evaluación económica es simultánea (un factor más) o
 *     posterior a la técnica (solo para quien alcanza el puntaje mínimo).
 *   · Art. 75.3: en la posterior, el puntaje total es PTP = C1 × Pt +
 *     C2 × Pe, con los coeficientes de las bases.
 *   · Art. 132.5–132.6 (bienes y servicios): puede rechazarse una oferta
 *     por debajo de la cuantía si, pedido el detalle de su composición
 *     —con al menos dos días hábiles—, hay razones objetivas de un
 *     probable incumplimiento. Es una decisión del comité, con documentos.
 *   · Art. 132.1–132.3: si la oferta del mejor puntaje total supera la
 *     cuantía, la DEC gestiona la ampliación de la certificación; si no
 *     hay recursos, se negocia con ese postor y luego con los siguientes.
 *   · Arts. 80 y 81: otorgamiento de la buena pro y desempate (primero el
 *     mejor puntaje técnico).
 *
 * El puntaje económico se calcula con la fórmula de las bases estándar
 * —Pi = PMP × Om / Oi— y se calcula aquí, no lo hace el modelo: es
 * aritmética. Lo que el modelo hace es leer el monto de cada oferta.
 */
import { generateText } from 'ai';
import { fastModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import type { LecturaBases } from './motor';
import type { ResultadoPostor } from './etapas';
import type { PerfilProcedimiento } from './procedimiento';

export interface OfertaEconomica {
  monto: number;
  moneda: string;
  /** De dónde se tomó: «Anexo N° 6, folio 12: S/ 1 234 567,89». */
  cita: string;
}

const SISTEMA = `Lees el monto total de la oferta económica de un postor en un procedimiento de selección del Estado peruano.

Devuelve SOLO este JSON: {"monto": 0, "moneda": "PEN", "cita": "documento, folio y el texto donde consta el monto"}

- El monto es el TOTAL ofertado (normalmente en el Anexo N° 6 «Precio de la oferta» o «Oferta económica»), en números, sin separadores de miles: 1234567.89.
- Si hay varios ítems o paquetes, suma solo si la oferta da un total; si no, el del ítem principal y dilo en la cita.
- NO uses montos de contratos, órdenes de servicio, conformidades o facturas de la experiencia del postor ni de su personal: son de contrataciones anteriores. El monto es el que el postor OFERTA en este procedimiento (Anexo N° 6: «monto ofertado», «el precio de la oferta corresponde a…», total con IGV).
- Si la oferta no trae la oferta económica, devuelve "monto": 0 y explica en "cita" qué encontraste.`;

/**
 * El Anexo N° 6 completo y el total ofertado.
 *
 * Antes se tomaban 3 500 caracteres tras las primeras ocho menciones de
 * «oferta económica», «monto total»…: en el Consorcio Mega el Anexo N° 6
 * ocupa las páginas 275 a 278 y el total («MONTO OFERTADO (ST+IGV) |
 * 5,378,108.00») quedaba fuera; en el Consorcio Ayacucho «monto total»
 * llevó al contrato de una experiencia anterior (S/ 3 595 258,85).
 */
function extracto(texto: string): string {
  const fuertes = /ANEXO\s+N[°º.]?\s*0?6\b[\s\S]{0,200}?PRECIO\s+DE\s+LA\s+OFERTA|PRECIO\s+DE\s+LA\s+OFERTA|MONTO\s+OFERTADO|(?:el\s+)?precio\s+de\s+(?:la|mi|nuestra)\s+oferta\s+(?:corresponde|asciende)|TOTAL\s+DE\s+LA\s+OFERTA/gi;
  const trozos: Array<[number, number]> = [];
  for (const m of texto.matchAll(fuertes)) {
    // Desde un poco antes hasta cuatro páginas después: el anexo con su
    // estructura de costos y el total al pie.
    trozos.push([Math.max(0, m.index! - 800), Math.min(texto.length, m.index! + 16_000)]);
  }
  if (trozos.length === 0) {
    for (const m of texto.matchAll(/OFERTA\s+ECON[ÓO]MICA|ANEXO\s+N[°º.]?\s*0?6\b/gi)) {
      trozos.push([Math.max(0, m.index! - 600), Math.min(texto.length, m.index! + 6000)]);
    }
  }
  // Se unen los que se pisan, y se prefieren los últimos: el índice de la
  // oferta nombra el Anexo N° 6 al principio, el anexo está al final.
  trozos.sort((a, b) => a[0] - b[0]);
  const unidos: Array<[number, number]> = [];
  for (const t of trozos) {
    const u = unidos.at(-1);
    if (u && t[0] <= u[1]) u[1] = Math.max(u[1], t[1]);
    else unidos.push([...t]);
  }
  const elegidos = unidos.slice(-4);
  if (elegidos.length === 0) return texto.slice(-15_000);
  return elegidos
    .map(([a, b]) => texto.slice(a, b))
    .join('\n\n[…]\n\n')
    .slice(-60_000);
}

export async function leerOfertaEconomica(texto: string): Promise<OfertaEconomica | null> {
  try {
    const { text } = await generateText({
      model: fastModel,
      system: SISTEMA,
      prompt: extracto(texto),
      temperature: 0,
      maxTokens: 300,
      abortSignal: AbortSignal.timeout(60_000),
    });
    const o = parseJsonLoose(text) as { monto?: unknown; moneda?: unknown; cita?: unknown };
    const monto = typeof o.monto === 'number' ? o.monto : Number(String(o.monto ?? '').replace(/[^\d.]/g, ''));
    if (!Number.isFinite(monto) || monto <= 0) return null;
    return { monto, moneda: String(o.moneda ?? 'PEN').trim() || 'PEN', cita: String(o.cita ?? '').trim() };
  } catch (e) {
    console.warn('[evaluacion] no se pudo leer la oferta económica:', (e as Error).message.slice(0, 160));
    return null;
  }
}

const redondear = (n: number) => Math.round(n * 100) / 100;
const soles = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** ¿Llega el postor a la evaluación económica? Superó admisión y calificación y no quedó fuera. */
export function accedeAEconomica(p: ResultadoPostor, lectura: LecturaBases, perfil?: PerfilProcedimiento): boolean {
  const cortado = p.etapas.some((e) => !e.omitida && e.resultado === 'no_cumple' && e.etapa !== 'evaluacion');
  if (cortado) return false;
  if (p.rechazo?.rechazada) return false;
  // El mínimo técnico rige donde la económica es posterior (art. 74.1 b):
  // posterior propiamente dicha y limitada. En bienes es simultánea; con
  // oferta fija no hay evaluación económica.
  const conMinimo = perfil
    ? perfil.economica.tipo === 'posterior' || perfil.economica.tipo === 'limitada'
    : lectura.evaluacionEconomica?.tipo === 'posterior';
  const minimo = conMinimo ? (perfil?.puntajeTecnicoMinimo ?? lectura.puntajeTecnicoMinimo) : null;
  if (typeof minimo === 'number' && (p.puntajeTecnico ?? 0) < minimo) return false;
  return true;
}

export interface EtapasFinales {
  /** Cómo se calculó, para el acta. */
  metodo: string;
  rechazo: Array<{ postor: string; estado: 'por_revisar'; fundamento: string }>;
  negociacion: { postor: string; fundamento: string } | null;
  buenaPro: { postor: string | null; fundamento: string; empate?: string[] };
  /** El procedimiento que se aplicó (`procedimiento.ts`). Las evaluaciones anteriores no lo tienen. */
  perfil?: PerfilProcedimiento;
  /** Ofertas descalificadas en la evaluación económica: fuera del rango, monto distinto del fijo. */
  descalificados?: Array<{ postor: string; motivo: string }>;
  /** Bonificaciones: a quién se aplicaron y lo que queda para el comité. */
  bonificaciones?: Array<{ postor: string; detalle: string; aplicada: boolean }>;
  /** Si no hay oferta válida, o en comparación de precios menos de dos calificadas (art. 84.1; numeral 98.1). */
  desierto?: string;
  /** Cuándo queda consentida la buena pro (art. 82). */
  consentimiento?: string;
}

const normalizar = (t?: string) => (t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

/**
 * Las bonificaciones del postor sobre su puntaje total (art. 75.5 y 75.6).
 * Se suman sobre el total sin bonificar: «5 % sobre el puntaje total
 * obtenido», «10 % sobre el puntaje total».
 */
function bonificar(p: ResultadoPostor, perfil: PerfilProcedimiento): Array<{ detalle: string; aplicada: boolean }> {
  const s = p.bonificacion;
  const out: Array<{ detalle: string; aplicada: boolean }> = [];
  if (!s || typeof p.puntajeTotal !== 'number') return out;
  const base = p.puntajeTotal;
  let extra = 0;
  const aplicadas: string[] = [];
  if (s.mype) {
    if (perfil.bonificaciones.mype) {
      extra += base * 0.05;
      aplicadas.push('MYPE 5 %');
      out.push({
        aplicada: true,
        detalle:
          `Solicitó la bonificación del 5 % por ser micro o pequeña empresa: ${redondear(base)} + ${redondear(base * 0.05)} puntos (art. 75.5 del Reglamento). ` +
          (s.remype ? 'La oferta adjunta la acreditación en el REMYPE; ' : 'La oferta no adjunta la constancia del REMYPE; ') +
          `el comité verifica la condición en el portal del REMYPE${p.consorcio?.length ? ', y en consorcio la de cada integrante' : ''}, como dicen las Bases.`,
      });
    } else {
      out.push({ aplicada: false, detalle: 'Solicitó la bonificación MYPE, pero las Bases no la prevén para este procedimiento (art. 75.5: solo en la modalidad abreviada): no se aplica.' });
    }
  }
  if (s.provincia) {
    const misma = s.provinciaDomicilio && s.provinciaEjecucion && normalizar(s.provinciaDomicilio) === normalizar(s.provinciaEjecucion);
    if (perfil.bonificaciones.provincia && misma) {
      extra += base * 0.1;
      aplicadas.push('Provincia 10 %');
      out.push({ aplicada: true, detalle: `Solicitó la bonificación del 10 %: su domicilio en el RNP está en la provincia de ${s.provinciaDomicilio}, donde se ejecuta la prestación (art. 75.6 del Reglamento).` });
    } else if (perfil.bonificaciones.provincia) {
      out.push({
        aplicada: false,
        detalle: `Solicitó la bonificación del 10 %${s.provinciaDomicilio ? ` con domicilio en la provincia de ${s.provinciaDomicilio}` : ''}${s.provinciaEjecucion ? `; la prestación se ejecuta en ${s.provinciaEjecucion}` : ''}. El comité verifica en la constancia del RNP si el domicilio está en esa provincia o en una colindante (art. 75.6): no se aplicó automáticamente.`,
      });
    } else {
      out.push({ aplicada: false, detalle: 'Solicitó la bonificación del 10 %, pero las Bases no la prevén (art. 75.6: servicios, consultorías y obras fuera de Lima y Callao, bajo los topes de cuantía): no se aplica.' });
    }
  }
  if (extra > 0) {
    p.puntajeSinBonificacion = redondear(base);
    p.puntajeTotal = redondear(base + extra);
    p.bonificacionesAplicadas = aplicadas;
  }
  return out;
}

/**
 * Puntaje económico, puntaje total, orden de prelación y lo que
 * corresponde en rechazo, negociación y buena pro, según el procedimiento
 * de las Bases (`procedimiento.ts`). Modifica los postores (montos,
 * puntajes, prelación) y devuelve el resumen de las etapas.
 */
export function etapasFinales(
  postores: ResultadoPostor[],
  ofertas: Map<string, OfertaEconomica | null>,
  lectura: LecturaBases,
  perfil?: PerfilProcedimiento,
): EtapasFinales {
  const eco = lectura.evaluacionEconomica;
  const tipo = perfil?.economica.tipo ?? (eco?.tipo === 'posterior' ? 'posterior' : 'simultanea');
  const posterior = tipo === 'posterior' || tipo === 'limitada';
  const pmp = perfil ? (perfil.economica.puntajeMaximo || eco?.puntajeMaximo || 100) : eco?.puntajeMaximo ?? 100;
  const c1 = eco?.coeficienteTecnico;
  const c2 = eco?.coeficienteEconomico;
  const cuantia = lectura.procedimiento.cuantiaMonto;

  // Precio fijo: hay bases que fijan la oferta económica en el 100 % de
  // la cuantía y no le dan puntaje (CP SER-SM-6-2026: «Evaluación
  // económica fija al 100% de la cuantía. No se asigna puntaje a la
  // oferta económica»). Entonces el total es el puntaje técnico.
  const precioFijo = tipo === 'fija' || eco?.puntajeMaximo === 0 || /fij[ao]|no se asigna puntaje/i.test(eco?.formula ?? '');
  // Solo precio: subasta inversa y comparación de precios (art. 74.3).
  const soloPrecio = tipo === 'menor_precio' || tipo === 'lances';

  const habilitados = postores.filter((p) => accedeAEconomica(p, lectura, perfil));
  for (const p of postores) {
    p.ofertaEconomica = ofertas.get(p.postor) ?? undefined;
    p.accedeEconomica = habilitados.includes(p);
    p.descalificadoEconomica = undefined;
    p.bonificacionesAplicadas = undefined;
    p.puntajeSinBonificacion = undefined;
  }

  // Descalificación en la económica: oferta limitada fuera de rango (art.
  // 133 a; bases de obras y de consultoría de obra) u oferta fija distinta
  // de la cuantía (art. 133 b, 134.1). Sin la cuantía no se puede decidir.
  const descalificados: Array<{ postor: string; motivo: string }> = [];
  const avisos: string[] = [];
  if (perfil && (tipo === 'limitada' || tipo === 'fija')) {
    for (const p of habilitados) {
      const m = p.ofertaEconomica?.monto;
      if (!m) continue;
      if (!cuantia) continue;
      let motivo = '';
      if (tipo === 'limitada' && perfil.economica.rango) {
        const { minimo, maximo } = perfil.economica.rango;
        if (m < cuantia * minimo - 0.005) motivo = `su oferta (${soles(m)}) es menor al ${Math.round(minimo * 100)} % de la cuantía (${soles(cuantia * minimo)})`;
        else if (maximo && m > cuantia * maximo + 0.005) motivo = `su oferta (${soles(m)}) supera el ${Math.round(maximo * 100)} % de la cuantía (${soles(cuantia * maximo)})`;
      } else if (tipo === 'fija' && Math.abs(m - cuantia) > 0.5) {
        motivo = `su oferta (${soles(m)}) no corresponde al 100 % de la cuantía (${soles(cuantia)}), como exige la oferta económica fija`;
      }
      if (motivo) {
        p.descalificadoEconomica = motivo;
        p.accedeEconomica = false;
        descalificados.push({ postor: p.postor, motivo: `Descalificada: ${motivo}.` });
      }
    }
    if (!cuantia) {
      avisos.push(
        tipo === 'limitada'
          ? `La cuantía no consta en las Bases leídas: el comité verifica que cada oferta esté ${perfil.economica.rango?.maximo ? `entre el ${Math.round(perfil.economica.rango.minimo * 100)} % y el ${Math.round(perfil.economica.rango.maximo * 100)} %` : `por encima del ${Math.round((perfil.economica.rango?.minimo ?? 0.9) * 100)} %`} de la cuantía; la que no lo esté se descalifica.`
          : 'La cuantía no consta en las Bases leídas: el comité verifica que cada oferta corresponda al 100 % de la cuantía; la que no, se descalifica.',
      );
    }
  }
  const enCompetencia = habilitados.filter((p) => !p.descalificadoEconomica);

  // Comparación de precios: al menos dos ofertas calificadas (numeral 98.1).
  const minimo = perfil?.minimoCalificadas;
  const desiertoPorMinimo = typeof minimo === 'number' && enCompetencia.length < minimo;

  const conMonto = enCompetencia.filter((p) => p.ofertaEconomica?.monto);
  const om = conMonto.length > 0 ? Math.min(...conMonto.map((p) => p.ofertaEconomica!.monto)) : null;

  if (!desiertoPorMinimo) {
    for (const p of enCompetencia) {
      if (precioFijo) {
        p.puntajeEconomico = undefined;
        p.puntajeTotal = p.puntajeTecnico ?? 0;
        continue;
      }
      if (soloPrecio) {
        p.puntajeEconomico = undefined;
        p.puntajeTotal = undefined;
        continue;
      }
      const oi = p.ofertaEconomica?.monto;
      if (!om || !oi) continue;
      p.puntajeEconomico = redondear((pmp * om) / oi);
      const pt = p.puntajeTecnico ?? 0;
      if (posterior) {
        // Sin coeficientes no hay promedio ponderado que calcular (art. 75.3):
        // sumar técnico y económico daría hasta 200 puntos.
        p.puntajeTotal = c1 && c2 ? redondear(c1 * pt + c2 * p.puntajeEconomico) : undefined;
      } else {
        p.puntajeTotal = redondear(pt + p.puntajeEconomico);
      }
    }
  }
  if (posterior && !precioFijo && !soloPrecio && !(c1 && c2)) {
    avisos.push('Las Bases leídas no traen los coeficientes C1 y C2: el comité calcula el puntaje total con los de sus Bases (art. 75.3).');
  }

  // Bonificaciones, sobre el puntaje total (art. 75.5 y 75.6).
  const bonificaciones: NonNullable<EtapasFinales['bonificaciones']> = [];
  if (perfil && !soloPrecio && !desiertoPorMinimo) {
    for (const p of enCompetencia) for (const b of bonificar(p, perfil)) bonificaciones.push({ postor: p.postor, ...b });
  }

  // Orden de prelación. Con puntaje: total; empate, técnico (art. 81 a) y
  // luego la condición MYPE (art. 81 c). Solo precio: menor monto.
  const esMype = (p: ResultadoPostor) => !!(p.bonificacion?.remype || p.bonificacion?.mype);
  const ordenables = desiertoPorMinimo
    ? []
    : soloPrecio
      ? enCompetencia.filter((p) => p.ofertaEconomica?.monto)
      : enCompetencia.filter((p) => typeof p.puntajeTotal === 'number');
  const comparar = (a: ResultadoPostor, b: ResultadoPostor) =>
    soloPrecio
      ? a.ofertaEconomica!.monto - b.ofertaEconomica!.monto || Number(esMype(b)) - Number(esMype(a))
      : (b.puntajeTotal ?? 0) - (a.puntajeTotal ?? 0) ||
        (b.puntajeTecnico ?? 0) - (a.puntajeTecnico ?? 0) ||
        Number(esMype(b)) - Number(esMype(a));
  const ordenados = [...ordenables].sort(comparar);
  for (const p of postores) p.prelacion = undefined;
  let posicion = 0;
  ordenados.forEach((p, i) => {
    const anterior = ordenados[i - 1];
    if (!anterior || comparar(anterior, p) !== 0) posicion = i + 1;
    p.prelacion = posicion;
  });

  const metodo = [
    soloPrecio
      ? 'El único factor es el precio: el orden de prelación va del menor al mayor monto ofertado (art. 74.3 del Reglamento).'
      : precioFijo
        ? `La oferta económica es fija${eco?.formula ? ` («${eco.formula}»)` : ''}: no se asigna puntaje económico y el puntaje total es el técnico.`
        : om
          ? `Puntaje económico = ${pmp} × ${om.toLocaleString('es-PE')} (menor oferta) / oferta del postor` +
            (posterior
              ? c1 && c2
                ? `; puntaje total = ${c1} × técnico + ${c2} × económico (art. 75.3 del Reglamento).`
                : '.'
              : '; puntaje total = técnico + económico (art. 75.1 del Reglamento).') +
            (eco?.formula ? ` Fórmula de las Bases: ${eco.formula}.` : '')
          : 'No se pudo leer el monto de las ofertas económicas: la evaluación económica queda a cargo del comité.',
    ...avisos,
  ]
    .filter(Boolean)
    .join(' ');

  // Rechazo (art. 132.5): solo bienes y servicios, no subasta inversa
  // (132.7). El Reglamento no fija un umbral; se señalan las que quedan por
  // debajo del 90 % para que el comité decida si pide el detalle.
  const aplicaRechazo = perfil ? perfil.rechazo : true;
  const rechazo =
    aplicaRechazo && cuantia && !precioFijo
      ? conMonto
          .filter((p) => p.ofertaEconomica!.monto < cuantia * 0.9)
          .map((p) => ({
            postor: p.postor,
            estado: 'por_revisar' as const,
            fundamento: `Su oferta (${p.ofertaEconomica!.monto.toLocaleString('es-PE')}) está ${Math.round(
              (1 - p.ofertaEconomica!.monto / cuantia) * 100,
            )} % por debajo de la cuantía (${cuantia.toLocaleString('es-PE')}). El comité puede pedirle el detalle de la composición de su oferta, con un plazo mínimo de dos días hábiles, y rechazarla solo si hay razones objetivas de un probable incumplimiento (art. 132.5 y 132.6 del Reglamento).`,
          }))
      : [];

  const primero = ordenados[0];
  const negociacion =
    primero && cuantia && !precioFijo && tipo !== 'lances' && primero.ofertaEconomica && primero.ofertaEconomica.monto > cuantia
      ? {
          postor: primero.postor,
          fundamento: `La oferta del mejor puntaje total (${primero.ofertaEconomica.monto.toLocaleString(
            'es-PE',
          )}) supera la cuantía (${cuantia.toLocaleString(
            'es-PE',
          )}). La DEC gestiona la ampliación de la certificación o previsión presupuestal; si no hay recursos, antes de adjudicar se negocia con este postor la reducción de su oferta y, en su caso, de prestaciones, y si no acepta, con los siguientes en el orden de prelación (art. 132.1 a 132.3 del Reglamento).`,
        }
      : null;

  const desierto = desiertoPorMinimo
    ? `Solo ${enCompetencia.length === 1 ? 'una oferta cumple' : `${enCompetencia.length} ofertas cumplen`} los requisitos de calificación y la evaluación económica requiere al menos ${minimo}: el procedimiento se declara desierto (bases estándar, numeral 98.1; art. 84.1 del Reglamento).`
    : enCompetencia.length === 0
      ? 'No hay ninguna oferta válida: el procedimiento se declara desierto (art. 84.1 del Reglamento). Los evaluadores informan las causas a la DEC (art. 84.3).'
      : undefined;

  const empatados = primero ? ordenados.filter((p) => p.prelacion === 1) : [];
  const buenaPro = desierto
    ? { postor: null, fundamento: desierto }
    : !primero
      ? {
          postor: null,
          fundamento:
            habilitados.length === 0
              ? 'Ninguna oferta superó la admisión y la calificación: no hay a quién otorgar la buena pro.'
              : 'Falta la oferta económica de los postores habilitados: el comité determina el puntaje total y el orden de prelación.',
        }
      : empatados.length > 1
        ? {
            postor: null,
            empate: empatados.map((p) => p.postor),
            fundamento: `Empate entre ${empatados.map((p) => p.postor).join(' y ')}${soloPrecio ? ' en el monto ofertado' : ' en puntaje total y técnico'}, sin que el puntaje técnico ni la condición de MYPE los distingan: se resuelve con los criterios restantes del artículo 81 del Reglamento — MYPE integrada por personas con discapacidad y, en último término, sorteo.`,
          }
        : {
            postor: primero.postor,
            fundamento:
              (soloPrecio
                ? `Primer lugar del orden de prelación con la oferta de menor monto (${soles(primero.ofertaEconomica!.monto)})`
                : `Primer lugar del orden de prelación con ${primero.puntajeTotal} puntos totales${primero.bonificacionesAplicadas?.length ? ` (incluida la bonificación ${primero.bonificacionesAplicadas.join(' y ')})` : ''}`) +
              (ordenados[1] && comparar(primero, ordenados[1]) !== 0 && ordenados[1].puntajeTotal === primero.puntajeTotal
                ? '; el empate en puntaje total se resolvió por el mejor puntaje técnico o la condición de MYPE (art. 81 del Reglamento)'
                : '') +
              (negociacion ? ', sujeto a la ampliación de la certificación o a la negociación (art. 132).' : '.') +
              (pendientesDe(primero) ? ' Antes de otorgarla, el postor debe subsanar lo observado.' : ''),
          };

  const presentadas = postores.length;
  const consentimiento = desierto
    ? undefined
    : presentadas >= 2
      ? 'Se presentaron dos o más ofertas: el consentimiento de la buena pro se produce y registra en la Pladicop al día siguiente de vencido el plazo para interponer recurso de apelación sin que los postores lo hayan ejercido (art. 82.1 del Reglamento).'
      : 'Se presentó una sola oferta: el consentimiento de la buena pro se produce el mismo día de la notificación de su otorgamiento y se registra en la Pladicop al día siguiente (art. 82.2 del Reglamento).';

  return { metodo, rechazo, negociacion, buenaPro, perfil, descalificados, bonificaciones, desierto, consentimiento };
}

function pendientesDe(p: ResultadoPostor): boolean {
  return p.etapas.some((e) => !e.omitida && e.resultado === 'subsanable');
}
