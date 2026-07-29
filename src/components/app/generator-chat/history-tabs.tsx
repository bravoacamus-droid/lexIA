'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn, formatRelative } from '@/lib/utils';
import {
  GENERATOR_PERFILES,
  PERFIL_COLORS,
  type GeneratorPerfil,
} from '@/lib/ai/generator-perfiles';

interface ConvoRow {
  id: string;
  title: string | null;
  perfil: GeneratorPerfil;
  updated_at: string;
}

/**
 * Historial del generador clasificado en pestañas por perfil.
 * Acordado con César (reunión 27/07/2026): "que estén en pestañas y
 * clasificado... le das clic y aparece únicamente la lista de área
 * usuaria, la de proveedor, así dividido", con colores distintivos.
 */
export function GeneratorHistoryTabs({ convos }: { convos: ConvoRow[] }) {
  const [tab, setTab] = useState<GeneratorPerfil | 'todos'>('todos');

  const perfilesPresentes = useMemo(() => {
    const seen: GeneratorPerfil[] = [];
    for (const c of convos) {
      if (GENERATOR_PERFILES[c.perfil] && !seen.includes(c.perfil)) seen.push(c.perfil);
    }
    return seen;
  }, [convos]);

  const visibles = tab === 'todos' ? convos : convos.filter((c) => c.perfil === tab);

  if (convos.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Documentos generados ({convos.length})
      </h2>

      {/* Pestañas por perfil */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          type="button"
          onClick={() => setTab('todos')}
          className={cn(
            'rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors',
            tab === 'todos'
              ? 'bg-foreground text-background border-foreground'
              : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40',
          )}
        >
          Todos
        </button>
        {perfilesPresentes.map((key) => {
          const p = GENERATOR_PERFILES[key];
          const n = convos.filter((c) => c.perfil === key).length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors inline-flex items-center gap-1',
                tab === key
                  ? cn(PERFIL_COLORS[key].chip, 'border-transparent ring-1 ring-foreground/20')
                  : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40',
              )}
            >
              <span>{p.emoji}</span>
              <span>{p.shortLabel}</span>
              <span className="opacity-60">({n})</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {visibles.map((c) => {
          const perfil = GENERATOR_PERFILES[c.perfil];
          return (
            <Link key={c.id} href={`/generador/chat/${c.id}`} className="block">
              <Card
                className={cn(
                  'p-4 border-l-4 hover:border-brand-400 hover:shadow-sm transition-all',
                  PERFIL_COLORS[c.perfil].border,
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{perfil.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={cn(
                          'text-[10px] uppercase tracking-wider font-semibold rounded px-1.5 py-0.5',
                          PERFIL_COLORS[c.perfil].chip,
                        )}
                      >
                        {perfil.shortLabel}
                      </span>
                    </div>
                    <h3 className="font-medium text-sm truncate">
                      {c.title || 'Nueva conversación'}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Actualizada {formatRelative(c.updated_at)}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
