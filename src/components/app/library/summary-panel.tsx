'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Lightbulb,
  Users,
  Scale,
  Tag,
  Link2,
  Loader2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getDocTypeMeta } from '@/lib/utils';
import type { NormativeDocType } from '@/lib/supabase/types';

export interface DocumentSummary {
  de_que_trata: string;
  que_establece: string;
  a_quien_afecta: string;
  que_criterio_establece: string;
  temas: string[];
}

interface RelatedDoc {
  document_id: string;
  doc_title: string;
  doc_type: NormativeDocType;
  doc_number: string | null;
  similarity: number;
}

interface Props {
  documentId: string;
  initialSummary: DocumentSummary | null;
  initialGeneratedAt: string | null;
  initialModel: string | null;
}

/**
 * Panel "Resumen IA" para la vista de detalle de un documento normativo.
 * Implementa lo pedido por César en Observaciones.docx (imágenes 1-2):
 *
 *   - Resumen ejecutivo generado por IA con sub-secciones:
 *       ¿De qué trata? · ¿Qué establece? · ¿A quién afecta? · ¿Qué criterio?
 *   - Temas principales (chips)
 *   - Relacionado con este documento (top-5 por similitud de embedding)
 *
 * Flujo de generación lazy:
 *   1. Si initialSummary != null → muestra directamente.
 *   2. Si null → muestra CTA "Generar resumen con IA" → POST → guarda
 *      en BD → muestra resultado.
 *   3. Botón "Regenerar" disponible siempre que hay summary.
 */
export function SummaryPanel({
  documentId,
  initialSummary,
  initialGeneratedAt,
  initialModel,
}: Props) {
  const [summary, setSummary] = useState<DocumentSummary | null>(initialSummary);
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt);
  const [model, setModel] = useState<string | null>(initialModel);
  const [loading, setLoading] = useState(false);
  const [related, setRelated] = useState<RelatedDoc[] | null>(null);

  // Cargar relacionados al montar (independiente del summary)
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/normativa/${documentId}/related`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setRelated((j.related as RelatedDoc[]) || []);
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  async function generate(force = false) {
    setLoading(true);
    try {
      const res = await fetch(`/api/normativa/${documentId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.detail || json?.error || 'Error desconocido');
      }
      setSummary(json.summary);
      setGeneratedAt(json.generated_at);
      setModel(json.model);
      if (!json.cached) toast.success('Resumen generado');
    } catch (e) {
      toast.error('No se pudo generar el resumen', {
        description: (e as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Resumen ejecutivo */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h3 className="font-semibold text-sm tracking-tight">
              Resumen IA
            </h3>
          </div>
          {summary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generate(true)}
              disabled={loading}
              className="h-7 px-2 text-xs"
              title="Regenerar resumen"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!summary && !loading && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-2 space-y-3"
            >
              <p className="text-xs text-muted-foreground leading-relaxed">
                Genera un resumen ejecutivo con IA: <strong>¿de qué trata?</strong>,{' '}
                <strong>¿qué establece?</strong>, <strong>¿a quién afecta?</strong>,{' '}
                <strong>¿qué criterio establece?</strong> y temas clave.
              </p>
              <Button
                size="sm"
                onClick={() => generate(false)}
                variant="glow"
                className="w-full"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generar resumen
              </Button>
            </motion.div>
          )}

          {loading && !summary && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-6 gap-2"
            >
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
              <p className="text-xs text-muted-foreground">
                Generando resumen con IA…
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                Suele tomar 10-20 segundos
              </p>
            </motion.div>
          )}

          {summary && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <SummarySection
                icon={<Lightbulb className="h-3.5 w-3.5" />}
                label="¿De qué trata?"
                text={summary.de_que_trata}
              />
              <SummarySection
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="¿Qué establece?"
                text={summary.que_establece}
              />
              <SummarySection
                icon={<Users className="h-3.5 w-3.5" />}
                label="¿A quién afecta?"
                text={summary.a_quien_afecta}
              />
              <SummarySection
                icon={<Scale className="h-3.5 w-3.5" />}
                label="¿Qué criterio establece?"
                text={summary.que_criterio_establece}
              />

              {summary.temas.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Temas principales
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.temas.map((t) => (
                      <Link
                        key={t}
                        href={`/biblioteca?tema=${encodeURIComponent(t)}`}
                        className="inline-flex items-center rounded-md bg-secondary text-xs px-2 py-0.5 font-medium hover:bg-brand-100 dark:hover:bg-brand-950 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {generatedAt && (
                <p className="text-[10px] text-muted-foreground/70 pt-2">
                  Generado{' '}
                  {new Date(generatedAt).toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {model && ` · ${model.replace('gemini-', '')}`}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Relacionados */}
      {related && related.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-foreground">
              <Link2 className="h-3.5 w-3.5" />
            </span>
            <h3 className="font-semibold text-sm tracking-tight">
              Documentos relacionados
            </h3>
          </div>
          <div className="space-y-1.5">
            {related.map((r) => {
              const meta = getDocTypeMeta(r.doc_type);
              return (
                <Link
                  key={r.document_id}
                  href={`/biblioteca/documento/${r.document_id}`}
                  className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/60 transition-colors"
                >
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded ${meta.bg} mt-0.5`}
                  >
                    <span className={`text-[9px] font-bold ${meta.color}`}>
                      {meta.label[0]}
                    </span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 mb-0.5 ${meta.color}`}
                    >
                      {meta.label}
                    </Badge>
                    <p className="text-xs leading-snug font-medium line-clamp-2 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                      {r.doc_number || r.doc_title}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      Similitud {(r.similarity * 100).toFixed(0)}%
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function SummarySection({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1 text-brand-700 dark:text-brand-400">
        {icon}
        <p className="text-[10px] uppercase tracking-wider font-semibold">
          {label}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{text}</p>
    </div>
  );
}
