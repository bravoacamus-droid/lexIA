'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  UserRound,
  Settings2,
  Scale,
  Landmark,
  BarChart3,
  ShieldAlert,
  Briefcase,
  Check,
  ChevronDown,
  Loader2,
  ArrowRight,
  Lightbulb,
  Paperclip,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  GENERATOR_PERFILES_LIST,
  GENERATOR_QUICK_ACTIONS,
  type GeneratorPerfil,
} from '@/lib/ai/generator-perfiles';

/**
 * El arranque del generador de documentos, sobre el mockup de setiembre.
 *
 * Antes había que elegir un perfil, esperar a que se creara la
 * conversación y recién entonces escribir el caso. Ahora las dos cosas
 * pasan aquí: se marca desde qué perfil se emite y se cuenta el caso en
 * el mismo gesto; el texto viaja en la URL y se envía solo al abrir el
 * chat.
 *
 * El tercer paso del mockup —las fuentes en tres niveles: indispensables,
 * según el caso y complementarias— no está: exige un catálogo de qué
 * documentos pide cada actuación, que todavía no existe. Los archivos se
 * siguen adjuntando dentro del chat, que es donde A-LexIA ya los lee.
 */

const ICONOS: Record<GeneratorPerfil, LucideIcon> = {
  area_usuaria: UserRound,
  dec: Settings2,
  area_legal: Scale,
  titular_entidad: Landmark,
  aga: BarChart3,
  fiscalizacion: ShieldAlert,
  postor: Briefcase,
};

/**
 * El nombre corto de cada perfil en las pastillas.
 *
 * No se usa `shortLabel` del catálogo porque ahí «Área Usuaria» está
 * abreviado a «Usuaria», que fuera de una tabla no se entiende. El
 * mockup los nombra enteros y cabe.
 */
const CORTOS: Record<GeneratorPerfil, string> = {
  area_usuaria: 'Área Usuaria',
  dec: 'DEC',
  area_legal: 'Asesoría Jurídica',
  titular_entidad: 'Titular de la Entidad',
  aga: 'AGA',
  fiscalizacion: 'Fiscalización',
  postor: 'Postor / Proveedor',
};

/** Cuántos perfiles se ven antes de «Más perfiles». */
const A_LA_VISTA = 5;
const TOPE = 2000;

export function ArranqueDelGenerador({ allowed }: { allowed?: GeneratorPerfil[] }) {
  const router = useRouter();
  const visibles = useMemo(
    () =>
      allowed
        ? GENERATOR_PERFILES_LIST.filter((p) => allowed.includes(p.key))
        : GENERATOR_PERFILES_LIST,
    [allowed],
  );

  const [perfil, setPerfil] = useState<GeneratorPerfil | null>(visibles[0]?.key ?? null);
  const [todos, setTodos] = useState(false);
  const [caso, setCaso] = useState('');
  const [yendo, setYendo] = useState(false);
  const cajon = useRef<HTMLTextAreaElement>(null);

  const alaVista = todos ? visibles : visibles.slice(0, A_LA_VISTA);
  const ocultos = visibles.length - alaVista.length;
  const actuaciones = perfil ? GENERATOR_QUICK_ACTIONS[perfil] || [] : [];

  async function arrancar(texto: string) {
    if (!perfil || !texto.trim()) return;
    setYendo(true);
    try {
      const res = await fetch('/api/generator-chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || json?.error || 'No se pudo crear');
      router.push(`/generador/chat/${json.id}?q=${encodeURIComponent(texto.trim())}`);
    } catch (e) {
      toast.error((e as Error).message);
      setYendo(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* ── 1 · Quién emite ── */}
      <section>
        <Rotulo
          numero="1"
          titulo="¿Quién emitirá el documento?"
          bajada="Selecciona el perfil desde el cual se emitirá el documento."
        />
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          {alaVista.map((p) => {
            const Icono = ICONOS[p.key];
            const marcado = perfil === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPerfil(p.key)}
                aria-pressed={marcado}
                title={p.description}
                className={cn(
                  'relative flex min-w-[168px] flex-1 items-center gap-2.5 rounded-xl border-2 px-4 py-3.5 text-left transition-all sm:flex-none',
                  marcado
                    ? 'border-generar-500 bg-generar-50/70 shadow-glow dark:bg-generar-900/25'
                    : 'border-border bg-card hover:border-generar-300 dark:hover:border-generar-700',
                )}
              >
                <Icono
                  className={cn(
                    'h-4.5 w-4.5 shrink-0',
                    marcado ? 'text-generar-600 dark:text-generar-400' : 'text-muted-foreground',
                  )}
                  strokeWidth={1.9}
                />
                <span className="min-w-0 text-[13.5px] font-semibold leading-snug">
                  {CORTOS[p.key] ?? p.shortLabel}
                </span>
                {marcado && (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-generar-500 text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
          {ocultos > 0 && (
            <button
              type="button"
              onClick={() => setTodos(true)}
              className="flex min-w-[150px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-3.5 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:border-generar-300 hover:text-foreground sm:flex-none"
            >
              Más perfiles
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
        {perfil && (
          <p className="mt-2.5 text-pretty text-[12.5px] leading-relaxed text-muted-foreground">
            {visibles.find((p) => p.key === perfil)?.description}
          </p>
        )}
      </section>

      {/* ── 2 · Qué hay que resolver ── */}
      <section>
        <Rotulo
          numero="2"
          titulo="¿Qué necesitas resolver?"
          bajada="Describe tu caso en tus propias palabras. Puedes elegir una actuación frecuente o escribir libremente."
        />

        <form
          className="mt-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            void arrancar(caso);
          }}
        >
          <div className="rounded-2xl border border-border bg-card p-3 shadow-soft transition-colors focus-within:border-generar-400">
            <textarea
              ref={cajon}
              value={caso}
              maxLength={TOPE}
              onChange={(e) => setCaso(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void arrancar(caso);
                }
              }}
              rows={4}
              placeholder="Ej.: El contratista solicita una ampliación de plazo por retrasos en la entrega del terreno. Se cuenta con el informe del supervisor…"
              aria-label="Describe tu caso"
              className="w-full resize-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border pt-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                Podrás adjuntar los documentos del expediente dentro del chat.
              </span>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                {caso.length}/{TOPE}
              </span>
              <button
                type="submit"
                disabled={yendo || !perfil || caso.trim().length < 8}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-semibold transition-colors',
                  yendo || !perfil || caso.trim().length < 8
                    ? 'cursor-not-allowed bg-muted text-muted-foreground'
                    : 'bg-generar-500 text-white hover:bg-generar-600',
                )}
              >
                {yendo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Analizar mi caso
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {actuaciones.length > 0 && (
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />O selecciona una actuación
              frecuente:
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {actuaciones.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  disabled={yendo}
                  onClick={() => {
                    // La acción no se lanza sola: deja su consigna en el
                    // cajón para que se le pueda añadir el caso concreto,
                    // que es lo que la vuelve útil.
                    setCaso(a.prompt.endsWith(':') ? `${a.prompt} ` : a.prompt);
                    cajon.current?.focus();
                  }}
                  className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-[12.5px] font-medium transition-colors hover:border-generar-300 hover:bg-generar-50/60 disabled:opacity-50 dark:hover:border-generar-700 dark:hover:bg-generar-900/20"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Rotulo({
  numero,
  titulo,
  bajada,
}: {
  numero: string;
  titulo: string;
  bajada: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-generar-500 text-[13px] font-bold text-white">
        {numero}
      </span>
      <div className="min-w-0">
        <h2 className="text-[19px] font-bold tracking-tight">{titulo}</h2>
        <p className="text-pretty text-[13px] leading-relaxed text-muted-foreground">{bajada}</p>
      </div>
    </div>
  );
}
