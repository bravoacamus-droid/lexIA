'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TypeFilter } from '@/components/app/library/type-filter';
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

interface BrowseDoc {
  id: string;
  type: NormativeDocType;
  number: string | null;
  title: string;
  summary: string | null;
  date: string | null;
  source_url: string | null;
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
}

interface Props {
  initialFolders: FolderItem[];
  unfiledCount: number;
  initialDocuments: BrowseDoc[];
  savedDocIds: string[];
  typeCounts: Record<string, number>;
}

export function LibraryView({
  initialFolders,
  unfiledCount: initialUnfiled,
  initialDocuments,
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
  const [type, setType] = useState<NormativeDocType | null>(null);
  const [browseDocs, setBrowseDocs] = useState<BrowseDoc[]>(initialDocuments);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [mode, setMode] = useState<'browse' | 'search'>('browse');
  const [loading, setLoading] = useState(false);

  // Save modal state
  const [savingDocId, setSavingDocId] = useState<string | null>(null);

  // Debounce input → searched query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch on debounced or type change
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: debounced,
            type,
            limit: 12,
          }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.mode === 'search') {
          setMode('search');
          setResults(json.results || []);
        } else {
          setMode('browse');
          setBrowseDocs(json.documents || []);
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
  }, [debounced, type]);

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
        <h1 className="font-serif text-3xl tracking-tight">Biblioteca normativa</h1>
        <p className="text-sm text-muted-foreground">
          Busca semánticamente en la base de Contrataciones del Estado. Guarda lo que te
          importa en carpetas personales.
        </p>
      </header>

      {/* Search + filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar opinión, pronunciamiento, resolución, artículo…"
            className="pl-11 h-12 text-base shadow-sm"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <TypeFilter value={type} onChange={setType} counts={typeCounts} />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Sidebar — folders */}
        <aside className="lg:col-span-3">
          <FoldersPanel
            folders={folders}
            unfiledCount={unfiledCount}
            onCreated={onFolderCreated}
            onChanged={(f) => setFolders(f)}
          />
        </aside>

        {/* Main — results */}
        <section className="lg:col-span-9 min-w-0">
          {mode === 'search' ? (
            <SearchResultsList
              results={results}
              loading={loading}
              savedIds={savedIds}
              onSave={onSave}
              onUnsave={onUnsave}
              query={debounced}
            />
          ) : (
            <BrowseList
              docs={browseDocs}
              loading={loading}
              savedIds={savedIds}
              onSave={onSave}
              onUnsave={onUnsave}
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
}

function SearchResultsList({
  results,
  loading,
  savedIds,
  onSave,
  onUnsave,
  query,
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

  return (
    <div>
      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
        {results.length} resultados
      </p>
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
                }}
                excerpt={r.topChunkContent}
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
  savedIds: Set<string>;
  onSave: (id: string) => void;
  onUnsave: (id: string) => void;
}

function BrowseList({ docs, loading, savedIds, onSave, onUnsave }: BrowseProps) {
  if (loading && docs.length === 0) return <LoadingSkeleton />;
  if (docs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-sm">No hay documentos para mostrar.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">
        Recientes
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
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse-soft">
          <div className="h-3 w-20 bg-secondary rounded mb-3" />
          <div className="h-5 w-3/4 bg-secondary rounded mb-2" />
          <div className="h-3 w-full bg-secondary rounded" />
        </div>
      ))}
    </div>
  );
}
