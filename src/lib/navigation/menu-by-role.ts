import {
  LayoutDashboard,
  MessageSquare,
  Library,
  FileSearch,
  FilePen,
  HardHat,
  Briefcase,
  ShieldCheck,
  ScanSearch,
  ClipboardList,
  PhoneCall,
  SearchCode,
  type LucideIcon,
} from 'lucide-react';
import type { ProfileRole } from '@/lib/auth/session';

/**
 * Matriz única de navegación módulo × rol.
 *
 * Cada perfil ve un conjunto diferenciado en la sidebar. Esto es el single
 * source of truth — sidebar, topbar, command-palette y dashboards consultan
 * esta lista para no divergir.
 *
 * Si `roles` está vacío o ausente, el item es visible para TODOS los roles.
 *
 * Para crecer en próximas etapas: cuando se construyan nuevos generadores
 * (Etapas 6-9 del plan), agregar aquí su entrada y se mostrará automáticamente.
 */
/**
 * Familia visual del item — se usa para el color del ícono en la
 * sidebar y para el badge en cards asociadas. Feedback de César
 * 30/06/2026: el sistema se veía monocromático (todo azul brand),
 * "no se usan los demás colores de la marca". Cada sección funcional
 * ahora tiene su color propio manteniendo la paleta Tailwind existente.
 */
export type MenuColor = 'brand' | 'emerald' | 'rose' | 'amber' | 'violet' | 'sky' | 'teal' | 'slate';

export interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  /** Si está vacío, visible para todos los perfiles. */
  roles?: ProfileRole[];
  /** Marca acento brand (el botón de Chat se destaca como CTA primario). */
  accent?: boolean;
  /** Próximamente — se muestra grisáceo y no navegable. */
  comingSoon?: boolean;
  /** Color visual del ícono (aplicado a bg del cuadrado y color del svg). */
  color?: MenuColor;
}

/**
 * Utility: dado un MenuColor devuelve las clases Tailwind para bg del
 * cuadrado del icono y color del icono en sí. Se usa desde el
 * Sidebar y desde componentes que necesiten replicar el look.
 */
export function colorClasses(c: MenuColor | undefined): { bg: string; fg: string; dot: string } {
  const palette: Record<MenuColor, { bg: string; fg: string; dot: string }> = {
    brand: {
      bg: 'bg-brand-50 dark:bg-brand-950/50',
      fg: 'text-brand-600 dark:text-brand-400',
      dot: 'bg-brand-500',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      fg: 'text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      fg: 'text-rose-600 dark:text-rose-400',
      dot: 'bg-rose-500',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      fg: 'text-amber-600 dark:text-amber-400',
      dot: 'bg-amber-500',
    },
    violet: {
      bg: 'bg-violet-50 dark:bg-violet-950/50',
      fg: 'text-violet-600 dark:text-violet-400',
      dot: 'bg-violet-500',
    },
    sky: {
      bg: 'bg-sky-50 dark:bg-sky-950/50',
      fg: 'text-sky-600 dark:text-sky-400',
      dot: 'bg-sky-500',
    },
    teal: {
      bg: 'bg-teal-50 dark:bg-teal-950/50',
      fg: 'text-teal-600 dark:text-teal-400',
      dot: 'bg-teal-500',
    },
    slate: {
      bg: 'bg-slate-100 dark:bg-slate-800/60',
      fg: 'text-slate-600 dark:text-slate-400',
      dot: 'bg-slate-500',
    },
  };
  return palette[c || 'brand'];
}

export interface MenuSection {
  label: string;
  items: MenuItem[];
}

export const MENU_SECTIONS: MenuSection[] = [
  {
    label: 'Principal',
    items: [
      {
        label: 'Inicio',
        href: '/app',
        icon: LayoutDashboard,
        description: 'Resumen de tu actividad reciente.',
        color: 'slate',
      },
      {
        label: 'Chat LexIA',
        href: '/chat',
        icon: MessageSquare,
        description: 'Asistente normativo con citas verificables.',
        accent: true,
        color: 'brand',
      },
      {
        label: 'Buscador inteligente',
        href: '/buscador',
        icon: SearchCode,
        description:
          'Combina hasta 8 términos y encuentra jurisprudencia con resaltado por colores.',
        color: 'teal',
        accent: true,
      },
      {
        label: 'Biblioteca',
        href: '/biblioteca',
        icon: Library,
        description: 'Ley 32069, Reglamento, opiniones y jurisprudencia.',
        color: 'emerald',
      },
      {
        label: 'Asistente de Voz',
        href: '/llamadas',
        icon: PhoneCall,
        description:
          'Conversa por voz con LexIA y obtén respuestas con sustento normativo citado al artículo.',
        accent: true,
        color: 'rose',
      },
    ],
  },
  {
    label: 'Entidad pública',
    items: [
      {
        label: 'Evaluador de ofertas',
        href: '/evaluador',
        icon: FileSearch,
        description: 'Compara Bases con ofertas y dictamina por requisito.',
        roles: ['entity'],
        color: 'sky',
      },
      {
        label: 'Revisor EETT / TDR',
        href: '/revisor-tdr',
        icon: ScanSearch,
        description: 'Audita tu TDR antes de publicarlo: detecta vicios y direccionamiento.',
        roles: ['entity'],
        color: 'teal',
      },
      {
        label: 'Generador',
        href: '/generador',
        icon: FilePen,
        description: 'TDR, Estrategia de Contratación, Pliego de Absolución.',
        roles: ['entity'],
        color: 'amber',
      },
    ],
  },
  {
    label: 'Proveedor',
    items: [
      {
        label: 'Generador',
        href: '/generador',
        icon: FilePen,
        description: 'Consultas, Observaciones, Apelaciones, Ampliación de Plazo.',
        roles: ['provider'],
        color: 'amber',
      },
      {
        label: 'Revisión de oferta',
        href: '/revision-oferta',
        icon: ShieldCheck,
        description: 'Audita tu propia oferta antes de presentarla.',
        roles: ['provider'],
        color: 'sky',
      },
      {
        label: 'Trámites RNP',
        href: '/rnp',
        icon: HardHat,
        description: 'Aumento de CMC, actualización financiera, requisitos del trámite.',
        roles: ['provider'],
        color: 'teal',
      },
    ],
  },
  {
    label: 'Consultor',
    items: [
      {
        label: 'Casos de estudio',
        href: '/casos',
        icon: Briefcase,
        description: 'Análisis avanzado y modelos de litigio.',
        roles: ['consultant'],
        comingSoon: true,
        color: 'violet',
      },
    ],
  },
  {
    label: 'Comunidad',
    items: [
      {
        label: 'Encuestas',
        href: '/encuestas',
        icon: ClipboardList,
        description:
          'Comparte tu experiencia y obtén créditos extra para usar la plataforma.',
        color: 'violet',
      },
    ],
  },
];

/**
 * Devuelve los items visibles para un rol dado, manteniendo la estructura por
 * secciones. Las secciones que queden vacías se filtran.
 */
export function getMenuFor(role: ProfileRole | null): MenuSection[] {
  return MENU_SECTIONS
    .map((section) => ({
      label: section.label,
      items: section.items.filter((item) => {
        if (!item.roles || item.roles.length === 0) return true;
        if (!role) return false;
        return item.roles.includes(role);
      }),
    }))
    .filter((s) => s.items.length > 0);
}

/**
 * Versión lineal (sin secciones) — útil para command-palette y otras búsquedas.
 */
export function getFlatMenuFor(role: ProfileRole | null): MenuItem[] {
  return getMenuFor(role).flatMap((s) => s.items);
}

export const ROLE_LABELS: Record<ProfileRole, string> = {
  entity: 'Entidad pública',
  provider: 'Proveedor',
  consultant: 'Consultor',
};

export const ROLE_DESCRIPTIONS: Record<ProfileRole, string> = {
  entity:
    'Trabajo en una entidad pública (gobierno regional, municipalidad, ministerio, OPD). Mi rol es área usuaria, logística, asesor legal o autoridad.',
  provider:
    'Soy proveedor de bienes, servicios, obras o consultoría de obras. Participo en procedimientos de selección del Estado.',
  consultant:
    'Asesoro o capacito a entidades y proveedores en contrataciones públicas. Mi rol es consultor independiente o de empresa especializada.',
};
