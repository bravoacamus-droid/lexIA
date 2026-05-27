'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/app/app-sidebar';
import { AppTopbar } from '@/components/app/app-topbar';
import { CommandPalette } from '@/components/app/command-palette';
import { useUiStore } from '@/lib/stores/ui';

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
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
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
