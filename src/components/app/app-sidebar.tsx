'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Library,
  FileSearch,
  FilePen,
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

const PRIMARY_NAV = [
  { label: 'Inicio', href: '/app', icon: LayoutDashboard },
  { label: 'Chat LexIA', href: '/chat', icon: MessageSquare, accent: true },
  { label: 'Biblioteca', href: '/biblioteca', icon: Library },
  { label: 'Evaluador', href: '/evaluador', icon: FileSearch },
  { label: 'Generador', href: '/generador', icon: FilePen },
];

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
              className="fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col border-r border-border bg-card shadow-2xl md:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b border-border px-4">
                <Logo href="/app" size="md" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onMobileClose}
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SidebarBody collapsed={false} pathname={pathname} />
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
}: {
  collapsed: boolean;
  onToggle: () => void;
  pathname: string | null;
}) {
  return (
    <aside
      className={cn(
        'hidden md:flex fixed inset-y-0 left-0 z-30 flex-col border-r border-border bg-secondary/30 backdrop-blur-sm transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-[264px]',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-border',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
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
          className={cn(collapsed && 'hidden')}
          aria-label="Colapsar sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <SidebarBody collapsed={collapsed} pathname={pathname} onToggle={onToggle} />
    </aside>
  );
}

function SidebarBody({
  collapsed,
  pathname,
  onToggle,
}: {
  collapsed: boolean;
  pathname: string | null;
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

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
        <div
          className={cn(
            'mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
            collapsed && 'hidden',
          )}
        >
          Navegación
        </div>
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const content = (
              <Link
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  active
                    ? 'bg-brand-100 text-brand-900 dark:bg-brand-950 dark:text-brand-200'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    active && 'text-brand-700 dark:text-brand-400',
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-400" />
                )}
              </Link>
            );
            return (
              <li key={item.href}>
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
      </nav>

      <div className={cn('border-t border-border p-3 space-y-1', collapsed && 'px-2')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="icon" className="w-full">
                <Link href="/ajustes">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Ajustes</TooltipContent>
          </Tooltip>
        ) : (
          <Button asChild variant="ghost" className="w-full justify-start text-muted-foreground">
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
                className="w-full"
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
