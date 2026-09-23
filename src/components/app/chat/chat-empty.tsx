'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Scale,
  FileText,
  BookOpen,
  MessageSquareDashed,
  Users,
  ShieldAlert,
  Loader2,
  ArrowRight,
  ArrowUp,
  Mic,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { Companero } from '@/components/marca/companero';
import { useConversations } from '@/lib/stores/conversations';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  autoCreate?: boolean;
  prefillQuery?: string | null;
  /** El nombre de pila, para el saludo. Lo pasa la página. */
  nombre?: string | null;
}

interface Arranque {
  icono: LucideIcon;
  titulo: string;
  pregunta: string;
}

/**
 * Las preguntas de arranque. Las tres primeras son las que enseña el
 * mockup; el resto sale al pulsar «Ver más ejemplos», porque seis
 * tarjetas a la vez tapan el cajón de escribir, que es lo que de verdad
 * hay que usar.
 */
const ARRANQUES: Arranque[] = [
  {
    icono: FileText,
    titulo: 'Ampliación de plazo',
    pregunta: '¿Cuándo procede y qué documentos se requieren?',
  },
  {
    icono: ShieldAlert,
    titulo: 'Penalidad por mora',
    pregunta: '¿Cómo se calcula y en qué casos se aplica?',
  },
  {
    icono: Users,
    titulo: 'Experiencia del postor',
    pregunta: '¿Qué se considera y cómo se acredita?',
  },
  {
    icono: Scale,
    titulo: 'Subsanación de ofertas',
    pregunta: '¿En qué casos procede y cuáles son los plazos?',
  },
  {
    icono: BookOpen,
    titulo: 'Apelaciones al Tribunal',
    pregunta: '¿Cuál es el plazo para presentar una apelación?',
  },
  {
    icono: MessageSquareDashed,
    titulo: 'Adicionales de obra',
    pregunta: '¿Qué requisitos exige su aprobación?',
  },
];

export function ChatEmpty({ autoCreate, prefillQuery, nombre }: Props) {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [yaLanzado, setYaLanzado] = useState(false);
  const [texto, setTexto] = useState('');
  const [todos, setTodos] = useState(false);
  const cajon = useRef<HTMLTextAreaElement>(null);

  async function abrirCon(consulta?: string) {
    setCreando(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      const { conversation } = await res.json();
      useConversations.getState().upsert(conversation);
      const qs = consulta ? `?q=${encodeURIComponent(consulta)}` : '';
      router.push(`/chat/${conversation.id}${qs}`);
    } catch {
      toast.error('No se pudo crear la conversación');
      setCreando(false);
    }
  }

  // Al llegar con ?new=1 se crea sola y se entra.
  useEffect(() => {
    if (autoCreate && !yaLanzado) {
      setYaLanzado(true);
      abrirCon(prefillQuery || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreate, yaLanzado, prefillQuery]);

  /** El cajón crece con lo escrito, hasta un tope. */
  function ajustarAlto() {
    const el = cajon.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  if (autoCreate || creando) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Companero pose="saludo" estado="pensando" alto={140} />
          <p className="text-sm">Iniciando conversación…</p>
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      </div>
    );
  }

  const visibles = todos ? ARRANQUES : ARRANQUES.slice(0, 3);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col items-center text-center"
        >
          <Companero pose="saludo" estado="quieto" alto={150} prioridad />
          <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight sm:text-[2.75rem]">
            Hola, {nombre || 'de nuevo'} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground/85 sm:text-[1.7rem]">
            ¿En qué puedo ayudarte hoy?
          </p>
          <p className="mt-3 max-w-xl text-pretty text-[15px] leading-relaxed text-muted-foreground">
            Formula tus consultas sobre contrataciones del Estado y recibe respuestas claras, con
            sustento normativo.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {visibles.map((a, i) => (
            <motion.button
              key={a.titulo}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 + i * 0.05 }}
              onClick={() => abrirCon(`${a.titulo}: ${a.pregunta}`)}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-consultar-300 hover:shadow-glow dark:hover:border-consultar-700"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-consultar-50 dark:bg-consultar-900/40">
                <a.icono
                  className="h-5 w-5 text-consultar-600 dark:text-consultar-400"
                  strokeWidth={1.8}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{a.titulo}</span>
                <span className="block text-pretty text-[12.5px] leading-snug text-muted-foreground">
                  {a.pregunta}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-consultar-500 transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          ))}
        </div>

        {!todos && (
          <button
            type="button"
            onClick={() => setTodos(true)}
            className="mx-auto mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-consultar-600 transition-colors hover:text-consultar-700 dark:text-consultar-400"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ver más ejemplos
          </button>
        )}

        {/* El cajón de escribir: el mockup lo pone aquí para que se pueda
            empezar sin tener que crear antes la conversación a mano. */}
        <form
          className="mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            const t = texto.trim();
            if (t) abrirCon(t);
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-soft transition-colors focus-within:border-consultar-400">
            <textarea
              ref={cajon}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                ajustarAlto();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const t = texto.trim();
                  if (t) abrirCon(t);
                }
              }}
              rows={1}
              placeholder="Pregunta sobre contrataciones públicas…"
              aria-label="Escribe tu consulta"
              className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[14.5px] outline-none placeholder:text-muted-foreground"
            />
            <Link
              href="/llamadas"
              aria-label="Consultar por voz"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Mic className="h-4.5 w-4.5" />
            </Link>
            <button
              type="submit"
              disabled={!texto.trim()}
              aria-label="Enviar consulta"
              className={cn(
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                texto.trim()
                  ? 'bg-consultar-500 text-white hover:bg-consultar-600'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <ArrowUp className="h-4.5 w-4.5" />
            </button>
          </div>
        </form>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          A-LexIA puede cometer errores. Verifica la información relevante en las fuentes citadas.
        </p>
      </div>
    </div>
  );
}
