'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageSquare, PhoneCall, Clock, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  lastConversation: {
    id: string;
    title: string | null;
    updatedAt: string;
  } | null;
  lastCall: {
    id: string;
    voice: string;
    durationSeconds: number | null;
    summary: string | null;
    endedAt: string;
  } | null;
}

/**
 * Widget "Continúa donde te quedaste" para la home.
 * Muestra hasta 2 cards: última conversación abierta y última llamada
 * completada, con navegación directa para retomar.
 *
 * Introducido 30/06/2026 tras el rediseño de la home. La actividad
 * reciente muestra una lista larga; este widget destaca los 2 items
 * más accionables para retomar la sesión rápido.
 *
 * Si el usuario no tiene ni conversación ni llamada previa, el
 * componente no renderiza nada (empty state elegante = ocultarlo).
 */
export function ContinueLeftOff({ lastConversation, lastCall }: Props) {
  const hasAnything = lastConversation !== null || lastCall !== null;
  if (!hasAnything) return null;

  const items: Array<{
    id: string;
    kind: 'chat' | 'call';
    icon: typeof MessageSquare;
    tone: 'brand' | 'rose';
    href: string;
    title: string;
    subtitle: string;
    meta: string;
  }> = [];

  if (lastConversation) {
    items.push({
      id: `chat-${lastConversation.id}`,
      kind: 'chat',
      icon: MessageSquare,
      tone: 'brand',
      href: `/chat/${lastConversation.id}`,
      title: lastConversation.title || 'Nueva conversación',
      subtitle: 'Retoma la conversación con LexIA',
      meta: relativeTime(lastConversation.updatedAt),
    });
  }

  if (lastCall) {
    const duration = lastCall.durationSeconds
      ? `${Math.floor(lastCall.durationSeconds / 60)}:${(lastCall.durationSeconds % 60).toString().padStart(2, '0')}`
      : null;
    items.push({
      id: `call-${lastCall.id}`,
      kind: 'call',
      icon: PhoneCall,
      tone: 'rose',
      href: `/llamadas/${lastCall.id}`,
      title: lastCall.summary
        ? lastCall.summary.slice(0, 70) + (lastCall.summary.length > 70 ? '…' : '')
        : `Llamada con ${lastCall.voice}`,
      subtitle: duration
        ? `Llamada de ${duration} min con ${lastCall.voice}`
        : `Llamada con ${lastCall.voice}`,
      meta: relativeTime(lastCall.endedAt),
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Continúa donde te quedaste
        </h2>
      </div>
      <div className={`grid gap-3 ${items.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-2xl'}`}>
        {items.map((item, i) => {
          const styles = TONE_STYLES[item.tone];
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link href={item.href} className="block group">
                <Card
                  className={`p-4 h-full transition-all hover:shadow-md hover:-translate-y-0.5 ${styles.card}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.iconBg} group-hover:scale-105 transition-transform`}
                    >
                      <Icon className={`h-4 w-4 ${styles.iconFg}`} strokeWidth={2} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${styles.iconFg} border-current/30`}
                        >
                          {item.kind === 'chat' ? 'CHAT' : 'LLAMADA'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {item.meta}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold leading-snug line-clamp-1 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {item.subtitle}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

const TONE_STYLES = {
  brand: {
    card: 'hover:border-brand-400 bg-gradient-to-br from-card to-brand-50/30 dark:to-brand-950/20 border-brand-500/10',
    iconBg: 'bg-brand-100 dark:bg-brand-950',
    iconFg: 'text-brand-700 dark:text-brand-400',
  },
  rose: {
    card: 'hover:border-rose-400 bg-gradient-to-br from-card to-rose-50/30 dark:to-rose-950/20 border-rose-500/10',
    iconBg: 'bg-rose-100 dark:bg-rose-950',
    iconFg: 'text-rose-700 dark:text-rose-400',
  },
} as const;

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'hace unos segundos';
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `hace ${m} min`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `hace ${h} h`;
  }
  const d = Math.floor(diffSec / 86400);
  if (d < 7) return `hace ${d} día${d === 1 ? '' : 's'}`;
  return new Date(iso).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
  });
}
