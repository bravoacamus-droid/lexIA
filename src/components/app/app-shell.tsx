'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/app/app-sidebar';
import { AppTopbar } from '@/components/app/app-topbar';
import { BarraInferiorMovil } from '@/components/app/barra-inferior-movil';
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

/**
 * Lo que la barra lateral necesita saber del plan. Se calcula en el
 * layout (servidor) y baja como propiedad: la barra es un componente de
 * cliente y no puede consultar la base.
 */
export interface ResumenDePlan {
  etiqueta: string;
  /** La cuota más cerca de agotarse. `null` si el plan no tiene límites. */
  medidor: { usado: number; tope: number; unidad: string } | null;
  /** Fecha de renovación ya formateada, o `null` si no aplica. */
  renovacion: string | null;
}

interface Props {
  user: AppUser;
  plan: ResumenDePlan | null;
  children: React.ReactNode;
}

export function AppShell({ user, plan, children }: Props) {
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

  // En escritorio el margen depende de si la barra está plegada (solo
  // después de montar, para no chocar con el valor guardado en
  // localStorage). En móvil no hay margen: la barra es un cajón.
  const margenDeEscritorio = mounted && sidebarCollapsed ? '64px' : '264px';

  return (
    <div className="flex min-h-screen bg-background">
      <NavProgress />
      <AppSidebar
        user={user}
        plan={plan}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div
        className="flex min-w-0 flex-1 flex-col transition-[margin] duration-200 md:[margin-left:var(--margen-escritorio)]"
        style={{ ['--margen-escritorio' as never]: margenDeEscritorio }}
      >
        <AppTopbar
          user={user}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />
        {/* IMPORTANTE (fallo reportado por César el 08/07/2026):
            antes había `overflow-x-hidden` para contener elementos anchos
            que provocaban desplazamiento horizontal. Pero cualquier
            `overflow` —`overflow-x` incluido— rompe el `position: sticky`
            de TODOS los descendientes, y por eso el índice «Contenido»
            de la biblioteca no se quedaba pegado al desplazar.
            `overflow-x-clip` recorta el desborde SIN crear un contexto de
            desplazamiento, así que los `sticky` de dentro siguen vivos.
            El `pb-16 md:pb-0` deja sitio a la barra inferior del móvil. */}
        <main className="min-w-0 flex-1 overflow-x-clip pb-16 md:pb-0">{children}</main>
      </div>
      <BarraInferiorMovil role={user.profile_role} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
