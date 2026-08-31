/**
 * El motor: lee las Bases, evalúa cada oferta etapa por etapa y ordena.
 *
 * POR QUÉ ESTÁ SEPARADO DE LA RUTA
 *
 * Porque así se puede probar. La ruta necesita sesión, base de datos y
 * archivos en Storage; el motor solo necesita texto. `scripts/probar-
 * evaluacion-ofertas.ts` lo ejecuta con las Bases y las ofertas reales
 * que hay en el repositorio, sin levantar nada.
 *
 * EL ORDEN, QUE ES LO QUE PIDIÓ CÉSAR
 *
 *   Bases  →  qué se exige en cada etapa
 *     ↓
 *   Postor →  ADMISIÓN
 *     ↓ (solo si no fue no admitida)
 *            CALIFICACIÓN
 *     ↓ (solo si no fue descalificado)
 *            EVALUACIÓN → puntaje
 *     ↓
 *   Todos  →  orden de prelación → buena pro
 *
 * Un postor que no pasa una etapa NO se evalúa en las siguientes, y en
 * el acta figura por qué se quedó donde se quedó. No es un ahorro de
 * llamadas: es que un descarte en admisión no puede razonarse con lo
 * que habría pasado en la calificación.
 */
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { criteriosDe } from './criterios.generado';
import { PROMPT_LEER_BASES, PROMPT_POR_ETAPA } from './prompts';
import {
  ETAPAS,
  avanza,
  ordenarPorPuntaje,
  resultadoDeFichas,
  type Etapa,
  type FichaRequisito,
  type Resultado,
  type ResultadoEtapa,
  type ResultadoPostor,
} from './etapas';

/** Un requisito tal como lo exigen las Bases de ESTE procedimiento. */
export interface ExigenciaBases {
  id: string;
  requisito: string;
  reglaBases: string;
  documento?: string;
  /** Solo en factores. */
  puntajeMaximo?: number;
}

export interface LecturaBases {
  procedimiento: {
    entidad?: string;
    numero?: string;
    objeto?: string;
    denominacion?: string;
    cuantia?: string;
  };
  admision: ExigenciaBases[];
  calificacion: ExigenciaBases[];
  factores: ExigenciaBases[];
  /**
   * La económica va aparte de los factores técnicos.
   *
   * Medido con las Bases del CPA 008-2026-EF/43: al pedirlos juntos, el
   * modelo devolvía "Evaluación económica — 100 pts" como un factor más
   * y los técnicos sumaban 200. Son dos etapas distintas, y el acta de
   * César también las separa.
   */
  evaluacionEconomica: { puntajeMaximo?: number; formula?: string } | null;
  puntajeTecnicoMinimo: number | null;
  advertencias: string[];
}

/** Cuánto texto de cada documento se le da al modelo por llamada. */
const TOPE_BASES = 120_000;
const TOPE_OFERTA = 200_000;

const recortar = (t: string, tope: number) =>
  t.length > tope ? `${t.slice(0, tope)}\n\n[…documento recortado…]` : t;

/**
 * Qué exige el procedimiento, leído de las Bases Integradas.
 *
 * Se hace una vez y vale para todos los postores: si cada oferta se
 * evaluara contra una lectura distinta de las Bases, la comparación
 * entre postores no significaría nada.
 */
export async function leerBases(textoBases: string): Promise<LecturaBases> {
  const { text } = await generateText({
    model: chatModel,
    system: PROMPT_LEER_BASES,
    prompt: `BASES INTEGRADAS:\n\n${recortar(textoBases, TOPE_BASES)}`,
    temperature: 0.1,
  });

  const crudo = parseJsonLoose(text) as Partial<LecturaBases> | null;
  const lista = (x: unknown): ExigenciaBases[] =>
    Array.isArray(x)
      ? x
          .map((e): ExigenciaBases | null => {
            const o = e as Record<string, unknown>;
            const requisito = String(o.requisito ?? o.factor ?? '').trim();
            if (!requisito) return null;
            const max = Number(o.puntajeMaximo);
            return {
              id: String(o.id ?? '').trim() || requisito.toLowerCase().replace(/\W+/g, '_').slice(0, 40),
              requisito,
              reglaBases: String(o.reglaBases ?? '').trim(),
              documento: o.documento ? String(o.documento) : undefined,
              puntajeMaximo: Number.isFinite(max) && max > 0 ? max : undefined,
            };
          })
          .filter((x): x is ExigenciaBases => x !== null)
      : [];

  const minimo = Number(crudo?.puntajeTecnicoMinimo);

  // Aunque se le pida que la deje fuera, el modelo cuela la oferta
  // económica entre los factores técnicos: en las Bases va en el mismo
  // capítulo. Se aparta aquí para que la suma técnica siga siendo 100.
  const todos = lista(crudo?.factores);
  const esEconomico = (e: ExigenciaBases) =>
    /(?:oferta|evaluaci[óo]n|precio|propuesta)\s+econ[óo]mic|^econ[óo]mic/i.test(e.requisito);
  const factores = todos.filter((e) => !esEconomico(e));
  const economicoEnLista = todos.find(esEconomico);
  const economicoDeclarado = crudo?.evaluacionEconomica ?? null;

  return {
    procedimiento: crudo?.procedimiento ?? {},
    admision: lista(crudo?.admision),
    calificacion: lista(crudo?.calificacion),
    factores,
    evaluacionEconomica:
      economicoDeclarado ??
      (economicoEnLista
        ? { puntajeMaximo: economicoEnLista.puntajeMaximo, formula: economicoEnLista.reglaBases }
        : null),
    puntajeTecnicoMinimo: Number.isFinite(minimo) ? minimo : null,
    advertencias: Array.isArray(crudo?.advertencias) ? crudo.advertencias.map(String) : [],
  };
}

/**
 * Los casos del Tribunal que tocan a los requisitos de esta etapa.
 *
 * Se emparejan por id del catálogo cuando coincide y, si no, por
 * parecido del nombre: las Bases llaman "Experiencia del postor en la
 * especialidad" a lo que el documento de César titula igual, pero no
 * siempre con las mismas palabras exactas.
 */
export function criteriosParaEtapa(etapa: Etapa, exigencias: ExigenciaBases[]): string {
  const bloques: string[] = [];
  const vistos = new Set<string>();

  const normalizar = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  for (const e of exigencias) {
    const directo = criteriosDe(e.id);
    let bloque = directo;

    if (!bloque) {
      const objetivo = normalizar(e.requisito);
      const palabras = objetivo.split(' ').filter((p) => p.length > 4);
      let mejor: { c: ReturnType<typeof criteriosDe>; puntos: number } | null = null;
      for (const posible of CANDIDATOS(etapa)) {
        const titulo = normalizar(posible.titulo);
        const puntos = palabras.filter((p) => titulo.includes(p)).length;
        if (puntos > 0 && (!mejor || puntos > mejor.puntos)) mejor = { c: posible, puntos };
      }
      // Se exige más de una palabra larga en común: con una sola,
      // "capacitación del personal clave" casaba con "capacitación al
      // personal de la entidad", que es otro factor y otros criterios.
      if (mejor && mejor.puntos >= 2) bloque = mejor.c;
    }

    if (!bloque || vistos.has(bloque.id)) continue;
    vistos.add(bloque.id);
    bloques.push(`### ${bloque.titulo}\n\n${bloque.texto}`);
  }

  if (bloques.length === 0) return '';
  return `═══════════════════════════════════════════════════════
CASOS SEMILLA DEL TRIBUNAL SOBRE ESTOS REQUISITOS
═══════════════════════════════════════════════════════
Enseñan qué controversias existen. No son un catálogo cerrado ni un
resultado a copiar.

${bloques.join('\n\n---\n\n')}`;
}

/** Los criterios disponibles de una etapa. */
function CANDIDATOS(etapa: Etapa) {
  // Import diferido para no cargar 450 KB de criterios cuando no hacen
  // falta (por ejemplo, al solo leer las Bases).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { CRITERIOS } = require('./criterios.generado') as typeof import('./criterios.generado');
  return CRITERIOS.filter((c) => c.etapa === etapa);
}

/** Una etapa de un postor. */
export async function evaluarEtapa(args: {
  etapa: Etapa;
  exigencias: ExigenciaBases[];
  textoOferta: string;
  nombrePostor: string;
  textoBases: string;
}): Promise<ResultadoEtapa> {
  const { etapa, exigencias, textoOferta, nombrePostor } = args;

  if (exigencias.length === 0) {
    return {
      etapa,
      fichas: [],
      resultado: 'cumple',
      subsanaciones: [],
      fundamento: 'Las Bases Integradas no establecen requisitos para esta etapa.',
    };
  }

  const criterios = criteriosParaEtapa(etapa, exigencias);
  const listaRequisitos = exigencias
    .map(
      (e, i) =>
        `${i + 1}. [id: ${e.id}] ${e.requisito}\n   Exige: ${e.reglaBases}` +
        (e.documento ? `\n   Se acredita con: ${e.documento}` : '') +
        (e.puntajeMaximo ? `\n   Puntaje máximo: ${e.puntajeMaximo}` : ''),
    )
    .join('\n\n');

  const peticion = `PROCEDIMIENTO — REQUISITOS DE ESTA ETAPA, tal como los exigen las Bases Integradas:

${listaRequisitos}

${criterios}

═══════════════════════════════════════════════════════
OFERTA DEL POSTOR: ${nombrePostor}
═══════════════════════════════════════════════════════
${recortar(textoOferta, TOPE_OFERTA)}

Evalúa la etapa y devuelve el JSON.`;

  type Respuesta = { fichas?: unknown; subsanaciones?: unknown; fundamento?: unknown };

  /**
   * El JSON de una etapa puede venir roto, y eso no puede llevarse por
   * delante el procedimiento entero.
   *
   * Pasó con las Bases del MEF: el modelo cortó el JSON a mitad de una
   * ficha, `parseJsonLoose` lanzó y se perdieron las tres etapas de los
   * tres postores. Ahora se reintenta una vez —recordándole que solo
   * quiere el JSON— y, si vuelve a fallar, esa etapa queda para el
   * comité en lugar de tumbarlo todo.
   */
  let crudo: Respuesta | null = null;
  let ultimoError = '';
  for (let intento = 1; intento <= 2 && !crudo; intento++) {
    const { text } = await generateText({
      model: chatModel,
      system: PROMPT_POR_ETAPA[etapa],
      prompt:
        intento === 1
          ? peticion
          : `${peticion}

AVISO: tu respuesta anterior no era JSON válido (${ultimoError}). Devuelve
únicamente el objeto JSON, sin markdown, sin comentarios y sin comas
finales. Sé más breve en los textos si hace falta para cerrarlo.`,
      temperature: 0.1,
    });
    try {
      crudo = parseJsonLoose(text) as Respuesta;
    } catch (e) {
      ultimoError = (e as Error).message.slice(0, 120);
      console.error(`[evaluacion] ${nombrePostor} · ${etapa}: JSON ilegible (intento ${intento})`);
    }
  }

  if (!crudo) {
    return {
      etapa,
      fichas: normalizarFichas([], exigencias, etapa),
      resultado: 'revision_humana',
      puntaje: etapa === 'evaluacion' ? 0 : undefined,
      subsanaciones: [],
      fundamento:
        'El análisis automático no devolvió un resultado legible para esta etapa. ' +
        'Los requisitos quedan pendientes de revisión del comité.',
    };
  }

  const fichas = normalizarFichas(crudo?.fichas, exigencias, etapa);

  const resultado = resultadoDeFichas(fichas);
  const puntaje =
    etapa === 'evaluacion'
      ? fichas.reduce((s, f) => s + (typeof f.puntaje === 'number' ? f.puntaje : 0), 0)
      : undefined;

  return {
    etapa,
    fichas,
    resultado: etapa === 'evaluacion' ? 'cumple' : resultado,
    puntaje,
    subsanaciones: Array.isArray(crudo?.subsanaciones) ? crudo.subsanaciones.map(String) : [],
    fundamento: String(crudo?.fundamento ?? '').trim(),
  };
}

const RESULTADOS: Resultado[] = ['cumple', 'subsanable', 'no_cumple', 'revision_humana'];

/**
 * Deja las fichas del modelo en la forma que espera el resto.
 *
 * Lo importante que se hace aquí, y por qué:
 *
 *  · Se topa el puntaje al máximo de las Bases. El modelo se pasa a
 *    veces, y un factor que otorga más de lo que las Bases permiten
 *    cambia al ganador.
 *  · Un requisito que el modelo no devolvió NO se da por cumplido: se
 *    marca para revisión humana. Callar un requisito es la forma
 *    silenciosa de aprobarlo.
 */
export function normalizarFichas(
  crudo: unknown,
  exigencias: ExigenciaBases[],
  etapa: Etapa,
): FichaRequisito[] {
  const lista = Array.isArray(crudo) ? crudo : [];
  const porId = new Map<string, FichaRequisito>();

  for (const f of lista) {
    const o = f as Record<string, unknown>;
    const id = String(o.id ?? '').trim();
    const requisito = String(o.requisito ?? '').trim();
    if (!id && !requisito) continue;

    const exigencia = exigencias.find((e) => e.id === id) ??
      exigencias.find((e) => e.requisito.toLowerCase() === requisito.toLowerCase());

    const resultadoCrudo = String(o.resultado ?? '').trim() as Resultado;
    const resultado = RESULTADOS.includes(resultadoCrudo) ? resultadoCrudo : 'revision_humana';

    let puntaje: number | undefined;
    if (etapa === 'evaluacion') {
      const n = Number(o.puntaje);
      const max = exigencia?.puntajeMaximo;
      puntaje = Number.isFinite(n) && n > 0 ? n : 0;
      if (typeof max === 'number' && puntaje > max) puntaje = max;
    }

    const ficha: FichaRequisito = {
      id: exigencia?.id ?? id ?? requisito,
      requisito: requisito || exigencia?.requisito || id,
      reglaBases: String(o.reglaBases ?? exigencia?.reglaBases ?? ''),
      norma: o.norma ? String(o.norma) : undefined,
      documentoPresentado: String(o.documentoPresentado ?? ''),
      evidencia: Array.isArray(o.evidencia)
        ? o.evidencia.map((e) => {
            const x = e as Record<string, unknown>;
            return {
              documento: String(x.documento ?? ''),
              ubicacion: x.ubicacion ? String(x.ubicacion) : undefined,
              cita: String(x.cita ?? ''),
            };
          })
        : [],
      hallazgo: String(o.hallazgo ?? ''),
      naturalezaDefecto: ['formal', 'sustancial', 'ninguno'].includes(String(o.naturalezaDefecto))
        ? (String(o.naturalezaDefecto) as 'formal' | 'sustancial' | 'ninguno')
        : undefined,
      subsanable: typeof o.subsanable === 'boolean' ? o.subsanable : undefined,
      jurisprudencia: Array.isArray(o.jurisprudencia)
        ? o.jurisprudencia.map((j) => {
            const x = j as Record<string, unknown>;
            return {
              resolucion: String(x.resolucion ?? ''),
              criterio: String(x.criterio ?? ''),
              aplicable: String(x.aplicable ?? ''),
            };
          })
        : [],
      conflicto: o.conflicto ? String(o.conflicto) : undefined,
      resultado,
      confianza: ['alta', 'media', 'baja'].includes(String(o.confianza))
        ? (String(o.confianza) as 'alta' | 'media' | 'baja')
        : 'media',
      puntaje,
      puntajeMaximo: exigencia?.puntajeMaximo,
    };
    porId.set(ficha.id, ficha);
  }

  // Lo que el modelo no contestó no queda aprobado por omisión.
  for (const e of exigencias) {
    if (porId.has(e.id)) continue;
    porId.set(e.id, {
      id: e.id,
      requisito: e.requisito,
      reglaBases: e.reglaBases,
      documentoPresentado: '',
      evidencia: [],
      hallazgo:
        'El análisis no devolvió una ficha para este requisito. No se da por cumplido: requiere revisión del comité.',
      jurisprudencia: [],
      resultado: 'revision_humana',
      confianza: 'baja',
      puntaje: etapa === 'evaluacion' ? 0 : undefined,
      puntajeMaximo: e.puntajeMaximo,
    });
  }

  // En el orden en que las Bases los exigen, que es el del acta.
  return exigencias.map((e) => porId.get(e.id)!).filter(Boolean);
}

export interface OfertaEntrada {
  postor: string;
  texto: string;
}

/** Todo el procedimiento: las tres etapas de cada postor y la prelación. */
export async function evaluarProcedimiento(args: {
  textoBases: string;
  ofertas: OfertaEntrada[];
  /** Para no releer las Bases cuando ya se leyeron. */
  bases?: LecturaBases;
  /** Avisa por dónde va, para poder seguirlo desde fuera. */
  progreso?: (paso: string) => void;
}): Promise<{ bases: LecturaBases; postores: ResultadoPostor[] }> {
  const aviso = args.progreso ?? (() => {});

  aviso('Leyendo las Bases Integradas');
  const bases = args.bases ?? (await leerBases(args.textoBases));

  const exigenciasDe: Record<Etapa, ExigenciaBases[]> = {
    admision: bases.admision,
    calificacion: bases.calificacion,
    evaluacion: bases.factores,
  };

  const postores: ResultadoPostor[] = [];

  for (const oferta of args.ofertas) {
    const etapas: ResultadoEtapa[] = [];
    let cortado: { etapa: Etapa; motivo: string } | null = null;

    for (const etapa of ETAPAS) {
      if (cortado) {
        etapas.push({
          etapa,
          omitida: true,
          motivoOmision: cortado.motivo,
          fichas: [],
          resultado: 'no_cumple',
          subsanaciones: [],
          fundamento: cortado.motivo,
        });
        continue;
      }

      aviso(`${oferta.postor} · ${etapa}`);
      const resultado = await evaluarEtapa({
        etapa,
        exigencias: exigenciasDe[etapa],
        textoOferta: oferta.texto,
        nombrePostor: oferta.postor,
        textoBases: args.textoBases,
      });
      etapas.push(resultado);

      if (!avanza(resultado.resultado)) {
        cortado = {
          etapa,
          motivo: `No se evalúa: la oferta no superó la etapa de ${etapa}.`,
        };
      }
    }

    const evaluacion = etapas.find((e) => e.etapa === 'evaluacion' && !e.omitida);
    const ultimaSuperada = [...etapas].reverse().find((e) => !e.omitida);

    postores.push({
      postor: oferta.postor,
      etapas,
      puntajeTecnico: evaluacion?.puntaje,
      resultadoFinal: cortado
        ? `No admitido en ${cortado.etapa}`
        : ultimaSuperada?.resultado === 'subsanable'
          ? 'Sujeto a subsanación'
          : 'Evaluado',
    });
  }

  ordenarPorPuntaje(postores);
  return { bases, postores };
}
