'use client';

import { useEffect, useMemo, useState } from 'react';
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
  FileText,
  Quote,
  History,
  BookmarkCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn, getDocTypeMeta } from '@/lib/utils';
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
  /**
   * Texto crudo del documento — usado para tabs "Contenido" y "Citas".
   * Si no viene, esas tabs quedan vacías.
   */
  rawText?: string;
  /** Fecha (ISO) en que el usuario guardó este doc. Null si no está guardado. */
  savedAt?: string | null;
}

type TabKey = 'summary' | 'content' | 'citations' | 'history';

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
  rawText,
  savedAt,
}: Props) {
  const [summary, setSummary] = useState<DocumentSummary | null>(initialSummary);
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt);
  const [model, setModel] = useState<string | null>(initialModel);
  const [loading, setLoading] = useState(false);
  const [related, setRelated] = useState<RelatedDoc[] | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  // Extracción de citas del texto — inspecciona el rawText en busca de
  // referencias normativas: "artículo N", "Ley N° XXXX", "DS N° XXX-YYYY-EF",
  // "Directiva N° XXX", "Pronunciamiento N° XXX", "Opinión N° XXX".
  // Se dedupica y se muestran las primeras 20.
  const citations = useMemo(() => extractCitations(rawText || ''), [rawText]);

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

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Sparkles }> = [
    { key: 'summary', label: 'Resumen IA', icon: Sparkles },
    { key: 'content', label: 'Contenido', icon: FileText },
    { key: 'citations', label: 'Citas', icon: Quote },
    { key: 'history', label: 'Historial', icon: History },
  ];

  return (
    <div className="space-y-5">
      {/* Panel principal con tabs (Ref UI cliente 01/07/2026) */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h3 className="font-semibold text-sm tracking-tight">Panel del documento</h3>
          </div>
          {activeTab === 'summary' && summary && (
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

        {/* Tabs nav */}
        <div className="flex items-center gap-1 -mx-1 border-b border-border">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors',
                  active
                    ? 'border-brand-500 text-brand-700 dark:text-brand-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab: Contenido */}
        {activeTab === 'content' && (
          <ContentTab rawText={rawText} />
        )}

        {/* Tab: Citas */}
        {activeTab === 'citations' && (
          <CitationsTab citations={citations} />
        )}

        {/* Tab: Historial */}
        {activeTab === 'history' && (
          <HistoryTab
            generatedAt={generatedAt}
            model={model}
            savedAt={savedAt}
          />
        )}

        {/* Tab: Resumen IA (default) */}
        {activeTab === 'summary' && (
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
        )}
      </Card>

      {/* Relacionados */}
      {related && related.length > 0 && (
        <RelatedCard related={related} />
      )}
    </div>
  );
}

/**
 * Sección de documentos relacionados con expansión.
 * Feedback César 01/07/2026 (Ref UI cliente): mostrar solo N iniciales
 * con botón "Ver más relaciones (X)" que expande al resto.
 */
function RelatedCard({ related }: { related: RelatedDoc[] }) {
  const INITIAL_VISIBLE = 5;
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? related : related.slice(0, INITIAL_VISIBLE);
  const remaining = related.length - INITIAL_VISIBLE;
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-foreground">
          <Link2 className="h-3.5 w-3.5" />
        </span>
        <h3 className="font-semibold text-sm tracking-tight">
          Documentos relacionados
        </h3>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {related.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {visible.map((r) => {
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
      {remaining > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full h-8 text-xs"
        >
          {expanded ? (
            <>Ver menos</>
          ) : (
            <>Ver más relaciones ({remaining})</>
          )}
        </Button>
      )}
    </Card>
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

/**
 * Tab de Contenido: preview del texto normativo del documento.
 * Muestra primeros ~3500 chars con opción de "Ver más" que expande.
 */
function ContentTab({ rawText }: { rawText?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!rawText) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        <FileText className="h-6 w-6 mx-auto mb-2 opacity-30" />
        Sin contenido cargado para este documento.
      </div>
    );
  }
  const PREVIEW_LEN = 3500;
  const isLong = rawText.length > PREVIEW_LEN;
  const shown = expanded ? rawText : rawText.slice(0, PREVIEW_LEN);
  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        Extracto del texto original
      </p>
      <div className="text-xs leading-relaxed text-foreground/85 whitespace-pre-wrap font-mono/none max-h-96 overflow-y-auto scrollbar-thin border-l-2 border-brand-500/40 pl-3">
        {shown}
        {isLong && !expanded && <span className="text-muted-foreground">…</span>}
      </div>
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full h-7 text-xs"
        >
          {expanded ? 'Ver menos' : `Ver más (${(rawText.length - PREVIEW_LEN).toLocaleString('es-PE')} caracteres)`}
        </Button>
      )}
    </div>
  );
}

/**
 * Tab de Citas: lista de referencias normativas encontradas en el texto.
 * Cada cita agrupa las N veces que aparece. Se muestran las primeras 20.
 */
function CitationsTab({ citations }: { citations: ExtractedCitation[] }) {
  if (citations.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        <Quote className="h-6 w-6 mx-auto mb-2 opacity-30" />
        No se detectaron referencias normativas en este documento.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {citations.length} referencia{citations.length !== 1 ? 's' : ''} detectadas
      </p>
      <div className="space-y-1 max-h-96 overflow-y-auto scrollbar-thin">
        {citations.slice(0, 20).map((c) => (
          <div
            key={c.text}
            className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5"
          >
            <span className="text-xs font-medium truncate">{c.text}</span>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              ×{c.count}
            </span>
          </div>
        ))}
        {citations.length > 20 && (
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            + {citations.length - 20} más
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Tab de Historial: eventos relevantes del documento y del usuario.
 * Actualmente muestra la generación del resumen IA y si está guardado
 * en favoritos. Se puede expandir con más eventos (visitas, preguntas
 * en chat) cuando exista la tabla de tracking.
 */
function HistoryTab({
  generatedAt,
  model,
  savedAt,
}: {
  generatedAt: string | null;
  model: string | null;
  savedAt: string | null | undefined;
}) {
  const events: Array<{ icon: typeof Sparkles; label: string; when: string; sub?: string }> = [];
  if (generatedAt) {
    events.push({
      icon: Sparkles,
      label: 'Resumen IA generado',
      when: new Date(generatedAt).toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      sub: model ? model.replace('gemini-', '') : undefined,
    });
  }
  if (savedAt) {
    events.push({
      icon: BookmarkCheck,
      label: 'Guardado en tu biblioteca',
      when: new Date(savedAt).toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    });
  }
  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        <History className="h-6 w-6 mx-auto mb-2 opacity-30" />
        Aún no hay eventos registrados para este documento.
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        Eventos del documento
      </p>
      <div className="space-y-2">
        {events.map((e) => {
          const Icon = e.icon;
          return (
            <div key={e.label} className="flex items-start gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 mt-0.5">
                <Icon className="h-3 w-3" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-tight">{e.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {e.when}
                  {e.sub && ` · ${e.sub}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ExtractedCitation {
  text: string;
  count: number;
}

/**
 * Extrae referencias normativas del texto mediante regex:
 *   - "artículo N" / "artículo N.M"
 *   - "Ley N° XXXXX"
 *   - "DS N° XXX-YYYY-EF" / "Decreto Supremo N° ..."
 *   - "Directiva N° ..."
 *   - "Pronunciamiento N° ..."
 *   - "Opinión N° ..."
 *   - "Resolución N° ..."
 * Normaliza (baja mayúsculas de la palabra clave) y agrupa por firma.
 */
function extractCitations(text: string): ExtractedCitation[] {
  if (!text) return [];
  const patterns: Array<{ rx: RegExp; label: (m: RegExpMatchArray) => string }> = [
    {
      rx: /art[íi]culo\s+(\d{1,4}(?:\.\d{1,2})?)/gi,
      label: (m) => `Artículo ${m[1]}`,
    },
    {
      rx: /\bLey\s+N[°º.]?\s*(\d{4,6})/gi,
      label: (m) => `Ley N° ${m[1]}`,
    },
    {
      rx: /\b(?:DS|Decreto\s+Supremo)\s+N[°º.]?\s*(\d{3}-\d{4}-[A-Z]+)/gi,
      label: (m) => `DS N° ${m[1]}`,
    },
    {
      rx: /\bDirectiva\s+N[°º.]?\s*(\d{3,4}[-\s]\d{4}[-\s][A-Z\/\.\d]+)/gi,
      label: (m) => `Directiva N° ${m[1]}`,
    },
    {
      rx: /\bPronunciamiento\s+N[°º.]?\s*(\d{2,4}[-\s]\d{4}\/?[A-Z\-]*)/gi,
      label: (m) => `Pronunciamiento N° ${m[1]}`,
    },
    {
      rx: /\bOpini[óo]n\s+N[°º.]?\s*(D?\d{4,7}[-\s]\d{4}[-A-Z\/]*)/gi,
      label: (m) => `Opinión N° ${m[1]}`,
    },
    {
      rx: /\bResoluci[óo]n\s+N[°º.]?\s*(\d{3,5}[-\s]\d{4}[-A-Z\/]*)/gi,
      label: (m) => `Resolución N° ${m[1]}`,
    },
  ];

  const counts = new Map<string, number>();
  for (const p of patterns) {
    let m;
    const rx = new RegExp(p.rx.source, p.rx.flags);
    while ((m = rx.exec(text)) !== null) {
      const key = p.label(m);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count);
}
