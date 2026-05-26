'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageSquare, FileSearch, FilePen, Inbox } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRelative } from '@/lib/utils';

type ActivityItem =
  | { type: 'chat'; id: string; title: string; timestamp: string }
  | { type: 'evaluation'; id: string; title: string; status: string; timestamp: string }
  | { type: 'document'; id: string; title: string; documentType: string; timestamp: string };

interface Props {
  items: ActivityItem[];
}

export function DashboardActivity({ items }: Props) {
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold tracking-tight">Actividad reciente</h2>
        <span className="text-xs text-muted-foreground">{items.length} eventos</span>
      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <motion.li
              key={`${item.type}-${item.id}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
            >
              <ActivityRow item={item} />
            </motion.li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  if (item.type === 'chat') {
    return (
      <Link
        href={`/chat/${item.id}`}
        className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-secondary transition-colors"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400">
          <MessageSquare className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <p className="text-[11px] text-muted-foreground">{formatRelative(item.timestamp)}</p>
        </div>
        <Badge variant="secondary" className="text-[10px]">Chat</Badge>
      </Link>
    );
  }

  if (item.type === 'evaluation') {
    return (
      <Link
        href={`/evaluador/${item.id}`}
        className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-secondary transition-colors"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
          <FileSearch className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <p className="text-[11px] text-muted-foreground">{formatRelative(item.timestamp)}</p>
        </div>
        <Badge variant={item.status === 'done' ? 'success' : 'warning'} className="text-[10px]">
          {item.status === 'done' ? 'Lista' : item.status === 'processing' ? 'Procesando' : item.status}
        </Badge>
      </Link>
    );
  }

  return (
    <Link
      href={`/generador/${item.id}`}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-secondary transition-colors"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
        <FilePen className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-[11px] text-muted-foreground">{formatRelative(item.timestamp)}</p>
      </div>
      <Badge variant="secondary" className="text-[10px]">Documento</Badge>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary mb-3">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">Aún no hay actividad</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
        Inicia una conversación o crea una evaluación para ver tu historial aquí.
      </p>
      <Button asChild size="sm" className="mt-4">
        <Link href="/chat?new=1">Empezar a chatear</Link>
      </Button>
    </div>
  );
}
