'use client';

import { useEffect, useRef } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onStop?: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  placeholder,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = Math.min(ref.current.scrollHeight, 240) + 'px';
  }, [value]);

  // Focus al montar
  useEffect(() => {
    ref.current?.focus();
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) onSubmit();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isLoading && value.trim()) onSubmit(e);
      }}
      className={cn(
        'flex items-end gap-2 rounded-2xl border border-border bg-card pl-4 pr-2 py-2 shadow-sm focus-within:border-brand-400 focus-within:shadow-md transition-all',
      )}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder || 'Escribe tu consulta…'}
        rows={1}
        className="flex-1 resize-none bg-transparent border-0 outline-none placeholder:text-muted-foreground text-[15px] leading-relaxed py-1.5 max-h-60 scrollbar-thin"
        disabled={isLoading}
      />
      {isLoading && onStop ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={onStop}
          className="rounded-xl"
          aria-label="Detener"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          variant="default"
          disabled={!value.trim() || isLoading}
          className="rounded-xl"
          aria-label="Enviar"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
}
