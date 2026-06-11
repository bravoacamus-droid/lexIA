import {
  LayoutDashboard,
  MessageSquare,
  Library,
  FileSearch,
  FilePen,
  HardHat,
  Briefcase,
  ShieldCheck,
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
      },
      {
        label: 'Chat LexIA',
        href: '/chat',
        icon: MessageSquare,
        description: 'Asistente normativo con citas verificables.',
        accent: true,
      },
      {
        label: 'Biblioteca',
        href: '/biblioteca',
        icon: Library,
        description: 'Ley 32069, Reglamento, opiniones y jurisprudencia.',
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
      },
      {
        label: 'Generador',
        href: '/generador',
        icon: FilePen,
        description: 'TDR, Estrategia de Contratación, Pliego de Absolución.',
        roles: ['entity'],
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
      },
      {
        label: 'Revisión de oferta',
        href: '/revision-oferta',
        icon: ShieldCheck,
        description: 'Audita tu propia oferta antes de presentarla.',
        roles: ['provider'],
      },
      {
        label: 'Trámites RNP',
        href: '/rnp',
        icon: HardHat,
        description: 'Aumento de CMC, actualización financiera, requisitos del trámite.',
        roles: ['provider'],
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
