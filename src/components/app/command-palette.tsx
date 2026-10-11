'use client';

import { useEffect, useState } from 'react';
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
  Search,
  FileText,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { reconocerNumeroDeDocumento } from '@/lib/busqueda/numero-de-documento';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DocumentoHallado {
  document_id: string;
  doc_number: string | null;
  doc_title: string;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  /**
   * Lo que se escribe en el buscador global.
   *
   * La barra dice «Buscar normativa, resoluciones, documentos…», pero la
   * paleta solo sabía de acciones: César escribía «9056-2026», pulsaba
   * Enter y no pasaba nada (documento 13, 10/10/2026). Ahora, si lo
   * escrito es un número de documento, se busca por número y Enter abre
   * el primero; con cualquier otro texto, Enter lo busca en la biblioteca.
   */
  const [busqueda, setBusqueda] = useState('');
  const [documentos, setDocumentos] = useState<DocumentoHallado[]>([]);
  const texto = busqueda.trim();
  /** El elemento resaltado: el que abre Enter. */
  const [resaltado, setResaltado] = useState('');
  const valorDeDocumento = (id: string) => `${id} ${texto}`.toLowerCase();

  // La respuesta llega después de que cmdk ya resaltó «Buscar en la
  // biblioteca»: sin esto, Enter buscaba en vez de abrir la resolución.
  useEffect(() => {
    if (documentos.length > 0) setResaltado(valorDeDocumento(documentos[0].document_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentos]);

  useEffect(() => {
    if (!open) setBusqueda('');
  }, [open]);

  useEffect(() => {
    const ref = reconocerNumeroDeDocumento(texto);
    if (!ref) {
      setDocumentos([]);
      return;
    }
    let cancelado = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: texto, limit: 6 }),
        });
        const json = (await res.json()) as { porNumero?: boolean; results?: DocumentoHallado[] };
        if (!cancelado) setDocumentos(json.porNumero ? (json.results ?? []).slice(0, 6) : []);
      } catch {
        if (!cancelado) setDocumentos([]);
      }
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [texto]);

  function go(path: string) {
    onOpenChange(false);
    router.push(path);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      commandProps={{ value: resaltado, onValueChange: setResaltado }}
    >
      <CommandInput
        value={busqueda}
        onValueChange={setBusqueda}
        placeholder="Buscar normativa, resoluciones (p. ej. 9056-2026), acciones…"
      />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        {documentos.length > 0 && (
          <CommandGroup heading="Documentos">
            {documentos.map((d) => (
              <CommandItem
                key={d.document_id}
                // cmdk filtra por `value`: lleva lo escrito para que el
                // hallazgo por número no quede oculto por su filtro difuso.
                value={valorDeDocumento(d.document_id)}
                onSelect={() => go(`/biblioteca/documento/${d.document_id}`)}
              >
                <FileText />
                <span className="truncate">{d.doc_title || d.doc_number}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {texto.length >= 2 && (
          <CommandGroup heading="Biblioteca">
            <CommandItem
              value={`buscar en la biblioteca ${texto}`}
              onSelect={() => go(`/biblioteca?q=${encodeURIComponent(texto)}`)}
            >
              <Search />
              <span className="truncate">Buscar «{texto}» en la biblioteca</span>
            </CommandItem>
          </CommandGroup>
        )}

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
          <CommandItem onSelect={() => go('/generador')}>
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
            Ir a Chat A-LexIA
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
