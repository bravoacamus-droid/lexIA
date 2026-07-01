'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, BookOpen, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDocTypeMeta, formatDate } from '@/lib/utils';
import type { NormativeDocType } from '@/lib/supabase/types';

interface RecentDoc {
  id: string;
  type: NormativeDocType;
  number: string | null;
  title: string;
  date: string | null;
  ai_summary: { de_que_trata?: string; temas?: string[] } | null;
}

interface Props {
  docs: RecentDoc[];
}

/**
 * Widget "Normativa reciente" en la home. Muestra los 4 documentos
 * normativos más recientes ingresados a la base, con su resumen IA
 * y CTA para abrir en biblioteca.
 *
 * Rediseñado 30/06/2026 tras feedback: la home no mostraba contenido
 * REAL, solo widgets de acciones. Ahora exhibe lo mejor del corpus
 * como carta de presentación de la utilidad del sistema.
 */
export function RecentLibrary({ docs }: Props) {
  if (docs.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="font-semibold text-base tracking-tight flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              <BookOpen className="h-3.5 w-3.5" />
            </span>
            Normativa reciente en tu base
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Últimos pronunciamientos, opiniones y resoluciones ingresados
          </p>
        </div>
        <Link
          href="/biblioteca"
          className="text-xs font-semibold text-brand-700 dark:text-brand-400 hover:underline inline-flex items-center gap-1 group"
        >
          Ver todos
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {docs.map((doc, i) => {
          const meta = getDocTypeMeta(doc.type);
          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <Link href={`/biblioteca/documento/${doc.id}`} className="block h-full group">
                <Card className="p-4 h-full hover:border-brand-400 transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0 ${meta.bg} ${meta.color} border-transparent`}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full mr-1"
                        style={{ backgroundColor: meta.tagColor }}
                      />
                      {meta.label}
                    </Badge>
                    {doc.date && (
                      <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {formatDate(doc.date)}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                    {doc.number || doc.title}
                  </h3>

                  {doc.ai_summary?.de_que_trata && (
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                      <Sparkles className="h-3 w-3 text-brand-500 inline mr-1 -mt-0.5" />
                      {doc.ai_summary.de_que_trata}
                    </p>
                  )}

                  {doc.ai_summary?.temas && doc.ai_summary.temas.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/60 flex flex-wrap gap-1">
                      {doc.ai_summary.temas.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/70 text-muted-foreground font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
