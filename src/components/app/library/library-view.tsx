'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, BookmarkCheck, Inbox, Folder } from 'lucide-react';
import { TypeFilter } from '@/components/app/library/type-filter';
import { TagSearchInput } from '@/components/app/library/tag-search-input';
import { LawSelector, type LawFilter } from '@/components/app/law-selector';
import { FoldersPanel } from '@/components/app/library/folders-panel';
import { DocumentCard } from '@/components/app/library/document-card';
import { SaveToFolderDialog } from '@/components/app/library/save-to-folder';
import type { NormativeDocType } from '@/lib/supabase/types';
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

interface Props {
  initialFolders: FolderItem[];
  unfiledCount: number;
  initialDocuments: BrowseDoc[];
  initialTotal: number;
  pageSize: number;
  savedDocIds: string[];
  typeCounts: Record<string, number>;
}

export function LibraryView({
  initialFolders,
  unfiledCount: initialUnfiled,
  initialDocuments,
  initialTotal,
  pageSize,
  savedDocIds: initialSavedIds,
  typeCounts,
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
        // Si hay carpeta/saved seleccionado y NO hay query, traer documentos guardados.
        // Si hay query, ignorar la selección y buscar normalmente.
        if (selectedFolderId && !debounced) {
          // 'all-saved' → todos los saved del usuario (sin filtro de folder)
          // 'unfiled'   → saved con folder_id null
          // <uuid>      → saved con ese folder_id
          const folderParam =
            selectedFolderId === 'all-saved' ? 'all' : selectedFolderId;
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
          const docs = (json.documents || []) as BrowseDoc[];
          setBrowseDocs(docs);
          if (typeof json.total === 'number') setBrowseTotal(json.total);
          setExhausted(json.hasMore === false);
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
  }, [debounced, type, selectedFolderId, pageSize, lawFilter, tags]);

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
    <div className="container max-w-7xl py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-3xl tracking-tight">Biblioteca normativa</h1>
        <p className="text-sm text-muted-foreground">
          Busca semánticamente en la base de Contrataciones del Estado. Guarda lo que te
          importa en carpetas personales.
        </p>
      </header>

      {/* Search + filter */}
      <div className="space-y-3">
        <TagSearchInput
          tags={tags}
          input={query}
          onTagsChange={setTags}
          onInputChange={setQuery}
          loading={loading}
          placeholder="Busca por palabras clave… (Enter para agregar tag, combina varios)"
        />
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
