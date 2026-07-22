'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, ArrowRight } from 'lucide-react';
import {
  GENERATOR_PERFILES_LIST,
  type GeneratorPerfil,
} from '@/lib/ai/generator-perfiles';

export function GeneratorPerfilPicker() {
  const router = useRouter();
  const [creating, setCreating] = useState<GeneratorPerfil | null>(null);

  async function start(perfil: GeneratorPerfil) {
    setCreating(perfil);
    try {
      const res = await fetch('/api/generator-chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || json?.error || 'No se pudo crear');
      router.push(`/generador/chat/${json.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setCreating(null);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {GENERATOR_PERFILES_LIST.map((p) => {
        const isCreating = creating === p.key;
        return (
          <button
            key={p.key}
            type="button"
            disabled={creating !== null}
            onClick={() => start(p.key)}
            className={cn(
              'group text-left rounded-xl border-2 border-border/60 bg-card p-4 transition-all',
              'hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-950/30 hover:shadow-md hover:-translate-y-0.5',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none',
              isCreating && 'border-brand-500 bg-brand-50 dark:bg-brand-950/50',
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl leading-none shrink-0">{p.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="font-semibold text-sm">{p.label}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {p.description}
                </p>
              </div>
              {isCreating ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" />
              ) : (
                <ArrowRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-70 -translate-x-1 group-hover:translate-x-0 transition-all text-brand-600" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
