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

/** ¿Llega el postor a la evaluación económica? Superó admisión y calificación y no quedó fuera. */
export function accedeAEconomica(p: ResultadoPostor, lectura: LecturaBases): boolean {
  const cortado = p.etapas.some((e) => !e.omitida && e.resultado === 'no_cumple' && e.etapa !== 'evaluacion');
  if (cortado) return false;
  if (p.rechazo?.rechazada) return false;
  const minimo = lectura.evaluacionEconomica?.tipo === 'posterior' ? lectura.puntajeTecnicoMinimo : null;
  if (typeof minimo === 'number' && (p.puntajeTecnico ?? 0) < minimo) return false;
  return true;
}

export interface EtapasFinales {
  /** Cómo se calculó, para el acta. */
  metodo: string;
  rechazo: Array<{ postor: string; estado: 'por_revisar'; fundamento: string }>;
  negociacion: { postor: string; fundamento: string } | null;
  buenaPro: { postor: string | null; fundamento: string; empate?: string[] };
}

/**
 * Puntaje económico, puntaje total, orden de prelación y lo que
 * corresponde en rechazo, negociación y buena pro. Modifica los postores
 * (montos, puntajes, prelación) y devuelve el resumen de las etapas.
 */
export function etapasFinales(
  postores: ResultadoPostor[],
  ofertas: Map<string, OfertaEconomica | null>,
  lectura: LecturaBases,
): EtapasFinales {
  const eco = lectura.evaluacionEconomica;
  const pmp = eco?.puntajeMaximo ?? 100;
  const posterior = eco?.tipo === 'posterior';
  const c1 = eco?.coeficienteTecnico;
  const c2 = eco?.coeficienteEconomico;
  const cuantia = lectura.procedimiento.cuantiaMonto;

  // Precio fijo: hay bases que fijan la oferta económica en el 100 % de
  // la cuantía y no le dan puntaje (CP SER-SM-6-2026: «Evaluación
  // económica fija al 100% de la cuantía. No se asigna puntaje a la
  // oferta económica»). Entonces el total es el puntaje técnico.
  const precioFijo = eco?.puntajeMaximo === 0 || /fij[ao]|no se asigna puntaje/i.test(eco?.formula ?? '');

  const habilitados = postores.filter((p) => accedeAEconomica(p, lectura));
  for (const p of postores) {
    p.ofertaEconomica = ofertas.get(p.postor) ?? undefined;
    p.accedeEconomica = habilitados.includes(p);
  }
  const conMonto = habilitados.filter((p) => p.ofertaEconomica?.monto);
  const om = conMonto.length > 0 ? Math.min(...conMonto.map((p) => p.ofertaEconomica!.monto)) : null;

  for (const p of habilitados) {
    if (precioFijo) {
      p.puntajeEconomico = undefined;
      p.puntajeTotal = p.puntajeTecnico ?? 0;
      continue;
    }
    const oi = p.ofertaEconomica?.monto;
    if (!om || !oi) continue;
    p.puntajeEconomico = redondear((pmp * om) / oi);
    const pt = p.puntajeTecnico ?? 0;
    p.puntajeTotal =
      posterior && c1 && c2 ? redondear(c1 * pt + c2 * p.puntajeEconomico) : redondear(pt + p.puntajeEconomico);
  }

  // Orden de prelación por puntaje total; empate, por técnico (art. 81 a).
  const ordenables = habilitados.filter((p) => typeof p.puntajeTotal === 'number');
  const ordenados = [...ordenables].sort(
    (a, b) => (b.puntajeTotal ?? 0) - (a.puntajeTotal ?? 0) || (b.puntajeTecnico ?? 0) - (a.puntajeTecnico ?? 0),
  );
  if (ordenados.length > 0) {
    for (const p of postores) p.prelacion = undefined;
    let posicion = 0;
    ordenados.forEach((p, i) => {
      const anterior = ordenados[i - 1];
      if (!anterior || anterior.puntajeTotal !== p.puntajeTotal || anterior.puntajeTecnico !== p.puntajeTecnico) {
        posicion = i + 1;
      }
      p.prelacion = posicion;
    });
  }

  const metodo = precioFijo
    ? `Las Bases fijan la oferta económica${eco?.formula ? ` («${eco.formula}»)` : ''}: no se asigna puntaje económico y el puntaje total es el técnico.`
    : om
    ? `Puntaje económico = ${pmp} × ${om.toLocaleString('es-PE')} (menor oferta) / oferta del postor` +
      (posterior && c1 && c2
        ? `; puntaje total = ${c1} × técnico + ${c2} × económico (art. 75.3 del Reglamento).`
        : '; puntaje total = técnico + económico.') +
      (eco?.formula ? ` Fórmula de las Bases: ${eco.formula}.` : '')
    : 'No se pudo leer el monto de las ofertas económicas: la evaluación económica queda a cargo del comité.';

  // Rechazo (art. 132.5): ofertas sustancialmente por debajo de la
  // cuantía. El Reglamento no fija un umbral; se señalan las que quedan
  // por debajo del 90 % para que el comité decida si pide el detalle.
  const rechazo = cuantia && !precioFijo
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
    primero && cuantia && !precioFijo && primero.ofertaEconomica && primero.ofertaEconomica.monto > cuantia
      ? {
          postor: primero.postor,
          fundamento: `La oferta del mejor puntaje total (${primero.ofertaEconomica.monto.toLocaleString(
            'es-PE',
          )}) supera la cuantía (${cuantia.toLocaleString(
            'es-PE',
          )}). La DEC gestiona la ampliación de la certificación o previsión presupuestal; si no hay recursos, antes de adjudicar se negocia con este postor la reducción de su oferta y, en su caso, de prestaciones, y si no acepta, con los siguientes en el orden de prelación (art. 132.1 a 132.3 del Reglamento).`,
        }
      : null;

  const empatados = primero ? ordenados.filter((p) => p.prelacion === 1) : [];
  const buenaPro = !primero
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
          fundamento: `Empate en puntaje total y técnico entre ${empatados
            .map((p) => p.postor)
            .join(' y ')}: se resuelve con los criterios del artículo 81 del Reglamento (micro y pequeña empresa con personas con discapacidad, micro y pequeña empresa, sorteo).`,
        }
      : {
          postor: primero.postor,
          fundamento:
            `Primer lugar del orden de prelación con ${primero.puntajeTotal} puntos totales` +
            (negociacion ? ', sujeto a la ampliación de la certificación o a la negociación (art. 132).' : '.') +
            (pendientesDe(primero) ? ' Antes de otorgarla, el postor debe subsanar lo observado.' : ''),
        };

  return { metodo, rechazo, negociacion, buenaPro };
}

function pendientesDe(p: ResultadoPostor): boolean {
  return p.etapas.some((e) => !e.omitida && e.resultado === 'subsanable');
}
