'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onStop?: () => void;
  isLoading: boolean;
  placeholder?: string;
}

/**
 * Web Speech API type — no está en @types/dom por defecto.
 * Definimos la interfaz mínima que necesitamos.
 */
interface SpeechRecognitionEvent {
  results: {
    length: number;
    item(index: number): {
      length: number;
      item(index: number): { transcript: string };
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
    [index: number]: {
      length: number;
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/**
 * Chat input con dictado de voz nativo (Web Speech API).
 *
 * Feature solicitado por César 30/06/2026: "para hacer las consultas
 * no habría un botón así machucas un botón y lo dictas para no estar
 * escribiendo".
 *
 * Usa la Web Speech API del navegador (SpeechRecognition) que es
 * gratuita y no consume la API de voz de Google que preocupaba a César.
 * Soporte: Chrome/Edge/Safari (100% de nuestro tráfico esperado).
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
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Detectar soporte al montar (solo cliente).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

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

  function startDictation() {
    if (!isSupported || isRecording) return;
    const w = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    try {
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-PE';

      const baseValue = value;
      let finalTranscript = '';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            finalTranscript += text + ' ';
          } else {
            interim += text;
          }
        }
        // Combinar: valor original + dictado final + interim (para feedback en vivo)
        const combined = (baseValue + (baseValue.endsWith(' ') || baseValue === '' ? '' : ' ') + finalTranscript + interim).trim();
        onChange(combined);
      };

      recognition.onerror = (event) => {
        const err = event.error;
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          toast.error('Permite el acceso al micrófono para dictar', {
            description: 'El navegador bloqueó el acceso.',
          });
        } else if (err === 'no-speech') {
          toast.info('No detectamos audio. Intenta de nuevo.');
        } else if (err !== 'aborted') {
          toast.error(`Error de dictado: ${err}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      toast.error('No se pudo iniciar el dictado');
      console.error(e);
    }
  }

  function stopDictation() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
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
        isRecording && 'border-rose-400 ring-2 ring-rose-500/20',
      )}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          isRecording
            ? '🎤 Escuchando… habla claro'
            : placeholder || 'Escribe tu consulta…'
        }
        rows={1}
        className="flex-1 resize-none bg-transparent border-0 outline-none placeholder:text-muted-foreground text-[15px] leading-relaxed py-1.5 max-h-60 scrollbar-thin"
        disabled={isLoading}
      />

      {isSupported && !isLoading && (
        <Button
          type="button"
          size="icon"
          variant={isRecording ? 'default' : 'ghost'}
          onClick={isRecording ? stopDictation : startDictation}
          className={cn(
            'rounded-xl transition-all',
            isRecording && 'bg-rose-600 hover:bg-rose-700 animate-pulse',
          )}
          aria-label={isRecording ? 'Detener dictado' : 'Dictar por voz'}
          title={isRecording ? 'Detener dictado' : 'Dictar por voz'}
        >
          {isRecording ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
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
