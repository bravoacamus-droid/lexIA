'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pin,
  PinOff,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageSquarePlus,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, groupDateLabel, truncate } from '@/lib/utils';
import { toast } from 'sonner';
import { useConversations, type ConvoMini } from '@/lib/stores/conversations';

interface Props {
  initialConversations: ConvoMini[];
}

export function ConversationSidebar({ initialConversations }: Props) {
  const router = useRouter();
  const params = useParams();
  const activeId = (params?.id as string) || null;

  const conversations = useConversations((s) => s.conversations);
  const setAll = useConversations((s) => s.set);
  const patch = useConversations((s) => s.patch);
  const remove = useConversations((s) => s.remove);

  const [filter, setFilter] = useState('');
  const [renaming, setRenaming] = useState<ConvoMini | null>(null);
  const [deleting, setDeleting] = useState<ConvoMini | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAll(initialConversations);
  }, [initialConversations, setAll]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      (c.title || 'Nueva conversación').toLowerCase().includes(q),
    );
  }, [conversations, filter]);

  const grouped = useMemo(() => {
    const pinned = filtered.filter((c) => c.pinned);
    const rest = filtered.filter((c) => !c.pinned);
    const groups = new Map<string, ConvoMini[]>();
    for (const c of rest) {
      const key = groupDateLabel(c.updated_at);
      groups.set(key, [...(groups.get(key) || []), c]);
    }
    return { pinned, groups };
  }, [filtered]);

  async function createNew() {
    setBusy(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('create failed');
      const { conversation } = await res.json();
      useConversations.getState().upsert(conversation);
      router.push(`/chat/${conversation.id}`);
    } catch {
      toast.error('No se pudo crear la conversación');
    } finally {
      setBusy(false);
    }
  }

  async function togglePin(c: ConvoMini) {
    patch(c.id, { pinned: !c.pinned });
    const res = await fetch(`/api/conversations/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !c.pinned }),
    });
    if (!res.ok) {
      patch(c.id, { pinned: c.pinned });
      toast.error('No se pudo fijar');
    } else {
      toast.success(!c.pinned ? 'Fijada' : 'Sin fijar');
    }
  }

  async function confirmRename() {
    if (!renaming) return;
    const newTitle = renameValue.trim().slice(0, 80);
    if (!newTitle) return;
    const original = renaming.title;
    patch(renaming.id, { title: newTitle });
    setRenaming(null);
    const res = await fetch(`/api/conversations/${renaming.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    if (!res.ok) {
      patch(renaming.id, { title: original });
      toast.error('No se pudo renombrar');
    } else {
      toast.success('Renombrada');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    const wasActive = activeId === id;
    remove(id);
    setDeleting(null);
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('No se pudo eliminar');
    } else {
      toast.success('Eliminada');
      if (wasActive) router.push('/chat');
    }
  }

  return (
    <>
      <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-border bg-secondary/20">
        {/* Header */}
        <div className="p-3 space-y-2 border-b border-border">
          <Button onClick={createNew} loading={busy} className="w-full justify-start">
            <MessageSquarePlus className="h-4 w-4" />
            Nueva conversación
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar..."
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-4">
          {grouped.pinned.length > 0 && (
            <Group
              label="Fijadas"
              items={grouped.pinned}
              activeId={activeId}
              onPin={togglePin}
              onRename={(c) => {
                setRenaming(c);
                setRenameValue(c.title || '');
              }}
              onDelete={(c) => setDeleting(c)}
              showPinIcon
            />
          )}

          {['Hoy', 'Ayer', 'Esta semana', 'Anterior'].map((label) => {
            const items = grouped.groups.get(label);
            if (!items || items.length === 0) return null;
            return (
              <Group
                key={label}
                label={label}
                items={items}
                activeId={activeId}
                onPin={togglePin}
                onRename={(c) => {
                  setRenaming(c);
                  setRenameValue(c.title || '');
                }}
                onDelete={(c) => setDeleting(c)}
              />
            );
          })}

          {filtered.length === 0 && (
            <p className="text-xs text-center text-muted-foreground py-8">
              {filter
                ? 'Sin resultados'
                : 'Aún no tienes conversaciones. Inicia una arriba.'}
            </p>
          )}
        </div>
      </aside>

      {/* Rename dialog */}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar conversación</DialogTitle>
            <DialogDescription>
              Cambia el título visible en la barra lateral.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Título"
            maxLength={80}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmRename}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar conversación</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará{' '}
              <span className="font-medium text-foreground">
                "{deleting?.title || 'Nueva conversación'}"
              </span>{' '}
              y todos sus mensajes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface GroupProps {
  label: string;
  items: ConvoMini[];
  activeId: string | null;
  onPin: (c: ConvoMini) => void;
  onRename: (c: ConvoMini) => void;
  onDelete: (c: ConvoMini) => void;
  showPinIcon?: boolean;
}

function Group({
  label,
  items,
  activeId,
  onPin,
  onRename,
  onDelete,
  showPinIcon,
}: GroupProps) {
  return (
    <div>
      <h3 className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      <ul className="space-y-0.5">
        <AnimatePresence initial={false}>
          {items.map((c) => (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div
                className={cn(
                  'group relative flex items-center rounded-md transition-colors',
                  activeId === c.id
                    ? 'bg-brand-100 text-brand-900 dark:bg-brand-950 dark:text-brand-200'
                    : 'hover:bg-secondary',
                )}
              >
                <Link
                  href={`/chat/${c.id}`}
                  className="flex-1 flex items-center gap-2 px-2.5 py-2 min-w-0"
                >
                  {showPinIcon && <Pin className="h-3 w-3 shrink-0 text-amber-500" />}
                  <span className="text-[13px] font-medium truncate">
                    {c.title || 'Nueva conversación'}
                  </span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 mr-1 rounded p-1 hover:bg-background/60"
                      aria-label="Opciones"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => onPin(c)}>
                      {c.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      {c.pinned ? 'Quitar fijado' : 'Fijar arriba'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRename(c)}>
                      <Pencil className="h-4 w-4" />
                      Renombrar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(c)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
