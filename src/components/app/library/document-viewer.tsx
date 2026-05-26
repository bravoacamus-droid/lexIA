'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  StarOff,
  ExternalLink,
  ListTree,
  Highlighter,
  Trash2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, getDocTypeMeta, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { SaveToFolderDialog } from '@/components/app/library/save-to-folder';
import { HighlightToolbar } from '@/components/app/library/highlight-toolbar';
import type {
  NormativeDocType,
  UserAnnotation,
} from '@/lib/supabase/types';
import type { FolderItem } from '@/components/app/library/library-view';

interface DocumentFull {
  id: string;
  type: NormativeDocType;
  number: string | null;
  title: string;
  summary: string | null;
  date: string | null;
  source_url: string | null;
  raw_text: string | null;
}

interface Props {
  document: DocumentFull;
  initialAnnotations: UserAnnotation[];
  isSaved: boolean;
  savedFolderId: string | null;
  folders: FolderItem[];
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: 'bg-yellow-200/70 dark:bg-yellow-500/40',
  green: 'bg-green-200/70 dark:bg-green-500/40',
  blue: 'bg-blue-200/70 dark:bg-blue-500/40',
};

export function DocumentViewer({
  document: doc,
  initialAnnotations,
  isSaved: initialSaved,
  folders: initialFolders,
}: Props) {
  const meta = getDocTypeMeta(doc.type);
  const [saved, setSaved] = useState(initialSaved);
  const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
  const [savingDialog, setSavingDialog] = useState(false);
  const [annotations, setAnnotations] = useState<UserAnnotation[]>(initialAnnotations);
  const [toolbar, setToolbar] = useState<{
    x: number;
    y: number;
    start: number;
    end: number;
    text: string;
  } | null>(null);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const text = doc.raw_text || '';

  // Detect text selection and show toolbar
  useEffect(() => {
    function onMouseUp() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !contentRef.current) {
        setToolbar(null);
        return;
      }
      const range = sel.getRangeAt(0);
      // Ensure selection is within contentRef
      if (!contentRef.current.contains(range.commonAncestorContainer)) {
        setToolbar(null);
        return;
      }
      const selectedText = sel.toString();
      if (selectedText.length < 4) {
        setToolbar(null);
        return;
      }
      // Compute offsets relative to the full plain text
      const offsets = getSelectionOffsets(contentRef.current, range);
      if (!offsets) {
        setToolbar(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setToolbar({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        start: offsets.start,
        end: offsets.end,
        text: selectedText,
      });
    }
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keyup', onMouseUp);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keyup', onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createHighlight(color: 'yellow' | 'green' | 'blue') {
    if (!toolbar) return;
    const optimistic: UserAnnotation = {
      id: `optimistic-${Date.now()}`,
      user_id: '',
      document_id: doc.id,
      highlighted_text: toolbar.text,
      position: { start_offset: toolbar.start, end_offset: toolbar.end },
      color,
      created_at: new Date().toISOString(),
    };
    setAnnotations((prev) => [...prev, optimistic]);
    setToolbar(null);
    window.getSelection()?.removeAllRanges();

    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: doc.id,
          highlighted_text: toolbar.text,
          position: { start_offset: toolbar.start, end_offset: toolbar.end },
          color,
        }),
      });
      if (!res.ok) throw new Error();
      const { annotation } = await res.json();
      setAnnotations((prev) =>
        prev.map((a) => (a.id === optimistic.id ? annotation : a)),
      );
    } catch {
      setAnnotations((prev) => prev.filter((a) => a.id !== optimistic.id));
      toast.error('No se pudo guardar el resaltado');
    }
  }

  async function deleteAnnotation(id: string) {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/annotations/${id}`, { method: 'DELETE' });
  }

  async function toggleSave() {
    if (saved) {
      setSaved(false);
      const res = await fetch(`/api/saved-documents/${doc.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setSaved(true);
        toast.error('No se pudo quitar de biblioteca');
      } else {
        toast.success('Quitado de biblioteca');
      }
    } else {
      setSavingDialog(true);
    }
  }

  // Generate TOC from headings in raw_text
  const toc = useMemo(() => extractToc(text), [text]);

  // Build a text with highlight overlays
  const renderedContent = useMemo(
    () => renderWithHighlights(text, annotations),
    [text, annotations],
  );

  return (
    <>
      <div className="border-b border-border bg-card/70 backdrop-blur-sm sticky top-14 z-10">
        <div className="container max-w-6xl flex items-center justify-between gap-4 py-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/biblioteca">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div className="flex-1 text-center min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {doc.number || doc.type}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {doc.source_url && (
              <Button asChild variant="ghost" size="sm">
                <a href={doc.source_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Fuente</span>
                </a>
              </Button>
            )}
            <Button
              variant={saved ? 'default' : 'outline'}
              size="sm"
              onClick={toggleSave}
            >
              {saved ? (
                <>
                  <Star className="h-4 w-4 fill-current" />
                  <span className="hidden sm:inline">Guardado</span>
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" />
                  <span className="hidden sm:inline">Guardar</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl py-8 grid grid-cols-12 gap-8">
        {/* TOC sidebar (left) */}
        <aside className="hidden lg:block col-span-3">
          <Card className="p-4 sticky top-32">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <ListTree className="h-3.5 w-3.5" />
              Contenido
            </h2>
            {toc.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No hay tabla de contenido disponible.
              </p>
            ) : (
              <ul className="space-y-0.5 max-h-[60vh] overflow-y-auto scrollbar-thin">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={cn(
                        'block py-1 text-xs leading-relaxed transition-colors hover:text-brand-700 dark:hover:text-brand-400',
                        item.level === 1 ? 'font-semibold text-foreground' : 'text-muted-foreground',
                        item.level === 2 && 'pl-3',
                        item.level >= 3 && 'pl-5',
                      )}
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>

        {/* Main content */}
        <main className="col-span-12 lg:col-span-6 min-w-0">
          <motion.header
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <Badge variant="outline" className={cn('mb-3', meta.bg, meta.color)}>
              <span
                className="inline-block h-1.5 w-1.5 rounded-full mr-1"
                style={{ backgroundColor: meta.tagColor }}
              />
              {meta.label}
              {doc.date && (
                <>
                  <span className="opacity-50 mx-1">·</span>
                  {formatDate(doc.date)}
                </>
              )}
            </Badge>
            <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-balance">
              {doc.title}
            </h1>
            {doc.summary && (
              <p className="mt-3 text-muted-foreground leading-relaxed">
                {doc.summary}
              </p>
            )}
          </motion.header>

          <article
            ref={contentRef}
            className="prose-lexia select-text"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({ children }) => (
                  <h1 id={slugifyChildren(children)} className="font-serif scroll-mt-32">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 id={slugifyChildren(children)} className="scroll-mt-32">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 id={slugifyChildren(children)} className="scroll-mt-32">
                    {children}
                  </h3>
                ),
                mark: ({ children, ...props }) => {
                  const color = (props as { 'data-color'?: string })['data-color'] || 'yellow';
                  const bg =
                    color === 'green'
                      ? 'bg-emerald-200/70 dark:bg-emerald-500/40'
                      : color === 'blue'
                        ? 'bg-sky-200/70 dark:bg-sky-500/40'
                        : 'bg-yellow-200/70 dark:bg-yellow-500/40';
                  return (
                    <mark className={`${bg} rounded px-0.5 -mx-0.5`}>
                      {children}
                    </mark>
                  );
                },
              }}
            >
              {renderedContent}
            </ReactMarkdown>
          </article>
        </main>

        {/* Highlights sidebar (right) */}
        <aside className="hidden lg:block col-span-3">
          <Card className="p-4 sticky top-32">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <Highlighter className="h-3.5 w-3.5" />
              Mis resaltados
              <span className="ml-auto font-mono text-[10px] tabular-nums">
                {annotations.length}
              </span>
            </h2>
            {annotations.length === 0 ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Selecciona texto del documento para resaltarlo. Se guarda automáticamente.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
                {annotations.map((a) => (
                  <li
                    key={a.id}
                    className="group rounded-md border border-border p-2 hover:border-brand-400 transition-colors"
                  >
                    <div
                      className={cn(
                        'h-1 w-full rounded-full mb-1.5',
                        HIGHLIGHT_COLORS[a.color] || HIGHLIGHT_COLORS.yellow,
                      )}
                    />
                    <p className="text-[11px] leading-relaxed line-clamp-3 italic">
                      "{a.highlighted_text}"
                    </p>
                    <div className="mt-1 flex justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => deleteAnnotation(a.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                            aria-label="Eliminar resaltado"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar</TooltipContent>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      {toolbar && (
        <HighlightToolbar
          x={toolbar.x}
          y={toolbar.y}
          onPick={createHighlight}
          onClose={() => setToolbar(null)}
        />
      )}

      <SaveToFolderDialog
        documentId={savingDialog ? doc.id : null}
        folders={folders}
        onClose={() => setSavingDialog(false)}
        onSaved={() => {
          setSaved(true);
          setSavingDialog(false);
        }}
        onFolderCreated={(f) => setFolders((prev) => [...prev, f])}
      />
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

interface TocItem {
  id: string;
  level: number;
  text: string;
}

function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const re = /^(#{1,3})\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) {
    const level = m[1].length;
    const text = m[2].trim();
    items.push({ id: slugify(text), level, text });
  }
  return items;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function slugifyChildren(children: React.ReactNode): string {
  function txt(n: React.ReactNode): string {
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(txt).join('');
    if (n && typeof n === 'object' && 'props' in (n as unknown as Record<string, unknown>)) {
      const props = (n as unknown as { props: { children?: React.ReactNode } }).props;
      return txt(props.children);
    }
    return '';
  }
  return slugify(txt(children));
}

/** Compute character offsets of a Range within a container. */
function getSelectionOffsets(
  container: HTMLElement,
  range: Range,
): { start: number; end: number } | null {
  let start = 0;
  let end = 0;
  let found = false;

  function walk(node: Node, offset: number): { offset: number; done: boolean } {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = (node.textContent || '').length;
      if (node === range.startContainer) {
        start = offset + range.startOffset;
      }
      if (node === range.endContainer) {
        end = offset + range.endOffset;
        found = true;
      }
      return { offset: offset + length, done: false };
    }
    let cur = offset;
    for (const child of Array.from(node.childNodes)) {
      const r = walk(child, cur);
      cur = r.offset;
      if (found) return { offset: cur, done: true };
    }
    return { offset: cur, done: false };
  }

  walk(container, 0);
  if (!found) return null;
  return { start, end };
}

/**
 * Render markdown with non-overlapping highlight spans.
 * We approximate by replacing exact text matches in the markdown source —
 * para la demo es suficiente y se ve correcto en el render.
 */
function renderWithHighlights(text: string, annotations: UserAnnotation[]): string {
  if (annotations.length === 0) return text;
  let out = text;
  // Sort by length desc so we don't break longer highlights with shorter overlapping ones
  const sorted = [...annotations].sort(
    (a, b) => b.highlighted_text.length - a.highlighted_text.length,
  );
  for (const a of sorted) {
    const needle = a.highlighted_text.trim();
    if (needle.length < 4) continue;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const re = new RegExp(escaped, 'g');
    out = out.replace(re, (match) => `<mark data-color="${a.color}">${match}</mark>`);
  }
  return out;
}
