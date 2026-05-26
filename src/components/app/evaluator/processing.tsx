'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

const STAGES = [
  { label: 'Extrayendo texto de las Bases Integradas', duration: 8 },
  { label: 'Identificando requisitos de calificación', duration: 15 },
  { label: 'Analizando ofertas contra las Bases', duration: 35 },
  { label: 'Generando matriz comparativa con sustento normativo', duration: 12 },
  { label: 'Redactando resumen ejecutivo', duration: 8 },
];

export function Processing() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Distribute elapsed across stages by duration
  let acc = 0;
  const totals = STAGES.map((s) => {
    const before = acc;
    acc += s.duration;
    return { before, after: acc };
  });
  const TOTAL = acc;
  const overallProgress = Math.min(95, Math.round((elapsed / TOTAL) * 95)); // hold at 95 hasta que done

  return (
    <Card className="p-10 sm:p-14 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-950 dark:to-violet-950 text-brand-700 dark:text-brand-300 shadow-glow">
          <Loader2 className="h-7 w-7 animate-spin" />
        </span>
      </motion.div>

      <h2 className="font-serif text-2xl tracking-tight">
        LexIA está evaluando…
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto text-balance">
        Esto puede tardar entre 1 y 3 minutos según el tamaño de los PDFs y la cantidad de
        ofertas. No cierres esta pestaña.
      </p>

      {/* Progress bar */}
      <div className="mt-7 max-w-md mx-auto">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span className="font-mono">{overallProgress}%</span>
          <span>{formatElapsed(elapsed)}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
          />
        </div>
      </div>

      {/* Stages */}
      <ul className="mt-8 max-w-md mx-auto space-y-2 text-left">
        {STAGES.map((s, i) => {
          const isDone = elapsed >= totals[i].after;
          const isActive = !isDone && elapsed >= totals[i].before;
          return (
            <li
              key={s.label}
              className={`flex items-center gap-3 text-sm ${
                isDone
                  ? 'text-foreground'
                  : isActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground/60'
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                      ? 'bg-brand-100 dark:bg-brand-950'
                      : 'bg-secondary'
                }`}
              >
                {isDone ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : isActive ? (
                  <Loader2 className="h-3 w-3 animate-spin text-brand-700 dark:text-brand-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              {s.label}
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-[11px] text-muted-foreground">
        Si LexIA no responde en 5 minutos, refresca y verás el estado en{' '}
        <span className="font-medium text-foreground">Evaluador</span>.
      </p>
    </Card>
  );
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
