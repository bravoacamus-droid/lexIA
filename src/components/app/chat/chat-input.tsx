'use client';

import { useEffect, useRef } from 'react';
import { ArrowUp, Square, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDictado } from '@/lib/voz/use-dictado';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onStop?: () => void;
  isLoading: boolean;
  placeholder?: string;
}

/**
 * El cajón de escribir de una conversación, con dictado por voz.
 *
 * El dictado vive en `useDictado`, compartido con la portada del chat.
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  placeholder,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const dictado = useDictado(value, onChange);

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

  function enviar(e?: React.FormEvent) {
    if (isLoading) return;
    // Con el cajón vacío la flecha no quedaba muerta sin explicación
    // (César, 27/09/2026): lleva al cajón para escribir.
    if (!value.trim()) {
      ref.current?.focus();
      return;
    }
    if (dictado.dictando) dictado.detener();
    onSubmit(e);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enviar(e);
      }}
      className={cn(
        'flex items-end gap-2 rounded-2xl border border-border bg-card pl-4 pr-2 py-2 shadow-sm focus-within:border-brand-400 focus-within:shadow-md transition-all',
        dictado.dictando && 'border-rose-400 ring-2 ring-rose-500/20',
      )}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          dictado.dictando
            ? '🎤 Escuchando… habla claro'
            : placeholder || 'Escribe tu consulta…'
        }
        rows={1}
        className="flex-1 resize-none bg-transparent border-0 outline-none placeholder:text-muted-foreground text-[15px] leading-relaxed py-1.5 max-h-60 scrollbar-thin"
        disabled={isLoading}
      />

      {dictado.disponible && !isLoading && (
        <Button
          type="button"
          size="icon"
          variant={dictado.dictando ? 'default' : 'ghost'}
          onClick={dictado.alternar}
          className={cn(
            'rounded-xl transition-all',
            dictado.dictando && 'bg-rose-600 hover:bg-rose-700 animate-pulse',
          )}
          aria-label={dictado.dictando ? 'Detener dictado' : 'Dictar por voz'}
          title={dictado.dictando ? 'Detener dictado' : 'Dictar por voz'}
        >
          {dictado.dictando ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      )}

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
          disabled={isLoading}
          className={cn('rounded-xl', !value.trim() && 'opacity-60')}
          aria-label="Enviar"
          title={value.trim() ? 'Enviar' : 'Escribe o dicta tu consulta'}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
}
