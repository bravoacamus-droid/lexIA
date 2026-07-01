'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  SearchCode,
  Zap,
  Filter,
  X,
  BookOpen,
  Scale,
  FileSearch,
  MessageSquare,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TagSearchInput } from '@/components/app/library/tag-search-input';
import { TypeFilter } from '@/components/app/library/type-filter';
import { LawSelector, type LawFilter } from '@/components/app/law-selector';
import { DocumentCard } from '@/components/app/library/document-card';
import { getRoleTheme } from '@/lib/navigation/role-theme';
import { toast } from 'sonner';
import type { NormativeDocType } from '@/lib/supabase/types';
import type { ProfileRole } from '@/lib/auth/session';

interface Props {
  role: ProfileRole | null;
}

interface AiSummaryMini {
  de_que_trata?: string;
  temas?: string[];
}

interface SearchResult {
  document_id: string;
  doc_type: NormativeDocType;
  doc_number: string | null;
  doc_title: string;
  summary: string | null;
  date: string | null;
  source_url: string | null;
  topChunkContent: string;
  score: number;
  chunkCount: number;
  ai_summary?: AiSummaryMini | null;
  matchedCount?: number;
  matchedQueries?: number[];
}

/**
 * Vista dedicada del Buscador Inteligente Multi-Tag.
 *
 * Diseño enfocado en presentar el buscador como protagonista con:
 * - Hero explicativo del feature
 * - Input multi-tag prominente
 * - Ejemplos de búsquedas exitosas por rol (chips clickeables)
 * - Filtros expandibles (tipo, ley)
 * - Contador por tipo en tiempo real
 * - Resultados con resaltado por colores
 * - Empty state que muestra los ejemplos de nuevo
 */
export function SmartSearchView({ role }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = getRoleTheme(role);

  const [tags, setTags] = useState<string[]>(() => {
    const q = searchParams.get('q');
    if (q) {
      return q
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length >= 2);
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [type, setType] = useState<NormativeDocType | null>(null);
  const [lawFilter, setLawFilter] = useState<LawFilter>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Ejecutar búsqueda cuando cambian tags o filtros
  useEffect(() => {
    if (tags.length === 0) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const law = lawFilter && lawFilter.length === 1 ? lawFilter[0] : null;
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: '',
            queries: tags,
            type,
            law,
            limit: 20,
            offset: 0,
          }),
        });
        const json = await res.json();
        if (cancelled) return;
        setResults((json.results || []) as SearchResult[]);
      } catch {
        if (!cancelled) toast.error('Error al buscar. Intenta de nuevo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [tags, type, lawFilter]);

  // Sincronizar URL con tags
  useEffect(() => {
    const url = new URL(window.location.href);
    if (tags.length > 0) {
      url.searchParams.set('q', tags.join(','));
    } else {
      url.searchParams.delete('q');
    }
    router.replace(url.pathname + url.search, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags.join('|')]);

  const suggestions = useMemo(() => getSuggestionsByRole(role), [role]);

  const hasSearch = tags.length > 0;

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      {/* Hero del buscador */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`relative overflow-hidden rounded-2xl border ${
          theme?.classes.softBorder || 'border-brand-500/20'
        } ${
          theme?.classes.gradient || 'bg-gradient-to-br from-brand-50/40 to-transparent'
        } p-6 sm:p-8`}
      >
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden
        />
        <div className="relative flex items-start gap-4">
          <div
            className={`hidden sm:inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              theme?.classes.solidBg || 'bg-brand-600'
            } shadow-lg`}
          >
            <SearchCode className="h-7 w-7 text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 text-white px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider mb-2">
              <Zap className="h-3 w-3" />
              Motor de búsqueda con IA
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
              Buscador inteligente de normativa
            </h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-xl">
              Combina varios términos como <strong>chips</strong> y encuentra pronunciamientos, opiniones,
              resoluciones y directivas vigentes. Los resultados se rankean por cuántos términos coinciden.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Input multi-tag prominente */}
      <div className="space-y-3">
        <TagSearchInput
          tags={tags}
          input={input}
          onTagsChange={setTags}
          onInputChange={setInput}
          loading={loading}
          placeholder="Escribe un término y presiona Enter para agregarlo como chip…"
        />
        {tags.length > 0 && (
          <p className="text-[11px] text-muted-foreground -mt-1">
            Buscando documentos que mencionan <strong>{tags.length}</strong> término
            {tags.length !== 1 ? 's' : ''} · Los que más coincidan suben en el ranking
          </p>
        )}

        {/* Botón de filtros expandibles */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((s) => !s)}
            className="h-8"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {(type || (lawFilter && lawFilter.length > 0)) && (
              <span className="ml-1 rounded-full bg-brand-500 text-white text-[9px] font-bold px-1.5 py-0.5">
                {(type ? 1 : 0) + (lawFilter && lawFilter.length > 0 ? 1 : 0)}
              </span>
            )}
          </Button>
          {(type || (lawFilter && lawFilter.length > 0)) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setType(null);
                setLawFilter(null);
              }}
              className="h-8 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                    Tipo de documento
                  </p>
                  <TypeFilter value={type} onChange={setType} counts={{}} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                    Régimen normativo
                  </p>
                  <LawSelector value={lawFilter} onChange={setLawFilter} />
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Estado inicial: sugerencias por rol */}
      {!hasSearch && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles
              className={`h-4 w-4 ${theme?.classes.text || 'text-brand-600'}`}
            />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Ejemplos {theme?.label ? `para ${theme.label.toLowerCase()}` : 'para probar'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <button
                  type="button"
                  onClick={() => setTags(s.tags)}
                  className="w-full text-left group"
                >
                  <Card className="p-4 h-full hover:border-brand-400 hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                          theme?.classes.softBg || 'bg-brand-50'
                        } ${theme?.classes.text || 'text-brand-600'} shrink-0`}
                      >
                        <s.icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-snug group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                          {s.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {s.desc}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary/80 text-foreground/80"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </button>
              </motion.div>
            ))}
          </div>

          {/* Tip educativo */}
          <Card className="p-4 bg-secondary/30 border-dashed">
            <div className="flex items-start gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 shrink-0">
                <Zap className="h-3 w-3" />
              </span>
              <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Consejo</p>
                <p>
                  Combina hasta <strong>8 términos</strong>. Un documento que mencione TODOS
                  aparece arriba de uno que mencione solo algunos. Ejemplo: buscar
                  <code className="mx-1 px-1 py-0.5 rounded bg-background text-[11px]">
                    personal clave
                  </code>
                  +
                  <code className="mx-1 px-1 py-0.5 rounded bg-background text-[11px]">
                    incongruencia
                  </code>
                  +
                  <code className="mx-1 px-1 py-0.5 rounded bg-background text-[11px]">
                    certificado
                  </code>
                  encuentra resoluciones del TCE sobre impugnaciones por documentos del residente.
                </p>
              </div>
            </div>
          </Card>
        </motion.section>
      )}

      {/* Resultados */}
      {hasSearch && (
        <section className="space-y-3">
          {loading && results.length === 0 ? (
            <Card className="p-10 text-center">
              <div className="animate-pulse text-sm text-muted-foreground">
                Buscando en 371 documentos…
              </div>
            </Card>
          ) : results.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <Sparkles className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Sin resultados</p>
              <p className="text-xs text-muted-foreground mt-1">
                Prueba con términos más generales o quita algún tag.
              </p>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  {results.length} resultado{results.length !== 1 ? 's' : ''}
                </p>
                {countByType(results).map(([t, n]) => (
                  <span
                    key={t}
                    className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/80 px-1.5 py-0.5 rounded bg-secondary/60"
                  >
                    {t} {n}
                  </span>
                ))}
              </div>
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {results.map((r, i) => (
                    <motion.div
                      key={r.document_id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.02 }}
                    >
                      <DocumentCard
                        document={{
                          id: r.document_id,
                          type: r.doc_type,
                          number: r.doc_number,
                          title: r.doc_title,
                          summary: r.summary,
                          date: r.date,
                          source_url: r.source_url,
                          ai_summary: r.ai_summary,
                        }}
                        excerpt={r.topChunkContent}
                        highlightTerms={tags}
                        matchedCount={r.matchedCount}
                        totalQueries={tags.length}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

interface Suggestion {
  name: string;
  desc: string;
  tags: string[];
  icon: typeof BookOpen;
}

function getSuggestionsByRole(role: ProfileRole | null): Suggestion[] {
  if (role === 'entity') {
    return [
      {
        name: 'Direccionamiento en TDR',
        desc: 'Encuentra pronunciamientos sobre requisitos técnicos restrictivos.',
        tags: ['direccionamiento', 'requisitos técnicos', 'libre concurrencia'],
        icon: FileSearch,
      },
      {
        name: 'Elevación al OECE',
        desc: 'Casos y plazos para elevar cuestionamientos.',
        tags: ['elevación', 'cuestionamientos', 'pliego absolutorio'],
        icon: MessageSquare,
      },
      {
        name: 'Ampliación de plazo',
        desc: 'Causales aceptadas y no aceptadas por el Tribunal.',
        tags: ['ampliación de plazo', 'causal', 'obras'],
        icon: BookOpen,
      },
      {
        name: 'Adicional de obra',
        desc: 'Requisitos técnicos y presupuestales.',
        tags: ['adicional', 'obra', 'presupuesto'],
        icon: Scale,
      },
    ];
  }

  if (role === 'provider') {
    return [
      {
        name: 'Subsanación de ofertas',
        desc: 'Qué documentos son subsanables y cuáles no.',
        tags: ['subsanación', 'omisión', 'anexo'],
        icon: FileSearch,
      },
      {
        name: 'Experiencia del personal clave',
        desc: 'Impugnaciones sobre acreditación de residente/supervisor.',
        tags: ['personal clave', 'incongruencia', 'certificado de trabajo'],
        icon: BookOpen,
      },
      {
        name: 'Apelación al Tribunal',
        desc: 'Plazos, garantía y causales de apelación.',
        tags: ['apelación', 'plazo', 'garantía'],
        icon: Scale,
      },
      {
        name: 'Bienes similares',
        desc: 'Cómo definir experiencia en bienes semejantes.',
        tags: ['bienes similares', 'experiencia', 'especialidad'],
        icon: MessageSquare,
      },
    ];
  }

  if (role === 'consultant') {
    return [
      {
        name: 'Jurisprudencia reciente TCE',
        desc: 'Últimas resoluciones del Tribunal por temas complejos.',
        tags: ['nulidad', 'procedimiento', 'tribunal'],
        icon: Scale,
      },
      {
        name: 'Interpretación del Art 51',
        desc: 'Difusión del requerimiento vs anuncio de contratación.',
        tags: ['difusión', 'requerimiento', 'anuncio'],
        icon: BookOpen,
      },
      {
        name: 'Fraccionamiento del objeto',
        desc: 'Casos donde el TCE declaró nulidad por fraccionamiento.',
        tags: ['fraccionamiento', 'objeto contractual', 'nulidad'],
        icon: FileSearch,
      },
      {
        name: 'Gestión de riesgos en obras',
        desc: 'Análisis cualitativo y cuantitativo obligatorio.',
        tags: ['gestión de riesgos', 'matriz', 'obras'],
        icon: MessageSquare,
      },
    ];
  }

  // Genéricas
  return [
    {
      name: 'Plazo de pago al contratista',
      desc: '¿Cuándo debe pagar la entidad tras la conformidad?',
      tags: ['plazo', 'pago', 'conformidad'],
      icon: BookOpen,
    },
    {
      name: 'Subsanación de oferta',
      desc: 'Qué documentos son subsanables.',
      tags: ['subsanación', 'oferta', 'omisión'],
      icon: FileSearch,
    },
    {
      name: 'Apelación al Tribunal',
      desc: 'Plazos y requisitos.',
      tags: ['apelación', 'tribunal', 'plazo'],
      icon: Scale,
    },
    {
      name: 'Ampliación de plazo obras',
      desc: 'Causales y procedimiento.',
      tags: ['ampliación', 'plazo', 'obras'],
      icon: MessageSquare,
    },
  ];
}

function countByType(results: SearchResult[]): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const r of results) {
    map.set(r.doc_type, (map.get(r.doc_type) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}
