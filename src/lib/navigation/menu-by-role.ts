import {
  Home,
  Search,
  MessageSquare,
  Mic,
  SearchCode,
  FilePlus2,
  ClipboardList,
  FileSignature,
  ClipboardCheck,
  ScanSearch,
  FileSearch,
  ShieldCheck,
  Library,
  Bookmark,
  HardHat,
  MessagesSquare,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { ProfileRole } from '@/lib/auth/session';

/**
 * Matriz única de navegación — el único sitio donde se decide qué ve cada
 * perfil. La consultan la barra lateral, la paleta de comandos y los
 * centros de sección, para que no puedan divergir.
 *
 * ## El cambio de setiembre de 2026
 *
 * Hasta ahora el menú se ordenaba por **quién eres** (Entidad pública,
 * Proveedor, Consultor) y dentro de cada bloque aparecían herramientas
 * sueltas. Los mockups de César lo reordenan por **qué vas a hacer**:
 * tres verbos —Consultar, Generar, Evaluar— y debajo de cada uno las
 * herramientas que sirven para eso. El perfil sigue filtrando, pero ya
 * no es el encabezado: un consultor y un funcionario de entidad ven el
 * mismo "Evaluar", solo que con distintos hijos dentro.
 *
 * Regla que no se rompe: **aquí no entra ninguna ruta que no exista**.
 * En agosto el módulo de requerimiento estuvo construido y sin entrada
 * en el menú, y en setiembre el menú del proveedor prometía acciones que
 * no existían. Las dos cosas se reportaron. Si una pantalla del mockup
 * todavía no está construida, no se le pone entrada.
 */

/** La familia de acción a la que pertenece el item — de ahí sale su color. */
export type MenuColor =
  | 'consultar'
  | 'generar'
  | 'evaluar'
  | 'brand'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'violet'
  | 'sky'
  | 'teal'
  | 'slate';

export interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  /** Si está vacío, visible para todos los perfiles. */
  roles?: ProfileRole[];
  /** Próximamente — se muestra grisáceo y no navegable. */
  comingSoon?: boolean;
  /** Color visual del ícono. */
  color?: MenuColor;
  /** Submenú desplegable. Si todos los hijos quedan fuera por rol, el padre desaparece. */
  hijos?: MenuItem[];
  /** Rótulo corto para la barra inferior del móvil. */
  corto?: string;
}

/**
 * Clases Tailwind del cuadrado del ícono para cada familia. Se usa desde
 * la barra lateral y desde cualquier tarjeta que quiera repetir el look.
 */
export function colorClasses(c: MenuColor | undefined): { bg: string; fg: string; dot: string } {
  const palette: Record<MenuColor, { bg: string; fg: string; dot: string }> = {
    consultar: {
      bg: 'bg-consultar-500/15 dark:bg-consultar-500/20',
      fg: 'text-consultar-400',
      dot: 'bg-consultar-500',
    },
    generar: {
      bg: 'bg-generar-500/15 dark:bg-generar-500/20',
      fg: 'text-generar-400',
      dot: 'bg-generar-500',
    },
    evaluar: {
      bg: 'bg-evaluar-500/15 dark:bg-evaluar-500/20',
      fg: 'text-evaluar-400',
      dot: 'bg-evaluar-500',
    },
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
  /** Cadena vacía = bloque principal, sin encabezado. */
  label: string;
  items: MenuItem[];
}

export const MENU_SECTIONS: MenuSection[] = [
  {
    label: '',
    items: [
      {
        label: 'Inicio',
        href: '/app',
        icon: Home,
        description: 'Tu resumen y el punto de partida de cualquier contratación.',
        color: 'slate',
        corto: 'Inicio',
      },
      {
        label: 'Consultar',
        href: '/consultar',
        icon: Search,
        description: 'Resuelve tus dudas o encuentra normativa de contratación pública.',
        color: 'consultar',
        corto: 'Consultar',
        hijos: [
          {
            label: 'Chat con A-LexIA',
            href: '/chat',
            icon: MessageSquare,
            description: 'Pregunta por escrito y recibe la respuesta con su sustento citado.',
            color: 'consultar',
          },
          {
            label: 'Habla con A-LexIA',
            href: '/llamadas',
            icon: Mic,
            description: 'Consulta por voz, como si llamaras a un especialista.',
            color: 'consultar',
          },
          {
            label: 'Búsqueda avanzada',
            href: '/buscador',
            icon: SearchCode,
            description: 'Combina hasta ocho términos y encuentra jurisprudencia al párrafo.',
            color: 'consultar',
          },
        ],
      },
      {
        label: 'Generar',
        href: '/generar',
        icon: FilePlus2,
        description: 'Crea requerimientos y documentos para todas las etapas de la contratación.',
        color: 'generar',
        corto: 'Generar',
        hijos: [
          {
            label: 'Requerimiento',
            href: '/generador/requerimiento-plantilla',
            icon: ClipboardList,
            description:
              'Arma el requerimiento sobre los quince formatos oficiales: el texto obligatorio va tal cual y A-LexIA redacta lo que depende de tu contratación.',
            roles: ['entity', 'consultant'],
            color: 'generar',
          },
          {
            label: 'Documentos administrativos',
            href: '/generador',
            icon: FileSignature,
            description:
              'Informes, requerimientos de área usuaria, consultas, observaciones, apelaciones y descargos.',
            color: 'generar',
          },
        ],
      },
      {
        label: 'Evaluar',
        href: '/evaluar',
        icon: ClipboardCheck,
        description: 'Analiza bases, requerimientos y ofertas de manera objetiva.',
        color: 'evaluar',
        corto: 'Evaluar',
        hijos: [
          {
            label: 'Evaluación de requerimiento',
            href: '/revisor-tdr',
            icon: ScanSearch,
            description: 'Audita el TDR o las EETT antes de publicarlos: vicios y direccionamiento.',
            roles: ['entity', 'consultant'],
            color: 'evaluar',
          },
          {
            label: 'Evaluación de ofertas',
            href: '/evaluador',
            icon: FileSearch,
            description: 'Compara las bases con cada oferta y dictamina requisito por requisito.',
            roles: ['entity', 'consultant'],
            color: 'evaluar',
          },
          {
            label: 'Revisión de mi oferta',
            href: '/revision-oferta',
            icon: ShieldCheck,
            description: 'Audita tu propia oferta antes de presentarla.',
            roles: ['provider'],
            color: 'evaluar',
          },
        ],
      },
      {
        label: 'Biblioteca normativa',
        href: '/biblioteca',
        icon: Library,
        description:
          'Ley N.° 32069, su reglamento, opiniones, pronunciamientos, resoluciones del Tribunal, bases estándar y guías.',
        color: 'emerald',
        corto: 'Biblioteca',
      },
    ],
  },
  {
    label: 'Mi espacio',
    items: [
      {
        // Las carpetas de la biblioteca ya existen; esto es la puerta
        // directa. No se pone "Mis contrataciones" ni "Historial" del
        // mockup porque esas pantallas todavía no están construidas y
        // un menú que promete lo que no hay ya se reportó una vez.
        label: 'Guardados',
        href: '/biblioteca?guardados=1',
        icon: Bookmark,
        description: 'Las normas, resoluciones y opiniones que marcaste.',
        color: 'amber',
      },
      {
        label: 'Trámites RNP',
        href: '/rnp',
        icon: HardHat,
        description: 'Aumento de capacidad máxima de contratación, actualización financiera y requisitos.',
        roles: ['provider'],
        color: 'teal',
      },
    ],
  },
  {
    label: 'A-LexIA',
    items: [
      {
        label: 'Tu opinión',
        href: '/encuestas',
        icon: MessagesSquare,
        description: 'Cuéntanos tu experiencia y gana créditos para seguir usando la plataforma.',
        color: 'violet',
      },
      {
        label: 'Ajustes',
        href: '/ajustes',
        icon: Settings,
        description: 'Tu cuenta, tu perfil y tus preferencias.',
        color: 'slate',
      },
    ],
  },
];

/** ¿Este item le corresponde a este perfil? */
function visiblePara(item: MenuItem, role: ProfileRole | null): boolean {
  if (!item.roles || item.roles.length === 0) return true;
  if (!role) return false;
  return item.roles.includes(role);
}

/**
 * Devuelve los items visibles para un rol, manteniendo la estructura por
 * secciones y podando en dos niveles: un padre cuyos hijos se fueron
 * todos desaparece con ellos, porque llevaría a un centro de sección
 * vacío.
 */
export function getMenuFor(role: ProfileRole | null): MenuSection[] {
  return MENU_SECTIONS.map((section) => ({
    label: section.label,
    items: section.items
      .filter((item) => visiblePara(item, role))
      .map((item) => {
        if (!item.hijos) return item;
        const hijos = item.hijos.filter((h) => visiblePara(h, role));
        return { ...item, hijos };
      })
      .filter((item) => !item.hijos || item.hijos.length > 0),
  })).filter((s) => s.items.length > 0);
}

/** Versión lineal, padres e hijos — para la paleta de comandos y búsquedas. */
export function getFlatMenuFor(role: ProfileRole | null): MenuItem[] {
  return getMenuFor(role).flatMap((s) => s.items.flatMap((i) => [i, ...(i.hijos || [])]));
}

/** Los hijos de un verbo, ya filtrados — lo que pinta cada centro de sección. */
export function hijosDe(href: string, role: ProfileRole | null): MenuItem[] {
  for (const s of getMenuFor(role)) {
    for (const i of s.items) {
      if (i.href === href) return i.hijos || [];
    }
  }
  return [];
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
