'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder, Inbox, FolderPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { FolderItem } from '@/components/app/library/library-view';

interface Props {
  documentId: string | null;
  folders: FolderItem[];
  onClose: () => void;
  onSaved: (folderId: string | null) => void;
  onFolderCreated: (f: FolderItem) => void;
}

export function SaveToFolderDialog({
  documentId,
  folders,
  onClose,
  onSaved,
  onFolderCreated,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!documentId) return;
    setBusy(true);
    try {
      let folderId = selected;
      if (creatingName.trim()) {
        const r = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: creatingName.trim() }),
        });
        if (!r.ok) throw new Error();
        const { folder } = await r.json();
        onFolderCreated(folder);
        folderId = folder.id;
      }
      const res = await fetch('/api/saved-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId, folder_id: folderId }),
      });
      if (!res.ok) throw new Error();
      toast.success('Guardado en la biblioteca');
      onSaved(folderId);
      setSelected(null);
      setCreatingName('');
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!documentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guardar en biblioteca</DialogTitle>
          <DialogDescription>
            Elige una carpeta de destino o déjalo sin clasificar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          <FolderOption
            selected={selected === null}
            onClick={() => setSelected(null)}
            icon={<Inbox className="h-4 w-4" />}
            name="Sin clasificar"
          />
          {folders.map((f) => (
            <FolderOption
              key={f.id}
              selected={selected === f.id}
              onClick={() => setSelected(f.id)}
              icon={<Folder className="h-4 w-4" />}
              name={f.name}
              count={f.count}
            />
          ))}
        </div>

        <div className="pt-2 border-t border-border">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            O crear una nueva
          </label>
          <div className="relative mt-1.5">
            <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={creatingName}
              onChange={(e) => setCreatingName(e.target.value)}
              placeholder="Nombre de la nueva carpeta…"
              className="pl-10"
              maxLength={60}
            />
          </div>
          {creatingName.trim() && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Se creará la carpeta y se guardará allí el documento.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FolderOption({
  selected,
  onClick,
  icon,
  name,
  count,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  name: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
        selected
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
          : 'border-border hover:bg-secondary',
      )}
    >
      <span
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-md',
          selected
            ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
            : 'bg-secondary text-muted-foreground',
        )}
      >
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium">{name}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
          {count}
        </span>
      )}
      {selected && <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
    </button>
  );
}
