'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { useTheme } from 'next-themes';
import type { AppUser } from '@/components/app/app-shell';
import Link from 'next/link';

const TITLES: Record<string, string> = {
  '/app': 'Inicio',
  '/chat': 'Chat LexIA',
  '/biblioteca': 'Biblioteca normativa',
  '/evaluador': 'Evaluador de ofertas',
  '/generador': 'Generador de documentos',
  '/ajustes': 'Ajustes',
};

interface Props {
  user: AppUser;
  onOpenPalette: () => void;
}

export function AppTopbar({ user, onOpenPalette }: Props) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const title =
    Object.entries(TITLES).find(([k]) => pathname?.startsWith(k))?.[1] || 'LexIA';

  const isDark = resolvedTheme === 'dark';

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-semibold truncate">{title}</h1>
      </div>

      <div className="flex-1 max-w-xl mx-auto hidden sm:flex">
        <button
          onClick={onOpenPalette}
          className={cn(
            'flex items-center w-full gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:border-brand-400 transition-colors',
          )}
          aria-label="Abrir buscador"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Buscar normativa, conversaciones, acciones…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">
            <span>⌘</span>K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" className="sm:hidden" onClick={onOpenPalette} aria-label="Buscar">
          <Search className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label="Cambiar tema"
        >
          {!mounted ? <Sun className="h-4 w-4" /> : isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="rounded-full">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                  {getInitials(user.full_name || user.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-foreground">
                  {user.full_name || 'Usuario LexIA'}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/ajustes">
                <Settings className="h-4 w-4" />
                Ajustes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
              <form action="/auth/signout" method="post" className="w-full">
                <button type="submit" className="flex w-full items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
