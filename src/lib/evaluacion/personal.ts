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
  // «RESIDENTE DE OBRA Con 60 meses como…», «ESPECIALISTA… Con experiencia
  // mínima de 36 meses…», «1.1 UN RESPONSABLE DE LA EJECUCION DEL SERVICIO.
  // Con experiencia de 02 años, contados a partir del título…».
  const rx = /([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ()/,-]{4,90}?)[.:]?\s+Con\s+(?:(?:una\s+)?experiencia\s+(?:m[íi]nima\s+)?de\s+)?(?:un\s+)?(\d{1,3})\s+(meses|mes|años|año)/g;
  const ms = [...extracto.matchAll(rx)];
  ms.forEach((m, i) => {
    const fin = i + 1 < ms.length ? ms[i + 1].index! : Math.min(extracto.length, m.index! + 1500);
    const cargo = m[1].replace(/^(?:EXPERIENCIA DEL PERSONAL CLAVE|B\.\d(?:\.\d)?\.?)\s*/g, '').trim();
    const meses = /^a/.test(m[3]) ? Number(m[2]) * 12 : Number(m[2]);
    salida.push({ cargo, meses, exigencia: extracto.slice(m.index!, fin).replace(/\s+/g, ' ').slice(0, 1200) });
  });
  return salida;
}

export interface ResultadoCargo {
  cargo: string;
  profesional: string;
  exigidos: number;
  /** Meses de certificados que nombran la obra o servicio. */
  conObra: number;
  /** De esos, los que además son del tipo de obra o servicio exigido. */
  delTipo: number;
  /** Todos los meses que suman los certificados leídos. */
  total: number;
  sinObra: Array<{ empleador: string; folio: string; meses: number }>;
  otroTipo: Array<{ empleador: string; folio: string; meses: number; motivo: string }>;
}

const PALABRAS: Array<[RegExp, RegExp]> = [
  [/residente|responsable/, /residente|responsable|jefe de (?:obra|servicio)|supervisor|inspector|coordinador/],
  [/estructura/, /estructur/],
  [/suelos|pavimento/, /suelos|pavimento|geotecn/],
  [/ambiental|ssoma|seguridad/, /ambiental|ssoma|seguridad|medio ambiente/],
  [/soldad/, /soldad|operario/],
];

const SISTEMA = `Revisas la experiencia del PERSONAL CLAVE de un cargo en una oferta.
1. Identifica a cada profesional propuesto para el cargo (Anexo N° 16 o equivalente). Si el cargo pide varias personas («tres especialistas»), cada una por separado.
2. Para cada profesional, lista CADA certificado, constancia o contrato que la oferta presenta para acreditar SU experiencia: empleador, folio (página), cargo que dice el documento, fechas, meses que computa (sin traslapes con los demás), y:
   · "obraOServicio": el nombre de la obra o servicio de la que proviene la experiencia, COPIADO LITERAL del certificado; vacío si el certificado solo dice el cargo, la empresa y el período. Lo que diga el Anexo N° 16 o una declaración del postor no cuenta.
   · "cumpleTipo": true si esa obra o servicio Y el cargo corresponden a lo que exigen las Bases para este cargo; false si no; null si no se puede saber. Revisa CADA condición que ponen las Bases (el cargo; el tipo de obra o servicio, p. ej. espacios deportivos o áreas recreativas; los componentes, p. ej. instalación de coberturas o estructuras metálicas) y di en "motivoTipo" cuáles se cumplen y cuál falta, con lo que dice el certificado.
3. La experiencia se cuenta por certificados, NO por los años transcurridos desde el título: el título solo marca desde cuándo se cuenta.
Devuelve SOLO JSON: {"profesionales": [{"nombre": "", "certificados": [{"empleador": "", "folio": "", "cargo": "", "desde": "", "hasta": "", "meses": número, "obraOServicio": "", "cumpleTipo": true|false|null, "motivoTipo": ""}]}]}`;

export async function comprobarPersonal(texto: string, cargos: CargoDeBases[]): Promise<ResultadoCargo[]> {
  const textoPlano = plano(texto);
  const paginas = texto.split(/(?==== P[áa]gina \d+ ===)/).filter((p) => /=== P[áa]gina \d+ ===/.test(p));
  const porCargo = await Promise.all(
    cargos.map(async (c): Promise<ResultadoCargo[]> => {
      const claves = PALABRAS.find(([rx]) => rx.test(plano(c.cargo)))?.[1] ?? new RegExp(plano(c.cargo).split(' ').filter((w) => w.length > 4)[0] ?? 'experiencia');
      const suyas = paginas
        .filter((p) => {
          const t = plano(p);
          return claves.test(t) && /certific|constancia|contrato|conformidad|anexo n 16|experiencia/.test(t);
        })
        .slice(0, 40);
      if (suyas.length === 0) return [];
      const { text } = await generateText({
        model: chatModel,
        system: SISTEMA,
        prompt: `CARGO: ${c.cargo}
LO QUE EXIGEN LAS BASES: ${c.exigencia}

PÁGINAS DE LA OFERTA:
${suyas.map((p) => p.slice(0, 6000)).join('\n\n')}`,
        temperature: 0,
        maxTokens: 8000,
        abortSignal: AbortSignal.timeout(150_000),
      });
      const o = parseJsonLoose(text) as { profesionales?: Array<Record<string, unknown>> } | null;
      return (o?.profesionales ?? []).flatMap((pr): ResultadoCargo[] => {
        const certificados = Array.isArray(pr.certificados) ? (pr.certificados as Array<Record<string, unknown>>) : [];
        if (certificados.length === 0) return [];
        // Una obra que el modelo dice haber leído tiene que estar en la oferta.
        const tieneObra = (x: Record<string, unknown>) => {
          const obra = plano(String(x.obraOServicio ?? ''));
          return obra.length >= 12 && textoPlano.includes(obra.slice(0, 30));
        };
        const meses = (x: Record<string, unknown>) => Number(x.meses) || 0;
        const conObra = certificados.filter(tieneObra);
        return [
          {
            cargo: c.cargo,
            profesional: String(pr.nombre ?? ''),
            exigidos: c.meses,
            conObra: conObra.reduce((s, x) => s + meses(x), 0),
            delTipo: conObra.filter((x) => x.cumpleTipo !== false).reduce((s, x) => s + meses(x), 0),
            total: certificados.reduce((s, x) => s + meses(x), 0),
            sinObra: certificados
              .filter((x) => !tieneObra(x))
              .map((x) => ({ empleador: String(x.empleador ?? ''), folio: String(x.folio ?? ''), meses: meses(x) })),
            otroTipo: conObra
              .filter((x) => x.cumpleTipo === false)
              .map((x) => ({
                empleador: String(x.empleador ?? ''),
                folio: String(x.folio ?? ''),
                meses: meses(x),
                motivo: String(x.motivoTipo ?? '').trim(),
              })),
          },
        ];
      });
    }),
  );
  return porCargo.flat();
}

const CRITERIO =
  'la Resolución N° 08305-2026-TCP-S2 exige que la experiencia del personal clave se acredite detallando de qué obras o servicios proviene, sin que basten el cargo y el plazo';

/**
 * La observación para el ítem del cargo, y si lo deja sin cumplir. Solo
 * decide cuando con todos los certificados leídos se llega a lo exigido
 * y sin los observados no: si ni con todos se llega, la lista leída puede
 * estar incompleta y decide la lectura general.
 */
export function observacionDeCargo(r: ResultadoCargo): { noCumple: boolean; observacion: string } | null {
  if (r.sinObra.length === 0 && r.otroTipo.length === 0) return null;
  const quien = r.profesional ? `${r.profesional}: ` : '';
  const partes: string[] = [];
  if (r.sinObra.length) {
    partes.push(
      `los certificados de ${r.sinObra.map((x) => `${x.empleador}${x.folio ? ` (folio ${x.folio})` : ''}`).join('; ')} no indican la obra o servicio de la que proviene la experiencia (${CRITERIO})`,
    );
  }
  if (r.otroTipo.length) {
    partes.push(
      `la experiencia de ${r.otroTipo
        .map((x) => `${x.empleador}${x.folio ? ` (folio ${x.folio})` : ''}${x.motivo ? ` — ${x.motivo}` : ''}`)
        .join('; ')} no proviene del tipo de obra o servicio que exigen las Bases para el cargo`,
    );
  }
  const decide = r.delTipo < r.exigidos && r.total >= r.exigidos;
  return {
    noCumple: decide,
    observacion: decide
      ? `${quien}${partes.join('; ')}. Sin esos certificados se acreditan ${Math.round(r.delTipo)} de ${r.exigidos} meses exigidos.`
      : `${quien}${partes.join('; ')}${r.delTipo >= r.exigidos ? '; aun sin ellos se alcanzan los meses exigidos' : ''}.`,
  };
}
