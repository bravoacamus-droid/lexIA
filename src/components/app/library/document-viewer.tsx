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
  ExternalLink,
  ListTree,
  Highlighter,
  Trash2,
  MessageSquare,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, getDocTypeMeta, formatDate } from '@/lib/utils';
import { formatForDisplay } from '@/lib/normativa/format-raw';
import { SummaryPanel, type DocumentSummary } from '@/components/app/library/summary-panel';
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
  initialSummary?: DocumentSummary | null;
  initialSummaryGeneratedAt?: string | null;
  initialSummaryModel?: string | null;
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
  initialSummary = null,
  initialSummaryGeneratedAt = null,
  initialSummaryModel = null,
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
  // Formatear el texto plano del PDF a markdown estructurado antes de
  // renderizar. El extractor de PDF deja headings y artículos como
  // texto plano; formatForDisplay convierte tablas del PDF en tablas
  // markdown reales, une palabras partidas y estructura secciones.
  // NO se usa el mismo formateador del chunk-sheet ni del RAG:
  //   Biblioteca (usuario final) → formatForDisplay (mode: 'display')
  //   Chunk-sheet (cita en chat) → formatNormativaText (mode: 'strip')
  //   RAG (chat/llamada respuestas) → el chunk raw, sin formato
  // Feedback César 30/06/2026: "la biblioteca es para el usuario y no
  // tendría que ser la misma que usa el sistema para responder".
  const text = useMemo(
    () => formatForDisplay(doc.raw_text),
    [doc.raw_text],
  );

  // Track del heading (artículo/capítulo) actualmente visible al hacer
  // scroll. Se usa para mostrar el sticky mini-header con "estás en
  // Artículo X" y para resaltar el item activo del TOC.
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [activeHeadingText, setActiveHeadingText] = useState<string>('');

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

  // Mapa question.key → anchor id, para que el SummaryPanel pueda hacer
  // scroll a la sección cuando se clickea una pregunta.
  const sectionAnchors = useMemo(
    () =>
      mapQuestionKeysToAnchors(
        Object.keys(QUESTION_KEY_TO_SECTION_HINTS),
        toc,
      ),
    [toc],
  );

  // Build a text with highlight overlays + anclas invisibles en las
  // secciones detectadas por la TOC (útil para pronunciamientos y
  // opiniones cuyos "CUESTIONAMIENTO N° 1" son texto plano, no headings
  // markdown).
  const renderedContent = useMemo(
    () => renderWithHighlights(injectSectionAnchors(text, toc), annotations),
    [text, toc, annotations],
  );

  // Trackear qué heading está actualmente en el viewport para mostrar
  // el sticky mini-header con "Estás leyendo Artículo X" y para
  // resaltar el item activo en el TOC. Usamos IntersectionObserver
  // con rootMargin negativo desde arriba para que solo dispare cuando
  // el heading ya pasó del "área de lectura".
  useEffect(() => {
    if (toc.length === 0) return;
    const headings = toc
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    // Fallback: si el usuario no ha scrolleado nada, marcar el primero
    setActiveHeadingId((prev) => prev || toc[0].id);
    setActiveHeadingText((prev) => prev || toc[0].text);

    const observer = new IntersectionObserver(
      (entries) => {
        // Filtramos los que ya cruzaron la línea de 25% del viewport
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const el = visible[0].target as HTMLElement;
          const id = el.id;
          const item = toc.find((t) => t.id === id);
          if (item) {
            setActiveHeadingId(id);
            setActiveHeadingText(item.text);
          }
        }
      },
      {
        rootMargin: '-80px 0px -70% 0px',
        threshold: [0, 1],
      },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);

  async function copyDocumentLink() {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    toast.success('Enlace del documento copiado');
  }

  function askLexiaAboutDoc() {
    // Redirige al chat con el documento pre-cargado como contexto.
    // El chat crea nueva conversación y usa el titulo/tipo/número como
    // prompt inicial.
    const prompt = encodeURIComponent(
      `Sobre el documento "${doc.number || doc.title}" (${doc.type}), quiero preguntar:`,
    );
    window.location.href = `/chat?new=1&q=${prompt}`;
  }

  return (
    <>
      <div className="border-b border-border bg-card/70 backdrop-blur-sm sticky top-14 z-10">
        {/* Feedback César 30/06/2026: aprovechar el espacio a la izquierda.
            Full width con padding responsivo, mismo que library-view. */}
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-10 xl:px-14 flex items-center justify-between gap-4 py-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/biblioteca">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {doc.number || doc.type}
            </p>
            {activeHeadingText && (
              <motion.p
                key={activeHeadingText}
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-semibold text-brand-700 dark:text-brand-400 truncate"
              >
                <span className="text-muted-foreground font-normal">Leyendo · </span>
                {activeHeadingText}
              </motion.p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={copyDocumentLink} aria-label="Copiar enlace">
                  <Link2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copiar enlace del documento</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={askLexiaAboutDoc}
                  className="text-brand-700 dark:text-brand-400"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Preguntar a LexIA</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preguntar a LexIA sobre este documento</TooltipContent>
            </Tooltip>
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

      <div className="w-full max-w-none px-4 sm:px-6 lg:px-10 xl:px-14 py-8 grid grid-cols-12 gap-6">
        {/* TOC sidebar (left) — solo aparece si hay items.
            Feedback César 30/06/2026: aprovechar más ancho de pantalla.
            Reducido de col-span-3 a col-span-2 para dar más espacio al contenido. */}
        {toc.length > 0 && (
          <aside className="hidden lg:block col-span-2">
            <Card className="p-4 sticky top-32">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <ListTree className="h-3.5 w-3.5" />
                Contenido
              </h2>
              <ul className="space-y-0.5 max-h-[60vh] overflow-y-auto scrollbar-thin">
                {toc.map((item) => {
                  const isActive = activeHeadingId === item.id;
                  return (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className={cn(
                          'block py-1 text-xs leading-relaxed transition-colors border-l-2 pl-2 -ml-0.5 rounded-r',
                          item.level === 1 ? 'font-semibold' : '',
                          item.level === 2 && 'pl-4',
                          item.level >= 3 && 'pl-6',
                          isActive
                            ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400'
                            : 'border-transparent text-muted-foreground hover:text-brand-700 dark:hover:text-brand-400 hover:border-brand-300',
                        )}
                      >
                        {item.text}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </aside>
        )}

        {/* Main content — expande cuando no hay TOC */}
        <main className={cn('col-span-12 min-w-0', toc.length > 0 ? 'lg:col-span-7' : 'lg:col-span-9')}>
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
            <h1 className="font-semibold text-3xl sm:text-4xl tracking-tight text-balance">
              {doc.title}
            </h1>
            {doc.summary && (
              <p className="mt-3 text-muted-foreground leading-relaxed">
                {doc.summary}
              </p>
            )}
            {/* Banner de aviso para "Buscador Interpretativo" — son índices
                sin texto normativo, solo hipervínculos a opiniones. Sin este
                aviso, el usuario abre esperando leer el Reglamento y solo
                ve la lista de títulos de artículo. */}
            {(doc.title?.toLowerCase().includes('buscador interpretativo') ||
              doc.title?.toLowerCase().includes('buscador de opiniones organizadas por artículo')) && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 text-sm">
                <div className="flex gap-3">
                  <span className="text-lg">ℹ</span>
                  <div className="flex-1">
                    <p className="font-medium text-amber-900 dark:text-amber-200">
                      Este documento es un índice de opiniones, no el texto normativo.
                    </p>
                    <p className="mt-1 text-amber-800 dark:text-amber-300/90 leading-relaxed">
                      Es el buscador oficial del DTN-OECE que lista los títulos de cada artículo
                      con hipervínculos hacia las opiniones vinculadas. Para leer el <strong>texto
                      completo</strong> del Reglamento y de la Ley 32069, consulta el documento{' '}
                      <em>"Ley N° 32069 + DS N° 009-2025-EF (texto íntegro El Peruano)"</em>.
                    </p>
                  </div>
                </div>
              </div>
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
                h1: ({ children }) => {
                  const id = slugifyChildren(children);
                  return (
                    <h1 id={id} className="font-semibold scroll-mt-32 group/heading relative">
                      {children}
                      <HeadingActions id={id} title={String(children)} />
                    </h1>
                  );
                },
                h2: ({ children }) => {
                  const id = slugifyChildren(children);
                  return (
                    <h2 id={id} className="scroll-mt-32 group/heading relative">
                      {children}
                      <HeadingActions id={id} title={String(children)} />
                    </h2>
                  );
                },
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

        {/* Sidebar derecho: Resumen IA + Relacionados + Mis resaltados */}
        <aside className="hidden lg:block col-span-3 space-y-5">
          {/* Resumen IA generado + Documentos relacionados.
              Bug reportado César 08/07/2026: cuando el panel derecho es
              más alto que el viewport visible, la parte inferior queda
              inaccesible (sticky no scrollea internamente). Fix:
              max-h + overflow-y-auto en el propio sticky. Ahora se
              puede scrollear dentro del panel para ver todas las
              preguntas + relacionados + mis resaltados sin perder la
              vista fija al hacer scroll del documento principal. */}
          <div className="sticky top-32 space-y-5 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin pr-1">
            <SummaryPanel
              documentId={doc.id}
              docType={doc.type}
              initialSummary={initialSummary}
              initialGeneratedAt={initialSummaryGeneratedAt}
              initialModel={initialSummaryModel}
              rawText={doc.raw_text || undefined}
              savedAt={saved ? new Date().toISOString() : null}
              sectionAnchors={sectionAnchors}
            />
            {/* Mis resaltados */}
          <Card className="p-4">
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
          </div>
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
  /** Índice de arranque del match dentro del markdown crudo, útil para
   *  inyectar anclas antes de secciones detectadas en texto plano
   *  (no headings markdown). */
  offset?: number;
}

/**
 * Mapea el `key` de cada pregunta del SummaryPanel al anchor id de la
 * sección del documento que responde esa pregunta. Se usa para hacer
 * las questions del sidebar clickeables — César 08/07/2026: pedía un
 * índice sticky que acompañe siempre en pronunciamientos, para poder
 * saltar de cuestionamientos a conclusiones sin scrollear.
 *
 * Cada question key tiene una lista de patrones (regex sobre el texto
 * del heading) por orden de preferencia. Se elige el PRIMER TocItem
 * que matchee alguno de los patrones.
 */
const QUESTION_KEY_TO_SECTION_HINTS: Record<string, RegExp[]> = {
  sumilla: [/sumilla/i, /materia/i],
  de_que_trata: [/sumilla/i, /materia/i, /asunto/i, /antecedente/i],
  asunto: [/asunto/i, /materia/i, /sumilla/i],
  antecedentes: [/antecedente/i, /hechos/i],
  cuestionamientos: [/cuestionamiento/i, /consulta/i, /petitorio/i, /materia/i],
  consultas_formuladas: [/consulta/i, /cuestionamiento/i, /materia/i],
  normativa_aplicada: [
    /normativa/i,
    /marco\s+normativo/i,
    /fundamento/i,
    /base\s+legal/i,
    /an[áa]lisis/i,
  ],
  normativa_desarrolla: [/normativa/i, /marco\s+normativo/i, /fundamento/i],
  puntos_controvertidos: [/controvertid/i, /puntos/i, /an[áa]lisis/i],
  criterio: [/criterio/i, /an[áa]lisis/i, /fundamento/i],
  que_criterio_establece: [/criterio/i, /an[áa]lisis/i, /fundamento/i],
  decisiones: [/decisi/i, /resuelve/i, /pronunciamiento/i],
  resolucion: [/resuelve/i, /decisi/i, /parte\s+resolutiva/i],
  inconsistencias: [/inconsisten/i, /observa/i, /omisi/i],
  modificaciones: [/modifica/i, /reformul/i, /disposi/i],
  disposiciones: [/disposi/i, /regla/i, /norma/i],
  obligaciones: [/obligaci/i, /disposi/i],
  conclusion: [/conclusi/i, /parte\s+final/i],
  conclusiones: [/conclusi/i, /parte\s+final/i],
  que_establece: [/establece/i, /disposi/i, /norma/i],
  a_quien_afecta: [/afecta/i, /alcance/i, /aplicaci/i],
};

/**
 * Devuelve `{ questionKey → anchorId }` recorriendo los patrones para
 * cada key y eligiendo el primer TocItem que matchea. Si no hay match
 * queda ausente y la question no será clickeable.
 */
export function mapQuestionKeysToAnchors(
  questionKeys: string[],
  toc: TocItem[],
): Record<string, string> {
  const map: Record<string, string> = {};
  if (toc.length === 0) return map;
  for (const key of questionKeys) {
    const hints = QUESTION_KEY_TO_SECTION_HINTS[key];
    if (!hints) continue;
    for (const re of hints) {
      const item = toc.find((t) => re.test(t.text));
      if (item) {
        map[key] = item.id;
        break;
      }
    }
  }
  return map;
}

function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const seen = new Set<string>();

  // Trunca un heading largo a su parte "canónica" para la TOC.
  // Los PDFs a veces pegan texto del cuerpo al heading porque el extractor
  // no reconoció el salto. Truncamos hasta el primer "." o coma si la
  // longitud excede 80 chars, con fallback a 120.
  const trimHeading = (raw: string): string => {
    const clean = raw.replace(/\s+/g, ' ').trim();
    if (clean.length <= 80) return clean;
    // Buscar primer punto o "." que cierre una frase corta
    const cutIdx = clean.slice(0, 100).search(/[.]\s|:\s/);
    if (cutIdx > 15 && cutIdx < 100) return clean.slice(0, cutIdx + 1);
    // Fallback: cortar en 120 chars sin partir palabra
    if (clean.length > 120) {
      const trunc = clean.slice(0, 120);
      const lastSpace = trunc.lastIndexOf(' ');
      return (lastSpace > 60 ? trunc.slice(0, lastSpace) : trunc) + '…';
    }
    return clean;
  };

  // 1. Headings markdown estándar (# H1, ## H2, ### H3)
  const reMd = /^(#{1,3})\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = reMd.exec(markdown))) {
    const level = m[1].length;
    const text = trimHeading(m[2]);
    const id = slugify(text);
    if (!seen.has(id)) {
      seen.add(id);
      items.push({ id, level, text, offset: m.index });
    }
  }

  // 2. Si no hay headings markdown, detectar patrones del texto plano:
  //    - Romanos: "I. ANTECEDENTES", "II. ANÁLISIS"
  //    - Numerados: "1. ANTECEDENTES", "2. ANÁLISIS"
  //    - Mayúsculas: "CUESTIONAMIENTO N° 1", "PETITORIO"
  if (items.length === 0) {
    // Los pronunciamientos y opiniones vienen usualmente sin saltos de
    // línea claros (todo en un solo párrafo). Por eso los patrones NO
    // usan ^/$/m — buscamos inline con un lookbehind sencillo (borde
    // de palabra + espacio) para no matchear en medio de una palabra.
    const KEYWORDS = 'CUESTIONAMIENTOS?|ANTECEDENTES|AN[ÁA]LISIS|CONCLUSIONES?|PETITORIO|FUNDAMENTOS?|FUNDAMENTACI[ÓO]N|RESUELVE|SUMILLA|MATERIA|HECHOS|DECISI[ÓO]N|PARTE\\s+RESOLUTIVA|MARCO\\s+NORMATIVO|NORMATIVA\\s+APLICABLE';
    const patterns: Array<{ re: RegExp; level: number }> = [
      // Con línea propia (formato ideal, poco frecuente en pronunciamientos)
      { re: /^\s*(I{1,4}|IV|V|VI{1,3}|IX|X)\.\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s,:\-]{3,80})$/gm, level: 1 },
      { re: /^\s*(\d{1,2})\.\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s,:\-]{3,80})$/gm, level: 2 },
      // Inline: "1. ANTECEDENTES", "2. CUESTIONAMIENTOS", "4. CONCLUSIONES"
      // — matchea en medio de párrafo continuo que es como vienen los
      // pronunciamientos OECE extraídos de PDF.
      { re: new RegExp(`\\s(\\d{1,2})\\.\\s+(${KEYWORDS})\\b`, 'g'), level: 2 },
      // Inline sin numeración: "CUESTIONAMIENTO N° 1", "PETITORIO", etc.
      { re: new RegExp(`\\s(${KEYWORDS}|CUESTIONAMIENTO\\s+N[\\.°º]?\\s*\\d+)\\b`, 'g'), level: 1 },
    ];

    for (const { re, level } of patterns) {
      let mm: RegExpExecArray | null;
      while ((mm = re.exec(markdown))) {
        const text = (mm[2] ? `${mm[1]}. ${mm[2]}` : mm[1] || mm[0]).trim();
        const id = slugify(text);
        if (id.length < 3) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        items.push({ id, level, text, offset: mm.index });
      }
    }
  }

  // Ordenamos por posición en el documento — los patrones no-markdown
  // no vienen en orden porque ejecutamos regex separados.
  items.sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0));

  // Dedup de secciones muy próximas (mismo bloque capturado por 2
  // patrones distintos, ej: "1. ANTECEDENTES" por patrón numerado +
  // "ANTECEDENTES" por patrón keyword). Nos quedamos con el primero.
  const deduped: TocItem[] = [];
  let lastOffset = -100;
  for (const it of items) {
    const off = it.offset ?? 0;
    if (off - lastOffset < 30) continue;
    deduped.push(it);
    lastOffset = off;
  }

  // Limit a 30 items para no saturar
  return deduped.slice(0, 30);
}

/**
 * Inyecta anclas invisibles `<span id="..."></span>` antes de cada
 * TocItem cuyo offset se conoce. Sirve para secciones detectadas en
 * texto plano (ej: "CUESTIONAMIENTO N° 1") que NO son headings
 * markdown y por lo tanto no tienen un elemento con id en el DOM.
 *
 * Sin esto, la TOC izquierda muestra el ítem pero al clickear el hash
 * no lleva a ningún lado. Con esto, las anclas quedan disponibles para
 * navegación por hash y para el auto-scroll desde el SummaryPanel
 * (feedback César 08/07/2026).
 */
function injectSectionAnchors(text: string, toc: TocItem[]): string {
  if (toc.length === 0) return text;
  // Insertamos de atrás hacia adelante para no descuadrar los offsets.
  const withOffsets = toc
    .filter((t) => typeof t.offset === 'number')
    .sort((a, b) => (b.offset ?? 0) - (a.offset ?? 0));
  let out = text;
  for (const item of withOffsets) {
    // Si el ancla ya está en el markdown (heading con id automático)
    // no necesitamos inyectar nada. Detectamos heurísticamente si el
    // texto en el offset comienza con "#": entonces el ReactMarkdown
    // components.h* ya asigna el id.
    const chunk = out.slice(item.offset!, item.offset! + 4);
    if (/^#{1,3}\s/.test(chunk)) continue;
    // Inyectar un span invisible con id + una línea en blanco para no
    // romper el flujo del markdown.
    const anchor = `\n<span id="${item.id}" class="scroll-mt-32" aria-hidden="true"></span>\n\n`;
    out = out.slice(0, item.offset!) + anchor + out.slice(item.offset!);
  }
  return out;
}

/**
 * Botones que aparecen al hover sobre un heading (Artículo X, Título Y).
 * Permiten: copiar el link permanente (ancla) y preguntar a LexIA
 * específicamente sobre ese artículo. Feedback de César 30/06/2026:
 * "faltan botones de copiar cita / preguntar a LexIA sobre este
 * artículo" en la vista de detalle de documento.
 */
function HeadingActions({ id, title }: { id: string; title: string }) {
  async function copyAnchor() {
    const url = window.location.href.split('#')[0] + '#' + id;
    await navigator.clipboard.writeText(url);
    toast.success('Enlace al artículo copiado');
  }

  function askAbout() {
    const clean = title.replace(/\s+/g, ' ').trim();
    const prompt = encodeURIComponent(`Explícame en detalle: ${clean}`);
    window.location.href = `/chat?new=1&q=${prompt}`;
  }

  return (
    <span className="inline-flex ml-2 gap-1.5 align-middle opacity-40 hover:opacity-100 group-hover/heading:opacity-90 transition-opacity">
      <button
        type="button"
        onClick={copyAnchor}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-brand-700 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-950/40 transition-colors"
        aria-label="Copiar enlace al artículo"
        title="Copiar enlace al artículo"
      >
        <Link2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={askAbout}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-brand-700 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-950/40 transition-colors"
        aria-label="Preguntar a LexIA sobre este artículo"
        title="Preguntar a LexIA sobre este artículo"
      >
        <MessageSquare className="h-3.5 w-3.5" />
      </button>
    </span>
  );
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
