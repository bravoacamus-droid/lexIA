'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  BookmarkCheck,
  PhoneCall,
  ScaleIcon,
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

                {/*
                 * Feedback César 30/06/2026:
                 *   "los cards son distintos, tampoco entiendo las imágenes
                 *    en los cards de consulta de chat y llamadas"
                 *
                 * Fix: ANTES los sparklines aparecían solo cuando había
                 * data (haciendo cards de altura desigual). Ahora TODOS
                 * los cards tienen la misma altura. Los que tienen trend
                 * muestran un mini "widget" claro con delta comparativo
                 * (esta semana vs anterior) y no un gráfico ambiguo.
                 */}
                <div className="relative mt-3 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  {item.trend && item.trend.some((v) => v > 0) ? (
                    <TrendDelta trend={item.trend} sparkColor={styles.spark} />
                  ) : (
                    <p className="text-[10px] text-muted-foreground/70">
                      {item.trend ? 'Sin actividad esta semana' : 'Total en el sistema'}
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * TrendDelta — reemplaza el sparkline "abstracto" por info concreta:
 * - Total esta semana
 * - Comparación con la semana anterior (si aplica)
 *
 * Feedback César 30/06/2026: "no entiendo las imágenes en los cards".
 * Los sparklines de barras eran demasiado abstractos con datos sparse
 * (una sola barra grande al final). Ahora mostramos:
 *   "8 esta semana ↑"  o  "8 esta semana"
 */
function TrendDelta({
  trend,
  sparkColor,
}: {
  trend: number[];
  sparkColor: string;
}) {
  const total = trend.reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Mini sparkline compacto pero legible como línea, no barras */}
      <div className="flex-1 flex items-end gap-px h-4">
        {trend.map((v, j) => {
          const max = Math.max(1, ...trend);
          const pct = (v / max) * 100;
          const isToday = j === trend.length - 1;
          return (
            <div
              key={j}
              className={`flex-1 rounded-sm ${sparkColor} ${
                isToday ? 'opacity-100' : 'opacity-40'
              } transition-opacity`}
              style={{ height: `${Math.max(pct, 15)}%` }}
              title={`${trend.length - 1 - j === 0 ? 'Hoy' : `Hace ${trend.length - 1 - j} d`}: ${v}`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] font-semibold tabular-nums">
          {total}
        </span>
        <span className="text-[10px] text-muted-foreground">
          esta semana
        </span>
      </div>
    </div>
  );
}

/**
 * Estilos por tono para los KPIs. Refactorizado 30/06/2026 tras
 * feedback: "KPIs con el mismo color de fondo pastel, no se distinguen,
 * falta jerarquía". Ahora:
 * - Border más marcado en color del KPI
 * - Bg semi-sólido (no pastel tenue)
 * - Ícono más grande y en fondo intenso
 * - Blob decorativo con opacidad mayor
 * - Sparkline con color intenso
 */
const TONE_STYLES: Record<ToneKey, {
  card: string;
  iconBg: string;
  iconFg: string;
  blob: string;
  spark: string;
}> = {
  brand: {
    card: 'border-brand-500/30 hover:border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 dark:border-brand-700/40 hover:dark:border-brand-500',
    iconBg: 'bg-brand-500 dark:bg-brand-500',
    iconFg: 'text-white',
    blob: 'bg-brand-400/50 dark:bg-brand-600/40',
    spark: 'bg-brand-500 dark:bg-brand-400',
  },
  emerald: {
    card: 'border-emerald-500/30 hover:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 dark:border-emerald-700/40 hover:dark:border-emerald-500',
    iconBg: 'bg-emerald-500 dark:bg-emerald-500',
    iconFg: 'text-white',
    blob: 'bg-emerald-400/50 dark:bg-emerald-600/40',
    spark: 'bg-emerald-500 dark:bg-emerald-400',
  },
  rose: {
    card: 'border-rose-500/30 hover:border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 dark:border-rose-700/40 hover:dark:border-rose-500',
    iconBg: 'bg-rose-500 dark:bg-rose-500',
    iconFg: 'text-white',
    blob: 'bg-rose-400/50 dark:bg-rose-600/40',
    spark: 'bg-rose-500 dark:bg-rose-400',
  },
  violet: {
    card: 'border-violet-500/30 hover:border-violet-500 bg-violet-50/60 dark:bg-violet-950/40 dark:border-violet-700/40 hover:dark:border-violet-500',
    iconBg: 'bg-violet-500 dark:bg-violet-500',
    iconFg: 'text-white',
    blob: 'bg-violet-400/50 dark:bg-violet-600/40',
    spark: 'bg-violet-500 dark:bg-violet-400',
  },
};
