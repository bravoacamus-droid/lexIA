'use client';

/**
 * «Tu plan y créditos» (/cuenta/suscripcion), con el modelo de planes
 * del documento «PLANES DE A-LEXIA» de César (17/10/2026).
 *
 * La suscripción habilita herramientas y los créditos permiten usarlas:
 * la página enseña las dos cosas por separado —qué incluye el plan (la
 * tabla de herramientas) y cuánto queda para usarlas (la bolsa)—, porque
 * mezcladas no se entendía por qué una herramienta «no incluida» no se
 * arreglaba con una recarga.
 *
 * No hay cobro en línea: recargar o cambiar de plan abre WhatsApp con
 * el mensaje ya escrito (plan actual, lo que se pide y el correo de la
 * cuenta, para que el administrador la encuentre en /admin/planes).
 */
import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowUpRight,
  Check,
  Coins,
  Copy,
  Crown,
  LogOut,
  Minus,
  MessageCircle,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PLANES, RECARGAS, enlaceWhatsApp, precioAnual, type PlanDeCatalogo } from '@/lib/billing/catalogo';
import type { resumenDeCuenta } from '@/lib/billing/gestion';

export type ResumenDeCuenta = Awaited<ReturnType<typeof resumenDeCuenta>>;

const n = (x: number) => x.toLocaleString('es-PE');
/*
 * Fechas armadas a mano y en hora de Lima (UTC−5, sin horario de
 * verano). Con toLocaleDateString/TimeString el servidor (Node, en UTC en
 * Vercel) y el navegador escribían distinto la misma hora («p. m.» contra
 * «p.m.», o el día siguiente pasada la medianoche UTC) y React rompía la
 * hidratación de la página en cuanto había un movimiento en la lista.
 */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const enLima = (iso: string) => new Date(new Date(iso).getTime() - 5 * 3_600_000);
const fecha = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = enLima(iso);
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
};
const fechaCorta = (iso: string) => {
  const d = enLima(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()].slice(0, 3)}. · ${hh}:${mm}`;
};

const ORIGEN: Record<string, string> = {
  consumo: 'Uso',
  reembolso: 'Devolución',
  recarga: 'Recarga',
  asignacion: 'Plan activado',
  ajuste: 'Ajuste',
};

/** Cómo se cobra cada herramienta: la voz por minuto, las ofertas por oferta. */
function textoDeCosto(id: string, costo: number) {
  if (id === 'consulta_voz') return `${costo} por minuto`;
  if (id === 'evaluacion_ofertas') return `${costo} por oferta`;
  return `${costo}`;
}

export function MiPlan({ inicial, email, userId }: { inicial: ResumenDeCuenta; email: string; userId: string }) {
  const [r, setR] = useState(inicial);
  const [anual, setAnual] = useState(inicial.plan.modalidad === 'anual');
  const [todosLosMovimientos, setTodosLosMovimientos] = useState(false);

  const recargar = useCallback(async () => {
    try {
      const res = await fetch('/api/cuenta/plan', { cache: 'no-store' });
      if (res.ok) setR(await res.json());
    } catch {
      /* se queda con lo último leído */
    }
  }, []);

  const esPrueba = r.plan.id === 'prueba';
  const unidad = esPrueba ? 'preguntas' : 'créditos';
  const porcentaje = r.plan.creditosMes > 0 ? Math.min(100, Math.round((r.creditos.usadosDelMes / r.plan.creditosMes) * 100)) : 0;
  const apretado = porcentaje >= 80;
  const suspendido = r.creditos.vencido && !(r.creditos.venceAt && new Date(r.creditos.venceAt).getTime() <= Date.now());
  const nombreDeMiembro = useMemo(
    () => new Map((r.equipo?.miembros ?? []).map((m) => [m.user_id, m.nombre])),
    [r.equipo],
  );

  const pedido = (texto: string) => enlaceWhatsApp(`${texto} Mi cuenta: ${email}.`);
  const movimientos = todosLosMovimientos ? r.movimientos : r.movimientos.slice(0, 8);

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">Mi cuenta</p>
        <h1 className="text-3xl font-semibold tracking-tight">Tu plan y créditos</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Tu plan habilita las herramientas; los créditos te permiten usarlas y se comparten entre todas las tareas.
        </p>
      </header>

      {/* ═══ Plan actual + créditos ═══════════════════════════════════ */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="relative overflow-hidden border-brand-100 bg-gradient-to-br from-brand-50/70 via-violet-50/40 to-white p-6 dark:border-brand-900 dark:from-brand-950/40 dark:via-violet-950/20 dark:to-background">
          <Badge
            variant="outline"
            className="mb-3 border-brand-300 bg-white/60 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300"
          >
            <Crown className="h-3 w-3" />
            Plan actual
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight">{r.plan.nombre}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{r.plan.tipo}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {r.creditos.vencido ? (
              <Badge variant="danger">
                <AlertTriangle className="h-3 w-3" />
                {suspendido ? 'Suspendido' : esPrueba ? 'Prueba terminada' : 'Vencido'}
              </Badge>
            ) : (
              <Badge variant="success">
                <Check className="h-3 w-3" />
                {esPrueba ? 'Prueba activa' : 'Vigente'}
              </Badge>
            )}
            {!esPrueba && <Badge variant="secondary">{r.plan.modalidad === 'anual' ? 'Anual' : 'Mensual'}</Badge>}
            {r.equipo && (
              <Badge variant="outline">
                <Users className="h-3 w-3" />
                {r.equipo.nombre} · {r.equipo.rol === 'propietario' ? 'propietario' : 'miembro'}
              </Badge>
            )}
          </div>

          {esPrueba ? (
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              20 preguntas por texto o 30 días, lo que ocurra primero. La prueba se da una sola vez por usuario.
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Dato
              rotulo={esPrueba ? 'La prueba vence el' : 'Vigente hasta'}
              valor={r.creditos.venceAt ? fecha(r.creditos.venceAt) : 'Sin vencimiento'}
            />
            <Dato
              rotulo={esPrueba ? 'Preguntas incluidas' : 'Créditos cada mes'}
              valor={`${n(r.plan.creditosMes)} ${unidad}`}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="glow">
              <a href="#cambiar-de-plan">
                <ArrowUpRight className="h-4 w-4" />
                {esPrueba ? 'Elegir un plan' : 'Cambiar de plan'}
              </a>
            </Button>
            {!esPrueba && (
              <Button asChild variant="outline">
                <a href="#recargas">
                  <Plus className="h-4 w-4" />
                  Recargar créditos
                </a>
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {esPrueba ? 'Preguntas disponibles' : 'Créditos disponibles'}
              </p>
              <p className={cn('mt-1 text-4xl font-bold tabular-nums', apretado && 'text-amber-600 dark:text-amber-400')}>
                {n(r.creditos.disponibles)}
              </p>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Coins className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium">{esPrueba ? 'Preguntas usadas' : 'Del mes'}</span>
              <span className={cn('tabular-nums text-muted-foreground', apretado && 'font-semibold text-amber-700 dark:text-amber-400')}>
                {n(r.creditos.usadosDelMes)} de {n(r.plan.creditosMes)} usados
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn('h-full rounded-full transition-[width] duration-500', apretado ? 'bg-amber-500' : 'bg-brand-500')}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-border p-3">
              <dt className="text-muted-foreground">Quedan del mes</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums">{n(r.creditos.delMes)}</dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-muted-foreground">Recargas</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums">{n(r.creditos.recargas)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {esPrueba
              ? `La prueba termina el ${fecha(r.creditos.renovacion)} o al usar la pregunta 20.`
              : `Los créditos del mes se renuevan el ${fecha(r.creditos.renovacion)}. Las recargas se usan cuando se acaban los del mes y no vencen con la renovación.`}
          </p>

          {r.limite && (
            <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-3">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium">{r.limite.texto}</span>
                <span className="tabular-nums text-muted-foreground">
                  {r.limite.usados} de {r.limite.maximo} este mes
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className={cn('h-full rounded-full', r.limite.usados >= r.limite.maximo ? 'bg-amber-500' : 'bg-violet-500')}
                  style={{ width: `${Math.min(100, (r.limite.usados / r.limite.maximo) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ═══ Herramientas ═════════════════════════════════════════════ */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-2 p-6 pb-3">
          <div>
            <h2 className="text-base font-semibold">Herramientas de tu plan</h2>
            <p className="text-xs text-muted-foreground">Qué incluye tu plan, cuánto cuesta cada uso y cuánto llevas este mes.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-secondary/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-2.5">Herramienta</th>
                <th className="px-3 py-2.5 text-center">En tu plan</th>
                <th className="px-3 py-2.5 text-right">Créditos por uso</th>
                <th className="px-3 py-2.5 text-right">Usos del mes</th>
                <th className="px-6 py-2.5 text-right">Créditos del mes</th>
              </tr>
            </thead>
            <tbody>
              {r.herramientas.map((h) => (
                <tr key={h.id} className={cn('border-b border-border last:border-0', !h.incluida && 'text-muted-foreground')}>
                  <td className="px-6 py-2.5">{h.nombre}</td>
                  <td className="px-3 py-2.5 text-center">
                    {h.incluida ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="Incluida" />
                    ) : (
                      <Minus className="mx-auto h-4 w-4 opacity-50" aria-label="No incluida" />
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{textoDeCosto(h.id, h.costo)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{h.usos ? n(h.usos) : '—'}</td>
                  <td className="px-6 py-2.5 text-right tabular-nums">{h.creditos ? n(h.creditos) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ═══ Equipo ═══════════════════════════════════════════════════ */}
      {r.equipo && <GestionDeEquipo equipo={r.equipo} userId={userId} alCambiar={recargar} />}

      {/* ═══ Movimientos ══════════════════════════════════════════════ */}
      <Card className="p-6">
        <h2 className="text-base font-semibold">Movimientos recientes</h2>
        <p className="text-xs text-muted-foreground">Cada uso, recarga y activación de tu bolsa de créditos.</p>
        {r.movimientos.length === 0 ? (
          <p className="mt-4 text-xs italic text-muted-foreground">Aún no hay movimientos.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {movimientos.map((m) => {
              const positivo = m.creditos > 0;
              const herramienta = r.herramientas.find((h) => h.id === m.herramienta)?.nombre;
              const quien = r.equipo && m.user_id ? nombreDeMiembro.get(m.user_id) : null;
              return (
                <li key={m.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      <span className="font-medium">{ORIGEN[m.origen] ?? m.origen}</span>
                      {herramienta && <span className="text-muted-foreground"> · {herramienta}</span>}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {fechaCorta(m.created_at)}
                      {quien ? ` · ${quien}` : ''}
                      {m.detalle ? ` · ${m.detalle}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-sm font-semibold tabular-nums',
                      positivo ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground',
                    )}
                  >
                    {positivo ? '+' : ''}
                    {n(m.creditos)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {r.movimientos.length > 8 && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTodosLosMovimientos((v) => !v)}>
            {todosLosMovimientos ? 'Ver menos' : `Ver los ${r.movimientos.length} más recientes`}
          </Button>
        )}
      </Card>

      {/* ═══ Recargas ═════════════════════════════════════════════════ */}
      <section id="recargas" className="scroll-mt-6">
        <h2 className="text-base font-semibold">Recargas</h2>
        <p className="text-xs text-muted-foreground">
          {esPrueba
            ? 'Las recargas son para planes de pago: durante la prueba, elige un plan.'
            : 'Créditos adicionales para tu bolsa. Pídelos por WhatsApp y se activan en tu cuenta.'}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {RECARGAS.map((rc) => (
            <Card key={rc.creditos} className={cn('flex flex-col p-5', esPrueba && 'opacity-60')}>
              <p className="text-2xl font-bold tabular-nums">{n(rc.creditos)}</p>
              <p className="text-xs text-muted-foreground">créditos</p>
              <p className="mt-3 text-lg font-semibold">S/ {n(rc.precio)}</p>
              <Button asChild={!esPrueba} variant="outline" size="sm" className="mt-4" disabled={esPrueba}>
                {esPrueba ? (
                  <span>Pedir por WhatsApp</span>
                ) : (
                  <a
                    href={pedido(
                      `Hola, uso A-LexIA (plan ${r.plan.nombre}) y quisiera una recarga de ${n(rc.creditos)} créditos (S/ ${n(rc.precio)}).`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Pedir por WhatsApp
                  </a>
                )}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* ═══ Cambiar de plan ══════════════════════════════════════════ */}
      <section id="cambiar-de-plan" className="scroll-mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Cambiar de plan</h2>
            <p className="text-xs text-muted-foreground">
              Elige el plan y escríbenos por WhatsApp: lo activamos en tu cuenta. El anual son 12 meses por el precio de 11.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5 text-xs font-medium" role="group" aria-label="Modalidad">
            {(['mensual', 'anual'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={anual === (m === 'anual')}
                onClick={() => setAnual(m === 'anual')}
                className={cn(
                  'rounded-md px-3 py-1.5 transition-colors',
                  anual === (m === 'anual') ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'mensual' ? 'Mensual' : 'Anual'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PLANES.filter((p) => !p.prueba).map((p) => (
            <TarjetaDePlanDeCatalogo
              key={p.id}
              plan={p}
              anual={anual}
              actual={p.id === r.plan.id}
              enlace={pedido(mensajeDePlan(p, anual, r.plan.nombre, p.id === r.plan.id))}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function mensajeDePlan(p: PlanDeCatalogo, anual: boolean, actual: string, esElActual: boolean) {
  if (p.desde) {
    return `Hola, uso A-LexIA (plan ${actual}) y quisiera cotizar el plan ${p.nombre} (${anual ? 'anual' : 'mensual'}).`;
  }
  const precio = anual ? `S/ ${n(precioAnual(p))} por 12 meses` : `S/ ${n(p.precioMensual)} al mes`;
  return esElActual
    ? `Hola, quisiera renovar mi plan ${p.nombre} de A-LexIA (${anual ? 'anual' : 'mensual'}: ${precio}).`
    : `Hola, uso A-LexIA (plan ${actual}) y quisiera pasar al plan ${p.nombre} (${anual ? 'anual' : 'mensual'}: ${precio}).`;
}

function TarjetaDePlanDeCatalogo({
  plan: p,
  anual,
  actual,
  enlace,
}: {
  plan: PlanDeCatalogo;
  anual: boolean;
  actual: boolean;
  enlace: string;
}) {
  return (
    <Card
      className={cn(
        'relative flex flex-col p-5',
        actual && 'border-brand-500 ring-2 ring-brand-500/20',
        !actual && p.recomendado && 'border-violet-300 dark:border-violet-800',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{p.tipo}</p>
          <h3 className="text-lg font-semibold">{p.nombre}</h3>
        </div>
        {actual ? (
          <Badge variant="default">Tu plan</Badge>
        ) : p.recomendado ? (
          <Badge className="border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">Recomendado</Badge>
        ) : null}
      </div>
      <p className="mt-2">
        {p.desde && <span className="text-xs text-muted-foreground">Desde </span>}
        <span className="text-2xl font-bold tabular-nums">S/ {n(anual ? precioAnual(p) : p.precioMensual)}</span>
        <span className="text-xs text-muted-foreground">{anual ? ' por 12 meses' : ' al mes'}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {n(p.creditosMes)} créditos al mes · {p.usuarios === 1 ? '1 usuario' : `hasta ${p.usuarios} usuarios`}
      </p>
      <ul className="mt-3 flex-1 space-y-1.5 text-xs">
        {p.caracteristicas.map((c) => (
          <li key={c} className="flex items-start gap-1.5">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="text-muted-foreground">{c}</span>
          </li>
        ))}
      </ul>
      <Button asChild variant={actual ? 'outline' : 'default'} size="sm" className="mt-4">
        <a href={enlace} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-4 w-4" />
          {p.desde ? 'Cotizar por WhatsApp' : actual ? 'Renovar por WhatsApp' : 'Pedir por WhatsApp'}
        </a>
      </Button>
    </Card>
  );
}

function Dato({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-white/60 p-3 dark:bg-background/40">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{rotulo}</p>
      <p className="mt-0.5 text-sm font-semibold">{valor}</p>
    </div>
  );
}

// ── Equipo ─────────────────────────────────────────────────────────────

type Equipo = NonNullable<ResumenDeCuenta['equipo']>;

function GestionDeEquipo({ equipo, userId, alCambiar }: { equipo: Equipo; userId: string; alCambiar: () => Promise<void> }) {
  const propietario = equipo.rol === 'propietario';
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(equipo.nombre);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [nuevoEnlace, setNuevoEnlace] = useState<string | null>(null);
  const lleno = equipo.miembros.length >= equipo.maxUsuarios;
  const enlaceDe = (token: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/equipo/unirse?token=${token}`;

  async function pedir(clave: string, url: string, init: RequestInit, exito?: string) {
    setOcupado(clave);
    try {
      const res = await fetch(url, init);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || j?.error || 'No se pudo completar');
      if (exito) toast.success(exito);
      return j;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setOcupado(null);
    }
  }

  async function guardarNombre() {
    if (nombre.trim().length < 2) return;
    const ok = await pedir(
      'nombre',
      '/api/equipo',
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nombre.trim() }) },
      'Nombre del equipo actualizado',
    );
    if (ok) {
      setEditando(false);
      await alCambiar();
    }
  }

  async function invitar() {
    const j = await pedir('invitar', '/api/equipo/invitaciones', { method: 'POST' });
    if (j?.enlace) {
      setNuevoEnlace(j.enlace as string);
      await alCambiar();
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar: selecciónalo y cópialo a mano');
    }
  }

  const compartir = (enlace: string) =>
    `https://wa.me/?text=${encodeURIComponent(`Te invito a nuestro equipo «${equipo.nombre}» en A-LexIA. Entra con tu cuenta desde este enlace: ${enlace}`)}`;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600">Tu equipo</p>
          {editando ? (
            <form
              className="mt-1 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void guardarNombre();
              }}
            >
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} autoFocus className="h-9 max-w-xs" aria-label="Nombre del equipo" />
              <Button type="submit" size="sm" loading={ocupado === 'nombre'}>
                Guardar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => (setEditando(false), setNombre(equipo.nombre))}>
                Cancelar
              </Button>
            </form>
          ) : (
            <h2 className="mt-0.5 flex items-center gap-2 text-lg font-semibold">
              {equipo.nombre}
              {propietario && (
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Cambiar el nombre del equipo"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </h2>
          )}
          <p className="text-xs text-muted-foreground">
            {equipo.miembros.length} de {equipo.maxUsuarios} usuarios · la bolsa de créditos es compartida
          </p>
        </div>
        {propietario && (
          <Button onClick={invitar} loading={ocupado === 'invitar'} disabled={lleno} size="sm">
            <Plus className="h-4 w-4" />
            Generar enlace de invitación
          </Button>
        )}
      </div>
      {propietario && lleno && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          El equipo ya tiene todos sus usuarios. Para sumar más, escríbenos por WhatsApp y ampliamos tu plan.
        </p>
      )}

      {nuevoEnlace && (
        <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50/60 p-3 dark:border-brand-800 dark:bg-brand-950/30">
          <p className="text-xs font-medium">Enlace nuevo: vale 14 días y para una sola persona.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1.5 text-[11px]">{nuevoEnlace}</code>
            <Button size="sm" variant="outline" onClick={() => void copiar(nuevoEnlace)}>
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={compartir(nuevoEnlace)} target="_blank" rel="noopener noreferrer">
                <Share2 className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      )}

      <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
        {equipo.miembros.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {m.nombre}
                {m.user_id === userId && <span className="font-normal text-muted-foreground"> (tú)</span>}
              </p>
              {m.email && m.email !== m.nombre && <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={m.rol === 'propietario' ? 'default' : 'secondary'}>{m.rol === 'propietario' ? 'Propietario' : 'Miembro'}</Badge>
              {propietario && m.rol !== 'propietario' && (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={ocupado === `quitar-${m.user_id}`}
                  onClick={async () => {
                    if (!confirm(`¿Quitar a ${m.nombre} del equipo? Dejará de usar la bolsa compartida.`)) return;
                    const ok = await pedir(`quitar-${m.user_id}`, `/api/equipo/miembros?user=${m.user_id}`, { method: 'DELETE' }, 'Miembro quitado');
                    if (ok) await alCambiar();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {propietario && equipo.invitaciones.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold">Invitaciones pendientes</p>
          <ul className="mt-2 space-y-2">
            {equipo.invitaciones.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                <span className="text-muted-foreground">Vence el {fecha(i.expira_at)}</span>
                <span className="ml-auto flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => void copiar(enlaceDe(i.token))}>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar enlace
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={ocupado === `revocar-${i.id}`}
                    onClick={async () => {
                      if (!confirm('¿Revocar esta invitación? El enlace dejará de funcionar.')) return;
                      const ok = await pedir(`revocar-${i.id}`, `/api/equipo/invitaciones?id=${i.id}`, { method: 'DELETE' }, 'Invitación revocada');
                      if (ok) {
                        if (nuevoEnlace?.endsWith(i.token)) setNuevoEnlace(null);
                        await alCambiar();
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revocar
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!propietario && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Usas los créditos del equipo. Si sales, vuelves a tu plan individual.
          </p>
          <Button
            size="sm"
            variant="outline"
            loading={ocupado === 'salir'}
            onClick={async () => {
              if (!confirm(`¿Salir del equipo «${equipo.nombre}»? Dejarás de usar su bolsa de créditos.`)) return;
              const ok = await pedir('salir', '/api/equipo/miembros', { method: 'DELETE' }, 'Saliste del equipo');
              // El plan y la tarjeta lateral cambian enteros: se recarga.
              if (ok) window.location.reload();
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir del equipo
          </Button>
        </div>
      )}
      <p className="mt-4 text-[11px] text-muted-foreground">
        ¿Necesitas más usuarios o créditos?{' '}
        <Link href="#cambiar-de-plan" className="text-brand-600 hover:underline dark:text-brand-400">
          Escríbenos
        </Link>
        .
      </p>
    </Card>
  );
}
