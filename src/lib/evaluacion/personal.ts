/**
 * La experiencia del personal clave, certificado por certificado, con el
 * criterio de la Resolución N° 08305-2026-TCP-S2.
 *
 * POR QUÉ
 *
 * César (documento 13, 10/10/2026): la experiencia del personal clave se
 * acredita detallando de qué obras o servicios proviene; no bastan el
 * cargo y el plazo. Si el Tribunal tiene una sola posición, se descalifica
 * con ella; si tiene dos, se advierten ambas (eso lo hace el contraste,
 * jurisprudencia.ts). La 08305 confirmó la descalificación del Consorcio
 * Mantenimiento Vial Ayacucho en este mismo concurso por el certificado de
 * su especialista de suelos.
 *
 * Pedido dentro de la lectura general, el modelo dejaba vacíos los datos
 * de cada certificado y la regla no se aplicaba. Aquí es una consulta por
 * cargo, sobre las páginas de certificados, y la cuenta la hace el código.
 */
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { plano } from './equipos';

export interface CargoDeBases {
  cargo: string;
  meses: number;
  exigencia: string;
}

/** «RESIDENTE DE OBRA Con 60 meses como: … en obras y/o servicios en …». */
export function cargosDeBases(extracto: string): CargoDeBases[] {
  const salida: CargoDeBases[] = [];
  const rx = /([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ()/,-]{4,90}?)\s+Con\s+(?:(?:una\s+)?experiencia\s+m[íi]nima\s+de\s+)?(\d{1,3})\s+meses/g;
  const ms = [...extracto.matchAll(rx)];
  ms.forEach((m, i) => {
    const fin = i + 1 < ms.length ? ms[i + 1].index! : Math.min(extracto.length, m.index! + 1500);
    const cargo = m[1].replace(/^(?:EXPERIENCIA DEL PERSONAL CLAVE|B\.\d(?:\.\d)?\.?)\s*/g, '').trim();
    salida.push({ cargo, meses: Number(m[2]), exigencia: extracto.slice(m.index!, fin).replace(/\s+/g, ' ').slice(0, 1200) });
  });
  return salida;
}

export interface ResultadoCargo {
  cargo: string;
  profesional: string;
  exigidos: number;
  conObra: number;
  sinObra: Array<{ empleador: string; folio: string; meses: number }>;
}

const PALABRAS: Array<[RegExp, RegExp]> = [
  [/residente/, /residente|jefe de (?:obra|servicio)|supervisor|inspector/],
  [/suelos|pavimento/, /suelos|pavimento|geotecn/],
  [/ambiental|ssoma|seguridad/, /ambiental|ssoma|seguridad|medio ambiente/],
];

export async function comprobarPersonal(texto: string, cargos: CargoDeBases[]): Promise<ResultadoCargo[]> {
  const textoPlano = plano(texto);
  const paginas = texto.split(/(?==== P[áa]gina \d+ ===)/).filter((p) => /=== P[áa]gina \d+ ===/.test(p));
  return Promise.all(
    cargos.map(async (c): Promise<ResultadoCargo | null> => {
      const claves = PALABRAS.find(([rx]) => rx.test(plano(c.cargo)))?.[1] ?? new RegExp(plano(c.cargo).split(' ')[0]);
      const suyas = paginas
        .filter((p) => {
          const t = plano(p);
          return claves.test(t) && /certific|constancia|contrato|conformidad|anexo n 16|experiencia/.test(t);
        })
        .slice(0, 35);
      if (suyas.length === 0) return null;
      const { text } = await generateText({
        model: chatModel,
        system: `Revisas la experiencia de UN profesional del personal clave en una oferta.
1. Identifica al profesional propuesto para el cargo (Anexo N° 16 o equivalente).
2. Lista CADA certificado, constancia o contrato que la oferta presenta para acreditar SU experiencia en ese cargo: empleador, folio (página), cargo que dice el documento, fechas, meses que computa, y "obraOServicio": el nombre de la obra o servicio de la que proviene la experiencia, COPIADO LITERAL del certificado. Si el certificado solo dice el cargo, la empresa y el período —sin nombrar una obra o servicio concreto—, "obraOServicio" va vacío. Lo que diga el Anexo N° 16 o una declaración del postor no cuenta: se mira el certificado.
Devuelve SOLO JSON: {"profesional": "", "certificados": [{"empleador": "", "folio": "", "cargo": "", "desde": "", "hasta": "", "meses": número, "obraOServicio": ""}]}`,
        prompt: `CARGO: ${c.cargo}
LO QUE EXIGEN LAS BASES: ${c.exigencia}

PÁGINAS DE LA OFERTA:
${suyas.map((p) => p.slice(0, 6000)).join('\n\n')}`,
        temperature: 0,
        maxTokens: 6000,
        abortSignal: AbortSignal.timeout(120_000),
      });
      const o = parseJsonLoose(text) as { profesional?: unknown; certificados?: Array<Record<string, unknown>> } | null;
      const certificados = o?.certificados ?? [];
      if (certificados.length === 0) return null;
      // Una obra que el modelo dice haber leído tiene que estar en la oferta.
      const tieneObra = (x: Record<string, unknown>) => {
        const obra = plano(String(x.obraOServicio ?? ''));
        return obra.length >= 12 && textoPlano.includes(obra.slice(0, 30));
      };
      const conObra = certificados.filter(tieneObra).reduce((s, x) => s + (Number(x.meses) || 0), 0);
      return {
        cargo: c.cargo,
        profesional: String(o?.profesional ?? ''),
        exigidos: c.meses,
        conObra,
        sinObra: certificados
          .filter((x) => !tieneObra(x))
          .map((x) => ({ empleador: String(x.empleador ?? ''), folio: String(x.folio ?? ''), meses: Number(x.meses) || 0 })),
      };
    }),
  ).then((r) => r.filter((x): x is ResultadoCargo => x !== null));
}

const CRITERIO =
  'la Resolución N° 08305-2026-TCP-S2 exige que la experiencia del personal clave se acredite detallando de qué obras o servicios proviene, sin que basten el cargo y el plazo';

/** La observación para el ítem del cargo, y si lo deja sin cumplir. */
export function observacionDeCargo(r: ResultadoCargo): { noCumple: boolean; observacion: string } | null {
  if (r.sinObra.length === 0) return null;
  const lista = r.sinObra.map((x) => `${x.empleador}${x.folio ? ` (folio ${x.folio})` : ''}`).join('; ');
  const total = r.conObra + r.sinObra.reduce((x, c) => x + c.meses, 0);
  // Solo decide el caso de la 08305: con todos los certificados se llega,
  // y sin los que no nombran la obra, no. Si ni con todos se llega, la
  // lista que se leyó puede estar incompleta: decide la lectura general.
  if (r.conObra < r.exigidos && total >= r.exigidos) {
    return {
      noCumple: true,
      observacion: `${r.profesional ? `${r.profesional}: ` : ''}los certificados de ${lista} no indican la obra o servicio de la que proviene la experiencia. Sin ellos se acreditan ${Math.round(r.conObra)} de ${r.exigidos} meses exigidos; ${CRITERIO}.`,
    };
  }
  return {
    noCumple: false,
    observacion: `${r.profesional ? `${r.profesional}: ` : ''}los certificados de ${lista} no indican la obra o servicio (${CRITERIO}); aun sin ellos se alcanzan los ${r.exigidos} meses exigidos.`,
  };
}
