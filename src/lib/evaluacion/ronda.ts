/**
 * La segunda evaluación: los documentos que llegan después de la primera
 * acta.
 *
 * POR QUÉ
 *
 * Documento 13 de César (10/10/2026): «después de una primera evaluación
 * y A-LexIA advierta que una oferta debe solicitar subsanación, el
 * evaluador (comité) debería gestionar esa subsanación de manera interna,
 * una vez contada con esa subsanación o el postor no haya subsanado, el
 * evaluador (comité) debe volver a evaluar nuevamente añadiendo el
 * documento de subsanación, o los documentos de rechazo de oferta o los
 * documentos de negociación […] y a partir de la segunda evaluación
 * A-LexIA ya no debería evaluar nuevamente las ofertas inicialmente
 * evaluadas por lo que solo debe considerar los resultados de la primera
 * acta y los nuevos documentos añadidos».
 *
 * QUÉ HACE
 *
 * Con el resultado guardado y los documentos nuevos de cada postor:
 *   · subsanación: revisa SOLO las fichas que quedaron sujetas a
 *     subsanación, con el documento presentado (art. 78 del Reglamento:
 *     no puede alterar el contenido esencial de la oferta);
 *   · no subsanó: esas fichas pasan a no cumplir;
 *   · rechazo: decide, con el detalle de costos o la decisión del
 *     comité, si la oferta se rechaza (art. 132.5 y 132.6);
 *   · negociación: toma el monto negociado (art. 132.1 a 132.3).
 * Luego se recalculan las etapas, el orden de prelación y el acta. Las
 * ofertas no se vuelven a leer.
 */
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { ETAPAS, ETIQUETA_RESULTADO, type FichaRequisito, type ResultadoEtapa, type ResultadoPostor } from './etapas';
import { cerrarEtapa } from './motor';

export type TipoDocumentoRonda = 'subsanacion' | 'rechazo' | 'negociacion';

export const NOMBRE_TIPO_RONDA: Record<TipoDocumentoRonda, string> = {
  subsanacion: 'Subsanación',
  rechazo: 'Rechazo de oferta',
  negociacion: 'Negociación',
};

export interface RevisionPostor {
  /** Fichas revisadas con la subsanación, por id. */
  fichas?: Record<string, FichaRequisito>;
  rechazo?: { rechazada: boolean; fundamento: string };
  negociacion?: { monto?: number; acepta: boolean; fundamento: string };
  /** Lo que cambió, para el acta y la pantalla. */
  cambios: string[];
}

const SISTEMA_SUBSANACION = `Eres el comité de selección evaluando la SUBSANACIÓN que presentó un postor, después de la primera acta.

Recibes las fichas que quedaron "sujetas a subsanación" (lo que exigen las Bases, lo que se observó y qué se pidió subsanar) y el documento que presentó el postor. NO vuelves a evaluar la oferta: solo si el documento subsana lo observado.

Reglas (art. 78 del Reglamento):
· La subsanación corrige una omisión o un error material o formal; no puede alterar el contenido esencial de la oferta, ni mejorarla, ni incorporar lo que no existía.
· Si el documento subsanado es de una entidad pública o de un privado con función pública, debe haberse emitido antes de la fecha de presentación de ofertas.
· Si el documento no corresponde a lo observado, o no lo corrige del todo, la ficha no cumple.

Devuelve SOLO este JSON:
{"fichas": [{"id": "", "resultado": "cumple"|"no_cumple"|"revision_humana", "hallazgo": "qué presentó y por qué subsana o no", "evidencia": [{"documento": "", "ubicacion": "", "cita": ""}]}]}`;

const SISTEMA_RECHAZO = `Eres el comité de selección y decides si se RECHAZA una oferta económica por estar por debajo de la cuantía, con el documento que se adjunta (el detalle de la composición de la oferta que presentó el postor, o el análisis del comité).

Regla (art. 132.5 y 132.6 del Reglamento, bienes y servicios): se rechaza solo si, solicitada la descripción a detalle de la composición de la oferta, se determina mediante RAZONES OBJETIVAS un probable incumplimiento de las prestaciones (oferta sustancialmente por debajo de la cuantía, prestaciones no incorporadas o insuficientemente presupuestadas). La decisión es fundamentada.

Devuelve SOLO este JSON: {"rechazada": true|false, "fundamento": "las razones objetivas, con lo que dice el documento"}`;

const SISTEMA_NEGOCIACION = `Lees el documento de NEGOCIACIÓN con un postor (acta, carta o correo) en un procedimiento de selección.

Regla (art. 132.1 a 132.3 del Reglamento): se negocia la reducción de la oferta económica y, en su caso, de prestaciones o condiciones del requerimiento con no objeción del área usuaria; no puede negociarse lo que dio puntaje en los factores de evaluación.

Devuelve SOLO este JSON: {"acepta": true|false, "monto": 0, "fundamento": "qué se negoció y qué aceptó o rechazó el postor; monto final en soles si lo hay"}`;

export async function revisarSubsanacion(args: {
  postor: ResultadoPostor;
  textoDocumento: string;
}): Promise<Record<string, FichaRequisito>> {
  const observadas = args.postor.etapas.flatMap((e) =>
    e.omitida ? [] : e.fichas.filter((f) => f.resultado === 'subsanable').map((f) => ({ etapa: e, f })),
  );
  if (observadas.length === 0) return {};
  const peticion = `POSTOR: ${args.postor.postor}

FICHAS SUJETAS A SUBSANACIÓN:
${JSON.stringify(
  observadas.map(({ etapa, f }) => ({
    id: f.id,
    etapa: etapa.etapa,
    requisito: f.requisito,
    reglaBases: f.reglaBases,
    hallazgo: f.hallazgo,
    queSePidio: etapa.subsanaciones,
  })),
  null,
  1,
)}

DOCUMENTO DE SUBSANACIÓN PRESENTADO:
${args.textoDocumento.slice(0, 200_000)}

Evalúa la subsanación y devuelve el JSON.`;
  const { text } = await generateText({
    model: chatModel,
    system: SISTEMA_SUBSANACION,
    prompt: peticion,
    temperature: 0.1,
    abortSignal: AbortSignal.timeout(180_000),
  });
  const crudo = parseJsonLoose(text) as { fichas?: Array<Record<string, unknown>> };
  const salida: Record<string, FichaRequisito> = {};
  for (const { f } of observadas) {
    const r = (crudo.fichas ?? []).find((x) => String(x.id ?? '') === f.id);
    const resultado = ['cumple', 'no_cumple', 'revision_humana'].includes(String(r?.resultado))
      ? (String(r!.resultado) as FichaRequisito['resultado'])
      : 'revision_humana';
    salida[f.id] = {
      ...f,
      resultado,
      subsanable: false,
      hallazgo: `Subsanación: ${String(r?.hallazgo ?? 'el análisis no devolvió conclusión para esta ficha; la revisa el comité.').trim()} (Observación original: ${f.hallazgo})`,
      evidencia: Array.isArray(r?.evidencia)
        ? [
            ...f.evidencia,
            ...(r!.evidencia as Array<Record<string, unknown>>).map((x) => ({
              documento: String(x.documento ?? 'Documento de subsanación'),
              ubicacion: x.ubicacion ? String(x.ubicacion) : undefined,
              cita: String(x.cita ?? ''),
            })),
          ]
        : f.evidencia,
    };
  }
  return salida;
}

export async function revisarRechazo(args: {
  postor: ResultadoPostor;
  textoDocumento: string;
  cuantia?: number;
}): Promise<{ rechazada: boolean; fundamento: string }> {
  const { text } = await generateText({
    model: chatModel,
    system: SISTEMA_RECHAZO,
    prompt: `POSTOR: ${args.postor.postor}
OFERTA ECONÓMICA: ${args.postor.ofertaEconomica?.monto ?? 'no consta'}
CUANTÍA: ${args.cuantia ?? 'no consta'}

DOCUMENTO:
${args.textoDocumento.slice(0, 150_000)}`,
    temperature: 0.1,
    abortSignal: AbortSignal.timeout(150_000),
  });
  const o = parseJsonLoose(text) as { rechazada?: unknown; fundamento?: unknown };
  return { rechazada: o.rechazada === true, fundamento: String(o.fundamento ?? '').trim() };
}

export async function revisarNegociacion(args: {
  postor: ResultadoPostor;
  textoDocumento: string;
}): Promise<{ monto?: number; acepta: boolean; fundamento: string }> {
  const { text } = await generateText({
    model: chatModel,
    system: SISTEMA_NEGOCIACION,
    prompt: `POSTOR: ${args.postor.postor}
OFERTA ECONÓMICA ORIGINAL: ${args.postor.ofertaEconomica?.monto ?? 'no consta'}

DOCUMENTO:
${args.textoDocumento.slice(0, 150_000)}`,
    temperature: 0.1,
    abortSignal: AbortSignal.timeout(150_000),
  });
  const o = parseJsonLoose(text) as { acepta?: unknown; monto?: unknown; fundamento?: unknown };
  const monto = Number(String(o.monto ?? '').replace(/[^\d.]/g, ''));
  return {
    acepta: o.acepta === true,
    monto: Number.isFinite(monto) && monto > 0 ? monto : undefined,
    fundamento: String(o.fundamento ?? '').trim(),
  };
}

/** «No subsanó»: lo sujeto a subsanación pasa a no cumplir. */
export function sinSubsanar(postor: ResultadoPostor): Record<string, FichaRequisito> {
  const salida: Record<string, FichaRequisito> = {};
  for (const e of postor.etapas) {
    if (e.omitida) continue;
    for (const f of e.fichas) {
      if (f.resultado !== 'subsanable') continue;
      salida[f.id] = {
        ...f,
        resultado: 'no_cumple',
        subsanable: false,
        hallazgo: `El postor no presentó la subsanación requerida dentro del plazo. (Observación original: ${f.hallazgo})`,
      };
    }
  }
  return salida;
}

/**
 * Aplica las revisiones a un postor: fichas, etapas, cortes. Devuelve el
 * postor nuevo; el económico y la prelación se recalculan después, para
 * todos a la vez.
 */
export function aplicarRevision(postor: ResultadoPostor, rev: RevisionPostor): ResultadoPostor {
  const etapas: ResultadoEtapa[] = [];
  let corte: string | null = null;
  for (const etapa of ETAPAS) {
    const e = postor.etapas.find((x) => x.etapa === etapa);
    if (!e) continue;
    if (corte) {
      etapas.push({
        etapa,
        omitida: true,
        motivoOmision: corte,
        fichas: [],
        resultado: 'no_cumple',
        subsanaciones: [],
        fundamento: corte,
      });
      continue;
    }
    if (e.omitida) {
      etapas.push(e);
      continue;
    }
    const fichas = e.fichas.map((f) => rev.fichas?.[f.id] ?? f);
    const cerrada = cerrarEtapa({ ...e, fichas });
    etapas.push(cerrada);
    if (cerrada.resultado === 'no_cumple' && etapa !== 'evaluacion') {
      corte = `No se evalúa: la oferta no superó la etapa de ${etapa} tras la subsanación.`;
    }
  }
  const evaluacion = etapas.find((e) => e.etapa === 'evaluacion' && !e.omitida);
  const cortada = etapas.find((e) => !e.omitida && e.resultado === 'no_cumple' && e.etapa !== 'evaluacion');
  const nuevo: ResultadoPostor = {
    ...postor,
    etapas,
    puntajeTecnico: evaluacion?.puntaje,
    resultadoFinal: cortada
      ? `${ETIQUETA_RESULTADO[cortada.etapa].no_cumple} en ${cortada.etapa}`
      : etapas.some((e) => !e.omitida && e.resultado === 'subsanable')
        ? 'Sujeto a subsanación'
        : 'Evaluado',
    puntajeEconomico: undefined,
    puntajeTotal: undefined,
    prelacion: undefined,
  };
  if (rev.rechazo) nuevo.rechazo = rev.rechazo;
  if (rev.negociacion?.acepta && rev.negociacion.monto && nuevo.ofertaEconomica) {
    nuevo.ofertaEconomica = {
      ...nuevo.ofertaEconomica,
      monto: rev.negociacion.monto,
      cita: `Monto negociado. ${rev.negociacion.fundamento}`,
    };
  }
  return nuevo;
}
