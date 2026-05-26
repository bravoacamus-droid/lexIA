'use client';

import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  MessageSquare,
  Library,
  FileSearch,
  FilePen,
  LayoutDashboard,
  Plus,
  Settings,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  function go(path: string) {
    onOpenChange(false);
    router.push(path);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar acciones, normativa, conversaciones…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        <CommandGroup heading="Acciones rápidas">
          <CommandItem onSelect={() => go('/chat?new=1')}>
            <Plus />
            Nueva conversación
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go('/evaluador/nuevo')}>
            <FileSearch />
            Nueva evaluación de ofertas
          </CommandItem>
          <CommandItem onSelect={() => go('/generador/nuevo')}>
            <FilePen />
            Generar nuevo documento
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navegación">
          <CommandItem onSelect={() => go('/app')}>
            <LayoutDashboard />
            Ir a Inicio
          </CommandItem>
          <CommandItem onSelect={() => go('/chat')}>
            <MessageSquare />
            Ir a Chat LexIA
          </CommandItem>
          <CommandItem onSelect={() => go('/biblioteca')}>
            <Library />
            Ir a Biblioteca
          </CommandItem>
          <CommandItem onSelect={() => go('/evaluador')}>
            <FileSearch />
            Ir a Evaluador
          </CommandItem>
          <CommandItem onSelect={() => go('/generador')}>
            <FilePen />
            Ir a Generador
          </CommandItem>
          <CommandItem onSelect={() => go('/ajustes')}>
            <Settings />
            Ir a Ajustes
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Apariencia">
          <CommandItem
            onSelect={() => {
              setTheme(isDark ? 'light' : 'dark');
              onOpenChange(false);
            }}
          >
            {isDark ? <Sun /> : <Moon />}
            Cambiar a tema {isDark ? 'claro' : 'oscuro'}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Cuenta">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              const form = document.createElement('form');
              form.method = 'POST';
              form.action = '/auth/signout';
              document.body.appendChild(form);
              form.submit();
            }}
            className="text-destructive"
          >
            <LogOut />
            Cerrar sesión
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
