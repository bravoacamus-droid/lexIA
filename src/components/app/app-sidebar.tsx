'use client';

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
} from 'lucide-react';
import { Logo, LogoMark } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/lib/stores/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
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
}

export function AppSidebar({ user }: Props) {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  function isActive(href: string) {
    if (href === '/app') return pathname === '/app';
    return pathname?.startsWith(href);
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-secondary/30 backdrop-blur-sm transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-[264px]',
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex h-14 items-center border-b border-border',
        collapsed ? 'justify-center px-2' : 'justify-between px-4',
      )}>
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
          onClick={toggle}
          className={cn(collapsed && 'hidden')}
          aria-label="Colapsar sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Primary CTA */}
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

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto scrollbar-thin px-2 py-2')}>
        <div className={cn(
          'mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
          collapsed && 'hidden',
        )}>
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
                <Icon className={cn('h-4 w-4 shrink-0', active && 'text-brand-700 dark:text-brand-400')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && active && (
                  <motion.span
                    layoutId="nav-active"
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-400"
                  />
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

      {/* Footer */}
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
        {collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
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
    </aside>
  );
}
