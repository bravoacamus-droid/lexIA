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

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar user={user} />
      <div
        className="flex-1 flex flex-col min-w-0 transition-[margin] duration-200"
        style={{
          marginLeft: sidebarCollapsed ? '64px' : '264px',
        }}
      >
        <AppTopbar user={user} onOpenPalette={() => setPaletteOpen(true)} />
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
