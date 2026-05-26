'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ArrowRight } from 'lucide-react';

interface Props {
  items: string[];
  loading: boolean;
  onPick: (q: string) => void;
}

export function Suggested({ items, loading, onPick }: Props) {
  if (!loading && items.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Lightbulb className="h-3 w-3 text-amber-500" />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Preguntas sugeridas
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {loading && items.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-9 w-48 rounded-lg bg-secondary animate-pulse-soft"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((s, i) => (
              <motion.button
                key={s}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                onClick={() => onPick(s)}
                className="group inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] hover:border-brand-400 hover:-translate-y-0.5 transition-all"
              >
                <span className="text-foreground/90">{s}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors" />
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
