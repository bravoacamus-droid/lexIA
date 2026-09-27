'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Phone, Star, Clock, BookOpen, Trash2 } from 'lucide-react';
import { RelativeTime } from '@/components/ui/relative-time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface LlamadaDelHistorial {
  id: string;
  status: 'active' | 'completed' | 'failed' | 'deleted';
  started_at: string;
  duration_seconds: number | null;
  summary: string | null;
  rag_queries_count: number;
  user_rating: number | null;
}

/**
 * «Tus consultas por voz», con la opción de eliminar cada una.
 *
 * César (27/09/2026): «Las consultas de voz deben permitir eliminar».
 * Borrar ya existía, pero escondido en el detalle de cada llamada; aquí
 * está en la lista, donde se ve lo que se quiere limpiar.
 */
export function HistorialDeVoz({ llamadas }: { llamadas: LlamadaDelHistorial[] }) {
  const router = useRouter();
  const [aBorrar, setABorrar] = useState<LlamadaDelHistorial | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());

  async function borrar() {
    if (!aBorrar) return;
    setBorrando(true);
    try {
      const res = await fetch(`/api/voice/calls/${aBorrar.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.detail || j?.error || `HTTP ${res.status}`);
      }
      setOcultas((s) => new Set(s).add(aBorrar.id));
      toast.success('Consulta eliminada');
      setABorrar(null);
      router.refresh();
    } catch (e) {
      toast.error(`No se pudo eliminar: ${(e as Error).message}`);
    } finally {
      setBorrando(false);
    }
  }

  const visibles = llamadas.filter((l) => !ocultas.has(l.id));
  if (visibles.length === 0) return null;

  return (
    <section className="space-y-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Tus consultas por voz
      </p>
      {visibles.map((c) => (
        <Fila key={c.id} llamada={c} onBorrar={() => setABorrar(c)} />
      ))}

      <Dialog open={!!aBorrar} onOpenChange={(o) => !o && setABorrar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar esta consulta por voz?</DialogTitle>
            <DialogDescription>
              Se borran la transcripción, el resumen y la grabación. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {aBorrar?.summary && (
            <p className="rounded-lg bg-secondary/50 p-3 text-[13px] leading-relaxed text-muted-foreground">
              {aBorrar.summary}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setABorrar(null)} disabled={borrando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={borrar} loading={borrando}>
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Fila({ llamada: c, onBorrar }: { llamada: LlamadaDelHistorial; onBorrar: () => void }) {
  const activa = c.status === 'active';
  const interrumpida = c.status === 'failed';
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-brand-400 hover:shadow-md">
      <Link href={`/llamadas/${c.id}`} className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            activa
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
              : interrumpida
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                : 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-400',
          )}
        >
          <Phone className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {activa && (
              <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-400">
                En curso
              </Badge>
            )}
            {interrumpida && (
              <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-700 dark:text-amber-400">
                Interrumpida
              </Badge>
            )}
            {!!c.duration_seconds && (
              <span className="font-mono text-xs text-muted-foreground">
                <Clock className="mr-0.5 inline h-3 w-3" />
                {duracion(c.duration_seconds)}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              <RelativeTime date={c.started_at} />
            </span>
            {c.rag_queries_count > 0 && (
              <span className="text-[10px] text-muted-foreground">
                <BookOpen className="mr-0.5 inline h-3 w-3" />
                {c.rag_queries_count} {c.rag_queries_count === 1 ? 'consulta' : 'consultas'} a normativa
              </span>
            )}
          </span>
          <span className="line-clamp-2 text-sm font-medium leading-snug">
            {c.summary || (activa ? 'Llamada activa…' : 'Llamada sin resumen')}
          </span>
        </span>
        {c.user_rating && (
          <span className="ml-2 flex shrink-0 items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-3 w-3',
                  i < (c.user_rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
                )}
              />
            ))}
          </span>
        )}
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onBorrar}
        aria-label="Eliminar esta consulta"
        title="Eliminar esta consulta"
        className="shrink-0 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function duracion(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
