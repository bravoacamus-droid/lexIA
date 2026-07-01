'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Lightbulb, Sparkles, ArrowRight } from 'lucide-react';
import {
  getRoleTheme,
  ROLE_SUGGESTED_QUERIES,
  GENERIC_SUGGESTED_QUERIES,
} from '@/lib/navigation/role-theme';
import type { ProfileRole } from '@/lib/auth/session';

interface Props {
  role: ProfileRole | null;
}

/**
 * Widget "Consultas sugeridas" rediseñado 30/06/2026 para diferenciar
 * por perfil. Antes mostraba las mismas 4 consultas genéricas a todos.
 * Ahora cada rol ve consultas relevantes a su trabajo:
 *   entity     → sobre publicación de Bases, TDR, elevación al OECE
 *   provider   → sobre subsanación, apelación, observaciones, adicionales
 *   consultant → sobre jurisprudencia, análisis, casos complejos
 *
 * Los estilos siguen la paleta del rol (getRoleTheme).
 */
export function DashboardSuggested({ role }: Props) {
  const theme = getRoleTheme(role);
  const queries = role ? ROLE_SUGGESTED_QUERIES[role] : GENERIC_SUGGESTED_QUERIES;

  return (
    <Card
      className={`p-6 h-full border ${theme?.classes.softBorder || 'border-brand-200/50 dark:border-brand-900/50'} ${theme?.classes.gradient || 'bg-gradient-to-br from-brand-50/50 to-violet-50/30 dark:from-brand-950/30 dark:to-violet-950/20'}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
            theme?.classes.softBg || 'bg-brand-100 dark:bg-brand-950'
          } ${theme?.classes.text || 'text-brand-700 dark:text-brand-400'}`}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <h2 className="font-semibold tracking-tight text-sm">
          Consultas sugeridas
        </h2>
      </div>

      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        {role
          ? `Ideas típicas para tu perfil ${theme?.label.toLowerCase()}:`
          : 'Ideas para empezar a explorar la potencia de LexIA:'}
      </p>

      <ul className="space-y-1">
        {queries.map((query) => (
          <li key={query}>
            <Link
              href={`/chat?new=1&q=${encodeURIComponent(query)}`}
              className="group flex items-start gap-2 rounded-md p-2 text-xs hover:bg-background/60 transition-colors"
            >
              <Lightbulb
                className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${theme?.classes.text || 'text-amber-600 dark:text-amber-400'}`}
                strokeWidth={1.7}
              />
              <span className="flex-1 text-foreground/90 leading-relaxed">
                {query}
              </span>
              <ArrowRight className="h-3 w-3 mt-1 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
