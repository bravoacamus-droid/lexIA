'use client';

/**
 * Panel de planes (/admin/planes): aquí se activa lo que el cliente pide
 * por WhatsApp —un plan, una recarga— y se suspende una cuenta.
 *
 * Cada acción va a POST /api/admin/planes, que comprueba is_admin. Los
 * planes de Equipos y Organizaciones crean el equipo con el usuario como
 * propietario; los miembros entran luego con el enlace de invitación.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Ban, Coins, Crown, Loader2, PlayCircle, RefreshCw, Search, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PLANES, RECARGAS, planDelCatalogo, type IdDePlan } from '@/lib/billing/catalogo';
import type { listarCuentas } from '@/lib/billing/gestion';

type Cuenta = Awaited<ReturnType<typeof listarCuentas>>[number];

const n = (x: number) => x.toLocaleString('es-PE');
const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin vencimiento';

async function accion(cuerpo: Record<string, unknown>) {
  const res = await fetch('/api/admin/planes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.message || j?.error || 'No se pudo completar');
}

export function PanelDePlanes() {
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null);
  const [filtro, setFiltro] = useState('');
  const [asignando, setAsignando] = useState<Cuenta | null>(null);
  const [recargando, setRecargando] = useState<Cuenta | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const leer = useCallback(async () => {
    const res = await fetch('/api/admin/planes', { cache: 'no-store' });
    if (!res.ok) {
      toast.error('No se pudieron leer las cuentas');
      return;
    }
    const j = (await res.json()) as { cuentas: Cuenta[] };
    setCuentas(j.cuentas);
  }, []);

  useEffect(() => {
    void leer();
  }, [leer]);

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const lista = (cuentas ?? []).slice().sort((a, b) => +new Date(b.creado) - +new Date(a.creado));
    if (!q) return lista;
    return lista.filter((c) =>
      [c.email, c.nombre, c.organizacion, c.plan ? planDelCatalogo(c.plan).nombre : 'sin plan', c.equipo?.nombre]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(q)),
    );
  }, [cuentas, filtro]);

  const conteo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of cuentas ?? []) c[x.plan ?? 'sin'] = (c[x.plan ?? 'sin'] ?? 0) + 1;
    return c;
  }, [cuentas]);

  async function suspender(c: Cuenta) {
    const suspendido = c.estado !== 'suspendido';
    const quien = c.email ?? c.nombre ?? 'esta cuenta';
    const texto = suspendido
      ? `¿Suspender el plan de ${quien}?${c.equipo ? ` Se suspende la bolsa del equipo «${c.equipo.nombre}» para todos sus miembros.` : ''}`
      : `¿Reactivar el plan de ${quien}?`;
    if (!confirm(texto)) return;
    setOcupado(c.id);
    try {
      await accion({ accion: 'suspender', userId: c.id, suspendido });
      toast.success(suspendido ? 'Plan suspendido' : 'Plan reactivado');
      await leer();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="container max-w-7xl space-y-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Panel administrador
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Planes y créditos</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Activa los planes y las recargas que los clientes piden por WhatsApp. Equipos y Organizaciones crean el equipo con
            el usuario como propietario; él invita a los demás desde «Tu plan y créditos».
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void leer()}>
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {PLANES.map((p) => (
          <Badge key={p.id} variant="outline" className="text-[11px]">
            {p.nombre}: <span className="font-semibold tabular-nums">{conteo[p.id] ?? 0}</span>
          </Badge>
        ))}
        {(conteo.sin ?? 0) > 0 && (
          <Badge variant="secondary" className="text-[11px]">
            Sin bolsa aún: <span className="font-semibold tabular-nums">{conteo.sin}</span>
          </Badge>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por correo, nombre, organización, plan o equipo"
          className="pl-9"
          aria-label="Filtrar cuentas"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Cuenta</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Equipo</th>
                <th className="p-3 text-right">Disponibles</th>
                <th className="p-3 text-right">Recargas</th>
                <th className="p-3">Vence</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cuentas === null ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                    Ninguna cuenta coincide con «{filtro}».
                  </td>
                </tr>
              ) : (
                visibles.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/30" data-cuenta={c.email ?? c.id}>
                    <td className="max-w-[260px] p-3">
                      <p className="truncate font-medium">{c.email ?? '—'}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {c.nombre || 'Sin nombre'}
                        {c.organizacion ? ` · ${c.organizacion}` : ''}
                        {c.esAdmin ? ' · admin' : ''}
                      </p>
                    </td>
                    <td className="p-3">
                      {c.plan ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant={c.plan === 'prueba' ? 'secondary' : 'default'} className="text-[10px]">
                            {planDelCatalogo(c.plan).nombre}
                          </Badge>
                          {c.plan !== 'prueba' && c.modalidad === 'anual' && (
                            <Badge variant="outline" className="text-[10px]">
                              anual
                            </Badge>
                          )}
                          {c.estado === 'suspendido' && (
                            <Badge variant="danger" className="text-[10px]">
                              suspendido
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin bolsa</span>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {c.equipo ? (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {c.equipo.nombre}
                          <span className="text-muted-foreground">({c.equipo.rol})</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">{n(c.disponibles)}</td>
                    <td className="p-3 text-right tabular-nums">{c.recargas ? n(c.recargas) : '—'}</td>
                    <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">{c.plan ? fecha(c.venceAt) : '—'}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setAsignando(c)}>
                          <Crown className="h-3.5 w-3.5" />
                          Asignar plan
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRecargando(c)} disabled={!c.plan || c.plan === 'prueba'} title={c.plan === 'prueba' ? 'Primero asigna un plan de pago' : undefined}>
                          <Coins className="h-3.5 w-3.5" />
                          Recargar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void suspender(c)}
                          disabled={!c.plan}
                          loading={ocupado === c.id}
                          className={c.estado === 'suspendido' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}
                        >
                          {c.estado === 'suspendido' ? <PlayCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                          {c.estado === 'suspendido' ? 'Reactivar' : 'Suspender'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {asignando && (
        <DialogoAsignar
          cuenta={asignando}
          alCerrar={() => setAsignando(null)}
          alTerminar={async () => {
            setAsignando(null);
            await leer();
          }}
        />
      )}
      {recargando && (
        <DialogoRecargar
          cuenta={recargando}
          alCerrar={() => setRecargando(null)}
          alTerminar={async () => {
            setRecargando(null);
            await leer();
          }}
        />
      )}
    </div>
  );
}

const claseDeSelect =
  'mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20';

function DialogoAsignar({ cuenta, alCerrar, alTerminar }: { cuenta: Cuenta; alCerrar: () => void; alTerminar: () => Promise<void> }) {
  const [plan, setPlan] = useState<IdDePlan>(cuenta.plan && cuenta.plan !== 'prueba' ? cuenta.plan : 'profesional');
  const [modalidad, setModalidad] = useState<'mensual' | 'anual'>(cuenta.modalidad === 'anual' ? 'anual' : 'mensual');
  const [meses, setMeses] = useState(cuenta.modalidad === 'anual' ? 12 : 1);
  const [sinVencimiento, setSinVencimiento] = useState(false);
  const [creditosMes, setCreditosMes] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState(cuenta.equipo?.nombre ?? cuenta.organizacion ?? '');
  const [maxUsuarios, setMaxUsuarios] = useState('');
  const [enviando, setEnviando] = useState(false);
  const cat = planDelCatalogo(plan);
  const esMiembro = cuenta.equipo && cuenta.equipo.rol !== 'propietario';

  async function asignar() {
    setEnviando(true);
    try {
      await accion({
        accion: 'asignar',
        userId: cuenta.id,
        plan,
        modalidad,
        meses: sinVencimiento ? null : meses,
        ...(creditosMes.trim() ? { creditosMes: Number(creditosMes) } : {}),
        ...(cat.empresas
          ? {
              nombreEquipo: nombreEquipo.trim() || undefined,
              ...(maxUsuarios.trim() ? { maxUsuarios: Number(maxUsuarios) } : {}),
            }
          : {}),
      });
      toast.success(`Plan ${cat.nombre} activado para ${cuenta.email ?? 'la cuenta'}`);
      await alTerminar();
    } catch (e) {
      toast.error((e as Error).message);
      setEnviando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Asignar plan</DialogTitle>
          <DialogDescription>{cuenta.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="plan-a-asignar" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Plan
            </Label>
            <select id="plan-a-asignar" className={claseDeSelect} value={plan} onChange={(e) => setPlan(e.target.value as IdDePlan)}>
              {PLANES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.prueba ? ' (20 preguntas, 30 días)' : ` · S/ ${p.precioMensual}/mes · ${n(p.creditosMes)} créditos`}
                </option>
              ))}
            </select>
          </div>

          {plan !== 'prueba' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modalidad</Label>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary/40 p-0.5 text-sm">
                    {(['mensual', 'anual'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={modalidad === m}
                        onClick={() => {
                          setModalidad(m);
                          setMeses(m === 'anual' ? 12 : 1);
                        }}
                        className={cn('rounded-md py-1.5', modalidad === m ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground')}
                      >
                        {m === 'mensual' ? 'Mensual' : 'Anual'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="meses" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Meses pagados
                  </Label>
                  <Input
                    id="meses"
                    type="number"
                    min={1}
                    max={60}
                    value={meses}
                    disabled={sinVencimiento}
                    onChange={(e) => setMeses(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sinVencimiento} onChange={(e) => setSinVencimiento(e.target.checked)} />
                Sin vencimiento (cuentas internas o de cortesía)
              </label>
              <div>
                <Label htmlFor="creditos-mes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Créditos al mes (opcional)
                </Label>
                <Input
                  id="creditos-mes"
                  type="number"
                  min={0}
                  value={creditosMes}
                  onChange={(e) => setCreditosMes(e.target.value)}
                  placeholder={`${n(cat.creditosMes)} del catálogo`}
                  className="mt-1.5"
                />
              </div>
            </>
          )}

          {cat.empresas && (
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div>
                <Label htmlFor="nombre-equipo" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nombre del equipo
                </Label>
                <Input id="nombre-equipo" value={nombreEquipo} onChange={(e) => setNombreEquipo(e.target.value)} placeholder="Mi equipo" maxLength={120} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="max-usuarios" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Máx. usuarios
                </Label>
                <Input id="max-usuarios" type="number" min={1} max={500} value={maxUsuarios} onChange={(e) => setMaxUsuarios(e.target.value)} placeholder={String(cat.usuarios)} className="mt-1.5" />
              </div>
            </div>
          )}

          {esMiembro && (
            <p className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Es miembro del equipo «{cuenta.equipo!.nombre}» y usa su bolsa.
              {cat.empresas
                ? ' Para darle un plan de equipo propio, primero debe salir de ese equipo.'
                : ' El plan individual quedará guardado, pero no lo usará mientras siga en el equipo.'}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            {plan === 'prueba'
              ? 'Reinicia la prueba: 20 preguntas durante 30 días.'
              : `Activa ${cat.nombre} ${modalidad} con ${n(Number(creditosMes) || cat.creditosMes)} créditos al mes, ${sinVencimiento ? 'sin vencimiento' : `por ${meses} mes(es)`}. El mes de créditos empieza hoy.`}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={asignar} loading={enviando}>
            Activar plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoRecargar({ cuenta, alCerrar, alTerminar }: { cuenta: Cuenta; alCerrar: () => void; alTerminar: () => Promise<void> }) {
  const [creditos, setCreditos] = useState<number>(RECARGAS[0].creditos);
  const [libre, setLibre] = useState('');
  const [detalle, setDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const total = libre.trim() ? Math.round(Number(libre)) : creditos;
  const valido = Number.isFinite(total) && total >= 1;

  async function recargar() {
    if (!valido) return;
    setEnviando(true);
    try {
      await accion({ accion: 'recargar', userId: cuenta.id, creditos: total, ...(detalle.trim() ? { detalle: detalle.trim() } : {}) });
      toast.success(`${n(total)} créditos recargados`);
      await alTerminar();
    } catch (e) {
      toast.error((e as Error).message);
      setEnviando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recargar créditos</DialogTitle>
          <DialogDescription>
            {cuenta.email}
            {cuenta.equipo ? ` · se suman a la bolsa del equipo «${cuenta.equipo.nombre}»` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {RECARGAS.map((r) => (
              <button
                key={r.creditos}
                type="button"
                aria-pressed={!libre && creditos === r.creditos}
                onClick={() => {
                  setCreditos(r.creditos);
                  setLibre('');
                }}
                className={cn(
                  'rounded-lg border p-3 text-center transition-all',
                  !libre && creditos === r.creditos ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-border hover:border-brand-400',
                )}
              >
                <span className="block text-lg font-semibold tabular-nums">{n(r.creditos)}</span>
                <span className="text-[11px] text-muted-foreground">S/ {r.precio}</span>
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="creditos-libres" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Otra cantidad
            </Label>
            <Input id="creditos-libres" type="number" min={1} value={libre} onChange={(e) => setLibre(e.target.value)} placeholder="Ej. 50 (cortesía)" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="detalle-recarga" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Detalle (opcional)
            </Label>
            <Input id="detalle-recarga" value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Yape 17/10, operación 123456" maxLength={200} className="mt-1.5" />
          </div>
          <p className="text-xs text-muted-foreground">
            Disponibles ahora: {n(cuenta.disponibles)} · después: {n(cuenta.disponibles + (valido ? total : 0))}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={recargar} loading={enviando} disabled={!valido}>
            Recargar {valido ? n(total) : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
