'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { Isotipo, MarcaLateral } from '@/components/marca/logo-alexia';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/lib/stores/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppUser, ResumenDePlan } from '@/components/app/app-shell';
import {
  getMenuFor,
  colorClasses,
  MENU_SECTIONS,
  type MenuItem,
  type MenuSection,
} from '@/lib/navigation/menu-by-role';
import { TarjetaDePlan } from '@/components/app/tarjeta-de-plan';
import { SelloDelEstado } from '@/components/app/sello-del-estado';

interface Props {
  user: AppUser;
  plan: ResumenDePlan | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ user, plan, mobileOpen, onMobileClose }: Props) {
  const pathname = usePathname();
  // Dos entradas apuntan a /biblioteca y solo las distingue el
  // parámetro (`?guardados=1`). Sin mirarlo, las dos se encendían a
  // la vez y no se sabía dónde se estaba.
  const parametros = useSearchParams();
  const donde: Donde = { ruta: pathname, parametros };
  const storedCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Antes de hidratar asumimos no-colapsado para coincidir con el render del servidor.
  const collapsed = mounted ? storedCollapsed : false;

  const sections = useMemo(() => getMenuFor(user.profile_role), [user.profile_role]);

  // Cerrar el cajón al navegar
  useEffect(() => {
    if (mobileOpen && onMobileClose) onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <BarraDeEscritorio
        collapsed={collapsed}
        onToggle={toggle}
        donde={donde}
        sections={sections}
        plan={plan}
      />

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-noche-950/70 backdrop-blur-sm md:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="dark fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col border-r border-white/10 bg-noche-900 text-white shadow-2xl md:hidden"
            >
              <div className="flex items-start justify-between border-b border-white/10 px-4 py-3.5">
                <MarcaLateral />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onMobileClose}
                  aria-label="Cerrar"
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CuerpoDeLaBarra
                collapsed={false}
                donde={donde}
                sections={sections}
                plan={plan}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function BarraDeEscritorio({
  collapsed,
  onToggle,
  donde,
  sections,
  plan,
}: {
  collapsed: boolean;
  onToggle: () => void;
  donde: Donde;
  sections: MenuSection[];
  plan: ResumenDePlan | null;
}) {
  return (
    <aside
      className={cn(
        // La barra lleva tema oscuro fijo, sea cual sea el tema global:
        // la clase `dark` hace que los componentes de dentro tomen solos
        // su variante oscura.
        'dark fixed inset-y-0 left-0 z-30 hidden flex-col border-r transition-[width] duration-200 md:flex',
        'border-white/10 bg-noche-900 text-white',
        collapsed ? 'w-16' : 'w-[264px]',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-start border-b border-white/10',
          collapsed ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3.5',
        )}
      >
        {collapsed ? (
          <Link href="/app" className="flex items-center justify-center" aria-label="A-LexIA">
            <Isotipo alto={26} />
          </Link>
        ) : (
          <MarcaLateral />
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className={cn(
            '-mr-1 text-white/60 hover:bg-white/10 hover:text-white',
            collapsed && 'hidden',
          )}
          aria-label="Plegar la barra lateral"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <CuerpoDeLaBarra
        collapsed={collapsed}
        donde={donde}
        sections={sections}
        plan={plan}
        onToggle={onToggle}
      />
    </aside>
  );
}

function CuerpoDeLaBarra({
  collapsed,
  donde,
  sections,
  plan,
  onToggle,
}: {
  collapsed: boolean;
  donde: Donde;
  sections: MenuSection[];
  plan: ResumenDePlan | null;
  onToggle?: () => void;
}) {
  return (
    <>
      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div key={section.label || 'principal'}>
            {section.label && (
              <div
                className={cn(
                  'mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40',
                  collapsed && 'hidden',
                )}
              >
                {section.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <EntradaDelMenu
                  key={`${section.label}-${item.href}`}
                  item={item}
                  donde={donde}
                  collapsed={collapsed}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {plan && !collapsed && (
        <div className="shrink-0 px-3 pb-2">
          <TarjetaDePlan plan={plan} />
        </div>
      )}

      <div
        className={cn(
          'shrink-0 border-t border-white/10',
          collapsed ? 'px-2 py-2' : 'px-4 py-3.5',
        )}
      >
        {collapsed ? (
          onToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="w-full text-white/60 hover:bg-white/10 hover:text-white"
                  aria-label="Desplegar la barra lateral"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Desplegar</TooltipContent>
            </Tooltip>
          )
        ) : (
          <div className="flex items-center gap-3">
            <SelloDelEstado className="h-8 w-8 shrink-0 text-white/45" />
            <p className="text-[9.5px] font-semibold uppercase leading-[1.5] tracking-[0.1em] text-white/45">
              Contrataciones
              <br />
              más transparentes
              <br />
              para un mejor Estado
            </p>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Una entrada del menú. Si tiene hijos se despliega: el propio padre es
 * además un enlace al centro de la sección, así que el clic en el rótulo
 * navega y el clic en la flecha abre. Mezclar las dos cosas en un solo
 * botón obligaba a entrar por el centro para llegar a cualquier
 * herramienta.
 */
function EntradaDelMenu({
  item,
  donde,
  collapsed,
}: {
  item: MenuItem;
  donde: Donde;
  collapsed: boolean;
}) {
  const hijos = item.hijos || [];
  const tieneHijos = hijos.length > 0;
  const activo = esActiva(item.href, donde);
  const hijoActivo = hijos.some((h) => esActiva(h.href, donde));
  const [abierto, setAbierto] = useState(hijoActivo);

  // Al navegar a un hijo, el padre se abre solo.
  useEffect(() => {
    if (hijoActivo) setAbierto(true);
  }, [hijoActivo]);

  const colores = colorClasses(item.color);
  const Icono = item.icon;
  const deshabilitado = item.comingSoon === true;

  const enlace = (
    <Link
      href={deshabilitado ? '#' : item.href}
      aria-disabled={deshabilitado}
      onClick={(e) => {
        if (deshabilitado) e.preventDefault();
      }}
      className={cn(
        'group flex flex-1 items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-0',
        deshabilitado
          ? 'cursor-not-allowed text-white/40'
          : activo || (hijoActivo && !abierto)
            ? 'bg-white/10 text-white ring-1 ring-white/10'
            : 'text-white/75 hover:bg-white/10 hover:text-white',
      )}
    >
      <span
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-transform',
          deshabilitado ? 'bg-white/10 text-white/40' : colores.bg,
          !deshabilitado && 'group-hover:scale-105',
        )}
      >
        <Icono className={cn('h-3.5 w-3.5', !deshabilitado && colores.fg)} strokeWidth={2} />
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && activo && !deshabilitado && !tieneHijos && (
        <span className={cn('ml-auto h-1.5 w-1.5 rounded-full', colores.dot)} />
      )}
      {!collapsed && deshabilitado && (
        <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/60">
          Pronto
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>{enlace}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      </li>
    );
  }

  return (
    <li>
      <div className="flex items-center">
        {enlace}
        {tieneHijos && (
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-label={`${abierto ? 'Plegar' : 'Desplegar'} ${item.label}`}
            className="ml-0.5 rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', abierto && 'rotate-180')}
            />
          </button>
        )}
      </div>

      {tieneHijos && (
        <AnimatePresence initial={false}>
          {abierto && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="ml-[22px] mt-0.5 space-y-0.5 border-l border-white/10 pl-2.5">
                {hijos.map((h) => {
                  const act = esActiva(h.href, donde);
                  return (
                    <li key={h.href}>
                      <Link
                        href={h.href}
                        className={cn(
                          'flex items-start gap-2 rounded-md px-2 py-1.5 text-[13px] leading-snug transition-colors',
                          act
                            ? 'bg-white/10 font-medium text-white'
                            : 'text-white/60 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        <h.icon className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                        {/* Sin `truncate`: «Documentos de ejecución
                            contractual» no cabe en una línea y cortado
                            no se entiende. Cae a dos, como en el mockup. */}
                        <span className="min-w-0 flex-1">{h.label}</span>
                        {act && (
                          <span
                            className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', colores.dot)}
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </div>
            </motion.ul>
          )}
        </AnimatePresence>
      )}
    </li>
  );
}

/** Dónde está la persona: la ruta y los parámetros de la URL. */
interface Donde {
  ruta: string | null;
  parametros: ReturnType<typeof useSearchParams>;
}

/** Todas las entradas del menú, padres e hijos, en una sola lista. */
function todasLasEntradas(): MenuItem[] {
  const fuera: MenuItem[] = [];
  for (const seccion of MENU_SECTIONS) {
    for (const item of seccion.items) {
      fuera.push(item, ...(item.hijos || []));
    }
  }
  return fuera;
}

/** ¿La URL cae dentro de esta entrada? Sin decidir todavía si es la mejor. */
function encaja(href: string, donde: Donde): boolean {
  const { ruta: actual, parametros } = donde;
  if (!actual) return false;
  const [ruta, consulta] = href.split('?');

  const mismaRuta =
    ruta === '/app' ? actual === '/app' : actual === ruta || actual.startsWith(`${ruta}/`);
  if (!mismaRuta) return false;

  if (!consulta) return true;
  const pedidos = new URLSearchParams(consulta);
  for (const [clave, valor] of pedidos.entries()) {
    if (parametros?.get(clave) !== valor) return false;
  }
  return true;
}

/** Cuán específica es una entrada: gana la ruta más larga y, a igualdad, la que exige parámetros. */
function precision(href: string): number {
  const [ruta, consulta] = href.split('?');
  return ruta.length * 10 + (consulta ? new URLSearchParams(consulta).size : 0);
}

/**
 * Qué cuenta como «estoy aquí».
 *
 * No basta con que la URL caiga dentro de la entrada: varias entradas
 * pueden contenerla a la vez. `/generador/requerimiento-plantilla` cae
 * dentro de `/generador`, y `/biblioteca?guardados=1` cae dentro de
 * `/biblioteca`; sin desempate se encendían las dos y no se sabía dónde
 * se estaba. Gana **la más específica**: la de ruta más larga y, a
 * igualdad de ruta, la que además exige parámetros.
 */
function esActiva(href: string, donde: Donde): boolean {
  if (!encaja(href, donde)) return false;
  const mia = precision(href);
  return !todasLasEntradas().some((otra) => encaja(otra.href, donde) && precision(otra.href) > mia);
}
