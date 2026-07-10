'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/app/app-sidebar';
import { AppTopbar } from '@/components/app/app-topbar';
import { CommandPalette } from '@/components/app/command-palette';
import { NavProgress } from '@/components/app/nav-progress';
import { useUiStore } from '@/lib/stores/ui';

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_role: 'entity' | 'provider' | 'consultant' | null;
  organization_name: string | null;
  is_admin: boolean;
}

interface Props {
  user: AppUser;
  children: React.ReactNode;
}

export function AppShell({ user, children }: Props) {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // En desktop el margen depende del estado colapsado (solo después de mount para evitar
  // hydration mismatch con el valor persistido en localStorage).
  // En mobile no aplica margen porque el sidebar es un drawer overlay.
  const desktopMargin = mounted && sidebarCollapsed ? '64px' : '264px';

  return (
    <div className="min-h-screen bg-background flex">
      <NavProgress />
      <AppSidebar
        user={user}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div
        className="flex-1 flex flex-col min-w-0 transition-[margin] duration-200 md:[margin-left:var(--desktop-margin)]"
        style={{ ['--desktop-margin' as never]: desktopMargin }}
      >
        <AppTopbar
          user={user}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />
        {/* IMPORTANTE (bug reportado por César 08/07/2026):
            Antes teníamos `overflow-x-hidden` para contener elementos
            anchos que provocaban scroll horizontal. Pero cualquier
            `overflow` (incluido `overflow-x`) rompe `position: sticky`
            de TODOS los descendientes — por eso el TOC "Contenido" de
            la biblioteca no quedaba pegado al hacer scroll.
            Reemplazamos por `overflow-x-clip`: recorta el desborde
            horizontal SIN crear un contexto de scroll, así los sticky
            de hijos siguen funcionando. */}
        <main className="flex-1 min-w-0 overflow-x-clip">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
