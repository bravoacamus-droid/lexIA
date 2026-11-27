'use client';

/**
 * Panel de usuarios (/admin/usuarios): crear cuentas con correo y
 * contraseña, darles rol y herramientas, suspenderlas y restablecer su
 * contraseña (reunión con César, 27/11/2026).
 *
 * El plan de una cuenta existente se cambia en /admin/planes; aquí solo se
 * elige al crearla. Todo pasa por /api/admin/usuarios, que comprueba el
 * permiso «usuarios» y registra cada acción.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Ban,
  Check,
  Copy,
  KeyRound,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PLANES, planDelCatalogo, type IdDePlan } from '@/lib/billing/catalogo';
import { COSTO, HERRAMIENTAS_DEL_PLAN, NOMBRE_HERRAMIENTA, type Herramienta } from '@/lib/billing/creditos';
import { DESCRIPCION_ROL, NOMBRE_ROL, ROLES, type Rol } from '@/lib/auth/permisos';
import type { UsuarioDelPanel } from '@/lib/usuarios/gestion';

type Perfil = 'entity' | 'provider' | 'consultant';
interface Equipo {
  id: string;
  nombre: string;
  maxUsuarios: number;
  miembros: number;
}
interface Yo {
  id: string;
  rol: Rol;
  rolesAsignables: Rol[];
}

const HERRAMIENTAS = Object.keys(COSTO) as Herramienta[];
const NOMBRE_PERFIL: Record<Perfil, string> = { entity: 'Entidad pública', provider: 'Proveedor', consultant: 'Consultor' };
const SELECT =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

async function pedir<T = Record<string, unknown>>(url: string, metodo: string, cuerpo?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const j = (await res.json().catch(() => ({}))) as T & { message?: string; error?: string };
  if (!res.ok) throw Object.assign(new Error(j?.message || j?.error || 'No se pudo completar'), { datos: j });
  return j;
}

function insigniaDeRol(rol: Rol) {
  const variante = rol === 'superadmin' ? 'danger' : rol === 'administrador' ? 'warning' : rol === 'usuario' ? 'secondary' : 'default';
  return (
    <Badge variant={variante} className="text-[10px]">
      {rol !== 'usuario' && <ShieldCheck className="h-2.5 w-2.5" />}
      {NOMBRE_ROL[rol]}
    </Badge>
  );
}

/** Texto para mandar por WhatsApp con los datos de ingreso. */
function mensajeDeAcceso(email: string, clave: string) {
  const sitio = typeof window !== 'undefined' ? window.location.origin : '';
  return `Hola, ya tienes tu cuenta de A-LexIA.\n\nIngresa en ${sitio}/login\nCorreo: ${email}\nContraseña temporal: ${clave}\n\nAl entrar te pedirá crear tu propia contraseña.`;
}

function ClaveEntregada({ email, clave, onCerrar }: { email: string; clave: string; onCerrar: () => void }) {
  const [copiado, setCopiado] = useState<'clave' | 'mensaje' | null>(null);
  async function copiar(que: 'clave' | 'mensaje') {
    await navigator.clipboard.writeText(que === 'clave' ? clave : mensajeDeAcceso(email, clave));
    setCopiado(que);
    setTimeout(() => setCopiado(null), 1800);
  }
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
          Cópiala ahora: no se vuelve a mostrar.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{email}</p>
        <p className="mt-1 select-all font-mono text-xl font-semibold tracking-wider">{clave}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => copiar('clave')}>
          {copiado === 'clave' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copiar contraseña
        </Button>
        <Button size="sm" onClick={() => copiar('mensaje')}>
          {copiado === 'mensaje' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copiar mensaje para WhatsApp
        </Button>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCerrar}>
          Listo
        </Button>
      </DialogFooter>
    </div>
  );
}

/** Herramientas por cuenta: según el plan, habilitada aparte o quitada. */
function AjusteDeHerramientas({
  plan,
  extra,
  quitadas,
  onChange,
}: {
  plan: IdDePlan | null;
  extra: Herramienta[];
  quitadas: Herramienta[];
  onChange: (extra: Herramienta[], quitadas: Herramienta[]) => void;
}) {
  const delPlan = plan ? HERRAMIENTAS_DEL_PLAN[plan] : [];
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {HERRAMIENTAS.map((h) => {
        const incluida = delPlan.includes(h);
        const estado: 'plan' | 'extra' | 'quitada' = extra.includes(h) ? 'extra' : quitadas.includes(h) ? 'quitada' : 'plan';
        const activa = estado === 'extra' || (incluida && estado !== 'quitada');
        const poner = (nuevo: 'plan' | 'extra' | 'quitada') =>
          onChange(
            nuevo === 'extra' ? Array.from(new Set([...extra, h])) : extra.filter((x) => x !== h),
            nuevo === 'quitada' ? Array.from(new Set([...quitadas, h])) : quitadas.filter((x) => x !== h),
          );
        return (
          <div key={h} className="flex items-center gap-3 px-3 py-2">
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', activa ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700')}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{NOMBRE_HERRAMIENTA[h]}</p>
              <p className="text-[11px] text-muted-foreground">
                {incluida ? 'Incluida en su plan' : 'Fuera de su plan'} · {COSTO[h]} crédito(s)
              </p>
            </div>
            {incluida ? (
              <Button
                type="button"
                variant={estado === 'quitada' ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => poner(estado === 'quitada' ? 'plan' : 'quitada')}
              >
                {estado === 'quitada' ? 'Devolver' : 'Quitar'}
              </Button>
            ) : (
              <Button
                type="button"
                variant={estado === 'extra' ? 'default' : 'outline'}
                size="sm"
                onClick={() => poner(estado === 'extra' ? 'plan' : 'extra')}
              >
                {estado === 'extra' ? 'Habilitada' : 'Habilitar'}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Crear cuenta ─────────────────────────────────────────────────────

function NuevaCuenta({
  abierto,
  onCerrar,
  yo,
  equipos,
  onCreada,
}: {
  abierto: boolean;
  onCerrar: () => void;
  yo: Yo;
  equipos: Equipo[];
  onCreada: () => void;
}) {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [organizacion, setOrganizacion] = useState('');
  const [cargo, setCargo] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('entity');
  const [rol, setRol] = useState<Rol>('usuario');
  const [acceso, setAcceso] = useState<'plan' | 'equipo'>('plan');
  const [plan, setPlan] = useState<IdDePlan>('consulta');
  const [meses, setMeses] = useState<string>('1');
  const [creditos, setCreditos] = useState('');
  const [equipoId, setEquipoId] = useState('');
  const [extra, setExtra] = useState<Herramienta[]>([]);
  const [quitadas, setQuitadas] = useState<Herramienta[]>([]);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entregada, setEntregada] = useState<{ email: string; clave: string } | null>(null);

  function limpiar() {
    setEmail('');
    setNombre('');
    setOrganizacion('');
    setCargo('');
    setPerfil('entity');
    setRol('usuario');
    setAcceso('plan');
    setPlan('consulta');
    setMeses('1');
    setCreditos('');
    setEquipoId('');
    setExtra([]);
    setQuitadas([]);
    setNota('');
    setError(null);
    setEntregada(null);
  }

  const equipoElegido = equipos.find((e) => e.id === equipoId);
  const cat = planDelCatalogo(plan);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const r = await pedir<{ email: string; claveTemporal: string | null }>('/api/admin/usuarios', 'POST', {
        email,
        nombre,
        organizacion: organizacion || undefined,
        cargo: cargo || undefined,
        perfil,
        rol,
        herramientasExtra: extra,
        herramientasQuitadas: quitadas,
        nota: nota || undefined,
        ...(acceso === 'equipo'
          ? { equipoId }
          : {
              plan: {
                id: plan,
                meses: meses === 'sin' ? null : Number(meses),
                ...(creditos ? { creditosMes: Number(creditos) } : {}),
                ...(cat.empresas ? { nombreEquipo: organizacion || undefined } : {}),
              },
            }),
      });
      onCreada();
      toast.success('Cuenta creada');
      if (r.claveTemporal) setEntregada({ email: r.email, clave: r.claveTemporal });
      else {
        limpiar();
        onCerrar();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(o) => {
        if (!o) {
          limpiar();
          onCerrar();
        }
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entregada ? 'Cuenta creada' : 'Nueva cuenta'}</DialogTitle>
          <DialogDescription>
            {entregada
              ? 'Envíale estos datos. Al entrar, creará su propia contraseña.'
              : 'Queda lista para entrar con correo y contraseña. La contraseña temporal se genera sola.'}
          </DialogDescription>
        </DialogHeader>

        {entregada ? (
          <ClaveEntregada
            email={entregada.email}
            clave={entregada.clave}
            onCerrar={() => {
              limpiar();
              onCerrar();
            }}
          />
        ) : (
          <form onSubmit={crear} className="space-y-5">
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datos</legend>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nc-email">Correo *</Label>
                <Input id="nc-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-nombre">Nombre completo *</Label>
                <Input id="nc-nombre" required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-perfil">Perfil</Label>
                <select id="nc-perfil" className={SELECT} value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
                  {(Object.keys(NOMBRE_PERFIL) as Perfil[]).map((p) => (
                    <option key={p} value={p}>
                      {NOMBRE_PERFIL[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-org">Entidad o empresa</Label>
                <Input id="nc-org" value={organizacion} onChange={(e) => setOrganizacion(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-cargo">Cargo</Label>
                <Input id="nc-cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} />
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rol</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {yo.rolesAsignables.map((r) => (
                  <label
                    key={r}
                    className={cn(
                      'flex cursor-pointer gap-2 rounded-lg border p-3 text-sm',
                      rol === r ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-border',
                    )}
                  >
                    <input type="radio" name="nc-rol" value={r} checked={rol === r} onChange={() => setRol(r)} className="mt-0.5" />
                    <span>
                      <span className="font-medium">{NOMBRE_ROL[r]}</span>
                      <span className="block text-[11px] text-muted-foreground">{DESCRIPCION_ROL[r]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan</legend>
              <div className="flex gap-2" role="radiogroup" aria-label="Cómo usa la plataforma">
                <Button type="button" size="sm" variant={acceso === 'plan' ? 'default' : 'outline'} onClick={() => setAcceso('plan')}>
                  Plan propio
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={acceso === 'equipo' ? 'default' : 'outline'}
                  onClick={() => setAcceso('equipo')}
                  disabled={equipos.length === 0}
                >
                  Miembro de un equipo
                </Button>
              </div>
              {acceso === 'plan' ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nc-plan">Plan</Label>
                    <select id="nc-plan" className={SELECT} value={plan} onChange={(e) => setPlan(e.target.value as IdDePlan)}>
                      {PLANES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nc-meses">Vigencia</Label>
                    <select
                      id="nc-meses"
                      className={SELECT}
                      value={meses}
                      onChange={(e) => setMeses(e.target.value)}
                      disabled={plan === 'prueba'}
                    >
                      <option value="1">1 mes</option>
                      <option value="3">3 meses</option>
                      <option value="6">6 meses</option>
                      <option value="12">12 meses</option>
                      <option value="sin">Sin vencimiento</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nc-creditos">Créditos al mes</Label>
                    <Input
                      id="nc-creditos"
                      type="number"
                      min={0}
                      max={1000000}
                      placeholder={String(plan === 'prueba' ? 20 : cat.creditosMes)}
                      value={creditos}
                      onChange={(e) => setCreditos(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="nc-equipo">Equipo</Label>
                  <select id="nc-equipo" className={SELECT} value={equipoId} onChange={(e) => setEquipoId(e.target.value)} required>
                    <option value="">Elige un equipo…</option>
                    {equipos.map((e) => (
                      <option key={e.id} value={e.id} disabled={e.miembros >= e.maxUsuarios}>
                        {e.nombre} · {e.miembros}/{e.maxUsuarios} usuarios{e.miembros >= e.maxUsuarios ? ' (lleno)' : ''}
                      </option>
                    ))}
                  </select>
                  {equipoElegido && (
                    <p className="text-[11px] text-muted-foreground">Usará la bolsa de créditos y el plan de ese equipo.</p>
                  )}
                </div>
              )}
            </fieldset>

            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">Ajustar herramientas (opcional)</summary>
              <p className="my-2 text-[11px] text-muted-foreground">
                Habilita herramientas fuera del plan o quita alguna del plan. Se cobran igual en créditos.
              </p>
              <AjusteDeHerramientas
                plan={acceso === 'plan' ? plan : null}
                extra={extra}
                quitadas={quitadas}
                onChange={(e, q) => {
                  setExtra(e);
                  setQuitadas(q);
                }}
              />
            </details>

            <div className="space-y-1.5">
              <Label htmlFor="nc-nota">Nota interna</Label>
              <Textarea id="nc-nota" maxLength={500} rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: pidió por WhatsApp el 27/11, pagó por Yape." />
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando || !email || nombre.trim().length < 2 || (acceso === 'equipo' && !equipoId)} aria-busy={enviando}>
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Crear cuenta
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Gestionar una cuenta ─────────────────────────────────────────────

interface EntradaDeHistorial {
  id: number;
  accion: string;
  detalle: Record<string, unknown>;
  created_at: string;
}

const NOMBRE_ACCION: Record<string, string> = {
  crear_cuenta: 'Cuenta creada',
  cambiar_cuenta: 'Datos, rol o herramientas cambiados',
  restablecer_clave: 'Contraseña restablecida',
  suspender: 'Cuenta suspendida',
  reactivar: 'Cuenta reactivada',
  cambiar_mi_clave: 'Cambió su contraseña',
};

function GestionarCuenta({
  usuario,
  yo,
  onCerrar,
  onCambio,
}: {
  usuario: UsuarioDelPanel | null;
  yo: Yo;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [organizacion, setOrganizacion] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('entity');
  const [rol, setRol] = useState<Rol>('usuario');
  const [extra, setExtra] = useState<Herramienta[]>([]);
  const [quitadas, setQuitadas] = useState<Herramienta[]>([]);
  const [nota, setNota] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [clave, setClave] = useState<string | null>(null);
  const [historial, setHistorial] = useState<EntradaDeHistorial[] | null>(null);

  useEffect(() => {
    if (!usuario) return;
    setNombre(usuario.nombre ?? '');
    setOrganizacion(usuario.organizacion ?? '');
    setPerfil(usuario.perfil ?? 'entity');
    setRol(usuario.rol);
    setExtra(usuario.herramientasExtra);
    setQuitadas(usuario.herramientasQuitadas);
    setNota(usuario.nota ?? '');
    setClave(null);
    setHistorial(null);
    pedir<{ historial: EntradaDeHistorial[] }>(`/api/admin/usuarios/${usuario.id}`, 'GET')
      .then((r) => setHistorial(r.historial))
      .catch(() => setHistorial([]));
  }, [usuario]);

  if (!usuario) return null;
  const esYo = usuario.id === yo.id;
  const intocable = usuario.rol === 'superadmin' && yo.rol !== 'superadmin';
  const rolesPosibles = Array.from(new Set([usuario.rol, ...yo.rolesAsignables])).filter((r) => ROLES.includes(r));

  async function hacer(que: string, cuerpo: Record<string, unknown>, ok: string) {
    setOcupado(que);
    try {
      const r = await pedir<{ claveTemporal?: string }>(`/api/admin/usuarios/${usuario!.id}`, 'PATCH', cuerpo);
      if (r.claveTemporal) setClave(r.claveTemporal);
      toast.success(ok);
      onCambio();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <Dialog open={!!usuario} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {usuario.nombre || usuario.email} {insigniaDeRol(usuario.rol)}
            {usuario.suspendido && <Badge variant="danger">Suspendida</Badge>}
          </DialogTitle>
          <DialogDescription>
            {usuario.email} · {usuario.plan ? planDelCatalogo(usuario.plan).nombre : 'sin plan'}
            {usuario.equipo ? ` · equipo ${usuario.equipo.nombre}` : ''}
          </DialogDescription>
        </DialogHeader>

        {intocable ? (
          <p className="text-sm text-muted-foreground">Solo un superadministrador puede modificar esta cuenta.</p>
        ) : clave ? (
          <ClaveEntregada email={usuario.email ?? ''} clave={clave} onCerrar={() => setClave(null)} />
        ) : (
          <Tabs defaultValue="acceso">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="acceso">Acceso</TabsTrigger>
              <TabsTrigger value="rol">Rol y herramientas</TabsTrigger>
              <TabsTrigger value="datos">Datos</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="acceso" className="space-y-4 pt-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] text-muted-foreground">Entra con</dt>
                  <dd>
                    {usuario.proveedores.map((p) => (p === 'email' ? 'Correo y contraseña' : p === 'google' ? 'Google' : p)).join(' · ') || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Último ingreso</dt>
                  <dd>{fecha(usuario.ultimoIngreso)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Contraseña</dt>
                  <dd>{usuario.debeCambiarClave ? 'Temporal (aún no la cambia)' : usuario.tieneClave ? 'Propia' : 'No tiene'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Créditos disponibles</dt>
                  <dd>{usuario.disponibles.toLocaleString('es-PE')}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={!!ocupado} onClick={() => hacer('clave', { accion: 'restablecer_clave' }, 'Contraseña restablecida')}>
                  {ocupado === 'clave' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {usuario.tieneClave ? 'Restablecer contraseña' : 'Darle contraseña'}
                </Button>
                {!esYo && (
                  <Button
                    variant={usuario.suspendido ? 'default' : 'outline'}
                    size="sm"
                    disabled={!!ocupado}
                    onClick={() =>
                      hacer(
                        'suspender',
                        { accion: 'suspender', suspendido: !usuario.suspendido },
                        usuario.suspendido ? 'Cuenta reactivada' : 'Cuenta suspendida',
                      )
                    }
                    className={usuario.suspendido ? '' : 'text-red-700 hover:text-red-800'}
                  >
                    {ocupado === 'suspender' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : usuario.suspendido ? (
                      <PlayCircle className="h-4 w-4" />
                    ) : (
                      <Ban className="h-4 w-4" />
                    )}
                    {usuario.suspendido ? 'Reactivar' : 'Suspender acceso'}
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/planes?buscar=${encodeURIComponent(usuario.email ?? '')}`}>Cambiar plan o recargar</Link>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Suspender impide entrar y renovar la sesión (la abierta se corta en menos de una hora). No toca su bolsa ni la de su equipo.
              </p>
            </TabsContent>

            <TabsContent value="rol" className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="gc-rol">Rol</Label>
                <select id="gc-rol" className={SELECT} value={rol} onChange={(e) => setRol(e.target.value as Rol)} disabled={esYo}>
                  {rolesPosibles.map((r) => (
                    <option key={r} value={r} disabled={!yo.rolesAsignables.includes(r)}>
                      {NOMBRE_ROL[r]}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {esYo ? 'No puedes cambiar tu propio rol.' : DESCRIPCION_ROL[rol]}
                </p>
              </div>
              <AjusteDeHerramientas
                plan={usuario.plan}
                extra={extra}
                quitadas={quitadas}
                onChange={(e, q) => {
                  setExtra(e);
                  setQuitadas(q);
                }}
              />
              <div className="space-y-1.5">
                <Label htmlFor="gc-nota">Nota interna</Label>
                <Textarea id="gc-nota" maxLength={500} rows={2} value={nota} onChange={(e) => setNota(e.target.value)} />
              </div>
              <DialogFooter>
                <Button
                  disabled={!!ocupado}
                  onClick={() =>
                    hacer(
                      'rol',
                      {
                        accion: 'cambiar',
                        ...(esYo ? {} : { rol }),
                        herramientasExtra: extra,
                        herramientasQuitadas: quitadas,
                        nota: nota || null,
                      },
                      'Cambios guardados',
                    )
                  }
                >
                  {ocupado === 'rol' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="datos" className="space-y-3 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="gc-nombre">Nombre</Label>
                <Input id="gc-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gc-org">Entidad o empresa</Label>
                <Input id="gc-org" value={organizacion} onChange={(e) => setOrganizacion(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gc-perfil">Perfil</Label>
                <select id="gc-perfil" className={SELECT} value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
                  {(Object.keys(NOMBRE_PERFIL) as Perfil[]).map((p) => (
                    <option key={p} value={p}>
                      {NOMBRE_PERFIL[p]}
                    </option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <Button
                  disabled={!!ocupado || nombre.trim().length < 2}
                  onClick={() => hacer('datos', { accion: 'cambiar', nombre, organizacion: organizacion || null, perfil }, 'Datos guardados')}
                >
                  {ocupado === 'datos' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="historial" className="pt-4">
              {historial === null ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : historial.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin acciones registradas (las anteriores a este panel no quedaron).</p>
              ) : (
                <ol className="space-y-2">
                  {historial.map((h) => (
                    <li key={h.id} className="flex justify-between gap-3 border-b border-border pb-2 text-sm last:border-0">
                      <span>{NOMBRE_ACCION[h.accion] ?? h.accion}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Panel ────────────────────────────────────────────────────────────

export function PanelDeUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioDelPanel[] | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [yo, setYo] = useState<Yo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState('');
  const [filtroRol, setFiltroRol] = useState<'todos' | 'equipo' | Rol>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'suspendidos' | 'clave_pendiente' | 'sin_ingreso'>('todos');
  const [creando, setCreando] = useState(false);
  const [elegido, setElegido] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await pedir<{ usuarios: UsuarioDelPanel[]; equipos: Equipo[]; yo: Yo }>('/api/admin/usuarios', 'GET');
      setUsuarios(r.usuarios);
      setEquipos(r.equipos);
      setYo(r.yo);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    const q = buscar
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
    return (usuarios ?? []).filter((u) => {
      if (filtroRol === 'equipo' ? u.rol === 'usuario' : filtroRol !== 'todos' && u.rol !== filtroRol) return false;
      if (filtroEstado === 'activos' && u.suspendido) return false;
      if (filtroEstado === 'suspendidos' && !u.suspendido) return false;
      if (filtroEstado === 'clave_pendiente' && !u.debeCambiarClave) return false;
      if (filtroEstado === 'sin_ingreso' && u.ultimoIngreso) return false;
      if (!q) return true;
      return [u.email, u.nombre, u.organizacion]
        .filter(Boolean)
        .some((t) =>
          t!
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .includes(q),
        );
    });
  }, [usuarios, buscar, filtroRol, filtroEstado]);

  const usuarioElegido = usuarios?.find((u) => u.id === elegido) ?? null;
  const delEquipo = (usuarios ?? []).filter((u) => u.rol !== 'usuario').length;

  return (
    <div className="container max-w-7xl space-y-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Panel
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Usuarios y roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {usuarios ? `${usuarios.length} cuentas · ${delEquipo} del equipo` : 'Cargando cuentas…'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar} aria-label="Actualizar lista">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreando(true)} disabled={!yo}>
            <UserPlus className="h-4 w-4" />
            Nueva cuenta
          </Button>
        </div>
      </header>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_200px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar por correo, nombre o entidad"
              className="pl-9"
              aria-label="Buscar cuentas"
            />
          </div>
          <select className={SELECT} value={filtroRol} onChange={(e) => setFiltroRol(e.target.value as typeof filtroRol)} aria-label="Filtrar por rol">
            <option value="todos">Todos los roles</option>
            <option value="equipo">Solo el equipo</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {NOMBRE_ROL[r]}
              </option>
            ))}
          </select>
          <select
            className={SELECT}
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
            aria-label="Filtrar por estado"
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Activas</option>
            <option value="suspendidos">Suspendidas</option>
            <option value="clave_pendiente">Con contraseña temporal</option>
            <option value="sin_ingreso">Nunca entraron</option>
          </select>
        </div>
      </Card>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Cuenta</th>
                <th className="p-3 font-medium">Rol</th>
                <th className="p-3 font-medium">Plan</th>
                <th className="p-3 font-medium">Acceso</th>
                <th className="p-3 font-medium">Último ingreso</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {usuarios === null ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Ninguna cuenta con estos filtros.
                  </td>
                </tr>
              ) : (
                visibles.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="p-3">
                      <p className="font-medium">{u.nombre || '—'}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      {u.organizacion && <p className="text-[11px] text-muted-foreground">{u.organizacion}</p>}
                    </td>
                    <td className="p-3">{insigniaDeRol(u.rol)}</td>
                    <td className="p-3">
                      {u.plan ? (
                        <>
                          <Badge variant={u.plan === 'prueba' ? 'secondary' : 'success'} className="text-[10px]">
                            {planDelCatalogo(u.plan).nombre}
                          </Badge>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {u.disponibles.toLocaleString('es-PE')} créditos
                            {u.herramientasExtra.length > 0 ? ` · +${u.herramientasExtra.length} herramienta(s)` : ''}
                            {u.herramientasQuitadas.length > 0 ? ` · −${u.herramientasQuitadas.length}` : ''}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin plan aún</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {u.suspendido && <Badge variant="danger" className="text-[10px]">Suspendida</Badge>}
                        {u.debeCambiarClave && <Badge variant="warning" className="text-[10px]">Clave temporal</Badge>}
                        {u.proveedores.includes('email') && <Badge variant="outline" className="text-[10px]">Correo</Badge>}
                        {u.proveedores.includes('google') && <Badge variant="outline" className="text-[10px]">Google</Badge>}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{u.ultimoIngreso ? fecha(u.ultimoIngreso) : 'Nunca'}</td>
                    <td className="p-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => setElegido(u.id)}>
                        Gestionar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {yo && (
        <>
          <NuevaCuenta abierto={creando} onCerrar={() => setCreando(false)} yo={yo} equipos={equipos} onCreada={cargar} />
          <GestionarCuenta usuario={usuarioElegido} yo={yo} onCerrar={() => setElegido(null)} onCambio={cargar} />
        </>
      )}
    </div>
  );
}
