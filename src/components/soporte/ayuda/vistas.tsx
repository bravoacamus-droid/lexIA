'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight,
  Bug,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Inbox,
  Lightbulb,
  Loader2,
  MessagesSquare,
  Search,
  Star,
  ThumbsUp,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RelativeTime } from '@/components/ui/relative-time';
import { Hilo, TextoConFormato } from '@/components/soporte/hilo';
import { Compositor } from '@/components/soporte/compositor';
import { IconoWhatsApp } from '@/components/soporte/boton-whatsapp';
import {
  buscarPreguntas,
  PREGUNTAS_FRECUENTES,
  TEMAS,
  type PreguntaFrecuente,
} from '@/lib/soporte/preguntas-frecuentes';
import { erroresRecientes } from '@/lib/soporte/errores-recientes';
import {
  CATEGORIAS,
  enlaceDeWhatsApp,
  ESTADOS,
  type CategoriaDeTicket,
  type EstadoDeTicket,
  type TicketDetalle,
  type TicketResumen,
} from '@/lib/soporte/tipos';
import type { VistaDelWidget } from './widget-de-ayuda';

export interface UsuarioDelWidget {
  id: string;
  nombre: string | null;
  email: string;
  perfil: 'entity' | 'provider' | 'consultant' | null;
  esAdmin: boolean;
}

const ICONO_DE_CATEGORIA: Record<CategoriaDeTicket, typeof Bug> = {
  error: Bug,
  consulta: CircleHelp,
  cuenta: UserCog,
  sugerencia: Lightbulb,
};

const TINTE_DE_CATEGORIA: Record<CategoriaDeTicket, string> = {
  error: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  consulta: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  cuenta: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  sugerencia: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

export function EstadoChip({ estado, className }: { estado: EstadoDeTicket; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
        estado === 'abierto' && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        estado === 'respondido' && 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300',
        estado === 'resuelto' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        className,
      )}
    >
      {ESTADOS[estado].etiqueta}
    </span>
  );
}

function usarMisTickets() {
  return useQuery({
    queryKey: ['soporte', 'tickets'],
    queryFn: async (): Promise<TicketResumen[]> => {
      const r = await fetch('/api/soporte/tickets', { cache: 'no-store' });
      if (!r.ok) return [];
      return (await r.json()).tickets;
    },
    refetchInterval: 20_000,
    staleTime: 5_000,
  });
}

// ── Inicio ────────────────────────────────────────────────────────────

export function VistaInicio({
  usuario,
  porAtender,
  ir,
  cerrar,
}: {
  usuario: UsuarioDelWidget;
  porAtender: number | null;
  ir: (v: VistaDelWidget) => void;
  cerrar: () => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const { data: tickets } = usarMisTickets();
  const resultados = useMemo(() => buscarPreguntas(busqueda, 6), [busqueda]);
  const nombre = usuario.nombre?.split(' ')[0] || null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="bg-gradient-to-br from-brand-800 to-brand-600 px-5 pb-10 pt-2 text-white">
        <p className="text-[20px] font-semibold leading-tight">Hola{nombre ? `, ${nombre}` : ''} 👋</p>
        <p className="mt-0.5 text-[14px] text-white/80">¿En qué te ayudamos hoy?</p>
      </div>

      <div className="-mt-6 space-y-4 px-4 pb-5">
        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 shadow-md focus-within:border-brand-400">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Busca tu duda: «descargar Word», «cupo»…"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground/70"
          />
        </label>

        {busqueda.trim().length > 2 ? (
          <div className="space-y-2">
            {resultados.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-[13px] text-muted-foreground">
                No encontramos una respuesta escrita para eso.
                <button
                  type="button"
                  onClick={() => ir({ tipo: 'nueva', categoria: 'consulta', texto: busqueda })}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-brand-700"
                >
                  Pregúntale al equipo <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              resultados.map((p) => <Pregunta key={p.id} p={p} ir={ir} cerrar={cerrar} />)
            )}
          </div>
        ) : (
          <>
            {usuario.esAdmin && porAtender !== null && (
              <Link
                href="/admin/soporte"
                onClick={cerrar}
                className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 transition-colors hover:border-brand-400 dark:border-brand-900 dark:bg-brand-950/50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
                  <Inbox className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">Bandeja de soporte</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {porAtender === 0
                      ? 'No hay conversaciones por responder.'
                      : `${porAtender} conversación${porAtender === 1 ? '' : 'es'} por responder.`}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-brand-600" />
              </Link>
            )}

            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Escríbenos
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(CATEGORIAS) as CategoriaDeTicket[]).map((c) => {
                  const Icono = ICONO_DE_CATEGORIA[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => ir({ tipo: 'nueva', categoria: c })}
                      className="group flex flex-col items-start gap-1.5 rounded-lg border border-border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-sm"
                    >
                      <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', TINTE_DE_CATEGORIA[c])}>
                        <Icono className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[12.5px] font-semibold leading-tight">{CATEGORIAS[c].etiqueta}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {tickets && tickets.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="mb-1 flex items-center justify-between px-1">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tus conversaciones
                  </p>
                  {tickets.length > 3 && (
                    <button type="button" onClick={() => ir({ tipo: 'lista' })} className="text-[12px] font-semibold text-brand-600 hover:underline">
                      Ver todas ({tickets.length})
                    </button>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {tickets.slice(0, 3).map((t) => (
                    <FilaDeTicket key={t.id} t={t} alAbrir={() => ir({ tipo: 'conversacion', id: t.id })} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Preguntas frecuentes
              </p>
              <div className="space-y-3">
                {TEMAS.map((tema) => (
                  <div key={tema}>
                    <p className="mb-1 px-1 text-[12px] font-semibold text-foreground/80">{tema}</p>
                    <div className="space-y-1.5">
                      {PREGUNTAS_FRECUENTES.filter((p) => p.tema === tema).map((p) => (
                        <Pregunta key={p.id} p={p} ir={ir} cerrar={cerrar} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <a
          href={enlaceDeWhatsApp(
            `Hola, soy ${usuario.nombre || 'usuario'} (${usuario.email}) y necesito ayuda urgente con A-LexIA.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 transition-colors hover:border-emerald-400 dark:border-emerald-900 dark:bg-emerald-950/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
            <IconoWhatsApp className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-emerald-900 dark:text-emerald-200">¿Es urgente?</span>
            <span className="block text-[12px] text-emerald-800/80 dark:text-emerald-300/80">Escríbenos por WhatsApp.</span>
          </span>
          <ArrowRight className="h-4 w-4 text-emerald-700" />
        </a>
      </div>
    </div>
  );
}

/** Una pregunta frecuente que se despliega, con «¿Te sirvió?». */
function Pregunta({
  p,
  ir,
  cerrar,
  abiertaAlInicio = false,
}: {
  p: PreguntaFrecuente;
  ir: (v: VistaDelWidget) => void;
  cerrar: () => void;
  abiertaAlInicio?: boolean;
}) {
  const [abierta, setAbierta] = useState(abiertaAlInicio);
  const [sirvio, setSirvio] = useState(false);
  return (
    <div className={cn('rounded-xl border bg-card transition-colors', abierta ? 'border-brand-200 dark:border-brand-900' : 'border-border')}>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex-1 text-[13px] font-medium leading-snug">{p.pregunta}</span>
        <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform', abierta && 'rotate-180')} />
      </button>
      {abierta && (
        <div className="space-y-2.5 px-3 pb-3 text-[13px] leading-relaxed text-foreground/85">
          {p.respuesta.map((r, i) => (
            <TextoConFormato key={i} texto={r} />
          ))}
          {p.enlace && (
            <Link
              href={p.enlace.href}
              onClick={cerrar}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-600 hover:underline"
            >
              {p.enlace.texto} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[12px] text-muted-foreground">
            {sirvio ? (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> ¡Qué bueno! Aquí estamos si necesitas algo más.
              </span>
            ) : (
              <>
                <span>¿Te sirvió?</span>
                <button
                  type="button"
                  onClick={() => setSirvio(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-medium hover:border-emerald-400 hover:text-emerald-700"
                >
                  <ThumbsUp className="h-3 w-3" /> Sí
                </button>
                <button
                  type="button"
                  onClick={() => ir({ tipo: 'nueva', categoria: p.categoria, texto: `Sobre «${p.pregunta}»: ` })}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-medium hover:border-brand-400 hover:text-brand-700"
                >
                  <MessagesSquare className="h-3 w-3" /> No, quiero escribir al equipo
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilaDeTicket({ t, alAbrir }: { t: TicketResumen; alAbrir: () => void }) {
  const Icono = ICONO_DE_CATEGORIA[t.categoria];
  return (
    <button type="button" onClick={alAbrir} className="flex w-full items-start gap-2.5 px-1 py-2.5 text-left hover:bg-secondary/40">
      <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md', TINTE_DE_CATEGORIA[t.categoria])}>
        <Icono className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={cn('truncate text-[13px]', t.sin_leer ? 'font-bold' : 'font-medium')}>{t.asunto}</span>
          {t.sin_leer && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="Respuesta sin leer" />}
        </span>
        <span className="block truncate text-[12px] text-muted-foreground">{t.ultimo_mensaje}</span>
        <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <EstadoChip estado={t.estado} />
          <span>#{t.numero}</span>·<RelativeTime date={t.ultimo_mensaje_at} />
        </span>
      </span>
    </button>
  );
}

// ── Lista ─────────────────────────────────────────────────────────────

export function VistaLista({ ir }: { ir: (v: VistaDelWidget) => void }) {
  const { data: tickets, isLoading } = usarMisTickets();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">Todavía no tienes conversaciones.</p>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((t) => (
              <FilaDeTicket key={t.id} t={t} alAbrir={() => ir({ tipo: 'conversacion', id: t.id })} />
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => ir({ tipo: 'nueva', categoria: 'consulta' })}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700"
        >
          <MessagesSquare className="h-4 w-4" /> Nueva conversación
        </button>
      </div>
    </div>
  );
}

// ── Nueva conversación ────────────────────────────────────────────────

function BurbujaDeAlexia({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" className="mb-0.5 h-7 w-7 shrink-0 rounded-full border border-brand-100 bg-white object-contain p-0.5" />
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-[13.5px] leading-relaxed dark:border-brand-900 dark:bg-brand-950/60">
        {children}
      </div>
    </div>
  );
}

export function VistaNueva({
  usuario,
  categoria,
  textoInicial,
  alCrear,
  cerrar,
}: {
  usuario: UsuarioDelWidget;
  categoria: CategoriaDeTicket;
  textoInicial?: string;
  alCrear: (id: string) => void;
  cerrar: () => void;
}) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState(textoInicial || '');
  const [sugeridas, setSugeridas] = useState<PreguntaFrecuente[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);

  // Las preguntas de esta categoría, primero: quizá la respuesta ya está escrita.
  const propias = useMemo(
    () => (categoria === 'sugerencia' ? [] : PREGUNTAS_FRECUENTES.filter((p) => p.categoria === categoria).slice(0, 3)),
    [categoria],
  );

  // Mientras escribe, las que se parecen a lo que cuenta.
  useEffect(() => {
    const t = setTimeout(() => {
      const ya = new Set(propias.map((p) => p.id));
      setSugeridas(texto.trim().length > 6 ? buscarPreguntas(texto, 3).filter((p) => !ya.has(p.id)) : []);
    }, 350);
    return () => clearTimeout(t);
  }, [texto, propias]);

  const paginaActual = typeof window !== 'undefined' ? `${pathname}${window.location.search}` : pathname;

  async function enviar(form: FormData): Promise<boolean> {
    form.set('categoria', categoria);
    form.set('pagina', paginaActual || '');
    form.set(
      'contexto',
      JSON.stringify({
        navegador: navigator.userAgent,
        pantalla: `${window.innerWidth}×${window.innerHeight}`,
        perfil: usuario.perfil ?? '',
        hora_local: new Date().toLocaleString('es-PE'),
        ...(categoria === 'error' ? { errores: erroresRecientes() } : {}),
      }),
    );
    const r = await fetch('/api/soporte/tickets', { method: 'POST', body: form });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast.error(datos.error || 'No se pudo enviar. Inténtalo de nuevo.');
      return false;
    }
    await queryClient.invalidateQueries({ queryKey: ['soporte'] });
    alCrear(datos.id);
    return true;
  }

  const Icono = ICONO_DE_CATEGORIA[categoria];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div className="flex justify-center">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold', TINTE_DE_CATEGORIA[categoria])}>
            <Icono className="h-3.5 w-3.5" /> {CATEGORIAS[categoria].etiqueta}
          </span>
        </div>
        <BurbujaDeAlexia>{CATEGORIAS[categoria].saludo}</BurbujaDeAlexia>

        {propias.length > 0 && (
          <BurbujaDeAlexia>
            <p className="mb-2">Antes de escribir, quizá esto te sirva:</p>
            <div className="space-y-1.5">
              {propias.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setAbierta(abierta === p.id ? null : p.id)}
                  className={cn(
                    'block w-full rounded-lg border bg-background px-2.5 py-1.5 text-left text-[12.5px] font-medium transition-colors hover:border-brand-400',
                    abierta === p.id ? 'border-brand-400' : 'border-border',
                  )}
                >
                  {p.pregunta}
                </button>
              ))}
            </div>
          </BurbujaDeAlexia>
        )}

        {abierta && (
          <Pregunta
            key={abierta}
            p={PREGUNTAS_FRECUENTES.find((p) => p.id === abierta)!}
            ir={() => setAbierta(null)}
            cerrar={cerrar}
            abiertaAlInicio
          />
        )}
      </div>

      {sugeridas.length > 0 && (
        <div className="border-t border-border bg-secondary/40 px-3 py-2">
          <p className="mb-1.5 text-[11.5px] font-semibold text-muted-foreground">¿Es alguna de estas?</p>
          <div className="flex flex-wrap gap-1.5">
            {sugeridas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setAbierta(p.id)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[12px] hover:border-brand-400"
              >
                {p.pregunta}
              </button>
            ))}
          </div>
        </div>
      )}

      <Compositor
        alEnviar={enviar}
        valorInicial={textoInicial}
        alCambiar={setTexto}
        autoFocus
        placeholder={
          categoria === 'error'
            ? 'Qué intentabas hacer y qué pasó…'
            : categoria === 'sugerencia'
              ? 'Tu idea…'
              : 'Escribe tu mensaje…'
        }
        pie={
          <>
            Enviaremos también la página en la que estás ({paginaActual})
            {categoria === 'error' ? ' y los errores recientes del navegador' : ''}, para ubicar el problema más rápido.
          </>
        }
      />
    </div>
  );
}

// ── Conversación ──────────────────────────────────────────────────────

export function VistaConversacion({ id, usuario }: { id: string; usuario: UsuarioDelWidget }) {
  const queryClient = useQueryClient();
  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['soporte', 'ticket', id],
    queryFn: async (): Promise<TicketDetalle> => {
      const r = await fetch(`/api/soporte/tickets/${id}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('no encontrado');
      return (await r.json()).ticket;
    },
    refetchInterval: 6_000,
  });

  // Abrirla la marca como leída: el globo del botón se actualiza.
  useEffect(() => {
    if (ticket) void queryClient.invalidateQueries({ queryKey: ['soporte', 'resumen'] });
  }, [ticket?.mensajes.length, queryClient, ticket]);

  async function enviar(form: FormData): Promise<boolean> {
    const r = await fetch(`/api/soporte/tickets/${id}/mensajes`, { method: 'POST', body: form });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast.error(datos.error || 'No se pudo enviar. Inténtalo de nuevo.');
      return false;
    }
    await queryClient.invalidateQueries({ queryKey: ['soporte'] });
    return true;
  }

  async function cambiar(cambios: { estado?: EstadoDeTicket; calificacion?: number }) {
    const r = await fetch(`/api/soporte/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cambios),
    });
    if (!r.ok) {
      toast.error('No se pudo guardar. Inténtalo de nuevo.');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['soporte'] });
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError || !ticket) {
    return <p className="p-6 text-center text-[13px] text-muted-foreground">No encontramos esa conversación.</p>;
  }

  const resuelto = ticket.estado === 'resuelto';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold">{ticket.asunto}</p>
          <p className="text-[11.5px] text-muted-foreground">
            #{ticket.numero} · {CATEGORIAS[ticket.categoria].etiqueta}
          </p>
        </div>
        <EstadoChip estado={ticket.estado} className="mt-0.5" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!ticket.iniciado_por_equipo && (
          <p className="mx-4 mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-center text-[11.5px] leading-snug text-muted-foreground">
            El equipo de A-LexIA te responde aquí mismo. Cuando haya respuesta verás un aviso en el botón «Ayuda».
          </p>
        )}
        <Hilo mensajes={ticket.mensajes} compacto />

        {resuelto && (
          <div className="mx-4 mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Conversación resuelta
            </p>
            {ticket.calificacion ? (
              <p className="mt-1 text-[12px] text-emerald-800/80 dark:text-emerald-300/80">
                Gracias por calificar la atención con {ticket.calificacion} de 5.
              </p>
            ) : (
              <>
                <p className="mt-1 text-[12px] text-emerald-800/80 dark:text-emerald-300/80">¿Cómo te atendimos?</p>
                <Estrellas alElegir={(n) => void cambiar({ calificacion: n })} />
              </>
            )}
          </div>
        )}
      </div>

      {!resuelto && ticket.mensajes.some((m) => m.de_equipo) && (
        <button
          type="button"
          onClick={() => void cambiar({ estado: 'resuelto' })}
          className="flex items-center justify-center gap-1.5 border-t border-border bg-secondary/30 py-2 text-[12px] font-medium text-muted-foreground hover:text-emerald-700"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Ya se resolvió, marcar como resuelta
        </button>
      )}

      <Compositor
        alEnviar={enviar}
        placeholder={resuelto ? 'Escribe para reabrir la conversación…' : 'Escribe tu mensaje…'}
        pie={usuario.esAdmin ? 'Estás escribiendo como usuario en tu propia conversación.' : undefined}
      />
    </div>
  );
}

function Estrellas({ alElegir }: { alElegir: (n: number) => void }) {
  const [encima, setEncima] = useState(0);
  return (
    <div className="mt-1.5 flex justify-center gap-1" onMouseLeave={() => setEncima(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} de 5`}
          onMouseEnter={() => setEncima(n)}
          onClick={() => alElegir(n)}
          className="rounded p-0.5 transition-transform hover:scale-110"
        >
          <Star className={cn('h-6 w-6', n <= encima ? 'fill-amber-400 text-amber-400' : 'text-emerald-300 dark:text-emerald-700')} />
        </button>
      ))}
    </div>
  );
}
