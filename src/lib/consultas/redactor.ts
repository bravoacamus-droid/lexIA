/**
 * Redacción de una consulta, una observación o su absolución.
 *
 * El modelo devuelve **la estructura**, no un texto corrido: cada tramo
 * con su rótulo y cada norma en su viñeta. Así el documento sale con la
 * forma del modelo de César y no como un párrafo largo que luego hay que
 * intentar partir.
 *
 * El sustento normativo sale de la biblioteca antes de redactar, igual
 * que en el requerimiento, para que las normas citadas existan de
 * verdad. Lo que no venga respaldado no se cita.
 */
import { generateText } from 'ai';
import { generatorModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { sustentoNormativo } from '@/lib/generadores/sustento';
import { auditarCitas, type Aviso } from '@/lib/normativa/citas';
import {
  TEXTO_DECISION,
  TRAMOS_DE_CONSULTA,
  TRAMOS_DE_OBSERVACION,
  type Absolucion,
  type Decision,
  type Formulacion,
  type TipoFormulacion,
  type Tramo,
  type Ubicacion,
} from '@/lib/consultas/tipos';

const REGLAS_COMUNES = `
REGLAS QUE NO SE NEGOCIAN

1. Escribe en español del Perú, en tercera persona y registro formal de
   escrito administrativo. Nada de «nosotros», nada de tuteo.
2. Cita solo normas que aparezcan en el SUSTENTO. Si una norma no está
   ahí, no la menciones: es preferible un escrito más corto que uno con
   una cita inventada.
3. Los artículos se citan completos, con su número y su norma, así:
   «artículo <N> de la Ley N° 32069», «numeral <N.N> del Reglamento
   aprobado por Decreto Supremo N° 009-2025-EF». El número lo pones tú a
   partir del SUSTENTO; los ejemplos de esta regla son la FORMA de citar,
   nunca un artículo que debas citar.
3 bis. El régimen vigente es la Ley N° 32069, Ley General de Contrataciones
   Públicas, y su Reglamento, el Decreto Supremo N° 009-2025-EF. La Ley
   N° 30225 y su TUO están DEROGADOS, y el OSCE fue sustituido por el
   OECE. En el sustento verás resoluciones antiguas que citan el régimen
   viejo porque resuelven casos de entonces: no lo copies. Un escrito de
   hoy no dice «Ley de Contrataciones del Estado».
4. Nunca inventes folios, numerales ni denominaciones del procedimiento:
   usa exactamente los que se te dan.
5. Cada párrafo es un párrafo: frases completas, sin viñetas dentro del
   texto salvo donde el formato las pide.
6. Devuelve ÚNICAMENTE el JSON pedido, sin vallas de código ni
   explicaciones.
`.trim();

/** El esqueleto que se le pide al modelo para una formulación. */
const FORMA_FORMULACION = `
{
  "cuerpo": [
    { "rotulo": "<rótulo exacto>", "parrafos": ["…"], "vinetas": [{ "titulo": "…", "texto": "…" }] }
  ],
  "normaVulnerada": "<artículo y norma, o cadena vacía si es consulta>"
}
`.trim();

const FORMA_ABSOLUCION = `
{
  "decision": "acoge" | "acoge_parcialmente" | "no_acoge" | "aclara",
  "fundamentos": [
    { "rotulo": "<nombre del fundamento>", "parrafos": ["…"] }
  ],
  "conclusion": "En consecuencia, …",
  "precisionEnBases": "<qué se incorpora a las bases integradas, o cadena vacía si no se acoge>"
}
`.trim();

function limpiarTramos(bruto: unknown): Tramo[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .map((t) => {
      const o = (t ?? {}) as Record<string, unknown>;
      return {
        rotulo: typeof o.rotulo === 'string' && o.rotulo.trim() ? o.rotulo.trim() : null,
        parrafos: Array.isArray(o.parrafos)
          ? o.parrafos.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
          : [],
        vinetas: Array.isArray(o.vinetas)
          ? (o.vinetas as Array<Record<string, unknown>>)
              .filter((v) => typeof v?.texto === 'string' && String(v.texto).trim())
              .map((v) => ({
                titulo: typeof v.titulo === 'string' ? v.titulo.trim() : undefined,
                texto: String(v.texto).trim(),
              }))
          : undefined,
      };
    })
    .filter((t) => t.parrafos.length > 0 || (t.vinetas ?? []).length > 0);
}

/**
 * Los tramos en texto corrido, solo para pasárselos al auditor de citas.
 * No se guarda ni se enseña: el documento sigue saliendo de la
 * estructura.
 */
function aplanar(tramos: Tramo[]): string {
  return tramos
    .map((t) =>
      [
        t.rotulo ?? '',
        ...t.parrafos,
        ...(t.vinetas ?? []).map((v) => `${v.titulo ?? ''} ${v.texto}`),
      ].join(' '),
    )
    .join('\n');
}

export interface PeticionDeFormulacion {
  tipo: TipoFormulacion;
  ubicacion: Ubicacion;
  /** Lo que la persona cuenta con sus palabras. */
  relato: string;
  /** El extracto de las bases sobre el que recae, si se tiene. */
  textoDeBases?: string;
  /** Denominación del procedimiento, para la referencia. */
  procedimiento?: string;
}

/**
 * Redacta una consulta o una observación con la estructura del modelo.
 */
export async function redactarFormulacion(
  p: PeticionDeFormulacion,
): Promise<Pick<Formulacion, 'cuerpo' | 'normaVulnerada'> & { avisos: Aviso[] }> {
  const rotulos = p.tipo === 'consulta' ? TRAMOS_DE_CONSULTA : TRAMOS_DE_OBSERVACION;

  const consulta = [
    p.relato,
    p.tipo === 'observacion' ? 'requisitos desproporcionados, libertad de concurrencia, competencia efectiva, requerimiento objetivo' : '',
    p.textoDeBases?.slice(0, 600) ?? '',
  ]
    .filter(Boolean)
    .join(' · ');
  const sustento = await sustentoNormativo(consulta);

  const instruccion =
    p.tipo === 'consulta'
      ? `Redacta una CONSULTA a las bases. Una consulta PIDE UNA ACLARACIÓN: no
denuncia una infracción ni pide que se modifique nada. Estructura:

  · «Referencia»: dónde está lo que se consulta —sección, capítulo, folio
    y numeral—, y qué dice ese extremo de las bases.
  · «Consulta»: la pregunta concreta, en forma de pregunta, seguida de por
    qué la precisión es necesaria para formular la oferta.

Deja "normaVulnerada" como cadena vacía: una consulta no denuncia nada.`
      : `Redacta una OBSERVACIÓN a las bases. Una observación SÍ denuncia que un
extremo de las bases contraviene la normativa y pide que se corrija.
Estructura, con estos rótulos exactos:

  · «Referencia»: dónde está el extremo observado.
  · «1. Sustento Fáctico»: qué exige hoy la entidad y por qué resulta
    desproporcionado, restrictivo o ambiguo. Hechos y técnica, no derecho.
  · «2. Sustento Jurídico»: una VIÑETA por cada norma, con el nombre del
    principio o de la norma en "titulo" y lo que dispone en "texto".
  · «3. Solicitud»: qué debe hacer el comité, con el texto de reemplazo
    entre comillas cuando se propone una redacción nueva.

En "normaVulnerada", el artículo y la norma principal que se contraviene.`;

  const prompt = `${REGLAS_COMUNES}

${instruccion}

RÓTULOS QUE DEBES USAR, EN ESTE ORDEN: ${rotulos.join(' → ')}

DATOS DEL CASO
· Procedimiento: ${p.procedimiento || '(no indicado)'}
· Sección de las bases: ${p.ubicacion.seccion}
· Numeral: ${p.ubicacion.numeral}${p.ubicacion.literal ? ` · literal ${p.ubicacion.literal}` : ''}
· Folio: ${p.ubicacion.pagina}

LO QUE CUENTA QUIEN FORMULA
${p.relato}

${p.textoDeBases ? `EXTREMO DE LAS BASES\n${p.textoDeBases.slice(0, 4000)}\n` : ''}
${sustento ? `SUSTENTO NORMATIVO DISPONIBLE\n${sustento}\n` : 'No hay sustento normativo disponible: no cites ninguna norma.\n'}

FORMA DE LA RESPUESTA
${FORMA_FORMULACION}`;

  const { text } = await generateText({ model: generatorModel, prompt });
  const salida = parseJsonLoose<{ cuerpo?: unknown; normaVulnerada?: unknown }>(text);

  const cuerpo = limpiarTramos(salida.cuerpo);
  const normaVulnerada =
    p.tipo === 'observacion' && typeof salida.normaVulnerada === 'string'
      ? salida.normaVulnerada.trim()
      : '';

  return {
    cuerpo,
    normaVulnerada,
    avisos: (await auditarCitas(`${aplanar(cuerpo)}\n${normaVulnerada}`, sustento)).avisos,
  };
}

export interface PeticionDeAbsolucion {
  formulacion: Formulacion;
  /** La postura del comité, si ya la tiene decidida. */
  decision?: Decision;
  /** Lo que el comité quiere argumentar, con sus palabras. */
  postura?: string;
  textoDeBases?: string;
  procedimiento?: string;
}

/**
 * Redacta la absolución del comité para una formulación.
 */
export async function redactarAbsolucion(
  p: PeticionDeAbsolucion,
): Promise<Omit<Absolucion, 'id' | 'numero'> & { avisos: Aviso[] }> {
  const f = p.formulacion;
  const cuerpoPlano = f.cuerpo
    .map((t) => `${t.rotulo ? t.rotulo + ': ' : ''}${t.parrafos.join(' ')} ${(t.vinetas ?? []).map((v) => `${v.titulo ?? ''} ${v.texto}`).join(' ')}`)
    .join('\n');

  const sustento = await sustentoNormativo(
    `${cuerpoPlano.slice(0, 700)} · facultad discrecional de la entidad, requisitos de calificación, bases estándar`,
  );

  const prompt = `${REGLAS_COMUNES}

Eres el COMITÉ DE SELECCIÓN y absuelves una ${f.tipo === 'consulta' ? 'consulta' : 'observación'}
presentada por un participante. Redacta la absolución con esta estructura:

  · Empieza por el veredicto. Lo pone el sistema delante, así que NO lo
    repitas dentro de los fundamentos.
  · «fundamentos»: entre tres y cinco, cada uno con su rótulo propio
    —por ejemplo «Facultad Discrecional y Rigor Técnico», «Razonabilidad
    y Proporcionalidad», «Libertad de Concurrencia», «Sujeción a las
    Bases Estándar»— y uno o dos párrafos de desarrollo con su norma.
  · «conclusion»: una sola frase que empiece por «En consecuencia,».
  · «precisionEnBases»: si se acoge o se acoge en parte, qué texto entra
    en las bases integradas. Si no se acoge, cadena vacía.

Decisiones posibles: ${Object.entries(TEXTO_DECISION)
    .map(([k, v]) => `"${k}" (${v})`)
    .join(' · ')}.
${p.decision ? `El comité ya decidió: ${TEXTO_DECISION[p.decision]}. Argumenta esa decisión.` : 'Decide tú a partir del sustento, y sé honesto: si la observación tiene razón, acógela.'}

DATOS DEL CASO
· Procedimiento: ${p.procedimiento || '(no indicado)'}
· Recae sobre: sección ${f.ubicacion.seccion}, numeral ${f.ubicacion.numeral}${f.ubicacion.literal ? ` literal ${f.ubicacion.literal}` : ''}, folio ${f.ubicacion.pagina}
${f.normaVulnerada ? `· Norma que el participante invoca: ${f.normaVulnerada}` : ''}

LO QUE PRESENTÓ EL PARTICIPANTE
${cuerpoPlano}

${p.postura ? `POSTURA DEL COMITÉ\n${p.postura}\n` : ''}
${p.textoDeBases ? `EXTREMO DE LAS BASES\n${p.textoDeBases.slice(0, 4000)}\n` : ''}
${sustento ? `SUSTENTO NORMATIVO DISPONIBLE\n${sustento}\n` : 'No hay sustento normativo disponible: no cites ninguna norma.\n'}

FORMA DE LA RESPUESTA
${FORMA_ABSOLUCION}`;

  const { text } = await generateText({ model: generatorModel, prompt });
  const salida = parseJsonLoose<{
    decision?: unknown;
    fundamentos?: unknown;
    conclusion?: unknown;
    precisionEnBases?: unknown;
  }>(text);

  const decision: Decision =
    p.decision ??
    (typeof salida.decision === 'string' && salida.decision in TEXTO_DECISION
      ? (salida.decision as Decision)
      : 'no_acoge');

  const fundamentos = limpiarTramos(salida.fundamentos);
  const conclusion = typeof salida.conclusion === 'string' ? salida.conclusion.trim() : '';
  const precisionEnBases =
    decision === 'no_acoge'
      ? ''
      : typeof salida.precisionEnBases === 'string'
        ? salida.precisionEnBases.trim()
        : '';

  return {
    decision,
    fundamentos,
    conclusion,
    precisionEnBases,
    avisos: (
      await auditarCitas(
        `${aplanar(fundamentos)}\n${conclusion}\n${precisionEnBases}`,
        sustento,
      )
    ).avisos,
  };
}
