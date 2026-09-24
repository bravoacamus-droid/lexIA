/**
 * El vocabulario del generador de documentos de ejecución contractual.
 *
 * Sale del documento de César «Generador de documentos administrativos»
 * (setiembre de 2026): quién emite (paso 1), qué hay que resolver
 * (paso 2), las doce carpetas del expediente contractual y los estados
 * de un documento. Todo lo demás —la matriz, el diagnóstico, la
 * redacción— habla con estas palabras.
 */

// ── Paso 1: quién emite ───────────────────────────────────────────────

export type Perfil =
  | 'area_usuaria'
  | 'dec'
  | 'asesoria_juridica'
  | 'aga'
  | 'titular'
  | 'supervisor'
  | 'defensa'
  | 'contratista';

export type RolDeUsuario = 'entity' | 'provider' | 'consultant';

export interface DefinicionDePerfil {
  clave: Perfil;
  nombre: string;
  /** Lo que se le enseña al elegirlo. */
  descripcion: string;
  /**
   * Lo que este perfil responde en su documento: la lista de la sección
   * 14 del documento de César. Va al modelo tal cual.
   */
  responde: string[];
  /** El enfoque de su documento (sección 20, «PERFILES»). */
  enfoque: string;
}

export const PERFILES: Record<Perfil, DefinicionDePerfil> = {
  area_usuaria: {
    clave: 'area_usuaria',
    nombre: 'Área Usuaria',
    descripcion: 'Sustento técnico, funcional y de finalidad pública: qué ocurrió, qué se necesita y qué se recomienda.',
    responde: [
      '¿Qué ocurrió?',
      '¿Qué necesidad existe?',
      '¿Qué prestación está involucrada?',
      '¿Cuál es el impacto técnico?',
      '¿Se afecta la finalidad pública?',
      '¿Cuál es la cuantificación?',
      '¿Qué se recomienda técnicamente?',
    ],
    enfoque: 'sustento técnico, funcional, operativo y de finalidad pública',
  },
  dec: {
    clave: 'dec',
    nombre: 'DEC',
    descripcion: 'Dependencia encargada de las contrataciones: análisis contractual, económico y procedimental.',
    responde: [
      '¿Qué contrato está involucrado?',
      '¿Cuál es el régimen aplicable?',
      '¿Se cumplen los requisitos contractuales?',
      '¿Cuál es el impacto económico?',
      '¿Qué cálculos corresponden?',
      '¿Qué procedimiento debe seguirse?',
      '¿Qué órgano es competente?',
      '¿Qué documentos deben incorporarse?',
    ],
    enfoque: 'análisis contractual, administrativo, económico y procedimental',
  },
  asesoria_juridica: {
    clave: 'asesoria_juridica',
    nombre: 'Asesoría Jurídica',
    descripcion: 'Legalidad, competencia, motivación y riesgos de la decisión.',
    responde: [
      '¿Cuál es el problema jurídico?',
      '¿Qué norma resulta aplicable?',
      '¿La figura es jurídicamente correcta?',
      '¿La autoridad es competente?',
      '¿Existe motivación suficiente?',
      '¿Existen riesgos de nulidad, controversia o responsabilidad?',
      '¿Es legalmente viable aprobar, denegar u observar?',
    ],
    enfoque: 'análisis de legalidad, competencia, motivación y riesgos',
  },
  aga: {
    clave: 'aga',
    nombre: 'AGA',
    descripcion: 'Autoridad de la gestión administrativa: el acto que aprueba, autoriza, deniega u observa.',
    responde: [
      '¿Existe competencia?',
      '¿Se cuenta con los informes necesarios?',
      '¿La decisión está motivada?',
      '¿Qué corresponde aprobar, autorizar, denegar u observar?',
      '¿Qué disposiciones deben ordenarse?',
    ],
    enfoque: 'acto de aprobación, autorización, denegatoria, observación o decisión que corresponda',
  },
  titular: {
    clave: 'titular',
    nombre: 'Titular de la Entidad',
    descripcion: 'Las decisiones reservadas al Titular, como los adicionales de obra por encima del 15 %.',
    responde: [
      '¿Existe competencia?',
      '¿Se cuenta con los informes necesarios?',
      '¿La decisión está motivada?',
      '¿Qué corresponde aprobar, autorizar, denegar u observar?',
      '¿Qué disposiciones deben ordenarse?',
    ],
    enfoque: 'acto de aprobación, autorización, denegatoria, observación o decisión que corresponda',
  },
  supervisor: {
    clave: 'supervisor',
    nombre: 'Supervisor / Inspector',
    descripcion: 'La opinión técnica especializada que exige la norma en obras y consultorías de obra.',
    responde: [
      '¿Qué se verificó en campo o en el cuaderno de incidencias?',
      '¿El hecho afecta la ruta crítica o el programa de ejecución?',
      '¿La solicitud está sustentada técnicamente?',
      '¿Qué cuantificación resulta de la verificación?',
      '¿Qué se opina y en qué plazo?',
    ],
    enfoque: 'opinión técnica especializada cuando sea exigible',
  },
  defensa: {
    clave: 'defensa',
    nombre: 'Defensa ante fiscalización',
    descripcion: 'La respuesta documentada a observaciones o requerimientos del órgano de control.',
    responde: [
      '¿Qué se observa o se requiere?',
      '¿Qué hechos están acreditados en el expediente?',
      '¿Qué norma respaldaba la actuación observada?',
      '¿Qué documentos sustentan cada punto?',
      '¿Qué no puede sostenerse con la documentación disponible?',
    ],
    enfoque: 'respuesta documentada a observaciones o requerimientos de control',
  },
  contratista: {
    clave: 'contratista',
    nombre: 'Contratista',
    descripcion: 'Solicitudes, descargos, apercibimientos y cartas del contratista ante la Entidad.',
    responde: [
      '¿Qué derecho u obligación contractual está en juego?',
      '¿Qué hecho lo origina y cómo se acredita?',
      '¿Qué plazo corre y cuándo vence?',
      '¿Qué se solicita exactamente a la Entidad?',
      '¿Qué ocurre si la Entidad no se pronuncia?',
    ],
    enfoque: 'solicitud o respuesta del contratista, sustentada en el contrato y la normativa',
  },
};

/**
 * Qué perfiles ve cada rol.
 *
 * La Entidad emite desde sus órganos. El proveedor, como contratista —y
 * también como supervisor, que es un contratista de consultoría de
 * obra—. El consultor asesora a los dos lados y ve todos. Así lo dice el
 * documento de estructura: «también puede ser utilizada por consultores
 * para brindar servicios especializados a entidades o proveedores».
 */
export const PERFILES_POR_ROL: Record<RolDeUsuario, Perfil[]> = {
  entity: ['area_usuaria', 'dec', 'asesoria_juridica', 'aga', 'titular', 'supervisor', 'defensa'],
  provider: ['contratista', 'supervisor'],
  consultant: ['area_usuaria', 'dec', 'asesoria_juridica', 'aga', 'titular', 'supervisor', 'defensa', 'contratista'],
};

// ── Paso 2: qué hay que resolver ─────────────────────────────────────

export type Actuacion =
  | 'diagnostico'
  | 'adicional'
  | 'reduccion'
  | 'ampliacion_plazo'
  | 'otra_modificacion'
  | 'complementario'
  | 'suspension'
  | 'resolucion'
  | 'penalidad'
  | 'reconocimiento_pago'
  | 'liquidacion'
  | 'otro_informe';

export const ACTUACIONES: Record<Actuacion, { nombre: string; descripcion: string }> = {
  diagnostico: {
    nombre: 'Diagnóstico contractual',
    descripcion: 'Qué está pasando en el contrato, qué figura corresponde y qué hacer.',
  },
  adicional: { nombre: 'Adicional', descripcion: 'Prestaciones adicionales al contrato.' },
  reduccion: { nombre: 'Reducción', descripcion: 'Reducción de prestaciones.' },
  ampliacion_plazo: { nombre: 'Ampliación de plazo', descripcion: 'Ampliación del plazo contractual.' },
  otra_modificacion: {
    nombre: 'Otra modificación',
    descripcion: 'Hecho sobreviniente, mejoras, sustitución de personal y otras modificaciones.',
  },
  complementario: { nombre: 'Contrato complementario', descripcion: 'Contratación complementaria.' },
  suspension: { nombre: 'Suspensión', descripcion: 'Suspensión del plazo de ejecución.' },
  resolucion: { nombre: 'Resolución', descripcion: 'Resolución del contrato y su apercibimiento.' },
  penalidad: { nombre: 'Penalidad', descripcion: 'Cálculo, aplicación o descargo de penalidades.' },
  reconocimiento_pago: {
    nombre: 'Reconocimiento de obligaciones / pagos',
    descripcion: 'Pagos pendientes, intereses y reconocimiento de obligaciones.',
  },
  liquidacion: { nombre: 'Liquidación', descripcion: 'Liquidación de obras y consultorías de obra.' },
  otro_informe: { nombre: 'Otro informe', descripcion: 'Cualquier otra actuación de la ejecución contractual.' },
};

export const ORDEN_ACTUACIONES: Actuacion[] = [
  'diagnostico',
  'adicional',
  'reduccion',
  'ampliacion_plazo',
  'otra_modificacion',
  'complementario',
  'suspension',
  'resolucion',
  'penalidad',
  'reconocimiento_pago',
  'liquidacion',
  'otro_informe',
];

// ── El contrato ──────────────────────────────────────────────────────

export type TipoContratacion = 'bienes' | 'servicios' | 'consultoria_obra' | 'obra';

export const TIPOS_CONTRATACION: Record<TipoContratacion, string> = {
  bienes: 'Bienes',
  servicios: 'Servicios',
  consultoria_obra: 'Consultoría de obras',
  obra: 'Ejecución de obras',
};

// ── El expediente: carpetas, clases y estados ────────────────────────

export const CARPETAS: Record<number, string> = {
  1: 'Documentos contractuales',
  2: 'Documentos técnicos',
  3: 'Solicitudes del contratista',
  4: 'Informes del Área Usuaria',
  5: 'Informes de la DEC',
  6: 'Informes legales',
  7: 'Resoluciones y actos administrativos',
  8: 'Actas y cronogramas',
  9: 'Documentos económicos',
  10: 'Documentos de supervisión',
  11: 'Documentos generados por LexIA',
  12: 'Documentos formalmente incorporados',
};

/**
 * Qué documento es. Lo decide la lectura y el usuario lo corrige. Cada
 * clase tiene su carpeta; «contiene» de la lectura resuelve el caso de
 * una resolución que trae dentro el informe técnico.
 */
export type ClaseDocumental =
  | 'contrato'
  | 'adenda'
  | 'orden'
  | 'bases'
  | 'oferta'
  | 'garantia'
  | 'consorcio'
  | 'tdr'
  | 'expediente_tecnico'
  | 'plan_trabajo'
  | 'solicitud_contratista'
  | 'informe_area_usuaria'
  | 'conformidad'
  | 'informe_dec'
  | 'informe_legal'
  | 'resolucion'
  | 'delegacion'
  | 'carta_entidad'
  | 'documento_control'
  | 'acta_suspension'
  | 'acta_reinicio'
  | 'acta_recepcion'
  | 'acta_entrega_terreno'
  | 'cronograma'
  | 'otra_acta'
  | 'certificacion_presupuestal'
  | 'valorizacion'
  | 'pago'
  | 'estructura_costos'
  | 'liquidacion'
  | 'informe_supervisor'
  | 'cuaderno_obra'
  | 'evidencia'
  | 'otro';

export const CLASES: Record<ClaseDocumental, { nombre: string; carpeta: number }> = {
  contrato: { nombre: 'Contrato', carpeta: 1 },
  adenda: { nombre: 'Adenda', carpeta: 1 },
  orden: { nombre: 'Orden de compra o de servicio', carpeta: 1 },
  bases: { nombre: 'Bases integradas', carpeta: 1 },
  oferta: { nombre: 'Oferta del contratista', carpeta: 1 },
  garantia: { nombre: 'Garantía', carpeta: 1 },
  consorcio: { nombre: 'Contrato de consorcio', carpeta: 1 },
  tdr: { nombre: 'Términos de referencia o especificaciones técnicas', carpeta: 2 },
  expediente_tecnico: { nombre: 'Expediente técnico', carpeta: 2 },
  plan_trabajo: { nombre: 'Plan de trabajo', carpeta: 2 },
  solicitud_contratista: { nombre: 'Solicitud o carta del contratista', carpeta: 3 },
  informe_area_usuaria: { nombre: 'Informe del Área Usuaria', carpeta: 4 },
  conformidad: { nombre: 'Conformidad de la prestación', carpeta: 4 },
  informe_dec: { nombre: 'Informe de la DEC', carpeta: 5 },
  informe_legal: { nombre: 'Informe legal', carpeta: 6 },
  resolucion: { nombre: 'Resolución', carpeta: 7 },
  delegacion: { nombre: 'Resolución de delegación de facultades', carpeta: 7 },
  carta_entidad: { nombre: 'Carta u oficio de la Entidad', carpeta: 7 },
  documento_control: { nombre: 'Documento del órgano de control', carpeta: 7 },
  acta_suspension: { nombre: 'Acta de suspensión', carpeta: 8 },
  acta_reinicio: { nombre: 'Acta de reinicio', carpeta: 8 },
  acta_recepcion: { nombre: 'Acta de recepción', carpeta: 8 },
  acta_entrega_terreno: { nombre: 'Acta de entrega de terreno', carpeta: 8 },
  cronograma: { nombre: 'Cronograma o programa de ejecución', carpeta: 8 },
  otra_acta: { nombre: 'Acta', carpeta: 8 },
  certificacion_presupuestal: { nombre: 'Certificación o previsión presupuestal', carpeta: 9 },
  valorizacion: { nombre: 'Valorización', carpeta: 9 },
  pago: { nombre: 'Comprobante o constancia de pago', carpeta: 9 },
  estructura_costos: { nombre: 'Estructura de costos o presupuesto', carpeta: 9 },
  liquidacion: { nombre: 'Liquidación', carpeta: 9 },
  informe_supervisor: { nombre: 'Informe u opinión del supervisor', carpeta: 10 },
  cuaderno_obra: { nombre: 'Cuaderno de obra o de incidencias', carpeta: 10 },
  evidencia: { nombre: 'Evidencia (fotografías, correos, otros)', carpeta: 3 },
  otro: { nombre: 'Otro documento', carpeta: 2 },
};

export const LISTA_CLASES = Object.keys(CLASES) as ClaseDocumental[];

/** Los seis estados de un documento (secciones 5 y 20). */
export type EstadoDocumento = 'original' | 'generado' | 'revisado' | 'firmado' | 'presentado' | 'incorporado';

export const ESTADOS_DOCUMENTO: Record<EstadoDocumento, string> = {
  original: 'Documento original cargado',
  generado: 'Generado por LexIA',
  revisado: 'Revisado',
  firmado: 'Firmado',
  presentado: 'Presentado',
  incorporado: 'Incorporado al expediente',
};
