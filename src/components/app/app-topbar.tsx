'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  LogOut,
  Sun,
  Moon,
  Menu,
  UserCircle,
  CreditCard,
  ShieldCheck,
  Bell,
  Wrench,
  ChevronDown,
} from 'lucide-react';
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
import { getInitials } from '@/lib/utils';
import { useTheme } from 'next-themes';
import type { AppUser } from '@/components/app/app-shell';
import { ROLE_LABELS } from '@/lib/navigation/menu-by-role';
import { Isotipo } from '@/components/marca/logo-alexia';
import Link from 'next/link';

interface Props {
  user: AppUser;
  onOpenPalette: () => void;
  onOpenMobileSidebar?: () => void;
}

/**
 * La barra superior.
 *
 * Ya no lleva el título de la página: cada pantalla trae su propia miga
 * de pan y su encabezado, que es donde el mockup los pone. Lo que queda
 * es lo que sirve desde cualquier sitio — el buscador global, el tema,
 * los avisos y la cuenta— y en el centro, para que el buscador esté
 * siempre en el mismo lugar.
 */
export function AppTopbar({ user, onOpenPalette, onOpenMobileSidebar }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const oscuro = resolvedTheme === 'dark';
  const nombre = (user.full_name || '').trim().split(/\s+/)[0] || 'de nuevo';
  const oficio = user.profile_role
    ? ROLE_LABELS[user.profile_role]
    : user.organization_name || 'Contrataciones del Estado';

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:gap-4 sm:px-6">
      {onOpenMobileSidebar && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onOpenMobileSidebar}
          className="md:hidden"
          aria-label="Abrir el menú"
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}
      <Link href="/app" className="md:hidden" aria-label="A-LexIA">
        <Isotipo alto={22} />
      </Link>

      <div className="mx-auto hidden w-full max-w-2xl sm:flex">
        <button
          onClick={onOpenPalette}
          className="flex w-full items-center gap-2.5 rounded-full border border-border bg-secondary/50 px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-brand-400 hover:bg-secondary"
          aria-label="Abrir el buscador global"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 truncate text-left">
            Buscar normativa, resoluciones, documentos, acciones…
          </span>
          <kbd className="inline-flex shrink-0 items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
            Ctrl + K
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:ml-0">
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          onClick={onOpenPalette}
          aria-label="Buscar"
        >
          <Search className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(oscuro ? 'light' : 'dark')}
          aria-label={oscuro ? 'Pasar al tema claro' : 'Pasar al tema oscuro'}
        >
          {!mounted ? (
            <Moon className="h-4 w-4" />
          ) : oscuro ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <Button variant="ghost" size="icon-sm" asChild aria-label="Avisos">
          <Link href="/cuenta/notificaciones">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-1.5 transition-colors hover:bg-accent sm:pr-2.5"
            >
              <span className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {getInitials(user.full_name || user.email)}
                  </AvatarFallback>
                </Avatar>
                {/* El punto del perfil activo — pedido de César el
                    30/06/2026: saber de un vistazo en qué perfil está. */}
                {user.profile_role && (
                  <span
                    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${
                      user.profile_role === 'entity'
                        ? 'bg-sky-500'
                        : user.profile_role === 'provider'
                          ? 'bg-amber-500'
                          : 'bg-violet-500'
                    }`}
                    aria-label={`Perfil: ${ROLE_LABELS[user.profile_role]}`}
                  />
                )}
              </span>
              <span className="hidden min-w-0 flex-col items-start leading-tight lg:flex">
                <span className="truncate text-[13px] font-semibold text-foreground">
                  Hola, {nombre}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">{oficio}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground lg:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {user.full_name || 'Tu cuenta'}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
                {user.organization_name && (
                  <span className="mt-0.5 truncate text-[10px] text-muted-foreground/80">
                    {user.organization_name}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/cuenta/perfil">
                <UserCircle className="h-4 w-4" />
                Mi perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/cuenta/suscripcion">
                <CreditCard className="h-4 w-4" />
                Suscripción y consumo
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/cuenta/notificaciones">
                <Bell className="h-4 w-4" />
                Notificaciones
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/cuenta/seguridad">
                <ShieldCheck className="h-4 w-4" />
                Seguridad
              </Link>
            </DropdownMenuItem>
            {user.is_admin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <Wrench className="h-4 w-4" />
                    Panel administrador
                  </Link>
                </DropdownMenuItem>
              </>
            )}
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
