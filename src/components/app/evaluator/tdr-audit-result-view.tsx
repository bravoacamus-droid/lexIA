'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Lightbulb,
  Quote,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatRelative } from '@/lib/utils';

type Severity = 'critico' | 'alto' | 'medio' | 'bajo';

interface Finding {
  id: string;
  categoria: string;
  severidad: Severity;
  titulo: string;
  ubicacion: string;
  extracto_literal: string;
  descripcion: string;
  recomendacion: string;
  fundamento_normativo?: Array<{ norma: string; articulo?: string }>;
}

interface TdrAuditResult {
  tipo_documento: 'TDR' | 'EETT' | 'MIXTO';
  objeto_inferido: string;
  stats: { criticos: number; altos: number; medios: number; bajos: number };
  hallazgos: Finding[];
  resumen_ejecutivo: string;
}

interface Props {
  id: string;
  title: string;
  result: TdrAuditResult;
  completedAt: string | null;
}

const SEVERITY_META: Record<
  Severity,
  { label: string; icon: typeof AlertCircle; pill: string; ring: string; bar: string }
> = {
  critico: {
    label: 'Crítico',
    icon: ShieldAlert,
    pill: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    ring: 'border-red-500/40 dark:border-red-900/60',
    bar: 'bg-red-500',
  },
  alto: {
    label: 'Alto',
    icon: AlertTriangle,
    pill: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    ring: 'border-orange-500/40 dark:border-orange-900/60',
    bar: 'bg-orange-500',
  },
  medio: {
    label: 'Medio',
    icon: AlertCircle,
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    ring: 'border-amber-500/40 dark:border-amber-900/60',
    bar: 'bg-amber-500',
  },
  bajo: {
    label: 'Bajo',
    icon: Info,
    pill: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    ring: 'border-sky-500/40 dark:border-sky-900/60',
    bar: 'bg-sky-500',
  },
};

const CATEGORY_LABEL: Record<string, string> = {
  direccionamiento_marca: 'Direccionamiento a marca',
  personal_desproporcionado: 'Personal desproporcionado',
  especificaciones_ambiguas: 'Especificaciones ambiguas',
  plazos_insustentables: 'Plazos insustentables',
  entregables_incompletos: 'Entregables incompletos',
  equipamiento_restrictivo: 'Equipamiento restrictivo',
  experiencia_restrictiva: 'Experiencia restrictiva',
  finalidad_publica_debil: 'Finalidad pública débil',
  otro: 'Otro',
};

export function TdrAuditResultView({ id: _id, title, result, completedAt }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { stats } = result;
  const total = stats.criticos + stats.altos + stats.medios + stats.bajos;

  const veredicto =
    stats.criticos > 0
      ? { label: 'Corregir antes de publicar', tone: 'text-red-700 dark:text-red-400' }
      : stats.altos > 0
        ? { label: 'Revisar y corregir', tone: 'text-orange-700 dark:text-orange-400' }
        : stats.medios > 0
          ? { label: 'Ajustes menores', tone: 'text-amber-700 dark:text-amber-400' }
          : { label: 'Listo para publicar', tone: 'text-emerald-700 dark:text-emerald-400' };

  // Agrupar hallazgos por severidad (críticos primero)
  const ordered: Severity[] = ['critico', 'alto', 'medio', 'bajo'];
  const grouped = ordered.map((sev) => ({
    sev,
    items: result.hallazgos.filter((h) => h.severidad === sev),
  }));

  return (
    <>
      {/* Sticky header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-14 z-10">
        <div className="container max-w-5xl flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button asChild variant="ghost" size="sm">
              <Link href="/revisor-tdr">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <span className="text-muted-foreground">/</span>
            <h1 className="font-semibold text-sm truncate">{title}</h1>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl py-8 space-y-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Badge variant="success" className="mb-2">
            <Sparkles className="h-3 w-3" />
            Auditoría completada
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{result.tipo_documento}</span> ·{' '}
            {result.objeto_inferido}
            {completedAt && <> · Completada {formatRelative(completedAt)}</>}
          </p>
        </motion.header>

        {/* Veredicto + stats */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Veredicto general
              </p>
              <p className={cn('mt-1 text-2xl font-serif tracking-tight', veredicto.tone)}>
                {veredicto.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {total} hallazgo{total === 1 ? '' : 's'} detectado{total === 1 ? '' : 's'} en
                este documento.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            {(['critico', 'alto', 'medio', 'bajo'] as Severity[]).map((sev) => {
              const meta = SEVERITY_META[sev];
              const count = stats[`${sev === 'critico' ? 'criticos' : sev === 'alto' ? 'altos' : sev === 'medio' ? 'medios' : 'bajos'}` as keyof typeof stats];
              return (
                <div
                  key={sev}
                  className={cn('rounded-lg py-2.5 text-center', meta.pill)}
                >
                  <div className="font-mono text-xl font-semibold tabular-nums">
                    {count}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80 mt-0.5">
                    {meta.label}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Resumen ejecutivo */}
        <Card className="p-6 bg-gradient-to-br from-brand-50/50 to-violet-50/30 dark:from-brand-950/30 dark:to-violet-950/20 border-brand-200/50 dark:border-brand-900/50">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Diagnóstico ejecutivo
          </h2>
          <p className="text-[15px] leading-relaxed text-foreground/95">
            {result.resumen_ejecutivo}
          </p>
        </Card>

        {/* Hallazgos por severidad */}
        {grouped.map(({ sev, items }) => {
          if (items.length === 0) return null;
          const meta = SEVERITY_META[sev];
          return (
            <section key={sev} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <meta.icon className="h-4 w-4" />
                {meta.label} · {items.length}
              </h2>

              {items.map((h, idx) => {
                const isOpen = expanded[h.id] ?? false;
                return (
                  <Card key={h.id} className={cn('overflow-hidden border-l-4', meta.ring)}>
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [h.id]: !isOpen }))}
                      className="w-full flex items-start justify-between gap-3 p-5 text-left hover:bg-secondary/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {CATEGORY_LABEL[h.categoria] || h.categoria}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            #{idx + 1}
                          </span>
                        </div>
                        <h3 className="font-semibold text-base leading-snug">{h.titulo}</h3>
                        {h.ubicacion && (
                          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {h.ubicacion}
                          </p>
                        )}
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="border-t border-border px-5 py-4 space-y-4 bg-secondary/20">
                        {h.extracto_literal && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                              <Quote className="h-3 w-3" />
                              Cita literal del texto
                            </p>
                            <blockquote className="text-[13px] italic border-l-2 border-border pl-3 text-foreground/85 leading-relaxed">
                              {h.extracto_literal}
                            </blockquote>
                          </div>
                        )}

                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                            Por qué es un problema
                          </p>
                          <p className="text-[13px] leading-relaxed text-foreground/90">
                            {h.descripcion}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" />
                            Cómo corregirlo
                          </p>
                          <p className="text-[13px] leading-relaxed text-foreground/90">
                            {h.recomendacion}
                          </p>
                        </div>

                        {h.fundamento_normativo && h.fundamento_normativo.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              Fundamento normativo
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {h.fundamento_normativo.map((f, i) => (
                                <Badge key={i} variant="outline" className="text-[11px]">
                                  {f.norma}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </section>
          );
        })}

        {total === 0 && (
          <Card className="p-10 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 mb-3">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <h3 className="font-semibold text-lg mb-1">Sin hallazgos relevantes</h3>
            <p className="text-sm text-muted-foreground">
              LexIA no detectó vicios significativos en este documento.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
