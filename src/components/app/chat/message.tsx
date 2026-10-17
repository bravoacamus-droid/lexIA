'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { normalizarMarkdownModelo } from '@/lib/markdown/normalizar-modelo';
import { detectTextCitations, type TextCitationMatch } from '@/lib/citations/detect';
import { detectFocusHint } from '@/lib/citations/focus';
import { extractSnippetRef } from '@/lib/citation-ref';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Library,
  ChevronDown,
  Search,
} from 'lucide-react';
import { CaritaCompanero } from '@/components/marca/companero';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, getDocTypeMeta } from '@/lib/utils';
import { toast } from 'sonner';
import type { ChatSource } from '@/lib/supabase/types';

interface MsgProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources: ChatSource[];
  };
  isStreaming?: boolean;
  /** El segundo argumento es el numeral/artículo detectado en el texto
   *  circundante al chip [N] — se usa para hacer highlight + auto-scroll
   *  al fragmento exacto dentro del sheet de la fuente. */
  onCitationClick: (src: ChatSource, focus?: string | null) => void;
  onRegenerate?: () => void;
}

export function ChatMessageView({
  message,
  isStreaming,
  onCitationClick,
  onRegenerate,
}: MsgProps) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  // Las que leyó el modelo, numeradas [N], y las del tema, que van
  // detrás y se listan aparte (lib/ai/fuentes-del-tema.ts).
  const citables = useMemo(() => message.sources.filter((s) => !s.relacionada), [message.sources]);
  const relacionadas = useMemo(() => message.sources.filter((s) => s.relacionada), [message.sources]);

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] bg-secondary rounded-2xl rounded-tr-md px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group flex gap-3"
    >
      {/* El avatar es la carita del compañero, no el logotipo: a 28 px
          el logotipo entero es una mancha y el robot sí se reconoce. */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
        <CaritaCompanero tamano={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="prose-lexia">
          <AssistantMarkdown
            content={message.content}
            sources={citables}
            textuales={message.sources}
            isStreaming={isStreaming}
            onCitationClick={onCitationClick}
          />
        </div>

        {citables.length > 0 && !isStreaming && (
          <SourcesPanel
            sources={citables}
            onCitationClick={onCitationClick}
          />
        )}

        {relacionadas.length > 0 && !isStreaming && (
          <FuentesDelTemaPanel fuentes={relacionadas} onCitationClick={onCitationClick} />
        )}

        {!isStreaming && (
          <div className="mt-2 flex items-center gap-1">
            <ActionButton
              label="Copiar"
              icon={<Copy className="h-3.5 w-3.5" />}
              activeIcon={<Check className="h-3.5 w-3.5" />}
              onClick={async () => {
                await navigator.clipboard.writeText(message.content);
                toast.success('Copiado al portapapeles');
              }}
            />
            {onRegenerate && (
              <ActionButton
                label="Regenerar"
                icon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={onRegenerate}
              />
            )}
            <ActionButton
              label="Me sirvió"
              icon={<ThumbsUp className="h-3.5 w-3.5" />}
              active={feedback === 'up'}
              onClick={() => {
                setFeedback('up');
                toast.success('Gracias por tu feedback');
              }}
            />
            <ActionButton
              label="No me sirvió"
              icon={<ThumbsDown className="h-3.5 w-3.5" />}
              active={feedback === 'down'}
              onClick={() => {
                setFeedback('down');
                toast('Tomamos nota — gracias');
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ActionButton({
  label,
  icon,
  activeIcon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors',
            active && 'text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-950',
          )}
          aria-label={label}
        >
          {active && activeIcon ? activeIcon : icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

interface AssistantMdProps {
  content: string;
  /** Las numeradas: [N] es sources[N - 1]. */
  sources: ChatSource[];
  /**
   * Contra las que se enlazan las menciones escritas («Resolución N.°
   * 8067-2026-TCP-S3»): también las del tema, que el modelo no leyó pero
   * pueden aparecer nombradas dentro de un fragmento que sí leyó.
   */
  textuales?: ChatSource[];
  isStreaming?: boolean;
  onCitationClick: (src: ChatSource, focus?: string | null) => void;
}

function AssistantMarkdown({
  content: contenido,
  sources,
  textuales = sources,
  isStreaming,
  onCitationClick,
}: AssistantMdProps) {
  // Reemplazamos [N] por un placeholder reconocible que luego renderizamos
  // como chip. Guardamos también la POSICIÓN original de cada [N] en el
  // texto crudo para poder detectar el artículo circundante (ej. "125.2")
  // cuando el usuario haga click y llevar el modal DIRECTAMENTE al
  // fragmento citado — bug reportado por César 08/07/2026: el modal
  // mostraba el chunk completo y daba la impresión de que la respuesta
  // ("125.2") y la fuente (con 125.1 + 125.2 + 125.3) se contradecían.
  const sentinel = '⟨LEXC⟩';
  const { transformed, focusByN } = useMemo(() => {
    const content = separarCitasAgrupadas(contenido);
    const focusByN: Record<number, string | null> = {};
    const re = /\[(\d+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const n = parseInt(m[1], 10);
      if (!Number.isFinite(n) || focusByN[n] !== undefined) continue;
      const hint = detectFocusHint(content, m.index);
      focusByN[n] = hint?.value ?? null;
    }
    return {
      // Se endereza antes de pintar: media base de respuestas guardadas
      // trae los encabezados envueltos en negritas y markdown no los
      // reconoce como tales.
      transformed: normalizarMarkdownModelo(content).replace(
        /\[(\d+)\]/g,
        `${sentinel}$1${sentinel}`,
      ),
      focusByN,
    };
  }, [contenido]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Custom text component to inject citation chips
        p: ({ children }) => (
          <p>{renderWithCitations(children, sources, sentinel, onCitationClick, focusByN, textuales)}</p>
        ),
        li: ({ children }) => (
          <li>{renderWithCitations(children, sources, sentinel, onCitationClick, focusByN, textuales)}</li>
        ),
        h1: ({ children }) => (
          <h1 className="font-semibold">
            {renderWithCitations(children, sources, sentinel, onCitationClick, focusByN, textuales)}
          </h1>
        ),
        h2: ({ children }) => (
          <h2>{renderWithCitations(children, sources, sentinel, onCitationClick, focusByN, textuales)}</h2>
        ),
        h3: ({ children }) => (
          <h3>{renderWithCitations(children, sources, sentinel, onCitationClick, focusByN, textuales)}</h3>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-brand-500 bg-brand-50/40 dark:bg-brand-950/30 pl-4 py-1 my-3 italic">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {transformed + (isStreaming ? ' ▍' : '')}
    </ReactMarkdown>
  );
}

/**
 * «[15, 28, 31]» → «[15][28][31]».
 *
 * El modelo agrupa las citas en un solo corchete aunque se le pida lo
 * contrario, y el chip solo reconoce [N]: la respuesta a César del
 * 16/10/2026 sobre experiencia en obras traía «[15, 28, 31, 32]» como
 * texto suelto, sin enlace, justo donde nombraba cuatro documentos.
 */
function separarCitasAgrupadas(texto: string): string {
  return texto.replace(/\[(\d+(?:\s*[,;]\s*\d+)+)\]/g, (_m, grupo: string) =>
    grupo
      .split(/[,;]/)
      .map((n) => `[${n.trim()}]`)
      .join(''),
  );
}

function renderWithCitations(
  children: React.ReactNode,
  sources: ChatSource[],
  sentinel: string,
  onClick: (src: ChatSource, focus?: string | null) => void,
  focusByN: Record<number, string | null> = {},
  textuales: ChatSource[] = sources,
): React.ReactNode {
  // Procesa un string nodo: primero busca el sentinel ⟨LEXC⟩N⟨LEXC⟩ que
  // representa el chip [N] del modelo, luego dentro de los fragmentos
  // de texto restantes detecta menciones textuales (Art. X, Opinión N°...,
  // Pronunciamiento N°..., etc.) y las enlaza si coinciden con un source.
  function processString(s: string, baseKey: string | number): React.ReactNode {
    const parts = s.split(sentinel);
    if (parts.length < 2) {
      return processTextualCitations(s, textuales, baseKey, onClick);
    }
    return parts.map((p, i) => {
      const key = `${baseKey}-${i}`;
      if (i % 2 === 1) {
        const n = parseInt(p, 10);
        if (Number.isFinite(n) && n >= 1) {
          const src = sources[n - 1];
          if (!src) {
            return (
              <span
                key={key}
                className="citation-chip opacity-50"
                title="Cita no disponible"
              >
                {n}
              </span>
            );
          }
          const focus = focusByN[n] ?? null;
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onClick(src, focus)}
                  className="citation-chip"
                  aria-label={`Cita ${n}${focus ? ` — ${focus}` : ''}`}
                >
                  {n}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-semibold mb-1">
                  {shortLabel(src)}
                  {focus && (
                    <span className="ml-1 text-brand-500 dark:text-brand-400">
                      · {focus}
                    </span>
                  )}
                </p>
                <p className="line-clamp-3 opacity-80 text-[11px]">
                  {src.snippet}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        }
      }
      return processTextualCitations(p, textuales, key, onClick);
    });
  }

  function process(node: React.ReactNode, key: string | number = 'r'): React.ReactNode {
    if (typeof node === 'string') return processString(node, key);
    if (Array.isArray(node)) {
      return node.map((n, i) => (
        <span key={`${key}-${i}`}>{process(n, `${key}-${i}`)}</span>
      ));
    }
    return node;
  }

  return process(children, 'root');
}

/**
 * Resuelve menciones textuales (Art. X, Opinión Y, Pronunciamiento Z)
 * dentro de un string y las renderiza como chips clickeables si el
 * patrón coincide con un source del mensaje. Si no, deja texto plano —
 * esto refuerza la defensa anti-alucinación: el usuario VE que esa
 * mención no tiene cita verificable.
 */
function processTextualCitations(
  text: string,
  sources: ChatSource[],
  baseKey: string | number,
  onClick: (src: ChatSource) => void,
): React.ReactNode {
  if (!text || sources.length === 0) return text;
  const matches = detectTextCitations(text, sources);
  if (matches.length === 0) return text;

  const out: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start > cursor) {
      out.push(text.slice(cursor, m.start));
    }
    if (m.source) {
      out.push(
        <TextCitationLink
          key={`${baseKey}-tc-${i}`}
          match={m}
          source={m.source}
          onClick={onClick}
        />,
      );
    } else {
      // No matchea ningún source → texto plano (no inventamos link)
      out.push(<span key={`${baseKey}-tc-${i}`}>{m.text}</span>);
    }
    cursor = m.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

/**
 * Chip clickeable para una cita textual. Diseño más sutil que el
 * citation-chip numérico [N]: subrayado punteado + color brand al
 * hover. No queremos llenar el texto de chips ruidosos.
 */
function TextCitationLink({
  match,
  source,
  onClick,
}: {
  match: TextCitationMatch;
  source: ChatSource;
  onClick: (src: ChatSource) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onClick(source)}
          className="text-citation-link"
          aria-label={`Abrir ${match.text}`}
        >
          {match.text}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-semibold mb-1">{shortLabel(source)}</p>
        <p className="line-clamp-3 opacity-80 text-[11px]">{source.snippet}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function shortLabel(src: ChatSource): string {
  const meta = getDocTypeMeta(src.doc_type);
  const ref = extractSnippetRef(src.snippet);
  const base = src.doc_number
    ? `${meta.label} ${src.doc_number}`
    : `${meta.label} — ${src.doc_title.slice(0, 40)}`;
  return ref ? `${base} · ${ref}` : base;
}

function SourcesPanel({
  sources,
  onCitationClick,
}: {
  sources: ChatSource[];
  onCitationClick: (src: ChatSource) => void;
}) {
  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
        Fuentes consultadas ({sources.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((src, i) => {
          const meta = getDocTypeMeta(src.doc_type);
          const ref = extractSnippetRef(src.snippet);
          return (
            <button
              key={`${src.chunk_id}-${i}`}
              onClick={() => onCitationClick(src)}
              className={cn(
                'group inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:border-brand-400 hover:-translate-y-0.5 transition-all',
                meta.bg,
                meta.color,
              )}
            >
              <span className="font-mono text-citation">[{i + 1}]</span>
              <span className="truncate max-w-[200px]">
                {src.doc_number || src.doc_title}
              </span>
              {ref && (
                <span className="shrink-0 font-semibold opacity-70">· {ref}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * «Otras fuentes de la biblioteca sobre este tema».
 *
 * César, documento 14 (16/10/2026): la respuesta sobre experiencia en
 * servicios acreditada con contratos de obra citó dos documentos, y en
 * la búsqueda avanzada había 74 que tratan el punto. Pidió que la
 * consulta muestre todas las fuentes pertinentes, para un análisis
 * mayor. Aquí van las que el modelo no leyó: agrupadas en el orden de
 * jerarquía que él dio (la ruta ya las manda así), con su número y una
 * línea de lo que dicen, y cada una se abre en el cajón lateral.
 */
const GRUPO_DEL_TEMA: Record<string, string> = {
  ley: 'Ley y Reglamento',
  reglamento: 'Ley y Reglamento',
  bases_estandar: 'Bases estándar',
  directiva: 'Directivas y lineamientos',
  lineamiento: 'Directivas y lineamientos',
  resolucion_tce: 'Resoluciones del Tribunal',
  resolucion: 'Resoluciones del Tribunal',
  acuerdo_sala_plena: 'Acuerdos de Sala Plena',
  opinion: 'Opiniones y pronunciamientos del OECE',
  pronunciamiento: 'Opiniones y pronunciamientos del OECE',
};
/** Cuántas se ven antes de «Mostrar las restantes»: decenas de golpe tapan la respuesta. */
const VISIBLES_DEL_TEMA = 12;

function fechaCorta(iso: string | null | undefined): string | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

/** El pasaje llega con ⟦marcas⟧ alrededor de la expresión buscada: van en negrita. */
function LineaConMarcas({ texto }: { texto: string }) {
  const partes = texto.split(/⟦|⟧/);
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function FuentesDelTemaPanel({
  fuentes,
  onCitationClick,
}: {
  fuentes: ChatSource[];
  onCitationClick: (src: ChatSource) => void;
}) {
  const [todas, setTodas] = useState(false);
  const cabecera = fuentes.find((f) => f.relacionada?.terminos)?.relacionada;
  const terminos = cabecera?.terminos ?? [];
  const total = cabecera?.total ?? fuentes.length;
  const visibles = todas ? fuentes : fuentes.slice(0, VISIBLES_DEL_TEMA);

  // Grupos consecutivos: la ruta ya las ordena por jerarquía.
  const grupos: Array<{ titulo: string; items: ChatSource[] }> = [];
  for (const f of visibles) {
    const titulo = GRUPO_DEL_TEMA[f.doc_type] ?? 'Otros documentos';
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.titulo === titulo) ultimo.items.push(f);
    else grupos.push({ titulo, items: [f] });
  }

  return (
    <div className="mt-3 pt-3 border-t border-border" data-fuentes-del-tema>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-1">
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          <Library className="h-3.5 w-3.5" />
          Otras fuentes de la biblioteca sobre este tema ({fuentes.length})
        </p>
        {terminos.length > 0 && (
          <Link
            href={`/buscador?q=${encodeURIComponent(terminos.join(','))}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            <Search className="h-3 w-3" />
            Ver los {total} en la búsqueda avanzada
          </Link>
        )}
      </div>
      {terminos.length > 0 && (
        <p className="mb-2 text-[11px] text-muted-foreground">
          Documentos que contienen{' '}
          {terminos.map((t, i) => (
            <span key={t}>
              {i > 0 && (i === terminos.length - 1 ? ' y ' : ', ')}
              <strong className="font-semibold text-foreground">«{t}»</strong>
            </span>
          ))}
          , además de los citados arriba. Por jerarquía y, en cada grupo, del más reciente al más antiguo.
        </p>
      )}
      <div className="space-y-3">
        {grupos.map((g, gi) => (
          <div key={`${g.titulo}-${gi}`}>
            <p className="mb-1 text-[11px] font-semibold text-foreground/80">{g.titulo}</p>
            <ul className="space-y-1">
              {g.items.map((f) => {
                const meta = getDocTypeMeta(f.doc_type);
                const fecha = fechaCorta(f.relacionada?.fecha);
                return (
                  <li key={f.chunk_id}>
                    <button
                      type="button"
                      onClick={() => onCitationClick(f)}
                      className="group w-full rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-secondary/60"
                    >
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className={cn('text-[12.5px] font-semibold group-hover:underline', meta.color)}>
                          {f.doc_number || f.doc_title}
                        </span>
                        {fecha && <span className="text-[11px] text-muted-foreground">{fecha}</span>}
                      </span>
                      {f.relacionada?.linea && (
                        <span className="mt-0.5 block line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                          <LineaConMarcas texto={f.relacionada.linea} />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {fuentes.length > VISIBLES_DEL_TEMA && (
        <button
          type="button"
          onClick={() => setTodas((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand-700 hover:underline dark:text-brand-400"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', todas && 'rotate-180')} />
          {todas ? 'Mostrar menos' : `Mostrar las ${fuentes.length - VISIBLES_DEL_TEMA} restantes`}
        </button>
      )}
    </div>
  );
}
