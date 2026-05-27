'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FolderPlus,
  Inbox,
  MoreHorizontal,
  Pencil,
  Trash2,
  Layers,
  Sparkles,
  BookmarkCheck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { FolderItem } from '@/components/app/library/library-view';

interface Props {
  folders: FolderItem[];
  unfiledCount: number;
  selectedFolderId: string | null | 'unfiled' | 'all-saved';
  onSelectFolder: (id: string | null | 'unfiled' | 'all-saved') => void;
  onCreated: (f: FolderItem) => void;
  onChanged: (f: FolderItem[]) => void;
}

const FOLDER_COLORS = ['indigo', 'emerald', 'sky', 'amber', 'fuchsia', 'rose'];

export function FoldersPanel({
  folders,
  unfiledCount,
  selectedFolderId,
  onSelectFolder,
  onCreated,
  onChanged,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('indigo');
  const [renaming, setRenaming] = useState<FolderItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState<FolderItem | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor, icon: 'folder' }),
      });
      if (!res.ok) throw new Error();
      const { folder } = await res.json();
      onCreated(folder);
      setNewName('');
      setCreating(false);
      toast.success('Carpeta creada');
    } catch {
      toast.error('No se pudo crear la carpeta');
    } finally {
      setBusy(false);
    }
  }

  async function onRename() {
    if (!renaming || !renameValue.trim()) return;
    const id = renaming.id;
    const value = renameValue.trim();
    setRenaming(null);
    onChanged(folders.map((f) => (f.id === id ? { ...f, name: value } : f)));
    const res = await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value }),
    });
    if (!res.ok) {
      toast.error('No se pudo renombrar');
      onChanged(folders);
    } else {
      toast.success('Carpeta renombrada');
    }
  }

  async function onDelete() {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    onChanged(folders.filter((f) => f.id !== id));
    const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('No se pudo eliminar la carpeta');
    } else {
      toast.success('Carpeta eliminada');
    }
  }

  return (
    <>
      <Card className="p-4 lg:sticky lg:top-20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3 w-3" />
            Mis carpetas
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCreating(true)}
            aria-label="Nueva carpeta"
            className="text-muted-foreground hover:text-foreground"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>

        <ul className="space-y-0.5">
          <li>
            <FolderRow
              icon={<Sparkles className="h-3.5 w-3.5" />}
              name="Recientes"
              color="indigo"
              active={selectedFolderId === null}
              onClick={() => onSelectFolder(null)}
            />
          </li>
          {(unfiledCount + folders.reduce((sum, f) => sum + f.count, 0)) > 0 && (
            <li>
              <FolderRow
                icon={<BookmarkCheck className="h-3.5 w-3.5" />}
                name="Todos mis guardados"
                count={unfiledCount + folders.reduce((sum, f) => sum + f.count, 0)}
                color="emerald"
                active={selectedFolderId === 'all-saved'}
                onClick={() => onSelectFolder('all-saved')}
              />
            </li>
          )}
          {unfiledCount > 0 && (
            <li>
              <FolderRow
                icon={<Inbox className="h-3.5 w-3.5" />}
                name="Sin clasificar"
                count={unfiledCount}
                color="slate"
                active={selectedFolderId === 'unfiled'}
                onClick={() => onSelectFolder('unfiled')}
              />
            </li>
          )}
          <AnimatePresence initial={false}>
            {folders.map((f) => (
              <motion.li
                key={f.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <FolderRow
                  icon={<Folder className="h-3.5 w-3.5" />}
                  name={f.name}
                  count={f.count}
                  color={f.color}
                  active={selectedFolderId === f.id}
                  onClick={() => onSelectFolder(f.id)}
                  actions={
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 rounded p-0.5 hover:bg-background"
                          aria-label="Opciones"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenaming(f);
                            setRenameValue(f.name);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Renombrar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleting(f)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {folders.length === 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
            Crea carpetas para organizar los documentos guardados por temática.
          </p>
        )}
      </Card>

      {/* Create modal */}
      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva carpeta</DialogTitle>
            <DialogDescription>
              Organiza la normativa guardada por temática o cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nombre
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Apelaciones, Subsanaciones, Cliente X…"
                maxLength={60}
                autoFocus
                className="mt-1.5"
                onKeyDown={(e) => e.key === 'Enter' && onCreate()}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Color
              </label>
              <div className="mt-2 flex gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-all',
                      colorBg(c),
                      newColor === c
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105',
                    )}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button onClick={onCreate} loading={busy} disabled={!newName.trim()}>
              Crear carpeta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename modal */}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar carpeta</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            maxLength={60}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && onRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancelar
            </Button>
            <Button onClick={onRename}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar carpeta</DialogTitle>
            <DialogDescription>
              Los documentos guardados pasarán a "Sin clasificar". Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              Eliminar carpeta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FolderRow({
  icon,
  name,
  count,
  color,
  actions,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  name: string;
  count?: number;
  color: string;
  actions?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center rounded-md px-2 py-1.5 transition-colors',
        onClick && 'cursor-pointer',
        active
          ? 'bg-brand-100 text-brand-900 dark:bg-brand-950 dark:text-brand-200'
          : 'hover:bg-secondary',
      )}
    >
      <span className={cn('mr-2 flex h-5 w-5 items-center justify-center rounded', colorBg(color))}>
        {icon}
      </span>
      <span className={cn('flex-1 text-sm font-medium truncate', active && 'text-brand-900 dark:text-brand-200')}>
        {name}
      </span>
      {typeof count === 'number' && (
        <span
          className={cn(
            'text-[11px] font-mono tabular-nums',
            active ? 'text-brand-700 dark:text-brand-300' : 'text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
      {actions && <span className="ml-1">{actions}</span>}
    </div>
  );
}

function colorBg(c: string): string {
  return (
    {
      indigo: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
      emerald:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
      amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
      fuchsia:
        'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
      rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
      slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    }[c] || 'bg-secondary text-foreground'
  );
}
