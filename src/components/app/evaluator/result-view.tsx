'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatRelative } from '@/lib/utils';

type Status = 'cumple' | 'subsanable' | 'no_cumple';

interface Postor {
  nombre: string;
  status: Status;
  detalle: string;
  sustento_normativo?: Array<{ norma: string; articulo?: string }>;
}

interface MatrixItem {
  requisito: string;
  requisito_id: string;
  categoria: string;
  descripcion: string;
  postores: Postor[];
}

interface Result {
  resumen_ejecutivo: string;
  postores: string[];
  items: MatrixItem[];
}

interface Props {
  id: string;
  title: string;
  result: Result;
  completedAt: string | null;
}

const STATUS_META: Record<Status, { label: string; icon: any; class: string; pill: string }> = {
  cumple: {
    label: 'Cumple',
    icon: CheckCircle2,
    class: 'text-emerald-600 dark:text-emerald-400',
    pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  subsanable: {
    label: 'Subsanable',
    icon: AlertTriangle,
    class: 'text-amber-600 dark:text-amber-400',
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  no_cumple: {
    label: 'No cumple',
    icon: XCircle,
    class: 'text-red-600 dark:text-red-400',
    pill: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  },
};

const CATEGORY_LABEL: Record<string, string> = {
  tecnica: 'Capacidad técnica',
  personal: 'Personal clave',
  economica: 'Económica-financiera',
  equipamiento: 'Equipamiento mínimo',
  administrativa: 'Documentación administrativa',
};

export function EvaluationResultView({ id, title, result, completedAt }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const counts = result.postores.map((nombre) => {
    const stats = { cumple: 0, subsanable: 0, no_cumple: 0 };
    for (const item of result.items) {
      const p = item.postores.find((pp) => pp.nombre === nombre);
      if (p) stats[p.status] += 1;
    }
    return { nombre, ...stats };
  });

  return (
    <>
      {/* Sticky header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-14 z-10">
        <div className="container max-w-7xl flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button asChild variant="ghost" size="sm">
              <Link href="/evaluador">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <span className="text-muted-foreground">/</span>
            <h1 className="font-semibold text-sm truncate">{title}</h1>
          </div>
          <Button asChild size="sm">
            <a href={`/api/evaluations/${id}/export`} download>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar DOCX</span>
            </a>
          </Button>
        </div>
      </div>

      <div className="container max-w-7xl py-8 space-y-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Badge variant="success" className="mb-2">
            <Sparkles className="h-3 w-3" />
            Evaluación completada
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl tracking-tight">{title}</h1>
          {completedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Completada {formatRelative(completedAt)}
            </p>
          )}
        </motion.header>

        {/* Resumen ejecutivo */}
        <Card className="p-6 bg-gradient-to-br from-brand-50/50 to-violet-50/30 dark:from-brand-950/30 dark:to-violet-950/20 border-brand-200/50 dark:border-brand-900/50">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Resumen ejecutivo
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/95">
            {result.resumen_ejecutivo}
          </p>
        </Card>

        {/* Stats por postor */}
        <div className={cn(
          'grid gap-3',
          counts.length === 1 ? 'grid-cols-1' :
          counts.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        )}>
          {counts.map((c, i) => {
            const total = c.cumple + c.subsanable + c.no_cumple;
            const recommendation = c.no_cumple > 0
              ? 'No admitida'
              : c.subsanable > 0
                ? 'Admitida con observaciones'
                : 'Admitida';
            const recColor = c.no_cumple > 0
              ? 'text-red-700 dark:text-red-400'
              : c.subsanable > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-emerald-700 dark:text-emerald-400';
            return (
              <motion.div
                key={c.nombre}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-5">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Postor {i + 1}
                  </p>
                  <h3 className="font-semibold text-base mt-0.5 truncate">{c.nombre}</h3>
                  <p className={cn('mt-1 text-xs font-semibold', recColor)}>
                    {recommendation}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <StatBox label="Cumple" count={c.cumple} status="cumple" />
                    <StatBox label="Subsanable" count={c.subsanable} status="subsanable" />
                    <StatBox label="No cumple" count={c.no_cumple} status="no_cumple" />
                  </div>
                  <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden flex">
                    {total > 0 && (
                      <>
                        <div className="bg-emerald-500" style={{ width: `${(c.cumple / total) * 100}%` }} />
                        <div className="bg-amber-500" style={{ width: `${(c.subsanable / total) * 100}%` }} />
                        <div className="bg-red-500" style={{ width: `${(c.no_cumple / total) * 100}%` }} />
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Matriz comparativa */}
        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-4">
            Matriz comparativa por requisito
          </h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left p-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground min-w-[260px]">
                      Requisito
                    </th>
                    {result.postores.map((p) => (
                      <th
                        key={p}
                        className="text-left p-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground min-w-[160px]"
                      >
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item, idx) => (
                    <ItemRow
                      key={item.requisito_id || idx}
                      item={item}
                      isExpanded={!!expanded[item.requisito_id]}
                      onToggle={() =>
                        setExpanded((p) => ({
                          ...p,
                          [item.requisito_id]: !p[item.requisito_id],
                        }))
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="mt-3 text-[11px] text-muted-foreground text-center">
            Click en cualquier fila para ver el detalle expandido con sustento normativo.
          </p>
        </div>
      </div>
    </>
  );
}

function ItemRow({
  item,
  isExpanded,
  onToggle,
}: {
  item: MatrixItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="p-4">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-muted-foreground transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
              <ChevronRight className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABEL[item.categoria] || item.categoria}
              </p>
              <p className="font-medium text-sm leading-snug">{item.requisito}</p>
            </div>
          </div>
        </td>
        {item.postores.map((p, i) => {
          const meta = STATUS_META[p.status];
          const Icon = meta.icon;
          return (
            <td key={i} className="p-4">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
                  meta.pill,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
            </td>
          );
        })}
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <td colSpan={item.postores.length + 1} className="bg-secondary/20 p-0">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                    {item.descripcion}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {item.postores.map((p, i) => (
                      <PostorDetail key={i} postor={p} />
                    ))}
                  </div>
                </div>
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

function StatBox({ label, count, status }: { label: string; count: number; status: Status }) {
  const meta = STATUS_META[status];
  return (
    <div className={cn('rounded-md py-1.5', meta.pill)}>
      <div className="font-mono text-base font-semibold tabular-nums">{count}</div>
      <div className="text-[9px] uppercase tracking-wider font-semibold opacity-80">
        {label}
      </div>
    </div>
  );
}

function PostorDetail({ postor }: { postor: Postor }) {
  const meta = STATUS_META[postor.status];
  const Icon = meta.icon;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-sm truncate">{postor.nombre}</p>
        <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', meta.pill)}>
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-foreground/90">{postor.detalle}</p>
      {postor.sustento_normativo && postor.sustento_normativo.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
            Sustento normativo
          </p>
          <div className="flex flex-wrap gap-1.5">
            {postor.sustento_normativo.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md border border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 text-[11px] text-brand-800 dark:text-brand-300"
              >
                <BookOpen className="h-3 w-3" />
                {s.norma}
                {s.articulo && <span className="opacity-70">· {s.articulo}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
