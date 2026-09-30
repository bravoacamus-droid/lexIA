'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  Bug,
  CheckCircle2,
  CircleHelp,
  Flag,
  Inbox,
  Lightbulb,
  Loader2,
  MessageSquarePlus,
  Monitor,
  RotateCcw,
  Search,
  Star,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RelativeTime } from '@/components/ui/relative-time';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Hilo } from '@/components/soporte/hilo';
import { Compositor } from '@/components/soporte/compositor';
import { EstadoChip } from '@/components/soporte/ayuda/vistas';
import { ROLE_LABELS } from '@/lib/navigation/menu-by-role';
import {
  CATEGORIAS,
  ESTADOS,
  type CategoriaDeTicket,
  type EstadoDeTicket,
  type TicketDetalle,
  type TicketResumen,
  type UsuarioDeSoporte,
} from '@/lib/soporte/tipos';

type TicketDeBandeja = TicketResumen & { usuario: UsuarioDeSoporte | null };
type Cuentas = { todos: number; abierto: number; respondido: number; resuelto: number; sin_leer: number; alta: number };
type UsuarioDeLista = UsuarioDeSoporte & { ultimo_acceso: string | null };

const ICONO: Record<CategoriaDeTicket, typeof Bug> = { error: Bug, consulta: CircleHelp, cuenta: UserCog, sugerencia: Lightbulb };
const TINTE: Record<CategoriaDeTicket, string> = {
  error: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  consulta: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  cuenta: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  sugerencia: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

const PLANES: Record<string, string> = { free_trial: 'Prueba gratuita', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };

const RESPUESTAS_RAPIDAS = [
  '¡Hola! Gracias por escribirnos. Ya estamos revisando tu caso y te respondemos por aquí.',
  '¿Nos podrías enviar una captura de pantalla de lo que ves? Puedes pegarla aquí con Ctrl+V.',
  'Ya lo corregimos. Por favor recarga la página con Ctrl + F5 y vuelve a intentarlo; cuéntanos si todo quedó bien.',
  'Para ayudarte mejor, ¿nos indicas el nombre del documento o del expediente en el que ocurrió?',
  'Te escribimos por WhatsApp para coordinarlo más rápido.',
  'Quedamos atentos. Si no tienes más dudas, marcaremos la conversación como resuelta.',
];

const FILTROS: Array<{ valor: EstadoDeTicket | 'todos'; etiqueta: string }> = [
  { valor: 'abierto', etiqueta: 'Por responder' },
  { valor: 'respondido', etiqueta: 'Esperando al usuario' },
  { valor: 'resuelto', etiqueta: 'Resueltas' },
  { valor: 'todos', etiqueta: 'Todas' },
];

function iniciales(u: UsuarioDeSoporte | null | undefined) {
  const base = u?.nombre || u?.email || '?';
  return base
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function BandejaDeSoporte() {
  const [pestana, setPestana] = useState<'conversaciones' | 'usuarios'>('conversaciones');
  const [filtro, setFiltro] = useState<EstadoDeTicket | 'todos'>('abierto');
  const [categoria, setCategoria] = useState<CategoriaDeTicket | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [elegido, setElegido] = useState<string | null>(null);
  const [escribirA, setEscribirA] = useState<UsuarioDeLista | null>(null);

  // Un enlace directo a una conversación: /admin/soporte?t=<id>
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t');
    if (t) {
      setElegido(t);
      setFiltro('todos');
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setQ(busqueda.trim()), 300);
    return () => clearTimeout(id);
  }, [busqueda]);

  function elegir(id: string | null) {
    setElegido(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('t', id);
    else url.searchParams.delete('t');
    window.history.replaceState(null, '', url.toString());
  }

  const { data, isLoading } = useQuery({
    queryKey: ['soporte', 'bandeja', filtro, categoria, q],
    queryFn: async (): Promise<{ tickets: TicketDeBandeja[]; cuentas: Cuentas }> => {
      const p = new URLSearchParams({ estado: filtro });
      if (categoria) p.set('categoria', categoria);
      if (q) p.set('q', q);
      const r = await fetch(`/api/admin/soporte/tickets?${p}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('No se pudo leer la bandeja');
      return r.json();
    },
    refetchInterval: 10_000,
    placeholderData: (anterior) => anterior,
  });

  const cuentas = data?.cuentas;
  const tickets = data?.tickets ?? [];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <Link href="/admin" className="mb-1 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Panel administrador
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Inbox className="h-6 w-6 text-brand-600" /> Bandeja de soporte
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Contador etiqueta="Por responder" valor={cuentas?.abierto} tono="amber" />
          <Contador etiqueta="Sin leer" valor={cuentas?.sin_leer} tono="rose" />
          <Contador etiqueta="Prioridad alta" valor={cuentas?.alta} tono="rose" />
          <Contador etiqueta="Esperando al usuario" valor={cuentas?.respondido} tono="brand" />
          <Contador etiqueta="Resueltas" valor={cuentas?.resuelto} tono="emerald" />
        </div>
      </header>

      <div className="flex gap-1 border-b border-border px-4 sm:px-6">
        {(
          [
            ['conversaciones', 'Conversaciones', Inbox],
            ['usuarios', 'Usuarios', Users],
          ] as const
        ).map(([valor, etiqueta, Icono]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setPestana(valor)}
            className={cn(
              '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors',
              pestana === valor ? 'border-brand-600 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icono className="h-4 w-4" /> {etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'usuarios' ? (
        <ListaDeUsuarios alEscribir={setEscribirA} />
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Lista de conversaciones */}
          <aside className={cn('flex w-full min-w-0 flex-col border-r border-border md:w-[360px] md:shrink-0', elegido && 'hidden md:flex')}>
            <div className="space-y-2 border-b border-border p-3">
              <label className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5 focus-within:border-brand-400">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por usuario, correo, asunto o #número"
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-1">
                {FILTROS.map((f) => (
                  <button
                    key={f.valor}
                    type="button"
                    onClick={() => setFiltro(f.valor)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors',
                      filtro === f.valor ? 'bg-brand-600 text-white' : 'bg-secondary text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {f.etiqueta}
                    {f.valor !== 'todos' && cuentas ? ` · ${cuentas[f.valor]}` : ''}
                  </button>
                ))}
              </div>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaDeTicket | '')}
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-[12.5px]"
              >
                <option value="">Todas las categorías</option>
                {(Object.keys(CATEGORIAS) as CategoriaDeTicket[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIAS[c].etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="px-6 py-12 text-center text-[13px] text-muted-foreground">
                  <Inbox className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  {filtro === 'abierto' ? 'No hay conversaciones por responder. ¡Todo al día!' : 'No hay conversaciones con ese filtro.'}
                </div>
              ) : (
                tickets.map((t) => <FilaDeBandeja key={t.id} t={t} activo={t.id === elegido} alElegir={() => elegir(t.id)} />)
              )}
            </div>
          </aside>

          {/* Conversación */}
          <section className={cn('min-w-0 flex-1', !elegido && 'hidden md:block')}>
            {elegido ? (
              <Conversacion key={elegido} id={elegido} alCerrar={() => elegir(null)} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <Inbox className="h-10 w-10 opacity-30" />
                <p className="text-[14px] font-medium">Elige una conversación para verla y responder.</p>
                <p className="max-w-sm text-[12.5px]">
                  Los usuarios escriben desde el botón «Ayuda». También puedes escribirle primero a cualquiera desde la pestaña Usuarios.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      <NuevaConversacion
        usuario={escribirA}
        alCerrar={() => setEscribirA(null)}
        alCrear={(id) => {
          setEscribirA(null);
          setPestana('conversaciones');
          setFiltro('todos');
          elegir(id);
        }}
      />
    </div>
  );
}

function Contador({ etiqueta, valor, tono }: { etiqueta: string; valor?: number; tono: 'amber' | 'rose' | 'brand' | 'emerald' }) {
  const tonos = {
    amber: 'text-amber-700 dark:text-amber-400',
    rose: 'text-rose-700 dark:text-rose-400',
    brand: 'text-brand-700 dark:text-brand-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
  };
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{etiqueta}</p>
      <p className={cn('font-mono text-lg font-semibold tabular-nums leading-tight', valor ? tonos[tono] : 'text-muted-foreground')}>
        {valor ?? '—'}
      </p>
    </div>
  );
}

function FilaDeBandeja({ t, activo, alElegir }: { t: TicketDeBandeja; activo: boolean; alElegir: () => void }) {
  const Icono = ICONO[t.categoria];
  return (
    <button
      type="button"
      onClick={alElegir}
      className={cn(
        'flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors',
        activo ? 'bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-secondary/50',
      )}
    >
      <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-muted-foreground">
        {iniciales(t.usuario)}
        {t.sin_leer && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-background" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn('truncate text-[13px]', t.sin_leer ? 'font-bold' : 'font-semibold')}>
            {t.usuario?.nombre || t.usuario?.email || 'Usuario'}
          </span>
          <RelativeTime date={t.ultimo_mensaje_at} className="ml-auto shrink-0 text-[11px] text-muted-foreground" />
        </span>
        {t.usuario?.organizacion && <span className="block truncate text-[11px] text-muted-foreground">{t.usuario.organizacion}</span>}
        <span className={cn('mt-0.5 block truncate text-[12.5px]', t.sin_leer ? 'font-semibold text-foreground' : 'text-foreground/85')}>
          {t.asunto}
        </span>
        <span className="block truncate text-[12px] text-muted-foreground">{t.ultimo_mensaje}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold', TINTE[t.categoria])}>
            <Icono className="h-3 w-3" /> {CATEGORIAS[t.categoria].corta}
          </span>
          {t.prioridad === 'alta' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              <Flag className="h-3 w-3" /> Alta
            </span>
          )}
          <span className="text-[10.5px] text-muted-foreground">#{t.numero}</span>
          <span className="ml-auto text-[10.5px] font-medium text-muted-foreground">{ESTADOS[t.estado].paraEquipo}</span>
        </span>
      </span>
    </button>
  );
}

function Conversacion({ id, alCerrar }: { id: string; alCerrar: () => void }) {
  const queryClient = useQueryClient();
  const [nota, setNota] = useState<string | null>(null);
  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['soporte', 'ticket', id],
    queryFn: async (): Promise<TicketDetalle> => {
      const r = await fetch(`/api/soporte/tickets/${id}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('no encontrado');
      return (await r.json()).ticket;
    },
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (ticket && nota === null) setNota(ticket.nota_interna || '');
  }, [ticket, nota]);

  async function refrescar() {
    await queryClient.invalidateQueries({ queryKey: ['soporte'] });
  }

  async function enviar(form: FormData): Promise<boolean> {
    const r = await fetch(`/api/soporte/tickets/${id}/mensajes`, { method: 'POST', body: form });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast.error(datos.error || 'No se pudo enviar.');
      return false;
    }
    await refrescar();
    return true;
  }

  async function cambiar(cambios: Record<string, unknown>, aviso?: string) {
    const r = await fetch(`/api/soporte/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cambios),
    });
    if (!r.ok) {
      toast.error('No se pudo guardar el cambio.');
      return;
    }
    if (aviso) toast.success(aviso);
    await refrescar();
  }

  async function eliminar() {
    if (!window.confirm('¿Eliminar esta conversación y todos sus mensajes? No se puede deshacer.')) return;
    const r = await fetch(`/api/soporte/tickets/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      toast.error('No se pudo eliminar.');
      return;
    }
    toast.success('Conversación eliminada.');
    alCerrar();
    await refrescar();
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError || !ticket) {
    return <p className="p-8 text-center text-[13px] text-muted-foreground">No encontramos esa conversación.</p>;
  }

  const u = ticket.usuario;
  const ctx = ticket.contexto as { navegador?: string; pantalla?: string; hora_local?: string; errores?: string[] };

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border px-4 py-2.5">
          <div className="flex items-start gap-2">
            <button type="button" onClick={alCerrar} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary md:hidden" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold leading-snug">{ticket.asunto}</p>
              <p className="truncate text-[12px] text-muted-foreground">
                #{ticket.numero} · {u?.nombre || u?.email} · abierta <RelativeTime date={ticket.created_at} />
                {ticket.iniciado_por_equipo ? ' por el equipo' : ''}
              </p>
            </div>
            <EstadoChip estado={ticket.estado} className="mt-0.5" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void cambiar({ prioridad: ticket.prioridad === 'alta' ? 'normal' : 'alta' })}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold',
                ticket.prioridad === 'alta'
                  ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
              title="Prioridad"
            >
              <Flag className="h-3.5 w-3.5" /> {ticket.prioridad === 'alta' ? 'Prioridad alta' : 'Prioridad normal'}
            </button>
            {ticket.estado === 'resuelto' ? (
              <button
                type="button"
                onClick={() => void cambiar({ estado: 'abierto' }, 'Conversación reabierta.')}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold hover:bg-secondary"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reabrir
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void cambiar({ estado: 'resuelto' }, 'Marcada como resuelta.')}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Marcar resuelta
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-secondary/20">
          <Hilo mensajes={ticket.mensajes} vistaDeEquipo nombreDelUsuario={u?.nombre || u?.email} />
          {ticket.estado === 'resuelto' && ticket.calificacion && (
            <p className="mb-4 flex items-center justify-center gap-1 text-[12px] text-muted-foreground">
              Calificó la atención:
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn('h-3.5 w-3.5', n <= ticket.calificacion! ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
              ))}
            </p>
          )}
        </div>

        <Compositor
          alEnviar={enviar}
          respuestasRapidas={RESPUESTAS_RAPIDAS}
          placeholder={`Responder a ${u?.nombre?.split(' ')[0] || 'el usuario'}… (Enter envía, Mayús+Enter salta de línea)`}
          pie="El usuario verá tu respuesta en su botón «Ayuda», con un aviso."
        />
      </div>

      {/* Ficha del usuario y del contexto */}
      <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-border p-4 xl:block">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-[14px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {iniciales(u)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">{u?.nombre || 'Sin nombre'}</p>
            {u?.email && (
              <a href={`mailto:${u.email}`} className="block truncate text-[12px] text-brand-600 hover:underline">
                {u.email}
              </a>
            )}
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-[12.5px]">
          <Dato titulo="Perfil">{u?.perfil ? ROLE_LABELS[u.perfil] : '—'}</Dato>
          <Dato titulo="Organización">{u?.organizacion || '—'}</Dato>
          <Dato titulo="Cargo">{u?.cargo || '—'}</Dato>
          <Dato titulo="Plan">{u?.plan ? PLANES[u.plan] || u.plan : '—'}</Dato>
          <Dato titulo="Registrado">{u?.registrado ? new Date(u.registrado).toLocaleDateString('es-PE') : '—'}</Dato>
          <Dato titulo="Conversaciones">{u?.tickets ?? '—'}</Dato>
        </dl>

        <div className="mt-4">
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Categoría</label>
          <select
            value={ticket.categoria}
            onChange={(e) => void cambiar({ categoria: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-[12.5px]"
          >
            {(Object.keys(CATEGORIAS) as CategoriaDeTicket[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORIAS[c].etiqueta}
              </option>
            ))}
          </select>
        </div>

        {!ticket.iniciado_por_equipo && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Monitor className="h-3.5 w-3.5" /> Desde dónde escribió
            </p>
            {ticket.pagina && (
              <a href={ticket.pagina} target="_blank" rel="noopener noreferrer" className="block break-all text-[12px] font-medium text-brand-600 hover:underline">
                {ticket.pagina}
              </a>
            )}
            {ctx.pantalla && <p className="mt-1 text-[11.5px] text-muted-foreground">Pantalla: {ctx.pantalla}</p>}
            {ctx.hora_local && <p className="text-[11.5px] text-muted-foreground">Su hora: {ctx.hora_local}</p>}
            {ctx.navegador && <p className="mt-1 break-words text-[11px] leading-snug text-muted-foreground">{navegadorLegible(ctx.navegador)}</p>}
            {ctx.errores && ctx.errores.length > 0 && (
              <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 dark:border-rose-900 dark:bg-rose-950/40">
                <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="h-3 w-3" /> Errores del navegador
                </p>
                {ctx.errores.map((e, i) => (
                  <p key={i} className="break-words font-mono text-[10.5px] leading-snug text-rose-800 dark:text-rose-300">
                    {e}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Nota interna</label>
          <textarea
            value={nota ?? ''}
            onChange={(e) => setNota(e.target.value)}
            onBlur={() => {
              if ((nota ?? '') !== (ticket.nota_interna ?? '')) void cambiar({ nota_interna: nota ?? '' }, 'Nota guardada.');
            }}
            rows={3}
            placeholder="Solo la ve el equipo."
            className="mt-1 w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-[12.5px] outline-none focus:border-brand-400"
          />
        </div>

        {ticket.otros && ticket.otros.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Otras conversaciones</p>
            <div className="space-y-1">
              {ticket.otros.map((o) => (
                <a key={o.id} href={`/admin/soporte?t=${o.id}`} className="block rounded-md px-2 py-1.5 text-[12px] hover:bg-secondary">
                  <span className="font-medium">#{o.numero}</span> {o.asunto}
                  <span className="block text-[11px] text-muted-foreground">{ESTADOS[o.estado].paraEquipo}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => void eliminar()}
          className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:border-rose-300 hover:text-rose-700"
        >
          <Trash2 className="h-3.5 w-3.5" /> Eliminar conversación
        </button>
      </aside>
    </div>
  );
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{titulo}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}

/** «Chrome 129 en Windows» a partir del user agent, sin librerías. */
function navegadorLegible(ua: string): string {
  const nav = /Edg\/(\d+)/.exec(ua)
    ? `Edge ${/Edg\/(\d+)/.exec(ua)![1]}`
    : /Chrome\/(\d+)/.exec(ua)
      ? `Chrome ${/Chrome\/(\d+)/.exec(ua)![1]}`
      : /Firefox\/(\d+)/.exec(ua)
        ? `Firefox ${/Firefox\/(\d+)/.exec(ua)![1]}`
        : /Version\/(\d+).*Safari/.exec(ua)
          ? `Safari ${/Version\/(\d+)/.exec(ua)![1]}`
          : 'Navegador desconocido';
  const so = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'Mac'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return so ? `${nav} en ${so}` : nav;
}

function ListaDeUsuarios({ alEscribir }: { alEscribir: (u: UsuarioDeLista) => void }) {
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQ(busqueda.trim()), 300);
    return () => clearTimeout(id);
  }, [busqueda]);

  const { data, isLoading } = useQuery({
    queryKey: ['soporte', 'usuarios', q],
    queryFn: async (): Promise<{ usuarios: UsuarioDeLista[]; total: number }> => {
      const r = await fetch(`/api/admin/soporte/usuarios?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('No se pudo leer la lista');
      return r.json();
    },
    placeholderData: (anterior) => anterior,
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex w-full max-w-md items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5 focus-within:border-brand-400">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo u organización"
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          />
        </label>
        {data && <p className="text-[12px] text-muted-foreground">{data.total} usuario(s)</p>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
              <th className="p-3 font-semibold">Usuario</th>
              <th className="p-3 font-semibold">Perfil</th>
              <th className="p-3 font-semibold">Organización</th>
              <th className="p-3 font-semibold">Plan</th>
              <th className="p-3 font-semibold">Último ingreso</th>
              <th className="p-3 font-semibold">Conversaciones</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : (
              (data?.usuarios ?? []).map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="p-3">
                    <p className="font-medium">{u.nombre || '—'}</p>
                    <p className="text-[11.5px] text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="p-3 text-[12px]">{u.perfil ? ROLE_LABELS[u.perfil] : '—'}</td>
                  <td className="p-3 text-[12px]">{u.organizacion || '—'}</td>
                  <td className="p-3 text-[12px]">{u.plan ? PLANES[u.plan] || u.plan : '—'}</td>
                  <td className="p-3 text-[12px] text-muted-foreground">
                    {u.ultimo_acceso ? <RelativeTime date={u.ultimo_acceso} /> : '—'}
                  </td>
                  <td className="p-3 text-[12px] tabular-nums">{u.tickets}</td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => alEscribir(u)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold hover:border-brand-400 hover:text-brand-700"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" /> Escribir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NuevaConversacion({
  usuario,
  alCerrar,
  alCrear,
}: {
  usuario: UsuarioDeLista | null;
  alCerrar: () => void;
  alCrear: (id: string) => void;
}) {
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (usuario) {
      setAsunto('');
      setCuerpo(`Hola${usuario.nombre ? `, ${usuario.nombre.split(' ')[0]}` : ''}. `);
    }
  }, [usuario]);

  const listo = useMemo(() => asunto.trim().length > 0 && cuerpo.trim().length > 0 && !enviando, [asunto, cuerpo, enviando]);

  async function enviar() {
    if (!usuario || !listo) return;
    setEnviando(true);
    const r = await fetch('/api/admin/soporte/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: usuario.id, asunto, cuerpo }),
    });
    const datos = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) {
      toast.error(datos.error || 'No se pudo enviar.');
      return;
    }
    toast.success('Mensaje enviado. Lo verá en su botón «Ayuda».');
    await queryClient.invalidateQueries({ queryKey: ['soporte'] });
    alCrear(datos.id);
  }

  return (
    <Dialog open={!!usuario} onOpenChange={(v) => !v && alCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escribir a {usuario?.nombre || usuario?.email}</DialogTitle>
          <DialogDescription>
            Le llegará como una conversación nueva en su botón «Ayuda», con un aviso. Podrá responderte por ahí.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-semibold">Asunto</label>
            <input
              value={asunto}
              onChange={(e) => setAsunto(e.target.value.slice(0, 160))}
              placeholder="Ej.: Tu reporte sobre el acta de contrato menor"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-[13px] outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="text-[12px] font-semibold">Mensaje</label>
            <textarea
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value.slice(0, 5000))}
              rows={6}
              className="mt-1 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-brand-400"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={alCerrar} className="rounded-lg border border-border px-3 py-2 text-[13px] font-medium hover:bg-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={!listo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />} Enviar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
