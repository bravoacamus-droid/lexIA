'use client';

import { motion } from 'framer-motion';
import { MessageSquare, BookmarkCheck, FolderTree, ScaleIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Props {
  chatMessages: number;
  savedDocs: number;
  folders: number;
  normativeTotal: number;
}

export function DashboardStats({
  chatMessages,
  savedDocs,
  folders,
  normativeTotal,
}: Props) {
  const items = [
    {
      icon: MessageSquare,
      label: 'Consultas al chat',
      value: chatMessages,
      hint: 'Preguntas que hiciste a LexIA',
      tone: 'brand',
    },
    {
      icon: BookmarkCheck,
      label: 'Documentos guardados',
      value: savedDocs,
      hint: folders > 0 ? `En ${folders} ${folders === 1 ? 'carpeta' : 'carpetas'}` : 'En tu biblioteca',
      tone: 'emerald',
    },
    {
      icon: FolderTree,
      label: 'Carpetas',
      value: folders,
      hint: 'Tu organización personal',
      tone: 'sky',
    },
    {
      icon: ScaleIcon,
      label: 'Normativa en sistema',
      value: normativeTotal,
      hint: 'Documentos disponibles',
      tone: 'violet',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
        >
          <Card className="p-5 hover:shadow-md transition-all hover:-translate-y-0.5 hover:border-brand-400">
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${toneBg(item.tone)}`}>
                <item.icon className={`h-4 w-4 ${toneText(item.tone)}`} />
              </span>
            </div>
            <div className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
              {item.value.toLocaleString('es-PE')}
            </div>
            <p className="mt-1 text-xs font-medium text-foreground">{item.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{item.hint}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function toneBg(tone: string) {
  return {
    brand: 'bg-brand-100 dark:bg-brand-950',
    emerald: 'bg-emerald-100 dark:bg-emerald-950',
    sky: 'bg-sky-100 dark:bg-sky-950',
    violet: 'bg-violet-100 dark:bg-violet-950',
  }[tone] || 'bg-secondary';
}

function toneText(tone: string) {
  return {
    brand: 'text-brand-700 dark:text-brand-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    sky: 'text-sky-700 dark:text-sky-400',
    violet: 'text-violet-700 dark:text-violet-400',
  }[tone] || 'text-foreground';
}
