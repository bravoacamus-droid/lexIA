/**
 * Las formas de lo que se guarda en el expediente: la ficha maestra, la
 * lectura de cada documento, el análisis de cada actuación, el borrador
 * y su auditoría.
 */
import type { Actuacion, ClaseDocumental, EstadoDocumento, Perfil, TipoContratacion } from './catalogo';

// ── La ficha maestra del contrato (fase 2, «Reconstrucción») ─────────

export type CampoFicha =
  | 'entidad'
  | 'contratista'
  | 'ruc_contratista'
  | 'numero_contrato'
  | 'objeto'
  | 'tipo_contratacion'
  | 'procedimiento'
  | 'fecha_convocatoria'
  | 'fecha_suscripcion'
  | 'fecha_inicio'
  | 'plazo_dias'
  | 'fecha_fin'
  | 'monto_original'
  | 'monto_vigente'
  | 'sistema_entrega'
  | 'modalidad_pago'
  | 'supervision';

export const CAMPOS_FICHA: Record<CampoFicha, { nombre: string; formato?: 'fecha' | 'monto' | 'numero' }> = {
  entidad: { nombre: 'Entidad' },
  contratista: { nombre: 'Contratista' },
  ruc_contratista: { nombre: 'RUC del contratista' },
  numero_contrato: { nombre: 'Contrato' },
  objeto: { nombre: 'Objeto' },
  tipo_contratacion: { nombre: 'Tipo de contratación' },
  procedimiento: { nombre: 'Procedimiento de selección' },
  fecha_convocatoria: { nombre: 'Fecha de convocatoria', formato: 'fecha' },
  fecha_suscripcion: { nombre: 'Fecha de suscripción', formato: 'fecha' },
  fecha_inicio: { nombre: 'Inicio del plazo', formato: 'fecha' },
  plazo_dias: { nombre: 'Plazo de ejecución (días)', formato: 'numero' },
  fecha_fin: { nombre: 'Fin del plazo vigente', formato: 'fecha' },
  monto_original: { nombre: 'Monto del contrato original', formato: 'monto' },
  monto_vigente: { nombre: 'Monto vigente', formato: 'monto' },
  sistema_entrega: { nombre: 'Sistema de entrega' },
  modalidad_pago: { nombre: 'Modalidad de pago' },
  supervision: { nombre: 'Supervisión' },
};

export const LISTA_CAMPOS = Object.keys(CAMPOS_FICHA) as CampoFicha[];

export interface DatoDeFicha {
  valor: string;
  /** De qué documento salió, con la frase que lo dice. */
  documentoId?: string;
  documento?: string;
  cita?: string;
  /** Lo escribió o lo corrigió el usuario: es una declaración. */
  delUsuario?: boolean;
}

export type Ficha = Partial<Record<CampoFicha, DatoDeFicha>>;

/** Dos documentos que dicen cosas distintas del mismo dato. */
export interface Contradiccion {
  descripcion: string;
  campo?: CampoFicha;
  valores?: Array<{ valor: string; documento: string; cita?: string }>;
}

// ── La lectura de un documento ───────────────────────────────────────

export interface LecturaDeDocumento {
  clase: ClaseDocumental;
  titulo: string;
  numero?: string | null;
  /** AAAA-MM-DD */
  fecha?: string | null;
  emisor?: string | null;
  resumen: string;
  ficha: Array<{ campo: CampoFicha; valor: string; cita: string }>;
  hechos: Array<{ fecha?: string | null; hecho: string; cita: string }>;
  montos: Array<{ concepto: string; monto: number; cita: string }>;
  /** Otros documentos que vienen dentro: una resolución con su informe. */
  contiene: ClaseDocumental[];
  /** Citas que el modelo dio y no están en el documento: se descartan. */
  descartadas?: number;
}

export interface DocumentoDelExpediente {
  id: string;
  nombre: string;
  ruta: string | null;
  origen: 'cargado' | 'lexia';
  estado: EstadoDocumento;
  carpeta: number | null;
  clase: ClaseDocumental | null;
  lectura: 'pendiente' | 'leyendo' | 'leido' | 'error';
  error: string | null;
  texto: string | null;
  paginas: number | null;
  datos: Partial<LecturaDeDocumento>;
  generacion: DatosDeGeneracion | null;
  formalizacion: DatosDeFormalizacion | null;
  actuacion_id: string | null;
  version_de: string | null;
  created_at: string;
}

/** Sección 6: lo que lleva un documento creado por LexIA. */
export interface DatosDeGeneracion {
  fecha: string;
  usuario: string;
  perfil: Perfil;
  actuacion: Actuacion;
  fuentes: string[];
  version: number;
  nivel: NivelDeSalida;
}

export interface DatosDeFormalizacion {
  numero?: string;
  fecha?: string;
  fechaPresentacion?: string;
  firmante?: string;
  expediente?: string;
  estadoTramite?: string;
}

// ── El análisis de una actuación ─────────────────────────────────────

export type Nivel = 1 | 2 | 3;

export type EstadoRequisito = 'acreditado' | 'declarado' | 'falta' | 'no_aplica';

export interface RequisitoEvaluado {
  id: string;
  texto: string;
  nivel: Nivel;
  estado: EstadoRequisito;
  porQue: string;
  base?: string;
  /** El documento que lo acredita. */
  documento?: string;
  /** Lo que respondió el usuario, si lo declaró. */
  declaracion?: string;
}

export type EstadoCondicion = 'cumple' | 'no_cumple' | 'no_acreditado' | 'declarado' | 'no_aplica';

export interface CondicionEvaluada {
  id: string;
  texto: string;
  base: string;
  estado: EstadoCondicion;
  sustento: string;
  evidencia: Array<{ documento: string; cita: string }>;
  /** La calculó el sistema, no el modelo. */
  calculada?: boolean;
}

export interface HechoIdentificado {
  hecho: string;
  fecha?: string | null;
  estado: 'acreditado' | 'declarado' | 'no_acreditado';
  documento?: string;
  cita?: string;
}

export type SemaforoProcedencia = 'verde' | 'amarillo' | 'naranja' | 'rojo' | 'negro';
export type SemaforoInformacion = 'verde' | 'amarillo' | 'naranja' | 'rojo';

export type NivelDeSalida = 'diagnostico' | 'borrador_condicionado' | 'revision_final';

export interface PreguntaDecisiva {
  id: string;
  texto: string;
  porQue: string;
  /** Qué puede cambiar la respuesta: figura, procedencia, documento… */
  cambia: string[];
  opciones?: string[];
  /** Si la respuesta es «sí», qué documento pedir. */
  siEsSi?: string;
  /** Dato de la ficha que resuelve. */
  campo?: CampoFicha;
}

export interface Respuesta {
  preguntaId: string;
  pregunta: string;
  respuesta: string;
  fecha: string;
}

export interface Calculo {
  concepto: string;
  resultado: string;
  detalle: string;
  base: string;
  /** Si el resultado impide la actuación. */
  impide?: boolean;
  /** Valores que el documento puede citar sin que la auditoría los marque. */
  valores?: string[];
  /** Una advertencia para quien revisa; no va al documento. */
  aviso?: string;
}

export interface PasoDeLaCadena {
  perfil: Perfil | 'contratista' | 'supervisor';
  documento: string;
  /** Vacío si siempre corresponde; si no, cuándo. */
  condicion?: string;
  base?: string;
  /** Ya está en el expediente. */
  hecho?: boolean;
}

export interface AnalisisDeActuacion {
  generadoEn: string;
  actuacion: Actuacion;
  /** Si el usuario eligió otra y LexIA identificó esta. */
  actuacionPedida?: Actuacion | null;
  tipo: TipoContratacion | null;
  regimen: { clave: 'ley_32069' | 'ley_30225' | 'por_determinar'; texto: string; base: string };
  entendimiento: string;
  figura: { nombre: string; corresponde: boolean; razon: string; alternativa?: Actuacion | null };
  requisitos: RequisitoEvaluado[];
  condiciones: CondicionEvaluada[];
  hechos: HechoIdentificado[];
  contradicciones: Contradiccion[];
  riesgos: Array<{ descripcion: string; gravedad: 'alta' | 'media' | 'baja' }>;
  calculos: Calculo[];
  competencia: { organo: string; base: string; verificar: string };
  cadena: PasoDeLaCadena[];
  explicacionCadena: string;
  documento: { tipo: TipoDeDocumento; titulo: string; advertencia?: string };
  suficiencia: number;
  semaforoInformacion: SemaforoInformacion;
  procedencia: { semaforo: SemaforoProcedencia; razon: string };
  nivelesPermitidos: NivelDeSalida[];
  mensajeSuficiencia: string;
  pregunta: PreguntaDecisiva | null;
  faltantes: Array<{ texto: string; nivel: Nivel; porQue: string }>;
  advertencias: string[];
  /** Los extractos normativos con que se analizó, para redactar y auditar. */
  sustento: string;
  /** Datos decisivos que se tomaron de los documentos en vez de preguntarlos. */
  datosDeLosDocumentos?: Array<{ id: string; pregunta: string; valor: string; documento: string; cita: string }>;
}

// ── El documento ─────────────────────────────────────────────────────

export type TipoDeDocumento =
  | 'informe_tecnico'
  | 'informe_dec'
  | 'informe_legal'
  | 'informe_diagnostico'
  | 'informe_supervisor'
  | 'resolucion'
  | 'carta'
  | 'acta'
  | 'adenda'
  | 'descargo';

export interface SeccionDeDocumento {
  titulo: string;
  parrafos: string[];
}

export interface BorradorDeDocumento {
  generadoEn: string;
  version: number;
  nivel: NivelDeSalida;
  tipo: TipoDeDocumento;
  titulo: string;
  asunto: string;
  referencias: string[];
  /** Informe, carta, acta, adenda, descargo. */
  secciones: SeccionDeDocumento[];
  /** Resolución. */
  vistos?: string[];
  considerandos?: string[];
  resuelve?: string[];
  destinatario?: { nombre: string; cargo?: string; entidad?: string };
  firmante?: { nombre: string; cargo: string };
  pendientes: string[];
  documentoId?: string;
}

export const TIPO_DE_HALLAZGO: Record<HallazgoDeAuditoria['tipo'], string> = {
  identificacion: 'Identificación',
  fechas: 'Fechas',
  economia: 'Economía',
  normativa: 'Normativa',
  competencia: 'Competencia',
  coherencia: 'Coherencia',
};

export interface HallazgoDeAuditoria {
  tipo: 'identificacion' | 'fechas' | 'economia' | 'normativa' | 'competencia' | 'coherencia';
  gravedad: 'error' | 'advertencia';
  texto: string;
}

export interface AuditoriaDelDocumento {
  generadoEn: string;
  version: number;
  hallazgos: HallazgoDeAuditoria[];
  /** Hay un error: no se emite el documento definitivo. */
  bloquea: boolean;
}
