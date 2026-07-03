'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';
import { Logo, LogoMark } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/lib/stores/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppUser } from '@/components/app/app-shell';
import { getMenuFor, colorClasses, type MenuSection } from '@/lib/navigation/menu-by-role';

interface Props {
  user: AppUser;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ user, mobileOpen, onMobileClose }: Props) {
  const pathname = usePathname();
  const storedCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Antes de hidratar, asumimos no-colapsado para coincidir con el server-render.
  const collapsed = mounted ? storedCollapsed : false;

  const sections = useMemo(() => getMenuFor(user.profile_role), [user.profile_role]);

  // Cerrar drawer al navegar
  useEffect(() => {
    if (mobileOpen && onMobileClose) onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Desktop sidebar — siempre visible md+ */}
      <DesktopSidebar
        collapsed={collapsed}
        onToggle={toggle}
        pathname={pathname}
        sections={sections}
      />

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="dark fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col border-r border-white/10 bg-[hsl(218_95%_13%)] text-white shadow-2xl md:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b border-white/10 px-4 [&_img]:brightness-0 [&_img]:invert [&_img]:opacity-95">
                <Logo href="/app" size="md" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onMobileClose}
                  aria-label="Cerrar"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SidebarBody collapsed={false} pathname={pathname} sections={sections} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function DesktopSidebar({
  collapsed,
  onToggle,
  pathname,
  sections,
}: {
  collapsed: boolean;
  onToggle: () => void;
  pathname: string | null;
  sections: MenuSection[];
}) {
  return (
    <aside
      className={cn(
        // Fondo azul oscuro brand LexIA (#021D40) — feedback César
        // 01/07/2026: "el slider debería mejorar con un fondo azul oscuro
        // para que se vea mejor". Aplicamos tema oscuro fijo al sidebar
        // independiente del tema global (dark/light) usando la clase
        // 'dark' de Tailwind para que los componentes hijos usen sus
        // variantes dark automáticamente.
        'dark hidden md:flex fixed inset-y-0 left-0 z-30 flex-col border-r transition-[width] duration-200',
        'bg-[hsl(218_95%_13%)] border-white/10 text-white',
        collapsed ? 'w-16' : 'w-[264px]',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-white/10',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
          // Los logos actuales son PNG con letras oscuras diseñados para
          // fondo claro. Filtro CSS los convierte a blanco puro para que
          // se vean sobre el nuevo fondo azul oscuro. La opacidad 0.95
          // mantiene un poco de suavidad para que no compita con el texto.
          '[&_img]:brightness-0 [&_img]:invert [&_img]:opacity-95',
        )}
      >
        {collapsed ? (
          <Link href="/app" className="flex items-center justify-center">
            <LogoMark size="lg" />
          </Link>
        ) : (
          <Logo href="/app" size="md" />
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className={cn('text-white/70 hover:text-white hover:bg-white/10', collapsed && 'hidden')}
          aria-label="Colapsar sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <SidebarBody collapsed={collapsed} pathname={pathname} sections={sections} onToggle={onToggle} />
    </aside>
  );
}

function SidebarBody({
  collapsed,
  pathname,
  sections,
  onToggle,
}: {
  collapsed: boolean;
  pathname: string | null;
  sections: MenuSection[];
  onToggle?: () => void;
}) {
  function isActive(href: string) {
    if (href === '/app') return pathname === '/app';
    return pathname?.startsWith(href);
  }

  return (
    <>
      <div className={cn('p-3', collapsed && 'px-2')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="default" size="icon" className="w-full">
                <Link href="/chat?new=1" aria-label="Nueva conversación">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Nueva conversación</TooltipContent>
          </Tooltip>
        ) : (
          <Button asChild variant="default" size="default" className="w-full justify-start">
            <Link href="/chat?new=1">
              <Plus className="h-4 w-4" />
              Nueva conversación
            </Link>
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <div
              className={cn(
                'mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/50',
                collapsed && 'hidden',
              )}
            >
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                const disabled = item.comingSoon === true;
                // Sistema de colores por sección (feedback de César 30/06/2026:
                // "no se usan los demás colores de la marca"). Cada item tiene
                // un color asignado en menu-by-role.ts. El cuadrado del ícono
                // usa ese color en bg + fg.
                const colors = colorClasses(item.color);
                const content = (
                  <Link
                    href={disabled ? '#' : item.href}
                    aria-disabled={disabled}
                    onClick={(e) => {
                      if (disabled) e.preventDefault();
                    }}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                      collapsed && 'justify-center px-0',
                      disabled
                        ? 'text-white/40 cursor-not-allowed'
                        : active
                          ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                          : 'text-white/75 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    {/* Ícono en cuadrado de color por sección */}
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-transform',
                        disabled ? 'bg-white/10 text-white/40' : colors.bg,
                        !disabled && 'group-hover:scale-105',
                      )}
                    >
                      <Icon
                        className={cn('h-3.5 w-3.5', !disabled && colors.fg)}
                        strokeWidth={2}
                      />
                    </span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && active && !disabled && (
                      <span className={cn('ml-auto h-1.5 w-1.5 rounded-full', colors.dot)} />
                    )}
                    {!collapsed && disabled && (
                      <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/60">
                        Pronto
                      </span>
                    )}
                  </Link>
                );
                return (
                  <li key={`${section.label}-${item.href}`}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{content}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn('border-t border-white/10 p-3 space-y-1', collapsed && 'px-2')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="icon" className="w-full text-white/70 hover:text-white hover:bg-white/10">
                <Link href="/ajustes">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Ajustes</TooltipContent>
          </Tooltip>
        ) : (
          <Button asChild variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10">
            <Link href="/ajustes">
              <Settings className="h-4 w-4" />
              Ajustes
            </Link>
          </Button>
        )}
        {collapsed && onToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="w-full text-white/70 hover:text-white hover:bg-white/10"
                aria-label="Expandir sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expandir</TooltipContent>
          </Tooltip>
        )}
      </div>
    </>
  );
}
