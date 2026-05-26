'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Lightbulb, Sparkles, ArrowRight } from 'lucide-react';

const SUGGESTED_QUERIES = [
  '¿En qué casos procede la subsanación de ofertas?',
  '¿Cuáles son los plazos para presentar apelación ante el Tribunal?',
  '¿Cuándo procede una ampliación de plazo por causal de lluvias?',
  'Diferencia entre adicional de obra y prestación adicional',
];

export function DashboardSuggested() {
  return (
    <Card className="p-6 h-full bg-gradient-to-br from-brand-50/50 to-violet-50/30 dark:from-brand-950/30 dark:to-violet-950/20 border-brand-200/50 dark:border-brand-900/50">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <h2 className="font-semibold tracking-tight text-sm">Consultas sugeridas</h2>
      </div>

      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Ideas para empezar a explorar la potencia de LexIA:
      </p>

      <ul className="space-y-1.5">
        {SUGGESTED_QUERIES.map((query) => (
          <li key={query}>
            <Link
              href={`/chat?new=1&q=${encodeURIComponent(query)}`}
              className="group flex items-start gap-2 rounded-md p-2 text-xs hover:bg-background/60 transition-colors"
            >
              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={1.7} />
              <span className="flex-1 text-foreground/90 leading-relaxed">{query}</span>
              <ArrowRight className="h-3 w-3 mt-1 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
