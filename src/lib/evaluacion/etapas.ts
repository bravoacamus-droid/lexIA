/**
 * Las tres etapas de la evaluación de ofertas, y el orden que las ata.
 *
 * POR QUÉ EXISTE
 *
 * César lo explicó así el 22/08/2026: "para la evaluación de servicios
 * se tiene que pasar por tres etapas: la etapa de admisión, la etapa de
 * calificación y la etapa de evaluación. Si pasaste la etapa de
 * admisión, la siguiente etapa será la calificación, y si pasas la
 * calificación será la etapa de evaluación, donde te otorgan puntaje, y
 * el que tiene mayor puntaje es quien es el ganador".
 *
 * Lo que había hasta ahora era una sola pasada de requisitos de
 * calificación, sin etapas, sin puntaje y sin acta.
 *
 * LA REGLA QUE MANDA
 *
 * Las etapas no se mezclan. Es la regla III del prompt de admisión de
 * César, y no es una preferencia de diseño: "un documento presentado
 * para admisión no podrá utilizarse automáticamente para calificación o
 * evaluación. Un incumplimiento de calificación no puede ser utilizado
 * para declarar no admitida una oferta. Cada consecuencia debe
 * corresponder a la etapa en la que jurídicamente se produce".
 *
 * Por eso cada etapa se evalúa en su propia llamada, con su propio
 * prompt y sus propios criterios, y solo llega a ella quien pasó la
 * anterior.
 */

export type Etapa = 'admision' | 'calificacion' | 'evaluacion';

export const ETAPAS: Etapa[] = ['admision', 'calificacion', 'evaluacion'];

export const NOMBRE_ETAPA: Record<Etapa, string> = {
  admision: 'Admisión',
  calificacion: 'Requisitos de calificación',
  evaluacion: 'Factores de evaluación técnica',
};

/**
 * Cómo puede terminar un postor en una etapa.
 *
 * `revision_humana` no es un adorno: sale de la regla XV del prompt de
 * César. Cuando hay conflicto jurisprudencial real o incertidumbre
 * jurídica, el sistema no debe elegir por su cuenta.
 */
export type Resultado =
  | 'cumple'
  | 'subsanable'
  | 'no_cumple'
  | 'revision_humana';

/** Cómo se llama ese resultado en cada etapa, para el acta. */
export const ETIQUETA_RESULTADO: Record<Etapa, Record<Resultado, string>> = {
  admision: {
    cumple: 'Admitida',
    subsanable: 'Sujeta a subsanación',
    no_cumple: 'No admitida',
    revision_humana: 'Revisión humana',
  },
  calificacion: {
    cumple: 'Calificado',
    subsanable: 'Sujeto a subsanación',
    no_cumple: 'Descalificado',
    revision_humana: 'Revisión humana',
  },
  evaluacion: {
    cumple: 'Evaluado',
    subsanable: 'Sujeto a subsanación',
    no_cumple: 'Sin puntaje',
    revision_humana: 'Revisión humana',
  },
};

/**
 * ¿Sigue el postor a la etapa siguiente?
 *
 * Un defecto subsanable no descarta: el Reglamento da plazo para
 * subsanar, y el acta de César tiene un apartado entero para ello en
 * cada etapa. Lo que corta el paso es el incumplimiento firme.
 *
 * La revisión humana tampoco corta: deja el expediente en manos del
 * comité, que es quien decide. Cortar por nuestra cuenta sería
 * exactamente lo que el prompt prohíbe.
 */
export function avanza(resultado: Resultado): boolean {
  return resultado !== 'no_cumple';
}

/** Evidencia de dónde sale una conclusión. Regla X del prompt. */
export interface Evidencia {
  /** Documento donde consta. */
  documento: string;
  /** Página o folio, cuando se puede precisar. */
  ubicacion?: string;
  /** Lo que dice, en sus palabras. */
  cita: string;
}

/**
 * La ficha que el prompt de César exige por cada requisito (apartado XX).
 *
 * No es un checklist: cada campo responde a una pregunta distinta, y la
 * regla XXII prohíbe una decisión desfavorable sin mostrar el camino
 * entero —base, norma, documento, evidencia, defecto, jurisprudencia,
 * análisis, consecuencia—.
 */
export interface FichaRequisito {
  /** Id del requisito en el catálogo, cuando corresponde a uno conocido. */
  id: string;
  /** Denominación exacta del requisito. */
  requisito: string;
  /** Qué exigen las Bases Integradas, con su numeral. */
  reglaBases: string;
  /** Norma que lo respalda. */
  norma?: string;
  /** Qué presentó el postor. */
  documentoPresentado: string;
  evidencia: Evidencia[];
  /** Lo hallado al comparar lo exigido con lo presentado. */
  hallazgo: string;
  /** Formal o sustancial. La distinción decide casi todo. */
  naturalezaDefecto?: 'formal' | 'sustancial' | 'ninguno';
  subsanable?: boolean;
  /** Casos del Tribunal aplicados, y por qué son aplicables. */
  jurisprudencia: Array<{ resolucion: string; criterio: string; aplicable: string }>;
  /** Divergencias detectadas entre criterios. */
  conflicto?: string;
  resultado: Resultado;
  confianza: 'alta' | 'media' | 'baja';
  /** Solo en la etapa de evaluación. */
  puntaje?: number;
  puntajeMaximo?: number;
}

/** Lo que sale de una etapa para un postor. */
export interface ResultadoEtapa {
  etapa: Etapa;
  /** No evaluada porque no pasó la etapa anterior. */
  omitida?: boolean;
  motivoOmision?: string;
  fichas: FichaRequisito[];
  resultado: Resultado;
  /** Suma de puntajes; solo en evaluación. */
  puntaje?: number;
  /** Lo que hay que pedirle al postor, si algo es subsanable. */
  subsanaciones: string[];
  /** Una o dos frases con el porqué del resultado. */
  fundamento: string;
}

/** Todo lo de un postor, etapa por etapa. */
export interface ResultadoPostor {
  postor: string;
  /** Integrantes, cuando es consorcio. */
  consorcio?: Array<{ nombre: string; participacion?: string }>;
  etapas: ResultadoEtapa[];
  /** Puntaje técnico total. */
  puntajeTecnico?: number;
  /** Orden de prelación; 1 es el ganador. */
  prelacion?: number;
  /** Dónde se quedó: la última etapa que superó. */
  resultadoFinal: string;
}

/**
 * El resultado del postor en una etapa a partir de sus fichas.
 *
 * Manda lo peor: un solo requisito incumplido deja fuera la oferta, por
 * muchos que estén bien. Es como funciona la evaluación y como está
 * redactada la regla XXI del prompt.
 */
export function resultadoDeFichas(fichas: FichaRequisito[]): Resultado {
  if (fichas.some((f) => f.resultado === 'no_cumple')) return 'no_cumple';
  if (fichas.some((f) => f.resultado === 'revision_humana')) return 'revision_humana';
  if (fichas.some((f) => f.resultado === 'subsanable')) return 'subsanable';
  return 'cumple';
}

/**
 * Ordena a los postores por puntaje y les pone el número de prelación.
 *
 * Solo entran los que llegaron a la evaluación técnica con puntaje. El
 * empate se deja como empate —dos primeros— porque desempatarlo tiene
 * reglas propias (sorteo, criterios de las bases) que no le tocan
 * decidir a un programa.
 */
export function ordenarPorPuntaje(postores: ResultadoPostor[]): ResultadoPostor[] {
  const conPuntaje = postores.filter((p) => typeof p.puntajeTecnico === 'number');
  const ordenados = [...conPuntaje].sort((a, b) => (b.puntajeTecnico ?? 0) - (a.puntajeTecnico ?? 0));
  let posicion = 0;
  let anterior: number | null = null;
  ordenados.forEach((p, i) => {
    if (anterior === null || p.puntajeTecnico !== anterior) posicion = i + 1;
    p.prelacion = posicion;
    anterior = p.puntajeTecnico ?? null;
  });
  return postores;
}
