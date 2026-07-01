'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  BookmarkCheck,
  PhoneCall,
  ScaleIcon,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Props {
  chatMessages: number;
  savedDocs: number;
  folders: number;
  normativeTotal: number;
  chatTrend?: number[];
  savedTrend?: number[];
  voiceTrend?: number[];
}

type ToneKey = 'brand' | 'emerald' | 'rose' | 'violet';

/**
 * KPIs de la home rediseñados 30/06/2026 tras feedback de César:
 * "los 4 KPIs tienen el mismo color de fondo pastel, no se distinguen
 * visualmente, falta jerarquía, sin evolución/tendencia".
 *
 * Cambios:
 * - Cada card usa gradient sutil hacia su color (más presencia visual
 *   que un solo bg-100)
 * - Sparkline SVG con últimos 7 días — cuando hay datos activos
 *   muestra tendencia
 * - Card entera es clickeable (Link) → navega al módulo correspondiente
 * - Reemplazamos "Carpetas" (poco útil como KPI) por "Llamadas" que es
 *   más relevante al feedback de "innovación legal"
 */
export function DashboardStats({
  chatMessages,
  savedDocs,
  folders,
  normativeTotal,
  chatTrend,
  savedTrend,
  voiceTrend,
}: Props) {
  const items: Array<{
    icon: typeof MessageSquare;
    label: string;
    value: number;
    hint: string;
    tone: ToneKey;
    href: string;
    trend?: number[];
  }> = [
    {
      icon: MessageSquare,
      label: 'Consultas al chat',
      value: chatMessages,
      hint: 'Preguntas que hiciste a LexIA',
      tone: 'brand',
      href: '/chat',
      trend: chatTrend,
    },
    {
      icon: BookmarkCheck,
      label: 'Guardados',
      value: savedDocs,
      hint: folders > 0 ? `En ${folders} ${folders === 1 ? 'carpeta' : 'carpetas'}` : 'En tu biblioteca',
      tone: 'emerald',
      href: '/biblioteca',
      trend: savedTrend,
    },
    {
      icon: PhoneCall,
      label: 'Llamadas con el Abogado',
      value: voiceTrend ? voiceTrend.reduce((a, b) => a + b, 0) : 0,
      hint: 'Últimos 7 días',
      tone: 'rose',
      href: '/llamadas',
      trend: voiceTrend,
    },
    {
      icon: ScaleIcon,
      label: 'Normativa disponible',
      value: normativeTotal,
      hint: 'Documentos en tu base',
      tone: 'violet',
      href: '/biblioteca',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, i) => {
        const styles = TONE_STYLES[item.tone];
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Link href={item.href} className="block group">
              <Card
                className={`p-5 h-full transition-all hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${styles.card}`}
              >
                {/* Gradient decorative */}
                <div
                  className={`absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-50 blur-2xl ${styles.blob}`}
                  aria-hidden
                />

                <div className="relative flex items-center justify-between mb-3">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${styles.iconBg} group-hover:scale-105 transition-transform`}
                  >
                    <item.icon className={`h-4 w-4 ${styles.iconFg}`} strokeWidth={2} />
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="relative font-mono text-3xl font-bold tracking-tight tabular-nums">
                  {item.value.toLocaleString('es-PE')}
                </div>
                <p className="relative mt-1 text-xs font-semibold text-foreground/90 leading-tight">
                  {item.label}
                </p>
                <p className="relative text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {item.hint}
                </p>

                {/* Sparkline con últimos 7 días */}
                {item.trend && item.trend.some((v) => v > 0) && (
                  <div className="relative mt-3 flex items-end justify-between h-6 gap-0.5">
                    {item.trend.map((v, j) => {
                      const max = Math.max(1, ...(item.trend || []));
                      const pct = (v / max) * 100;
                      return (
                        <div
                          key={j}
                          className={`flex-1 rounded-sm ${styles.spark} ${
                            j === item.trend!.length - 1 ? 'opacity-100' : 'opacity-60'
                          }`}
                          style={{ height: `${Math.max(pct, 8)}%` }}
                          title={`Hace ${item.trend!.length - 1 - j} días: ${v}`}
                        />
                      );
                    })}
                  </div>
                )}
                {item.trend && item.trend.some((v) => v > 0) && (
                  <p className="relative mt-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-2.5 w-2.5" />
                    <span>Últimos 7 días</span>
                  </p>
                )}
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

const TONE_STYLES: Record<ToneKey, {
  card: string;
  iconBg: string;
  iconFg: string;
  blob: string;
  spark: string;
}> = {
  brand: {
    card: 'hover:border-brand-400 bg-gradient-to-br from-card to-brand-50/30 dark:to-brand-950/20 border-brand-500/10',
    iconBg: 'bg-brand-100 dark:bg-brand-950',
    iconFg: 'text-brand-700 dark:text-brand-400',
    blob: 'bg-brand-300/40 dark:bg-brand-800/40',
    spark: 'bg-brand-500 dark:bg-brand-400',
  },
  emerald: {
    card: 'hover:border-emerald-400 bg-gradient-to-br from-card to-emerald-50/30 dark:to-emerald-950/20 border-emerald-500/10',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950',
    iconFg: 'text-emerald-700 dark:text-emerald-400',
    blob: 'bg-emerald-300/40 dark:bg-emerald-800/40',
    spark: 'bg-emerald-500 dark:bg-emerald-400',
  },
  rose: {
    card: 'hover:border-rose-400 bg-gradient-to-br from-card to-rose-50/30 dark:to-rose-950/20 border-rose-500/10',
    iconBg: 'bg-rose-100 dark:bg-rose-950',
    iconFg: 'text-rose-700 dark:text-rose-400',
    blob: 'bg-rose-300/40 dark:bg-rose-800/40',
    spark: 'bg-rose-500 dark:bg-rose-400',
  },
  violet: {
    card: 'hover:border-violet-400 bg-gradient-to-br from-card to-violet-50/30 dark:to-violet-950/20 border-violet-500/10',
    iconBg: 'bg-violet-100 dark:bg-violet-950',
    iconFg: 'text-violet-700 dark:text-violet-400',
    blob: 'bg-violet-300/40 dark:bg-violet-800/40',
    spark: 'bg-violet-500 dark:bg-violet-400',
  },
};
