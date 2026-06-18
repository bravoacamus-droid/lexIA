'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function ClauseEditor({ value, onChange, placeholder, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder:
          placeholder ||
          'Escribe el contenido de la cláusula o pégalo directamente desde Word…',
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3 [&_p]:my-2 [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted [&_td]:border [&_td]:px-2 [&_td]:py-1',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Sincronizar cambios externos al value (ej. cuando IA inyecta texto nuevo)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || '') !== current) {
      editor.commands.setContent(value || '', false);
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className={cn('rounded-lg border bg-card animate-pulse-soft', className)}>
        <div className="h-10 border-b bg-secondary/40" />
        <div className="h-24" />
      </div>
    );
  }

  const btnBase =
    'inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors';
  const btnActive = 'bg-secondary text-foreground';

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b bg-secondary/30 rounded-t-lg flex-wrap">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          className={btnBase}
          aria-label="Deshacer"
        >
          <Undo className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          className={btnBase}
          aria-label="Rehacer"
        >
          <Redo className="h-3.5 w-3.5" />
        </button>
        <span className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(
            btnBase,
            editor.isActive('heading', { level: 2 }) && btnActive,
          )}
          aria-label="Título"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(
            btnBase,
            editor.isActive('heading', { level: 3 }) && btnActive,
          )}
          aria-label="Subtítulo"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </button>
        <span className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(btnBase, editor.isActive('bold') && btnActive)}
          aria-label="Negrita"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(btnBase, editor.isActive('italic') && btnActive)}
          aria-label="Cursiva"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <span className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(btnBase, editor.isActive('bulletList') && btnActive)}
          aria-label="Lista"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(btnBase, editor.isActive('orderedList') && btnActive)}
          aria-label="Lista numerada"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
