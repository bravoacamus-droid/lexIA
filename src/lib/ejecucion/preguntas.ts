/**
 * «Una pregunta decisiva a la vez» (sección 8).
 *
 * Una pregunta solo se hace si su respuesta puede cambiar la figura, la
 * procedencia, el documento, la competencia o el análisis. Y nunca se
 * pregunta lo que ya dicen los documentos (sección 10): cada pregunta
 * sabe cuándo está resuelta sin preguntar.
 *
 * El orden es el de César para la ampliación de plazo: primero el tipo
 * de contrato —cambia todo—, después quién originó el pedido, después
 * el hecho y después si hay un documento que lo acredite.
 */
import type { Actuacion, Perfil, TipoContratacion } from './catalogo';
import type { Ficha, PreguntaDecisiva } from './tipos';

export interface EstadoParaPreguntar {
  actuacion: Actuacion;
  perfil: Perfil;
  tipo: TipoContratacion | null;
  regimen: 'ley_32069' | 'ley_30225' | 'por_determinar';
  ficha: Ficha;
  respuestas: Record<string, string>;
  /** Clases de documento presentes en el expediente (cargados). */
  clases: Set<string>;
  /** El modelo identificó el hecho que origina el caso. */
  hechoIdentificado: boolean;
  /** Hay un documento que acredita ese hecho. */
  hechoAcreditado: boolean;
  /** Montos que la lectura encontró, por concepto. */
  montos: Array<{ concepto: string; monto: number }>;
  hayFechaSolicitud: boolean;
}

interface Regla extends PreguntaDecisiva {
  para?: Actuacion[];
  /** Ya se sabe: no se pregunta. */
  resuelta: (e: EstadoParaPreguntar) => boolean;
}

const respondida = (e: EstadoParaPreguntar, id: string) => (e.respuestas[id] ?? '').trim().length > 0;
const hayMonto = (e: EstadoParaPreguntar, re: RegExp) => e.montos.some((m) => re.test(m.concepto));

const REGLAS: Regla[] = [
  {
    id: 'tipo_contratacion',
    campo: 'tipo_contratacion',
    texto: '¿El contrato corresponde a bienes, servicios, consultoría de obras o ejecución de obras?',
    porQue: 'La respuesta modifica todo el análisis: requisitos, plazos, límites y órgano competente son distintos.',
    cambia: ['figura', 'procedencia', 'documento', 'competencia'],
    opciones: ['Bienes', 'Servicios', 'Consultoría de obras', 'Ejecución de obras'],
    resuelta: (e) => e.tipo !== null,
  },
  {
    id: 'fecha_convocatoria',
    campo: 'fecha_convocatoria',
    texto: '¿En qué fecha se convocó el procedimiento de selección del que deriva el contrato?',
    porQue:
      'Decide el régimen: si se convocó antes del 22 de abril de 2025, el contrato se rige por la Ley N.° 30225 y su Reglamento, no por la Ley N.° 32069.',
    cambia: ['régimen normativo', 'análisis'],
    resuelta: (e) => e.regimen !== 'por_determinar' || respondida(e, 'fecha_convocatoria'),
  },
  // ── Ampliación de plazo ──
  {
    id: 'origen',
    para: ['ampliacion_plazo'],
    texto: '¿La solicitud de ampliación fue presentada por el contratista o fue identificada por la Entidad?',
    porQue: 'La ampliación solo procede a solicitud del contratista: si la identificó la Entidad, la figura es otra.',
    cambia: ['figura', 'documento'],
    opciones: ['Presentada por el contratista', 'Identificada por la Entidad'],
    resuelta: (e) => e.perfil === 'contratista' || e.clases.has('solicitud_contratista') || respondida(e, 'origen'),
  },
  {
    id: 'hecho',
    para: ['ampliacion_plazo', 'suspension', 'otra_modificacion', 'resolucion'],
    texto: '¿Cuál es el hecho concreto que habría impedido cumplir el plazo o que origina el caso?',
    porQue: 'El hecho decide la causal y, con ella, si la figura procede.',
    cambia: ['figura', 'procedencia'],
    resuelta: (e) => e.hechoIdentificado || respondida(e, 'hecho'),
  },
  {
    id: 'evidencia',
    para: ['ampliacion_plazo', 'suspension', 'otra_modificacion', 'resolucion', 'diagnostico', 'otro_informe'],
    texto: '¿Existe un documento que acredite ese hecho?',
    porQue:
      'Si existe, conviene adjuntarlo: pasa de declarado a acreditado. Si no existe, no se exige: el diagnóstico será preliminar y el informe lo advertirá.',
    cambia: ['procedencia', 'análisis'],
    opciones: ['Sí', 'No'],
    siEsSi: 'Adjunta el documento que acredita el hecho (carta, acta, asiento del cuaderno, informe, fotografías).',
    resuelta: (e) => e.hechoAcreditado || respondida(e, 'evidencia'),
  },
  {
    id: 'fecha_fin_hecho',
    para: ['ampliacion_plazo'],
    texto: '¿En qué fecha terminó el hecho que generó el atraso (o se notificó la aprobación del adicional)?',
    porQue: 'Desde esa fecha corren los diez días hábiles para solicitar la ampliación: una solicitud tardía se tiene por no presentada.',
    cambia: ['procedencia', 'plazo'],
    resuelta: (e) => !e.hayFechaSolicitud || respondida(e, 'fecha_fin_hecho'),
  },
  // ── Adicional ──
  {
    id: 'monto_adicional',
    para: ['adicional'],
    texto: '¿Cuál es el monto de la prestación adicional?',
    porQue: 'El porcentaje sobre el contrato original decide si procede y quién es competente para aprobarlo.',
    cambia: ['procedencia', 'competencia', 'monto'],
    resuelta: (e) => respondida(e, 'monto_adicional'),
  },
  {
    id: 'adicionales_previos',
    para: ['adicional'],
    texto: '¿Se aprobaron antes otros adicionales? Indica el monto acumulado, restando los deductivos vinculados (0 si no hubo).',
    porQue: 'El límite se mide sobre el acumulado, no sobre el adicional aislado.',
    cambia: ['procedencia', 'competencia'],
    resuelta: (e) => respondida(e, 'adicionales_previos'),
  },
  // ── Reducción ──
  {
    id: 'monto_reduccion',
    para: ['reduccion'],
    texto: '¿Cuál es el monto de las prestaciones que se reducen?',
    porQue: 'La reducción no puede superar el 25 % del monto del contrato original.',
    cambia: ['procedencia', 'monto'],
    resuelta: (e) => respondida(e, 'monto_reduccion') || hayMonto(e, /reduc/i),
  },
  // ── Complementario ──
  {
    id: 'monto_complementario',
    para: ['complementario'],
    texto: '¿Cuál es el monto previsto de la contratación complementaria?',
    porQue: 'No puede superar el 30 % del monto del contrato original.',
    cambia: ['procedencia', 'monto'],
    resuelta: (e) => respondida(e, 'monto_complementario') || hayMonto(e, /complementari/i),
  },
  // ── Suspensión ──
  {
    id: 'suspension_o_reinicio',
    para: ['suspension'],
    texto: '¿Se analiza la suspensión del plazo o el reinicio de una suspensión ya acordada?',
    porQue: 'Cambia el documento: el acta de suspensión o el acta de reinicio, y qué hay que acreditar.',
    cambia: ['documento'],
    opciones: ['La suspensión', 'El reinicio'],
    resuelta: (e) => respondida(e, 'suspension_o_reinicio') || (e.clases.has('acta_suspension') && e.clases.has('acta_reinicio')),
  },
  // ── Resolución ──
  {
    id: 'obligacion_incumplida',
    para: ['resolucion'],
    texto: '¿Qué obligación esencial incumplió la Entidad?',
    porQue: 'Cambia lo que el contratista debe acreditar: en la falta de pago, la conformidad y el vencimiento del plazo de pago.',
    cambia: ['procedencia', 'documento'],
    opciones: ['Falta de pago', 'Otra obligación esencial'],
    resuelta: (e) => e.perfil !== 'contratista' || respondida(e, 'obligacion_incumplida'),
  },
  {
    id: 'etapa_resolucion',
    para: ['resolucion'],
    texto: '¿Ya se notificó el requerimiento bajo apercibimiento y venció su plazo sin cumplimiento?',
    porQue: 'Si no, lo que corresponde ahora es el apercibimiento; si sí, la carta de resolución.',
    cambia: ['documento', 'procedencia'],
    opciones: ['No: corresponde el apercibimiento', 'Sí: corresponde la resolución'],
    resuelta: (e) => respondida(e, 'etapa_resolucion'),
  },
  // ── Penalidad ──
  {
    id: 'entregable',
    para: ['penalidad'],
    texto: '¿El atraso es de todo el contrato o de un entregable?',
    porQue: 'Si hay entregables cuantificables, la penalidad se calcula con el monto y el plazo del entregable atrasado.',
    cambia: ['cálculo', 'monto'],
    opciones: ['Todo el contrato', 'Un entregable'],
    resuelta: (e) => respondida(e, 'entregable'),
  },
  {
    id: 'monto_entregable',
    para: ['penalidad'],
    texto: '¿Cuál es el monto del entregable atrasado?',
    porQue: 'Es el monto de la fórmula de la penalidad.',
    cambia: ['cálculo', 'monto'],
    resuelta: (e) => !/entregable/i.test(e.respuestas.entregable ?? '') || respondida(e, 'monto_entregable'),
  },
  {
    id: 'plazo_entregable',
    para: ['penalidad'],
    texto: '¿Cuál es el plazo del entregable atrasado, en días?',
    porQue: 'Es el plazo de la fórmula de la penalidad y decide el factor F.',
    cambia: ['cálculo'],
    resuelta: (e) => !/entregable/i.test(e.respuestas.entregable ?? '') || respondida(e, 'plazo_entregable'),
  },
  {
    id: 'dias_atraso',
    para: ['penalidad'],
    texto: '¿Cuántos días de atraso se imputan al contratista?',
    porQue: 'Sin los días de atraso no hay penalidad que calcular. No deben contarse los días en que la Entidad excedió su plazo para dar la conformidad.',
    cambia: ['cálculo', 'monto'],
    resuelta: (e) => respondida(e, 'dias_atraso'),
  },
  // ── Reconocimiento de obligaciones ──
  {
    id: 'origen_obligacion',
    para: ['reconocimiento_pago'],
    texto: '¿La obligación deriva de un contrato con conformidad, o de una prestación ejecutada sin contrato o fuera de él?',
    porQue: 'Cambia la figura: la primera es un pago contractual con plazo e intereses; la segunda no se rige por las reglas de pago del contrato.',
    cambia: ['figura', 'procedencia'],
    opciones: ['De un contrato, con conformidad', 'De una prestación sin contrato o fuera de él'],
    resuelta: (e) => respondida(e, 'origen_obligacion'),
  },
  // ── Competencia ──
  {
    id: 'delegacion',
    texto: '¿Quien suscribirá el acto actúa por delegación de facultades?',
    porQue: 'Si actúa por delegación, hay que verificar la resolución que se la otorga: la competencia es determinante para la validez del acto.',
    cambia: ['competencia'],
    opciones: ['Sí', 'No, es el titular de la competencia'],
    resuelta: (e) => !(e.perfil === 'aga' || e.perfil === 'titular') || e.clases.has('delegacion') || respondida(e, 'delegacion'),
  },
];

/**
 * Las preguntas que piden un dato —una fecha, un monto, un número de
 * días— y no una decisión. Ese dato puede estar ya en un documento (la
 * carta del contratista dice cuándo terminó el hecho): el diagnóstico lo
 * busca allí primero, con su cita, y solo si no está se pregunta.
 */
export const DATOS_DETERMINANTES: Record<string, { formato: 'fecha' | 'monto' | 'numero' }> = {
  fecha_fin_hecho: { formato: 'fecha' },
  monto_adicional: { formato: 'monto' },
  adicionales_previos: { formato: 'monto' },
  monto_reduccion: { formato: 'monto' },
  monto_complementario: { formato: 'monto' },
  dias_atraso: { formato: 'numero' },
  monto_entregable: { formato: 'monto' },
  plazo_entregable: { formato: 'numero' },
};

/** Los datos determinantes de una actuación, con la pregunta que los pide. */
export function datosDeterminantes(actuacion: Actuacion): Array<{ id: string; texto: string; formato: 'fecha' | 'monto' | 'numero' }> {
  return REGLAS.filter((r) => DATOS_DETERMINANTES[r.id] && (!r.para || r.para.includes(actuacion))).map((r) => ({
    id: r.id,
    texto: r.texto,
    formato: DATOS_DETERMINANTES[r.id].formato,
  }));
}

/** La siguiente pregunta, o null si no hay nada decisivo por preguntar. */
export function siguientePregunta(e: EstadoParaPreguntar, delModelo?: PreguntaDecisiva | null): PreguntaDecisiva | null {
  for (const r of REGLAS) {
    if (r.para && !r.para.includes(e.actuacion)) continue;
    if (r.resuelta(e)) continue;
    const { para: _p, resuelta: _r, ...pregunta } = r;
    void _p;
    void _r;
    return pregunta;
  }
  if (delModelo && !respondida(e, delModelo.id)) return delModelo;
  return null;
}

/** El tipo de contratación a partir de una respuesta o de un valor de la ficha. */
export function tipoDesdeTexto(v: string | null | undefined): TipoContratacion | null {
  if (!v) return null;
  const s = v.toLowerCase();
  // El orden importa: «adquisición de bienes para la obra…» es bienes.
  if (/consultor[ií]a\s+de\s+obras?|consultoria_obra/.test(s)) return 'consultoria_obra';
  if (/ejecuci[oó]n\s+de\s+obras?/.test(s)) return 'obra';
  if (/\bbien(es)?\b/.test(s)) return 'bienes';
  if (/servicio|consultor[ií]a/.test(s)) return 'servicios';
  if (/^obras?$/.test(s.trim())) return 'obra';
  return null;
}
