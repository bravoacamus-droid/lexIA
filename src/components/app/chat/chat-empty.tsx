'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquareDashed, Scale, FileText, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Logo, LogoMark } from '@/components/logo';
import { useConversations } from '@/lib/stores/conversations';
import { toast } from 'sonner';

interface Props {
  autoCreate?: boolean;
  prefillQuery?: string | null;
}

const STARTERS = [
  {
    icon: Scale,
    color: 'from-brand-500/15 to-violet-500/10',
    iconClass: 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400',
    title: 'Subsanación de ofertas',
    text: '¿En qué casos procede la subsanación de ofertas y cuáles son los plazos?',
  },
  {
    icon: FileText,
    color: 'from-emerald-500/15 to-teal-500/10',
    iconClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
    title: 'Ampliación de plazo',
    text: '¿Qué causales permiten solicitar una ampliación de plazo contractual?',
  },
  {
    icon: BookOpen,
    color: 'from-sky-500/15 to-cyan-500/10',
    iconClass: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400',
    title: 'Apelaciones al Tribunal',
    text: '¿Cuál es el plazo para presentar apelación ante el Tribunal de Contrataciones?',
  },
  {
    icon: MessageSquareDashed,
    color: 'from-amber-500/15 to-orange-500/10',
    iconClass: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
    title: 'Adicionales de obra',
    text: 'Explícame los requisitos para la aprobación de adicionales en una obra pública.',
  },
];

export function ChatEmpty({ autoCreate, prefillQuery }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [didAuto, setDidAuto] = useState(false);

  async function createAndOpen(initialQuery?: string) {
    setCreating(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      const { conversation } = await res.json();
      useConversations.getState().upsert(conversation);
      const qs = initialQuery ? `?q=${encodeURIComponent(initialQuery)}` : '';
      router.push(`/chat/${conversation.id}${qs}`);
    } catch {
      toast.error('No se pudo crear la conversación');
      setCreating(false);
    }
  }

  // Auto-create cuando se llega con ?new=1
  useEffect(() => {
    if (autoCreate && !didAuto) {
      setDidAuto(true);
      createAndOpen(prefillQuery || undefined);
    }
  }, [autoCreate, didAuto, prefillQuery]);

  if (autoCreate || creating) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Iniciando conversación…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-card border border-border shadow-soft mb-5">
            <LogoMark size="xl" />
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl tracking-tight text-balance">
            ¿En qué te ayudo,{' '}
            <span className="italic gradient-text">hoy</span>?
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto text-balance">
            Pregúntame cualquier cosa sobre Contrataciones del Estado peruano. Cada respuesta
            incluye citas verificables de la normativa.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {STARTERS.map((s, i) => (
            <motion.button
              key={s.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              onClick={() => createAndOpen(s.text)}
              className={`group relative rounded-xl border border-border bg-card p-4 text-left overflow-hidden hover:border-brand-400 hover:-translate-y-0.5 transition-all`}
            >
              <div
                className={`absolute inset-0 -z-10 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${s.iconClass}`}
                >
                  <s.icon className="h-4 w-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm mb-0.5">{s.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {s.text}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="text-center">
          <Button onClick={() => createAndOpen()} variant="default" size="lg">
            <Sparkles className="h-4 w-4" />
            Iniciar conversación en blanco
          </Button>
          <p className="mt-3 text-[11px] text-muted-foreground">
            <kbd className="font-mono rounded border border-border bg-secondary px-1 py-0.5">⌘</kbd>{' '}
            +{' '}
            <kbd className="font-mono rounded border border-border bg-secondary px-1 py-0.5">K</kbd>{' '}
            para abrir el buscador en cualquier momento
          </p>
        </div>
      </div>
    </div>
  );
}
