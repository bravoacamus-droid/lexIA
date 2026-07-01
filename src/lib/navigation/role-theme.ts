/**
 * Sistema de identidad visual por perfil (Entity / Provider / Consultant).
 *
 * Feedback del usuario 30/06/2026: "colores específicos y estilo para
 * cada perfil recuerda". Este helper centraliza las decisiones visuales
 * para que sean consistentes en toda la app y no se dupliquen mapeos
 * de color en múltiples componentes.
 *
 * Asignaciones:
 *   entity     → sky (celeste)  — asocia orden, institución, oficialismo
 *   provider   → amber (ámbar)  — asocia trabajo activo, construcción
 *   consultant → violet         — asocia especialización, expertise
 *
 * Se usa desde: Hero, RoleContext widget, QuickActions destacadas,
 * Suggested queries, Sidebar decoration, y páginas específicas del rol.
 */

import type { LucideIcon } from 'lucide-react';
import { Building2, HardHat, Briefcase } from 'lucide-react';
import type { ProfileRole } from '@/lib/auth/session';

export interface RoleTheme {
  role: ProfileRole;
  label: string;
  tagline: string;
  icon: LucideIcon;
  /** Nombre corto del tono para lookups por string. */
  tone: 'sky' | 'amber' | 'violet';
  /** Set completo de clases Tailwind. */
  classes: {
    /** Fondo suave (para chips, tags). */
    softBg: string;
    /** Fondo brillante (para CTAs destacados). */
    solidBg: string;
    /** Borde suave para cards del perfil. */
    softBorder: string;
    /** Texto en tono del rol. */
    text: string;
    /** Texto oscuro (para títulos con acento). */
    textStrong: string;
    /** Gradient para hero/cards grandes. */
    gradient: string;
    /** Ring de focus. */
    ring: string;
    /** Punto/dot pequeño. */
    dot: string;
  };
}

const THEMES: Record<ProfileRole, RoleTheme> = {
  entity: {
    role: 'entity',
    label: 'Entidad pública',
    tagline:
      'LexIA acompaña tus procedimientos de selección desde el requerimiento hasta la ejecución contractual.',
    icon: Building2,
    tone: 'sky',
    classes: {
      softBg: 'bg-sky-50 dark:bg-sky-950/40',
      solidBg: 'bg-sky-600 dark:bg-sky-500',
      softBorder: 'border-sky-500/30',
      text: 'text-sky-700 dark:text-sky-400',
      textStrong: 'text-sky-900 dark:text-sky-200',
      gradient:
        'bg-gradient-to-br from-sky-500/20 via-sky-400/10 to-cyan-500/10 dark:from-sky-950/60 dark:via-sky-900/30 dark:to-cyan-950/30',
      ring: 'ring-sky-500/40',
      dot: 'bg-sky-500',
    },
  },
  provider: {
    role: 'provider',
    label: 'Proveedor',
    tagline:
      'Prepara consultas, observaciones, apelaciones y trámites RNP con sustento normativo verificable.',
    icon: HardHat,
    tone: 'amber',
    classes: {
      softBg: 'bg-amber-50 dark:bg-amber-950/40',
      solidBg: 'bg-amber-600 dark:bg-amber-500',
      softBorder: 'border-amber-500/30',
      text: 'text-amber-700 dark:text-amber-400',
      textStrong: 'text-amber-900 dark:text-amber-200',
      gradient:
        'bg-gradient-to-br from-amber-500/20 via-orange-400/10 to-yellow-500/10 dark:from-amber-950/60 dark:via-orange-900/30 dark:to-yellow-950/30',
      ring: 'ring-amber-500/40',
      dot: 'bg-amber-500',
    },
  },
  consultant: {
    role: 'consultant',
    label: 'Consultor',
    tagline:
      'Análisis jurisprudencial y modelos de asesoría con la base normativa vigente al día.',
    icon: Briefcase,
    tone: 'violet',
    classes: {
      softBg: 'bg-violet-50 dark:bg-violet-950/40',
      solidBg: 'bg-violet-600 dark:bg-violet-500',
      softBorder: 'border-violet-500/30',
      text: 'text-violet-700 dark:text-violet-400',
      textStrong: 'text-violet-900 dark:text-violet-200',
      gradient:
        'bg-gradient-to-br from-violet-500/20 via-purple-400/10 to-fuchsia-500/10 dark:from-violet-950/60 dark:via-purple-900/30 dark:to-fuchsia-950/30',
      ring: 'ring-violet-500/40',
      dot: 'bg-violet-500',
    },
  },
};

export function getRoleTheme(role: ProfileRole | null): RoleTheme | null {
  if (!role) return null;
  return THEMES[role];
}

/**
 * Consultas sugeridas específicas por rol para el widget "Consultas
 * sugeridas" de la home y para el chat vacío. Las genéricas se
 * sustituyen por las del rol si hay uno definido.
 */
export const ROLE_SUGGESTED_QUERIES: Record<ProfileRole, string[]> = {
  entity: [
    '¿Cómo publico correctamente las Bases Estándar para bienes?',
    '¿Cuándo elevo consultas al OECE por observaciones no absueltas?',
    '¿Qué requisitos debe tener el TDR para no vulnerar libre concurrencia?',
    '¿En qué casos procede la Ampliación del Plazo por causa no imputable?',
  ],
  provider: [
    '¿En qué casos procede subsanar documentos de mi oferta?',
    '¿Cuáles son los plazos para presentar apelación ante el Tribunal?',
    '¿Cómo formulo una observación fundamentada a las Bases?',
    '¿Cómo justifico una prestación adicional en obras?',
  ],
  consultant: [
    'Análisis jurisprudencial reciente sobre nulidad de procedimientos',
    'Criterios del Tribunal sobre experiencia adicional del personal clave',
    'Casos de fraccionamiento del objeto contractual',
    'Interpretación reciente del Art. 51 sobre difusión del requerimiento',
  ],
};

/**
 * Consultas genéricas cuando no hay rol definido (usuario que apenas
 * completó onboarding). Se muestran a modo demo.
 */
export const GENERIC_SUGGESTED_QUERIES = [
  '¿En qué casos procede la subsanación de ofertas?',
  '¿Cuáles son los plazos para presentar apelación ante el Tribunal?',
  '¿Cuándo procede una ampliación de plazo por causal de lluvias?',
  'Diferencia entre adicional de obra y prestación adicional',
];
