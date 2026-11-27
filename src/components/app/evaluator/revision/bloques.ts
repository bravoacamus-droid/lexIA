import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FileSearch,
  Info,
  Scale,
  ShieldAlert,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

/**
 * Cómo se presenta la revisión de un requerimiento: niveles de prioridad y
 * los cinco bloques del prototipo de César (reunión del 27/11/2026). Una
 * sola fuente para la pantalla y sus filtros.
 */

export type Severidad = 'critico' | 'alto' | 'medio' | 'bajo';

export const SEVERIDADES: Severidad[] = ['critico', 'alto', 'medio', 'bajo'];

export const SEVERIDAD: Record<
  Severidad,
  { nombre: string; icono: LucideIcon; pastilla: string; borde: string; activa: string; definicion: string }
> = {
  critico: {
    nombre: 'Crítico',
    icono: ShieldAlert,
    pastilla: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    borde: 'border-l-red-500',
    activa: 'ring-2 ring-red-500/60',
    definicion: 'Puede llevar a la nulidad o a la suspensión del procedimiento, o restringe la concurrencia.',
  },
  alto: {
    nombre: 'Alto',
    icono: AlertTriangle,
    pastilla: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    borde: 'border-l-orange-500',
    activa: 'ring-2 ring-orange-500/60',
    definicion: 'Falta algo sustantivo o es ambiguo de forma que generará consultas u observaciones.',
  },
  medio: {
    nombre: 'Medio',
    icono: AlertCircle,
    pastilla: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    borde: 'border-l-amber-500',
    activa: 'ring-2 ring-amber-500/60',
    definicion: 'Detalle insuficiente o una ambigüedad menor que conviene precisar.',
  },
  bajo: {
    nombre: 'Bajo',
    icono: Info,
    pastilla: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    borde: 'border-l-sky-500',
    activa: 'ring-2 ring-sky-500/60',
    definicion: 'Claridad, consistencia o redacción.',
  },
};

export type IdDeBloque = 'alcance' | 'proveedor' | 'plazos' | 'conformidad_pago' | 'garantias_otros';

export const BLOQUES: Array<{ id: IdDeBloque; nombre: string; pregunta: string; icono: LucideIcon; categorias: string[] }> = [
  {
    id: 'alcance',
    nombre: 'Objeto y alcance',
    pregunta: '¿Qué se está contratando y se describe sin dirigirlo?',
    icono: FileSearch,
    categorias: ['direccionamiento_marca', 'especificaciones_ambiguas', 'finalidad_publica_debil'],
  },
  {
    id: 'proveedor',
    nombre: 'Lo exigido al proveedor',
    pregunta: '¿Lo que se pide es necesario y proporcional?',
    icono: UserCheck,
    categorias: ['personal_desproporcionado', 'experiencia_restrictiva', 'equipamiento_restrictivo', 'requisito_no_previsto'],
  },
  {
    id: 'plazos',
    nombre: 'Plazos y entregables',
    pregunta: '¿Cuándo, dónde y qué se entrega?',
    icono: CalendarClock,
    categorias: ['plazos_insustentables', 'entregables_incompletos'],
  },
  {
    id: 'conformidad_pago',
    nombre: 'Conformidad, pago y penalidades',
    pregunta: '¿Cómo se verifica, se paga y se penaliza?',
    icono: Scale,
    categorias: ['conformidad', 'forma_de_pago', 'penalidades'],
  },
  {
    id: 'garantias_otros',
    nombre: 'Garantías y otras condiciones',
    pregunta: 'Garantías, certificaciones, ubicación, subcontratación y coherencia.',
    icono: ClipboardList,
    categorias: ['garantias', 'incoherencia', 'otro'],
  },
];

export function bloqueDe(categoria: string): IdDeBloque {
  return BLOQUES.find((b) => b.categorias.includes(categoria))?.id ?? 'garantias_otros';
}

export const NOMBRE_CATEGORIA: Record<string, string> = {
  direccionamiento_marca: 'Direccionamiento a marca',
  personal_desproporcionado: 'Personal desproporcionado',
  especificaciones_ambiguas: 'Especificaciones ambiguas',
  plazos_insustentables: 'Plazos insustentables',
  entregables_incompletos: 'Entregables incompletos',
  equipamiento_restrictivo: 'Equipamiento restrictivo',
  experiencia_restrictiva: 'Experiencia restrictiva',
  finalidad_publica_debil: 'Finalidad pública débil',
  requisito_no_previsto: 'Requisito no previsto',
  conformidad: 'Conformidad',
  forma_de_pago: 'Forma de pago',
  penalidades: 'Penalidades',
  garantias: 'Garantías',
  incoherencia: 'Incoherencia interna',
  otro: 'Otra condición',
};

export const NOMBRE_SOLICITUD = {
  modificar: 'Modificar',
  suprimir: 'Suprimir',
  ampliar: 'Ampliar',
  precisar: 'Precisar',
  incorporar: 'Incorporar',
} as const;

/** Sin tildes ni mayúsculas, para buscar. */
export const plegar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
