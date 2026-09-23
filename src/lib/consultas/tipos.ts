/**
 * Los dos documentos de la etapa de consultas y observaciones.
 *
 * César entregó el 23/09/2026 dos modelos reales de un concurso público
 * de mantenimiento vial:
 *
 *   · **Formulación de consultas y/u observaciones** — lo que presenta un
 *     participante. Una tabla con ocho columnas y, en la del cuerpo, un
 *     escrito con estructura fija.
 *   · **Absolución de consultas y/u observaciones** — lo que responde el
 *     comité de selección sobre esa misma tabla, añadiendo la columna de
 *     lo que se incorporará a las bases integradas.
 *
 * ## Por qué esto no es texto libre
 *
 * El cuerpo de cada entrada **no** es un párrafo: es un escrito con
 * partes nombradas. Una consulta lleva referencia y pregunta; una
 * observación lleva sustento fáctico, sustento jurídico con sus normas
 * y solicitud; una absolución empieza por el veredicto, enumera sus
 * fundamentos con rótulo y cierra con «En consecuencia…».
 *
 * Si se guardara como un solo texto, ni la pantalla podría enseñarlo
 * ordenado ni el Word saldría con la estructura del modelo, y es
 * exactamente lo que César viene señalando: «los formatos que están en
 * el software aún no están de acuerdo a la estructura alcanzada». Por
 * eso cada parte se guarda aparte y el documento se arma a partir de
 * ellas, igual que el requerimiento se arma desde su plantilla.
 */

/**
 * Una cita que el auditor no pudo respaldar.
 *
 * No se borra del escrito: se marca, y la fila pasa a «Requieren
 * revisión» para que lo mire un abogado. Ver `normativa/citas.ts`.
 */
export interface AvisoDeCita {
  cita: string;
  motivo: string;
}

export type TipoFormulacion = 'consulta' | 'observacion';

/** Sobre qué parte de las bases recae la consulta u observación. */
export interface Ubicacion {
  /** Las bases tienen sección general y sección específica. */
  seccion: 'General' | 'Específica';
  /** «4.4.1», «3.5.1», «19.» — tal como lo numeran las bases. */
  numeral: string;
  /** «A.», «B.1.2.» — vacío cuando el numeral no se desagrega. */
  literal: string;
  /** El folio de las bases. Se cita como página. */
  pagina: string;
}

/**
 * Un tramo del escrito con su rótulo.
 *
 * Los rótulos no se inventan: son los del modelo —«Referencia»,
 * «Consulta», «1. Sustento Fáctico», «2. Sustento Jurídico»,
 * «3. Solicitud»— y se reproducen tal cual.
 */
export interface Tramo {
  /** `null` cuando el tramo va sin rótulo, como el cierre. */
  rotulo: string | null;
  parrafos: string[];
  /**
   * Las normas del sustento jurídico y los fundamentos de una
   * absolución van en lista, cada uno con su nombre en negrita.
   */
  vinetas?: Array<{ titulo?: string; texto: string }>;
}

/** Una consulta u observación presentada por un participante. */
export interface Formulacion {
  id: string;
  numero: number;
  tipo: TipoFormulacion;
  /**
   * Quién la presenta. En la formulación es siempre el mismo y vive en
   * el encabezado; en la absolución cada fila viene de un postor
   * distinto, y la tabla del mockup lo lista por fila.
   */
  participante: string;
  /** El rótulo corto de la tabla: «Experiencia del personal clave». */
  tema: string;
  ubicacion: Ubicacion;
  /** Referencia + consulta, o referencia + los tres sustentos. */
  cuerpo: Tramo[];
  /**
   * «Artículo y norma que se vulnera». Solo en observaciones: una
   * consulta pide una aclaración, no denuncia una infracción.
   */
  normaVulnerada: string;
  /** Citas de este escrito que el auditor no pudo respaldar. */
  avisos: AvisoDeCita[];
}

/** Qué decide el comité sobre una formulación. */
export type Decision = 'acoge' | 'acoge_parcialmente' | 'no_acoge' | 'aclara';

export const TEXTO_DECISION: Record<Decision, string> = {
  acoge: 'SE ACOGE',
  acoge_parcialmente: 'SE ACOGE PARCIALMENTE',
  no_acoge: 'NO SE ACOGE',
  aclara: 'SE ACLARA',
};

/** La respuesta del comité a una formulación. */
export interface Absolucion {
  id: string;
  /** Apunta a la formulación por su número, como en el modelo. */
  numero: number;
  decision: Decision;
  /** Los fundamentos, cada uno con su rótulo: «Facultad Discrecional…». */
  fundamentos: Tramo[];
  /** El cierre: «En consecuencia, se ratifica…». */
  conclusion: string;
  /**
   * La última columna del modelo: qué se incorpora a las bases
   * integradas. Vacío cuando no se acoge y nada cambia.
   */
  precisionEnBases: string;
  /** Citas de la absolución que el auditor no pudo respaldar. */
  avisos: AvisoDeCita[];
}

/** La cabecera que comparten los dos documentos. */
export interface Encabezado {
  /** «CONCURSO PÚBLICO PARA SERVICIO DE MANTENIMIENTO VIAL». */
  procedimiento: string;
  /** «Nº 006-2026-GRA-DRTCA/CS-1». */
  numeroProcedimiento: string;
  /** La denominación completa del objeto de la convocatoria. */
  objeto: string;
  /** Quién presenta, en la formulación. Vacío en la absolución. */
  participante?: string;
}

/** El documento entero, en cualquiera de sus dos caras. */
export interface Pliego {
  encabezado: Encabezado;
  formulaciones: Formulacion[];
  /** Presentes solo en la absolución, emparejadas por número. */
  absoluciones: Absolucion[];
}

/** Los rótulos del escrito de una consulta, en su orden. */
export const TRAMOS_DE_CONSULTA = ['Referencia', 'Consulta'] as const;

/** Los rótulos del escrito de una observación, en su orden. */
export const TRAMOS_DE_OBSERVACION = [
  'Referencia',
  '1. Sustento Fáctico',
  '2. Sustento Jurídico',
  '3. Solicitud',
] as const;

/** Las columnas de la tabla, en el orden del modelo. */
export const COLUMNAS_FORMULACION = [
  'N.°',
  'Tipo Formulación',
  'Sección',
  'Numeral',
  'Literal',
  'Página',
  'Consulta u Observación',
  'Artículo y norma que se vulnera (en el caso de observaciones)',
] as const;

export const COLUMNAS_ABSOLUCION = [
  'N.°',
  'Tipo Formulación',
  'Sección',
  'Numeral',
  'Literal',
  'Página',
  'Consulta u Observación',
  'Precisión de aquello que se incorporará en las Bases a integrarse, de corresponder',
] as const;

/** Un tramo vacío no aporta nada al documento. */
export function tramoTieneTexto(t: Tramo): boolean {
  return (
    t.parrafos.some((p) => p.trim().length > 0) ||
    (t.vinetas ?? []).some((v) => v.texto.trim().length > 0)
  );
}

/**
 * Qué le falta a una entrada para poder presentarse.
 *
 * Se comprueba contra el modelo, no contra el gusto: una observación sin
 * sustento jurídico o sin solicitud no es una observación, y el comité
 * la tiene por no presentada.
 */
export function faltasDeFormulacion(f: Formulacion): string[] {
  const faltas: string[] = [];
  if (!f.ubicacion.numeral.trim()) faltas.push('el numeral de las bases');
  if (!f.ubicacion.pagina.trim()) faltas.push('el folio');

  const rotulos = f.cuerpo.filter(tramoTieneTexto).map((t) => (t.rotulo ?? '').toLowerCase());
  const exigidos =
    f.tipo === 'consulta' ? TRAMOS_DE_CONSULTA : TRAMOS_DE_OBSERVACION;
  for (const r of exigidos) {
    if (!rotulos.some((x) => x.includes(r.toLowerCase().replace(/^\d+\.\s*/, '')))) {
      faltas.push(`el tramo «${r}»`);
    }
  }
  if (f.tipo === 'observacion' && !f.normaVulnerada.trim()) {
    faltas.push('el artículo y la norma que se vulnera');
  }
  for (const a of f.avisos ?? []) faltas.push(`la cita «${a.cita}»`);
  return faltas;
}

/** Lo mismo para una absolución. */
export function faltasDeAbsolucion(a: Absolucion): string[] {
  const faltas: string[] = [];
  if (a.fundamentos.filter(tramoTieneTexto).length === 0) faltas.push('los fundamentos');
  if (!a.conclusion.trim()) faltas.push('la conclusión');
  if (
    (a.decision === 'acoge' || a.decision === 'acoge_parcialmente') &&
    !a.precisionEnBases.trim()
  ) {
    faltas.push('qué se incorpora a las bases integradas');
  }
  for (const aviso of a.avisos ?? []) faltas.push(`la cita «${aviso.cita}»`);
  return faltas;
}
