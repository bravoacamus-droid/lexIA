'use client';

import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Share2,
} from 'lucide-react';
import { Logo, LogoMark } from '@/components/logo';
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
  onCitationClick: (src: ChatSource) => void;
  onRegenerate?: () => void;
}

export function ChatMessageView({
  message,
  isStreaming,
  onCitationClick,
  onRegenerate,
}: MsgProps) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

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
      <div className="h-7 w-7 shrink-0 rounded-full bg-card border border-border flex items-center justify-center mt-0.5">
        <LogoMark size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="prose-lexia">
          <AssistantMarkdown
            content={message.content}
            sources={message.sources}
            isStreaming={isStreaming}
            onCitationClick={onCitationClick}
          />
        </div>

        {message.sources.length > 0 && !isStreaming && (
          <SourcesPanel
            sources={message.sources}
            onCitationClick={onCitationClick}
          />
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
  sources: ChatSource[];
  isStreaming?: boolean;
  onCitationClick: (src: ChatSource) => void;
}

function AssistantMarkdown({
  content,
  sources,
  isStreaming,
  onCitationClick,
}: AssistantMdProps) {
  // Reemplazamos [N] por un placeholder reconocible que luego renderizamos como chip
  const sentinel = '⟨LEXC⟩';
  const transformed = useMemo(() => {
    return content.replace(/\[(\d+)\]/g, `${sentinel}$1${sentinel}`);
  }, [content]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Custom text component to inject citation chips
        p: ({ children }) => (
          <p>{renderWithCitations(children, sources, sentinel, onCitationClick)}</p>
        ),
        li: ({ children }) => (
          <li>{renderWithCitations(children, sources, sentinel, onCitationClick)}</li>
        ),
        h1: ({ children }) => (
          <h1 className="font-serif">
            {renderWithCitations(children, sources, sentinel, onCitationClick)}
          </h1>
        ),
        h2: ({ children }) => (
          <h2>{renderWithCitations(children, sources, sentinel, onCitationClick)}</h2>
        ),
        h3: ({ children }) => (
          <h3>{renderWithCitations(children, sources, sentinel, onCitationClick)}</h3>
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

function renderWithCitations(
  children: React.ReactNode,
  sources: ChatSource[],
  sentinel: string,
  onClick: (src: ChatSource) => void,
): React.ReactNode {
  function process(node: React.ReactNode): React.ReactNode {
    if (typeof node === 'string') {
      const parts = node.split(sentinel);
      if (parts.length < 2) return node;
      return parts.map((p, i) => {
        if (i % 2 === 1) {
          const n = parseInt(p, 10);
          if (Number.isFinite(n) && n >= 1) {
            const src = sources[n - 1];
            if (!src) {
              return (
                <span
                  key={i}
                  className="citation-chip opacity-50"
                  title="Cita no disponible"
                >
                  {n}
                </span>
              );
            }
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onClick(src)}
                    className="citation-chip"
                    aria-label={`Cita ${n}`}
                  >
                    {n}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-semibold mb-1">{shortLabel(src)}</p>
                  <p className="line-clamp-3 opacity-80 text-[11px]">
                    {src.snippet}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          }
        }
        return <span key={i}>{p}</span>;
      });
    }
    if (Array.isArray(node)) return node.map((n, i) => <span key={i}>{process(n)}</span>);
    return node;
  }

  if (Array.isArray(children)) {
    return children.map((c, i) => <span key={i}>{process(c)}</span>);
  }
  return process(children);
}

function shortLabel(src: ChatSource): string {
  const meta = getDocTypeMeta(src.doc_type);
  if (src.doc_number) return `${meta.label} ${src.doc_number}`;
  return `${meta.label} — ${src.doc_title.slice(0, 40)}`;
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
