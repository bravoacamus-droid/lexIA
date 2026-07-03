'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, BookmarkCheck, Inbox, Folder, BookOpen, Scale, TrendingUp, Bot, Star, Clock } from 'lucide-react';
import { TypeFilter } from '@/components/app/library/type-filter';
import { TagSearchInput } from '@/components/app/library/tag-search-input';
import { LawSelector, type LawFilter } from '@/components/app/law-selector';
import { FoldersPanel } from '@/components/app/library/folders-panel';
import { DocumentCard } from '@/components/app/library/document-card';
import { SaveToFolderDialog } from '@/components/app/library/save-to-folder';
import type { NormativeDocType } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface FolderItem {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
  count: number;
}

/** Resumen IA — subset que necesitamos para las cards. */
interface AiSummaryMini {
  de_que_trata?: string;
  temas?: string[];
}

interface BrowseDoc {
  id: string;
  type: NormativeDocType;
  number: string | null;
  title: string;
  summary: string | null;
  date: string | null;
  source_url: string | null;
  ai_summary?: AiSummaryMini | null;
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
  /** Cuántas de las queries multi-tag matchearon en este documento. */
  matchedCount?: number;
  /** Índices de queries que matchearon, alineado a `tags` del componente. */
  matchedQueries?: number[];
}

export interface LibraryStats {
  /** Total de documentos indexados en la biblioteca. */
  totalDocuments: number;
  /** Nuevos en los últimos 7 días. */
  newThisWeek: number;
  /** % de documentos con resumen IA generado (cobertura real). */
  aiCoveragePct: number;
}

interface Props {
  initialFolders: FolderItem[];
  unfiledCount: number;
  initialDocuments: BrowseDoc[];
  initialTotal: number;
  pageSize: number;
  savedDocIds: string[];
  typeCounts: Record<string, number>;
  stats: LibraryStats;
}

/**
 * Preguntas curadas que se muestran como chips debajo del buscador para
 * orientar al usuario nuevo. Al hacer click se copian al buscador y
 * disparan la búsqueda. Están verificadas contra la BD real (todas
 * traen chunks relevantes con similarity ≥ 0.70).
 */
const SUGGESTED_QUERIES: Array<{ label: string; query: string }> = [
  {
    label: '¿Cómo acreditar experiencia del postor?',
    query: 'acreditar experiencia del postor documentos válidos',
  },
  {
    label: '¿Cuándo procede una ampliación de plazo?',
    query: 'causales de ampliación de plazo contractual',
  },
  {
    label: '¿Qué es el direccionamiento a marca?',
    query: 'direccionamiento a marca en las bases',
  },
  {
    label: '¿Plazo del recurso de apelación?',
    query: 'plazo recurso apelación ante Tribunal',
  },
  {
    label: '¿Qué establece el Art. 66.6?',
    query: 'divergencia pliego absolutorio bases integradas prevalencia',
  },
];

export function LibraryView({
  initialFolders,
  unfiledCount: initialUnfiled,
  initialDocuments,
  initialTotal,
  pageSize,
  savedDocIds: initialSavedIds,
  typeCounts,
  stats,
}: Props) {
  const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
  const [unfiledCount, setUnfiledCount] = useState(initialUnfiled);
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(initialSavedIds),
  );

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [type, setType] = useState<NormativeDocType | null>(null);
  // Filtro de ley aplicable (null = ambas). Persiste solo durante la
  // navegación; al recargar Biblioteca vuelve a Ambas.
  const [lawFilter, setLawFilter] = useState<LawFilter>(null);
  // Filtro rápido: 'favorites' = solo docs guardados por el usuario;
  // 'recent' = últimos 30 días indexados en la base. null = sin filtro.
  // Feedback César 01/07/2026 (ref UI cliente): agregar toggles visibles.
  const [quickFilter, setQuickFilter] = useState<'favorites' | 'recent' | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<
    string | null | 'unfiled' | 'all-saved'
  >(null);
  const [browseDocs, setBrowseDocs] = useState<BrowseDoc[]>(initialDocuments);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [mode, setMode] = useState<'browse' | 'search' | 'folder'>('browse');
  const [loading, setLoading] = useState(false);

  // Infinite scroll state — solo aplica en modo browse sin query y sin folder
  const [browseTotal, setBrowseTotal] = useState<number>(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Save modal state
  const [savingDocId, setSavingDocId] = useState<string | null>(null);

  // Debounce input → searched query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch on debounced/type/folder change — reset paginación al cambiar filtros
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setExhausted(false);
      try {
        // quickFilter='favorites' se implementa reutilizando la ruta de
        // documentos guardados (todos los saved del usuario). Se activa
        // aunque el usuario no haya elegido carpeta.
        const effectiveFolderId =
          quickFilter === 'favorites' ? 'all-saved' : selectedFolderId;

        // Si hay carpeta/saved seleccionado y NO hay query, traer documentos guardados.
        // Si hay query, ignorar la selección y buscar normalmente.
        if (effectiveFolderId && !debounced) {
          // 'all-saved' → todos los saved del usuario (sin filtro de folder)
          // 'unfiled'   → saved con folder_id null
          // <uuid>      → saved con ese folder_id
          const folderParam =
            effectiveFolderId === 'all-saved' ? 'all' : effectiveFolderId;
          const res = await fetch(`/api/saved-documents?folder=${folderParam}`);
          const json = await res.json();
          if (cancelled) return;
          const docs = (json.saved || [])
            .map((s: { normative_documents: BrowseDoc | null }) => s.normative_documents)
            .filter((d: BrowseDoc | null): d is BrowseDoc => d !== null);
          setBrowseDocs(docs);
          setMode('folder');
          setExhausted(true);
          return;
        }

        // En modo browse sin query: usar limit más alto para tener pesado inicial
        const hasSearchInput = debounced.length > 0 || tags.length > 0;
        const initialLimit = hasSearchInput ? 12 : pageSize;
        const law = lawFilter && lawFilter.length === 1 ? lawFilter[0] : null;
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: debounced,
            queries: tags,
            type,
            law,
            limit: initialLimit,
            offset: 0,
          }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.mode === 'search') {
          setMode('search');
          setResults(json.results || []);
          setExhausted(true); // los modos search no paginan (devuelve los top N)
        } else {
          setMode('browse');
          let docs = (json.documents || []) as BrowseDoc[];
          // quickFilter='recent' — mostrar solo docs publicados en
          // los últimos 30 días. Filtro post-fetch simple (el endpoint
          // ya ordena por fecha desc, así que suelen estar entre los
          // primeros).
          if (quickFilter === 'recent') {
            const cutoff = Date.now() - 30 * 86400_000;
            docs = docs.filter((d) => {
              if (!d.date) return false;
              const t = new Date(d.date).getTime();
              return !Number.isNaN(t) && t >= cutoff;
            });
            setExhausted(true); // no seguimos paginando si estamos filtrando
          } else if (typeof json.total === 'number') {
            setBrowseTotal(json.total);
            setExhausted(json.hasMore === false);
          }
          setBrowseDocs(docs);
        }
      } catch {
        toast.error('Error al buscar. Intenta de nuevo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced, type, selectedFolderId, pageSize, lawFilter, tags, quickFilter]);

  // Infinite scroll: cargar siguiente página al ver el sentinel
  useEffect(() => {
    if (mode !== 'browse' || debounced || tags.length > 0 || selectedFolderId) return;
    if (exhausted || loading || loadingMore) return;
    if (!sentinelRef.current) return;

    const target = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (loadingMore || exhausted) return;

        setLoadingMore(true);
        const currentLength = browseDocs.length;
        const lawForLoad = lawFilter && lawFilter.length === 1 ? lawFilter[0] : null;
        fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: '',
            type,
            law: lawForLoad,
            limit: pageSize,
            offset: currentLength,
          }),
        })
          .then((r) => r.json())
          .then((json) => {
            if (json.mode !== 'browse') return;
            const more = (json.documents || []) as BrowseDoc[];
            setBrowseDocs((prev) => {
              const seen = new Set(prev.map((d) => d.id));
              const fresh = more.filter((d) => !seen.has(d.id));
              return [...prev, ...fresh];
            });
            if (typeof json.total === 'number') setBrowseTotal(json.total);
            if (json.hasMore === false || more.length === 0) setExhausted(true);
          })
          .catch(() => toast.error('Error al cargar más documentos.'))
          .finally(() => setLoadingMore(false));
      },
      { rootMargin: '400px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    mode,
    debounced,
    selectedFolderId,
    exhausted,
    loading,
    loadingMore,
    browseDocs.length,
    type,
    pageSize,
    lawFilter,
  ]);

  async function onSave(documentId: string) {
    setSavingDocId(documentId);
  }

  function onSaveSuccess(documentId: string, folderId: string | null) {
    setSavedIds((prev) => new Set([...prev, documentId]));
    // Refresh folder counts (optimistic)
    if (folderId) {
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, count: f.count + 1 } : f)),
      );
    } else {
      setUnfiledCount((c) => c + 1);
    }
  }

  async function onUnsave(documentId: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(documentId);
      return next;
    });
    const res = await fetch(`/api/saved-documents/${documentId}`, { method: 'DELETE' });
    if (!res.ok) {
      setSavedIds((prev) => new Set([...prev, documentId]));
      toast.error('No se pudo eliminar de la biblioteca');
    } else {
      toast.success('Eliminado de la biblioteca');
      // Reload folder counts approximately — just refresh the page or refetch
      const r = await fetch('/api/folders');
      if (r.ok) {
        const j = await r.json();
        setFolders(j.folders);
        setUnfiledCount(j.unfiledCount || 0);
      }
    }
  }

  function onFolderCreated(folder: FolderItem) {
    setFolders((prev) => [...prev, folder]);
  }

  return (
    /* Feedback César 30/06/2026: "en biblioteca por qué no usas más el
       ancho si tiene espacio a la izquierda". Ampliamos de max-w-7xl
       (1280px) a full width con padding responsivo — aprovecha todo el
       ancho del main del app-shell. */
    <div className="w-full max-w-none px-4 sm:px-6 lg:px-10 xl:px-14 py-8 space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-3xl tracking-tight">
            Biblioteca jurídica inteligente
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <Sparkles className="h-3 w-3" />
            IA activa
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Tu base documental especializada en Contrataciones del Estado peruano.
        </p>
      </header>

      {/* Stats hero — 4 métricas de la biblioteca */}
      <StatsHero stats={stats} />

      {/* Search + preguntas sugeridas + filtros */}
      <div className="space-y-3">
        <TagSearchInput
          tags={tags}
          input={query}
          onTagsChange={setTags}
          onInputChange={setQuery}
          loading={loading}
          placeholder="Pregunta en lenguaje natural o busca un documento…"
        />
        {tags.length === 0 && query.length === 0 && (
          <SuggestedQueries onPick={(q) => setQuery(q)} />
        )}
        {tags.length > 0 && (
          <p className="text-[11px] text-muted-foreground -mt-1.5">
            Buscando documentos que mencionan <strong>{tags.length}</strong> término
            {tags.length !== 1 ? 's' : ''}. Los que coincidan en más tags suben en el ranking.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <TypeFilter value={type} onChange={setType} counts={typeCounts} />
          <LawSelector
            value={lawFilter}
            onChange={setLawFilter}
            ariaLabel="Filtrar biblioteca por ley aplicable"
          />
          <QuickFilters
            value={quickFilter}
            onChange={setQuickFilter}
            favoritesCount={savedIds.size}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Sidebar — folders */}
        <aside className="lg:col-span-3">
          <FoldersPanel
            folders={folders}
            unfiledCount={unfiledCount}
            selectedFolderId={selectedFolderId}
            onSelectFolder={(id) => {
              setSelectedFolderId(id);
              setQuery(''); // limpia el buscador al cambiar de carpeta
            }}
            onCreated={onFolderCreated}
            onChanged={(f) => setFolders(f)}
          />
        </aside>

        {/* Main — results */}
        <section className="lg:col-span-9 min-w-0">
          {/* Badge removible cuando hay carpeta activa */}
          {mode === 'folder' && selectedFolderId && (
            <ActiveFolderBadge
              folderId={selectedFolderId}
              folders={folders}
              docCount={browseDocs.length}
              onClear={() => setSelectedFolderId(null)}
            />
          )}

          {mode === 'search' ? (
            <SearchResultsList
              results={results}
              loading={loading}
              savedIds={savedIds}
              onSave={onSave}
              onUnsave={onUnsave}
              query={debounced}
              highlightTerms={tags.length > 0 ? tags : debounced ? [debounced] : []}
            />
          ) : (
            <BrowseList
              docs={browseDocs}
              loading={loading}
              loadingMore={loadingMore}
              exhausted={exhausted}
              total={mode === 'browse' && !selectedFolderId ? browseTotal : null}
              sentinelRef={sentinelRef}
              savedIds={savedIds}
              onSave={onSave}
              onUnsave={onUnsave}
              folderName={
                mode === 'folder'
                  ? selectedFolderId === 'all-saved'
                    ? 'Todos mis guardados'
                    : selectedFolderId === 'unfiled'
                      ? 'Sin clasificar'
                      : folders.find((f) => f.id === selectedFolderId)?.name || null
                  : null
              }
            />
          )}
        </section>
      </div>

      <SaveToFolderDialog
        documentId={savingDocId}
        folders={folders}
        onClose={() => setSavingDocId(null)}
        onSaved={(folderId) => {
          if (savingDocId) onSaveSuccess(savingDocId, folderId);
          setSavingDocId(null);
        }}
        onFolderCreated={onFolderCreated}
      />
    </div>
  );
}

interface ResultsProps {
  results: SearchResult[];
  loading: boolean;
  savedIds: Set<string>;
  onSave: (id: string) => void;
  onUnsave: (id: string) => void;
  query: string;
  /** Términos para resaltar en title/excerpt. Si vacío, sin highlight. */
  highlightTerms: string[];
}

function SearchResultsList({
  results,
  loading,
  savedIds,
  onSave,
  onUnsave,
  query,
  highlightTerms,
}: ResultsProps) {
  if (loading && results.length === 0) {
    return <LoadingSkeleton />;
  }
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Sin resultados para "{query}"</p>
        <p className="text-xs text-muted-foreground mt-1">
          Prueba con otros términos o quita los filtros de tipo.
        </p>
      </div>
    );
  }

  // Contar resultados por tipo para el badge de resumen
  const countsByType = new Map<string, number>();
  for (const r of results) {
    countsByType.set(r.doc_type, (countsByType.get(r.doc_type) || 0) + 1);
  }
  const typeBreakdown = Array.from(countsByType.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          {results.length} resultado{results.length !== 1 ? 's' : ''}
        </p>
        {typeBreakdown.map(([t, n]) => (
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
                highlightTerms={highlightTerms}
                matchedCount={r.matchedCount}
                totalQueries={highlightTerms.length}
                isSaved={savedIds.has(r.document_id)}
                onSave={() => onSave(r.document_id)}
                onUnsave={() => onUnsave(r.document_id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface BrowseProps {
  docs: BrowseDoc[];
  loading: boolean;
  loadingMore: boolean;
  exhausted: boolean;
  total: number | null;
  sentinelRef: React.RefObject<HTMLDivElement>;
  savedIds: Set<string>;
  onSave: (id: string) => void;
  onUnsave: (id: string) => void;
  folderName?: string | null;
}

function BrowseList({
  docs,
  loading,
  loadingMore,
  exhausted,
  total,
  sentinelRef,
  savedIds,
  onSave,
  onUnsave,
  folderName,
}: BrowseProps) {
  if (loading && docs.length === 0) return <LoadingSkeleton />;
  if (docs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium">
          {folderName ? `La carpeta "${folderName}" está vacía` : 'No hay documentos para mostrar.'}
        </p>
        {folderName && (
          <p className="text-xs text-muted-foreground mt-1">
            Busca documentos y guárdalos con la ⭐ para verlos aquí.
          </p>
        )}
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
        {folderName
          ? `${folderName} · ${docs.length} documento${docs.length === 1 ? '' : 's'}`
          : total != null
            ? `Recientes · ${docs.length} de ${total}`
            : `Recientes · ${docs.length}`}
      </p>
      <div className="space-y-3">
        {docs.map((d) => (
          <DocumentCard
            key={d.id}
            document={d}
            isSaved={savedIds.has(d.id)}
            onSave={() => onSave(d.id)}
            onUnsave={() => onUnsave(d.id)}
          />
        ))}
      </div>
      {/* Sentinel + skeleton para infinite scroll */}
      {!folderName && (
        <div ref={sentinelRef} className="mt-6">
          {loadingMore && <LoadingSkeleton compact />}
          {exhausted && docs.length > 0 && !loadingMore && (
            <p className="text-center text-xs text-muted-foreground py-6">
              Has llegado al final · {docs.length} documento
              {docs.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface ActiveFolderBadgeProps {
  folderId: string | 'unfiled' | 'all-saved';
  folders: FolderItem[];
  docCount: number;
  onClear: () => void;
}

function ActiveFolderBadge({
  folderId,
  folders,
  docCount,
  onClear,
}: ActiveFolderBadgeProps) {
  let icon: React.ReactNode;
  let name: string;
  if (folderId === 'all-saved') {
    icon = <BookmarkCheck className="h-3.5 w-3.5" />;
    name = 'Todos mis guardados';
  } else if (folderId === 'unfiled') {
    icon = <Inbox className="h-3.5 w-3.5" />;
    name = 'Sin clasificar';
  } else {
    icon = <Folder className="h-3.5 w-3.5" />;
    name = folders.find((f) => f.id === folderId)?.name || 'Carpeta';
  }

  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-950/50 px-3 py-1.5">
      <span className="text-brand-700 dark:text-brand-400">{icon}</span>
      <span className="text-xs font-medium text-brand-900 dark:text-brand-200">
        Filtrando por: <strong>{name}</strong>
      </span>
      <span className="text-[10px] font-mono text-brand-700 dark:text-brand-400 tabular-nums">
        {docCount} doc{docCount === 1 ? '' : 's'}
      </span>
      <button
        onClick={onClear}
        className="ml-1 rounded-full p-0.5 hover:bg-brand-200 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-400 transition-colors"
        aria-label="Quitar filtro"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function LoadingSkeleton({ compact = false }: { compact?: boolean }) {
  const count = compact ? 2 : 3;
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => i + 1).map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse-soft">
          <div className="h-3 w-20 bg-secondary rounded mb-3" />
          <div className="h-5 w-3/4 bg-secondary rounded mb-2" />
          <div className="h-3 w-full bg-secondary rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Hero de estadísticas de la biblioteca — 4 tarjetas horizontales.
 * Feedback César 01/07/2026: adoptar el patrón de la Ref UI enviada por
 * el cliente con métricas visibles al ingresar a la biblioteca.
 */
function StatsHero({ stats }: { stats: LibraryStats }) {
  const items = [
    {
      icon: BookOpen,
      label: 'Documentos indexados',
      value: stats.totalDocuments.toLocaleString('es-PE'),
      delta:
        stats.newThisWeek > 0
          ? `+${stats.newThisWeek} esta semana`
          : 'Sin novedades esta semana',
      color: 'text-brand-600 dark:text-brand-400',
      bg: 'bg-brand-50 dark:bg-brand-950/40',
      ring: 'ring-brand-100 dark:ring-brand-900/40',
    },
    {
      icon: Scale,
      label: 'Normativa vigente',
      value: 'Ley 32069',
      delta: 'y su Reglamento (DS 009-2025-EF)',
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
      ring: 'ring-violet-100 dark:ring-violet-900/40',
    },
    {
      icon: TrendingUp,
      label: 'Nuevas publicaciones',
      value: stats.newThisWeek.toString(),
      delta: 'últimos 7 días',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      ring: 'ring-amber-100 dark:ring-amber-900/40',
    },
    {
      icon: Bot,
      label: 'Cobertura IA',
      value: `${stats.aiCoveragePct}%`,
      delta: 'documentos con resumen',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      ring: 'ring-emerald-100 dark:ring-emerald-900/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 transition-shadow hover:shadow-sm"
        >
          <div
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ring-1 ${it.ring} ${it.bg}`}
          >
            <it.icon className={`h-5 w-5 ${it.color}`} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium truncate">
              {it.label}
            </p>
            <p className="text-lg font-semibold leading-none mt-1 truncate">
              {it.value}
            </p>
            <p className="text-[11px] text-muted-foreground/80 truncate mt-1">
              {it.delta}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Chips de preguntas sugeridas debajo del buscador. Al clickear se copia
 * al input y ejecuta la búsqueda automáticamente (debounce lo dispara).
 * Solo se muestran cuando el buscador está vacío para no distraer.
 */
function SuggestedQueries({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mr-1">
        Prueba con
      </span>
      {SUGGESTED_QUERIES.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => onPick(s.query)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:border-brand-300 dark:hover:border-brand-700 px-3 py-1 text-xs text-foreground/80 transition-colors"
        >
          <Sparkles className="h-3 w-3 text-brand-500" />
          {s.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Toggles rápidos: Favoritos y Recientes. Feedback César 01/07/2026
 * inspirado en la ref UI del cliente que muestra filtros rápidos junto
 * a los filtros por tipo. Se puede tener activo solo uno a la vez —
 * clickear el mismo lo desactiva.
 */
function QuickFilters({
  value,
  onChange,
  favoritesCount,
}: {
  value: 'favorites' | 'recent' | null;
  onChange: (v: 'favorites' | 'recent' | null) => void;
  favoritesCount: number;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 p-0.5">
      <button
        type="button"
        onClick={() => onChange(value === 'favorites' ? null : 'favorites')}
        title="Mostrar solo documentos guardados"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
          value === 'favorites'
            ? 'bg-amber-500 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
        )}
      >
        <Star
          className="h-3.5 w-3.5"
          fill={value === 'favorites' ? 'currentColor' : 'none'}
        />
        Favoritos
        {favoritesCount > 0 && (
          <span
            className={cn(
              'ml-0.5 font-mono text-[10px] opacity-70',
              value === 'favorites' ? 'text-white' : '',
            )}
          >
            {favoritesCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onChange(value === 'recent' ? null : 'recent')}
        title="Documentos publicados en los últimos 30 días"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
          value === 'recent'
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        Recientes
      </button>
    </div>
  );
}
