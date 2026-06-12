/**
 * Catálogo de encuestas segmentadas LexIA — versión condensada y amigable.
 *
 * Las encuestas largas originales (.docx en data/encuestas) tienen 20+ preguntas
 * cada una. Aquí condensamos a ~12-13 preguntas core por perfil agrupadas en
 * tres pasos (Perfil → Dolor → Validación + Pago) para que el llenado sea
 * fluido (<5 min) sin perder valor estadístico.
 */
import type { ProfileRole } from '@/lib/auth/session';

export type QuestionType = 'single' | 'multi' | 'rating' | 'text';

export interface SurveyOption {
  value: string;
  label: string;
}

export interface SurveyQuestion {
  id: string;
  step: 1 | 2 | 3;
  type: QuestionType;
  question: string;
  hint?: string;
  /** Solo para `multi`: máximo seleccionable. Si se omite, sin límite. */
  maxOptions?: number;
  /** Solo para `rating`: rango 1..max. */
  ratingMax?: number;
  ratingLabel?: { low: string; high: string };
  /** Solo para `single`/`multi`. */
  options?: SurveyOption[];
  /** Solo para `text`: placeholder y maxLength. */
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
}

export interface SurveyDefinition {
  slug: 'provider' | 'entity' | 'consultant';
  role: ProfileRole;
  title: string;
  subtitle: string;
  /** Estimación de tiempo en minutos para el header. */
  estimatedMinutes: number;
  steps: Array<{ title: string; subtitle: string }>;
  questions: SurveyQuestion[];
}

// ════════════════════════════════════════════════════════════════════
// SEGMENTO A — PROVEEDORES
// ════════════════════════════════════════════════════════════════════
const PROVIDER: SurveyDefinition = {
  slug: 'provider',
  role: 'provider',
  title: 'Encuesta de Proveedor',
  subtitle:
    'Tu experiencia como proveedor del Estado nos ayuda a priorizar funcionalidades. 12 preguntas, 5 min.',
  estimatedMinutes: 5,
  steps: [
    {
      title: 'Tu negocio',
      subtitle: 'Para entender qué tipo de proveedor eres.',
    },
    {
      title: 'Tus dolores',
      subtitle: 'Qué te frustra hoy al contratar con el Estado.',
    },
    {
      title: 'Validación y pago',
      subtitle: 'Cuán útil te resultarían nuestras funcionalidades.',
    },
  ],
  questions: [
    {
      id: 'pv_tipo_contratacion',
      step: 1,
      type: 'single',
      question: '¿En qué contrataciones participa principalmente tu organización?',
      required: true,
      options: [
        { value: 'bienes', label: 'Suministro de bienes' },
        { value: 'servicios', label: 'Prestación de servicios' },
        { value: 'consultoria_general', label: 'Consultoría en general' },
        { value: 'consultoria_obras', label: 'Consultoría de obras' },
        { value: 'obras', label: 'Ejecución de obras' },
      ],
    },
    {
      id: 'pv_volumen_anual',
      step: 1,
      type: 'single',
      question: 'En los últimos 12 meses, ¿en cuántos procedimientos participaste?',
      required: true,
      options: [
        { value: 'lt10', label: 'Menos de 10' },
        { value: '10_25', label: 'Entre 10 y 25' },
        { value: '26_50', label: 'Entre 26 y 50' },
        { value: '51_100', label: 'Entre 51 y 100' },
        { value: 'gt100', label: 'Más de 100' },
      ],
    },
    {
      id: 'pv_facturacion',
      step: 1,
      type: 'single',
      question: '¿Valor aproximado anual de tus contratos con el Estado?',
      required: true,
      options: [
        { value: 'lt100k', label: 'Menos de S/ 100,000' },
        { value: '100k_1m', label: 'Entre S/ 100,000 y S/ 1 millón' },
        { value: '1m_10m', label: 'Más de S/ 1 millón hasta S/ 10 millones' },
        { value: 'gt10m', label: 'Más de S/ 10 millones' },
        { value: 'unknown', label: 'No lo sé / prefiero no responder' },
      ],
    },
    {
      id: 'pv_desafios',
      step: 2,
      type: 'multi',
      maxOptions: 3,
      question: '¿Cuáles son tus principales desafíos al contratar con el Estado?',
      hint: 'Selecciona hasta 3 opciones.',
      required: true,
      options: [
        { value: 'bases_deficientes', label: 'Bases con deficiencias o requisitos restrictivos' },
        { value: 'normativa', label: 'Interpretar la normativa de contrataciones' },
        { value: 'ofertas', label: 'Elaborar ofertas técnicas y económicas' },
        { value: 'consultas', label: 'Formular consultas y observaciones' },
        { value: 'actualizacion', label: 'Mantenerme actualizado con cambios normativos' },
        { value: 'apelaciones', label: 'Elaborar y sustentar apelaciones' },
        { value: 'experiencia', label: 'Acreditar experiencia del postor o del personal' },
        { value: 'tiempo', label: 'Falta de tiempo para preparar las ofertas' },
        { value: 'criterios', label: 'Encontrar criterios y resoluciones aplicables' },
        { value: 'oportunidades', label: 'Identificar oportunidades de contratación' },
      ],
    },
    {
      id: 'pv_horas_oferta',
      step: 2,
      type: 'single',
      question: '¿Cuántas horas-hombre te toma preparar una oferta promedio?',
      required: true,
      options: [
        { value: 'lt10', label: 'Menos de 10 horas' },
        { value: '10_20', label: 'Entre 10 y 20 horas' },
        { value: '21_40', label: 'Entre 21 y 40 horas' },
        { value: '41_80', label: 'Entre 41 y 80 horas' },
        { value: 'gt80', label: 'Más de 80 horas' },
      ],
    },
    {
      id: 'pv_descalificacion',
      step: 2,
      type: 'single',
      question: '¿Has perdido una buena pro por errores en tu oferta?',
      required: true,
      options: [
        { value: 'yes', label: 'Sí' },
        { value: 'no', label: 'No' },
      ],
    },
    {
      id: 'pv_util_chat',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Asistente IA con sustento normativo (Ley 32069, opiniones, TCE)',
      required: true,
    },
    {
      id: 'pv_util_evaluador_bases',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Revisor IA de Bases (detecta requisitos restrictivos, genera consultas y observaciones)',
      required: true,
    },
    {
      id: 'pv_util_apelaciones',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Generador de recursos de apelación con sustento',
      required: true,
    },
    {
      id: 'pv_util_rnp',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Asistente de trámites RNP (aumento de CMC, actualización financiera)',
      required: true,
    },
    {
      id: 'pv_precio',
      step: 3,
      type: 'single',
      question: '¿Cuánto pagarías al mes por una herramienta así?',
      required: true,
      options: [
        { value: 'lt120', label: 'Menos de S/ 120' },
        { value: '120_150', label: 'Entre S/ 120 y S/ 150' },
        { value: '151_200', label: 'Entre S/ 151 y S/ 200' },
        { value: 'gt200', label: 'Más de S/ 200' },
        { value: 'no_viable', label: 'No me parece viable a ese precio' },
      ],
    },
    {
      id: 'pv_modalidad',
      step: 3,
      type: 'single',
      question: '¿Qué modalidad prefieres?',
      required: true,
      options: [
        { value: 'mensual', label: 'Mensual' },
        { value: 'trimestral', label: 'Trimestral' },
        { value: 'semestral', label: 'Semestral' },
        { value: 'anual', label: 'Anual' },
      ],
    },
  ],
};

// ════════════════════════════════════════════════════════════════════
// SEGMENTO B — ENTIDADES
// ════════════════════════════════════════════════════════════════════
const ENTITY: SurveyDefinition = {
  slug: 'entity',
  role: 'entity',
  title: 'Encuesta de Entidad Pública',
  subtitle:
    'Tu experiencia en la entidad nos ayuda a priorizar funcionalidades. 13 preguntas, 5 min.',
  estimatedMinutes: 5,
  steps: [
    { title: 'Tu rol y entidad', subtitle: 'Para entender en qué tipo de entidad trabajas.' },
    { title: 'Tus dolores', subtitle: 'Qué te demanda más tiempo hoy.' },
    { title: 'Validación y pago', subtitle: 'Cuán valiosas serían nuestras herramientas.' },
  ],
  questions: [
    {
      id: 'en_rol',
      step: 1,
      type: 'single',
      question: '¿Cuál es tu rol principal en contrataciones?',
      required: true,
      options: [
        { value: 'area_usuaria', label: 'Área Usuaria' },
        { value: 'dec', label: 'Dependencia Encargada de las Contrataciones (DEC)' },
        { value: 'asesoria_juridica', label: 'Asesoría Jurídica' },
        { value: 'evaluador', label: 'Evaluador / Comité' },
        { value: 'gestion_admin', label: 'Autoridad de la Gestión Administrativa' },
        { value: 'titular', label: 'Titular de la Entidad' },
        { value: 'oci', label: 'Órgano de Control Institucional (OCI)' },
      ],
    },
    {
      id: 'en_nivel',
      step: 1,
      type: 'single',
      question: '¿En qué tipo de entidad trabajas?',
      required: true,
      options: [
        { value: 'nacional', label: 'Gobierno Nacional' },
        { value: 'regional', label: 'Gobierno Regional' },
        { value: 'local', label: 'Gobierno Local (Municipalidad)' },
        { value: 'oca', label: 'Organismo Constitucional Autónomo' },
        { value: 'empresa', label: 'Empresa del Estado' },
        { value: 'universidad', label: 'Universidad Pública' },
      ],
    },
    {
      id: 'en_volumen',
      step: 1,
      type: 'single',
      question: '¿Cuántos procedimientos tramita tu entidad al año?',
      required: true,
      options: [
        { value: 'lt20', label: 'Menos de 20' },
        { value: '20_50', label: '20 a 50' },
        { value: '51_100', label: '51 a 100' },
        { value: '101_300', label: '101 a 300' },
        { value: 'gt300', label: 'Más de 300' },
      ],
    },
    {
      id: 'en_presupuesto',
      step: 1,
      type: 'single',
      question: 'Presupuesto anual aproximado en contrataciones',
      required: true,
      options: [
        { value: 'lt1m', label: 'Menos de S/ 1 millón' },
        { value: '1_10m', label: 'S/ 1 a 10 millones' },
        { value: '10_50m', label: 'S/ 10 a 50 millones' },
        { value: '50_100m', label: 'S/ 50 a 100 millones' },
        { value: 'gt100m', label: 'Más de S/ 100 millones' },
        { value: 'unknown', label: 'No lo sé' },
      ],
    },
    {
      id: 'en_demanda_tiempo',
      step: 2,
      type: 'multi',
      maxOptions: 5,
      question: '¿Qué actividades te demandan más tiempo?',
      hint: 'Hasta 5 opciones.',
      required: true,
      options: [
        { value: 'tdr_eett', label: 'Elaborar TDR / EETT' },
        { value: 'estrategia', label: 'Estrategia de Contratación' },
        { value: 'consultas', label: 'Absolución de consultas y observaciones' },
        { value: 'evaluacion', label: 'Evaluación y calificación de ofertas' },
        { value: 'actas', label: 'Redacción de actas de calificación' },
        { value: 'normativa', label: 'Búsqueda y análisis de normativa' },
        { value: 'informes_tecnicos', label: 'Informes técnicos de ejecución' },
        { value: 'informes_legales', label: 'Informes legales de ejecución' },
        { value: 'resoluciones', label: 'Proyectos de resolución' },
        { value: 'ampliaciones', label: 'Sustento de ampliaciones, penalidades, adicionales' },
        { value: 'actualizacion', label: 'Actualización normativa permanente' },
        { value: 'control', label: 'Atender observaciones de control' },
      ],
    },
    {
      id: 'en_horas_normativa',
      step: 2,
      type: 'single',
      question: 'Horas a la semana en búsqueda normativa',
      required: true,
      options: [
        { value: 'lt5', label: 'Menos de 5 horas' },
        { value: '5_10', label: '5 a 10 horas' },
        { value: '11_20', label: '11 a 20 horas' },
        { value: '21_40', label: '21 a 40 horas' },
        { value: 'gt40', label: 'Más de 40 horas' },
      ],
    },
    {
      id: 'en_dificultad',
      step: 2,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Muy fácil', high: 'Muy difícil' },
      question: '¿Qué tan difícil es encontrar opiniones y resoluciones aplicables?',
      required: true,
    },
    {
      id: 'en_util_chat',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Asistente IA con citas de normativa, opiniones y resoluciones del TCE',
      required: true,
    },
    {
      id: 'en_util_tdr',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Generador de TDR/EETT con detección de direccionamiento',
      required: true,
    },
    {
      id: 'en_util_evaluador',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Evaluador IA de ofertas con dictamen por requisito',
      required: true,
    },
    {
      id: 'en_util_pliego',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Generador de Pliego de Absolución y Bases Integradas',
      required: true,
    },
    {
      id: 'en_presupuesto_anual',
      step: 3,
      type: 'single',
      question: 'Presupuesto anual razonable para tu entidad',
      required: true,
      options: [
        { value: 'lt3k', label: 'Menos de S/ 3,000' },
        { value: '3k_5k', label: 'Entre S/ 3,000 y S/ 5,000' },
        { value: '5k_10k', label: 'Entre S/ 5,001 y S/ 10,000' },
        { value: '10k_20k', label: 'Entre S/ 10,001 y S/ 20,000' },
        { value: 'gt20k', label: 'Más de S/ 20,000' },
      ],
    },
    {
      id: 'en_modalidad',
      step: 3,
      type: 'single',
      question: 'Modalidad de contratación preferida',
      required: true,
      options: [
        { value: 'institucional_anual', label: 'Suscripción institucional anual' },
        { value: 'por_usuario', label: 'Licencia por usuario' },
        { value: 'corporativa', label: 'Licencia corporativa total' },
        { value: 'modular', label: 'Por módulos específicos' },
      ],
    },
  ],
};

// ════════════════════════════════════════════════════════════════════
// SEGMENTO C — CONSULTORES Y CAPACITADORES
// ════════════════════════════════════════════════════════════════════
const CONSULTANT: SurveyDefinition = {
  slug: 'consultant',
  role: 'consultant',
  title: 'Encuesta de Consultor / Capacitador',
  subtitle:
    'Tu trabajo como consultor o capacitador nos da dirección sobre qué construir. 12 preguntas, 5 min.',
  estimatedMinutes: 5,
  steps: [
    { title: 'Tu actividad', subtitle: 'Para entender qué tipo de servicio brindas.' },
    { title: 'Tus dolores', subtitle: 'Qué te limita hoy en tu trabajo profesional.' },
    { title: 'Validación y pago', subtitle: 'Cuán valiosa sería nuestra plataforma para ti.' },
  ],
  questions: [
    {
      id: 'co_actividad',
      step: 1,
      type: 'multi',
      maxOptions: 3,
      question: '¿Qué actividades realizas en contrataciones públicas?',
      hint: 'Hasta 3 opciones.',
      required: true,
      options: [
        { value: 'asesoria', label: 'Asesoría y consultoría especializada' },
        { value: 'ofertas', label: 'Elaboración y presentación de ofertas' },
        { value: 'apelaciones', label: 'Recursos de apelación e impugnación' },
        { value: 'patrocinio', label: 'Patrocinio ante el Tribunal' },
        { value: 'entidades', label: 'Asesoría a entidades públicas' },
        { value: 'rnp', label: 'Trámites ante el RNP' },
        { value: 'capacitacion', label: 'Capacitación y formación especializada' },
        { value: 'auditoria', label: 'Auditoría o control especializado' },
      ],
    },
    {
      id: 'co_organizacion',
      step: 1,
      type: 'single',
      question: '¿Bajo qué tipo de organización trabajas?',
      required: true,
      options: [
        { value: 'independiente', label: 'Profesional independiente' },
        { value: 'estudio', label: 'Estudio o firma especializada' },
        { value: 'empresa_consultora', label: 'Empresa de consultoría / asesoría' },
        { value: 'centro_formacion', label: 'Centro de formación / capacitación' },
        { value: 'asociacion', label: 'Asociación o gremio' },
      ],
    },
    {
      id: 'co_experiencia',
      step: 1,
      type: 'single',
      question: 'Años de experiencia en contrataciones',
      required: true,
      options: [
        { value: 'lt1', label: 'Menos de 1 año' },
        { value: '1_3', label: '1 a 3 años' },
        { value: '4_7', label: '4 a 7 años' },
        { value: '8_15', label: '8 a 15 años' },
        { value: 'gt15', label: 'Más de 15 años' },
      ],
    },
    {
      id: 'co_desafios',
      step: 2,
      type: 'multi',
      maxOptions: 3,
      question: '¿Cuáles son tus principales desafíos?',
      hint: 'Hasta 3 opciones.',
      required: true,
      options: [
        { value: 'identificar', label: 'Identificar rápidamente normativa aplicable' },
        { value: 'busqueda', label: 'Tiempo excesivo en búsqueda y análisis' },
        { value: 'recursos', label: 'Elaborar recursos y escritos sustentados' },
        { value: 'retrabajo', label: 'Retrabajo frecuente en informes y documentos' },
        { value: 'actualizacion', label: 'Mantenerme actualizado normativamente' },
        { value: 'herramientas', label: 'Falta de herramientas especializadas' },
        { value: 'criterios', label: 'Conciliar criterios divergentes' },
        { value: 'plazos', label: 'Plazos reducidos para atender consultas' },
        { value: 'escala', label: 'Escalar sin perder calidad' },
        { value: 'estandarizar', label: 'Estandarizar documentos y metodología' },
      ],
    },
    {
      id: 'co_horas_semanales',
      step: 2,
      type: 'single',
      question: 'Horas a la semana en búsqueda y análisis normativo',
      required: true,
      options: [
        { value: 'lt5', label: 'Menos de 5 horas' },
        { value: '5_10', label: '5 a 10 horas' },
        { value: '11_20', label: '11 a 20 horas' },
        { value: '21_40', label: '21 a 40 horas' },
        { value: 'gt40', label: 'Más de 40 horas' },
      ],
    },
    {
      id: 'co_retrabajo',
      step: 2,
      type: 'single',
      question: '¿Con qué frecuencia rehaces documentos por cambios o nuevos criterios?',
      required: true,
      options: [
        { value: 'nunca', label: 'Nunca' },
        { value: 'rara', label: 'Rara vez' },
        { value: 'algunas', label: 'Algunas veces' },
        { value: 'frecuentemente', label: 'Frecuentemente' },
        { value: 'muy', label: 'Muy frecuentemente' },
      ],
    },
    {
      id: 'co_util_chat',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Asistente IA con sustento normativo y jurisprudencial',
      required: true,
    },
    {
      id: 'co_util_buscador',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Buscador inteligente de normativa, opiniones y resoluciones',
      required: true,
    },
    {
      id: 'co_util_recursos',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Generador de recursos de apelación y escritos especializados',
      required: true,
    },
    {
      id: 'co_util_revisor',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Revisión automática de documentos (control de calidad)',
      required: true,
    },
    {
      id: 'co_util_capacitacion',
      step: 3,
      type: 'rating',
      ratingMax: 5,
      ratingLabel: { low: 'Nada útil', high: 'Indispensable' },
      question: 'Generador de material académico para capacitaciones',
      required: true,
    },
    {
      id: 'co_precio',
      step: 3,
      type: 'single',
      question: 'Precio mensual razonable',
      required: true,
      options: [
        { value: 'lt150', label: 'Menos de S/ 150' },
        { value: '150_250', label: 'Entre S/ 150 y S/ 250' },
        { value: '251_400', label: 'Entre S/ 251 y S/ 400' },
        { value: 'gt400', label: 'Más de S/ 400' },
        { value: 'no_viable', label: 'No me parece viable' },
      ],
    },
  ],
};

export const SURVEYS: Record<ProfileRole, SurveyDefinition> = {
  provider: PROVIDER,
  entity: ENTITY,
  consultant: CONSULTANT,
};

export function getSurveyForRole(role: ProfileRole): SurveyDefinition {
  return SURVEYS[role];
}

/** Bonus de créditos que se otorgan al completar una encuesta. */
export const SURVEY_REWARDS = {
  generator_call: 5,
  evaluation_run: 2,
} as const;
