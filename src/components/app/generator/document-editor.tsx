'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Save,
  Sparkles,
  Loader2,
  Check,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { markdownToHtml, htmlToMarkdown } from '@/lib/markdown-html';

interface Props {
  id: string;
  documentType: string;
  title: string;
  status: 'draft' | 'final';
  initialContent: string;
  autoGenerate?: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved';

export function DocumentEditor({
  id,
  title,
  status: initialStatus,
  initialContent,
  autoGenerate,
}: Props) {
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState<'draft' | 'final'>(initialStatus);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [hasContent, setHasContent] = useState(initialContent.length > 0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const triggeredRef = useRef(false);
  const lastSavedRef = useRef(initialContent);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'El contenido aparecerá aquí…',
      }),
    ],
    content: initialContent ? markdownToHtml(initialContent) : '',
    editable: !streaming,
    immediatelyRender: false,
    onUpdate({ editor }) {
      if (streaming) return;
      const md = htmlToMarkdown(editor.getHTML());
      if (md === lastSavedRef.current) return;
      scheduleSave(md);
    },
  });

  const scheduleSave = useCallback(
    (md: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSaveState('saving');
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/generated-documents/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generated_content: md }),
          });
          if (res.ok) {
            lastSavedRef.current = md;
            setHasContent(md.length > 0);
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 1800);
          } else {
            setSaveState('idle');
          }
        } catch {
          setSaveState('idle');
        }
      }, 900);
    },
    [id],
  );

  const generate = useCallback(async () => {
    if (streaming || !editor) return;
    setStreaming(true);
    setHasContent(false);
    editor.setEditable(false);
    editor.commands.clearContent();
    let accumulated = '';
    try {
      const res = await fetch(`/api/generated-documents/${id}/generate`, {
        method: 'POST',
      });
      if (!res.ok || !res.body) {
        throw new Error('No se pudo iniciar la generación');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // El server emite text/plain: cada chunk es markdown crudo, sin prefijos.
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          accumulated += chunk;
          editor.commands.setContent(markdownToHtml(accumulated));
        }
      }
      const tail = decoder.decode();
      if (tail) {
        accumulated += tail;
        editor.commands.setContent(markdownToHtml(accumulated));
      }
      if (!accumulated.trim()) {
        throw new Error('El modelo no devolvió contenido');
      }
      // Persistimos explícitamente desde el cliente — no confiamos en onFinish
      // del server, que corre después de cerrar la conexión y puede perderse.
      lastSavedRef.current = accumulated;
      setHasContent(true);
      await fetch(`/api/generated-documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generated_content: accumulated }),
      });
      toast.success('Documento generado');
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(`Falló la generación: ${msg}`);
    } finally {
      setStreaming(false);
      editor.setEditable(true);
    }
  }, [editor, id, streaming]);

  // Auto-trigger generation if ?generate=1
  useEffect(() => {
    if (!editor || !autoGenerate || triggeredRef.current) return;
    triggeredRef.current = true;
    generate();
  }, [editor, autoGenerate, generate]);

  async function toggleFinal() {
    const next = status === 'final' ? 'draft' : 'final';
    setStatus(next);
    const res = await fetch(`/api/generated-documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      setStatus(status);
      toast.error('No se pudo actualizar el estado');
    } else {
      toast.success(next === 'final' ? 'Marcado como final' : 'Vuelto a borrador');
    }
  }

  return (
    <>
      {/* Sticky header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-14 z-10">
        <div className="container max-w-5xl flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/generador">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <span className="text-muted-foreground">/</span>
            <h1 className="font-semibold text-sm truncate">{title}</h1>
            <SaveIndicator state={saveState} streaming={streaming} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={status === 'final' ? 'default' : 'outline'}
              size="sm"
              onClick={toggleFinal}
            >
              {status === 'final' ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Final
                </>
              ) : (
                'Marcar final'
              )}
            </Button>
            {hasContent ? (
              <Button size="sm" asChild>
                <a href={`/api/generated-documents/${id}/export`} download>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar DOCX</span>
                </a>
              </Button>
            ) : (
              <Button size="sm" disabled>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar DOCX</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Editor toolbar */}
      <div className="container max-w-5xl pt-6">
        <Toolbar
          editor={editor}
          streaming={streaming}
          onRegenerate={generate}
        />
      </div>

      {/* Editor */}
      <div className="container max-w-5xl py-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden"
        >
          {streaming && !hasContent && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 mb-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </span>
                <p className="font-medium text-sm">LexIA está redactando el documento…</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Estructurando antecedentes, hechos, sustento normativo y petitorio.
                </p>
              </div>
            </div>
          )}
          <div className={cn(streaming && !hasContent && 'hidden')}>
            <EditorContent editor={editor} />
          </div>
        </motion.div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Edita libremente el documento. Los cambios se guardan automáticamente.
        </p>
      </div>
    </>
  );
}

function SaveIndicator({ state, streaming }: { state: SaveState; streaming: boolean }) {
  if (streaming) {
    return (
      <Badge variant="warning" className="ml-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Generando
      </Badge>
    );
  }
  if (state === 'saving') {
    return (
      <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Guardando…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
        <Check className="h-3 w-3" strokeWidth={3} />
        Guardado
      </span>
    );
  }
  return null;
}

function Toolbar({
  editor,
  streaming,
  onRegenerate,
}: {
  editor: ReturnType<typeof useEditor>;
  streaming: boolean;
  onRegenerate: () => void;
}) {
  if (!editor) return null;
  const disabled = streaming;
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1.5 mb-3">
      <ToolbarBtn
        label="Negrita"
        active={editor.isActive('bold')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        label="Itálica"
        active={editor.isActive('italic')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarBtn
        label="Título 2"
        active={editor.isActive('heading', { level: 2 })}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        label="Título 3"
        active={editor.isActive('heading', { level: 3 })}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarBtn
        label="Lista"
        active={editor.isActive('bulletList')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        label="Lista numerada"
        active={editor.isActive('orderedList')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarBtn
        label="Deshacer"
        disabled={disabled || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        label="Rehacer"
        disabled={disabled || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onRegenerate}
        disabled={disabled}
        className="ml-auto"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Regenerar
      </Button>
    </div>
  );
}

function ToolbarBtn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            active
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            disabled && 'opacity-40 cursor-not-allowed',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
