import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  TrendingUp,
  MessageSquare,
  FilePen,
  FileSearch,
  ShieldCheck,
  Wrench,
  Lock,
  PhoneCall,
  Inbox,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/lib/navigation/menu-by-role';
import type { ProfileRole } from '@/lib/auth/session';
import { saludDelActualizador } from '@/lib/scraping/salud';
import { listarCuentas } from '@/lib/billing/gestion';
import { PLANES, planDelCatalogo } from '@/lib/billing/catalogo';
import { tienePermiso } from '@/lib/auth/permisos-servidor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Panel administrador' };

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const isAdmin = await tienePermiso(supabase, user.id, 'metricas');
  if (!isAdmin) {
    return (
      <div className="container max-w-2xl py-16">
        <Card className="p-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground mb-5">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="font-semibold text-3xl tracking-tight mb-2">
            Solo administradores
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            El panel administrador es para mantenimiento técnico de la
            plataforma. Pide al administrador que te dé el rol que corresponde si necesitas acceso.
          </p>
        </Card>
      </div>
    );
  }

  // El mantenimiento técnico (actualizador, voz, uso de IA) es solo del
  // superadmin; un administrador ve métricas, usuarios, planes y soporte.
  const tecnico = await tienePermiso(supabase, user.id, 'tecnico');

  // Cliente admin que bypasa RLS para leer todo
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Si el actualizador de la biblioteca falla, se ve desde aquí.
  const salud = await saludDelActualizador(admin);

  // Métricas globales (todo en paralelo)
  const [
    profilesRes,
    cuentas,
    chatRes,
    docsRes,
    evalsRes,
    usageRes,
    surveysRes,
    activeUsersRes,
    soporteRes,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'id, full_name, profile_role, organization_name, onboarding_completed, is_admin, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(100),
    // Planes con créditos (migración 0086): el plan efectivo de cada
    // usuario, el de su equipo si es de uno.
    listarCuentas(),
    admin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('role', 'user'),
    admin
      .from('generated_documents')
      .select('id', { count: 'exact', head: true })
      .not('generated_content', 'is', null),
    admin
      .from('evaluations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'done'),
    admin
      .from('feature_usage')
      .select('user_id, feature, count, period_start')
      .gte(
        'period_start',
        new Date(new Date().setMonth(new Date().getMonth() - 5))
          .toISOString()
          .slice(0, 10),
      ),
    admin.from('user_surveys').select('id', { count: 'exact', head: true }),
    admin
      .from('chat_messages')
      .select('conversation_id, created_at', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1),
    admin
      .from('soporte_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'abierto')
      .neq('user_id', user.id),
  ]);

  type Profile = {
    id: string;
    full_name: string | null;
    profile_role: ProfileRole | null;
    organization_name: string | null;
    onboarding_completed: boolean;
    is_admin: boolean;
    created_at: string;
  };

  const profiles = (profilesRes.data || []) as Profile[];
  const cuentaDe = new Map(cuentas.map((c) => [c.id, c]));

  // Stats agregadas
  const totalUsers = profiles.length;
  const completedOnboarding = profiles.filter((p) => p.onboarding_completed).length;
  const byRole: Record<string, number> = { entity: 0, provider: 0, consultant: 0 };
  for (const p of profiles) {
    if (p.profile_role) byRole[p.profile_role] = (byRole[p.profile_role] || 0) + 1;
  }
  const porPlan: Record<string, number> = {};
  let suspendidas = 0;
  let vencidas = 0;
  for (const c of cuentas) {
    porPlan[c.plan ?? 'sin'] = (porPlan[c.plan ?? 'sin'] ?? 0) + 1;
    if (c.estado === 'suspendido') suspendidas++;
    else if (c.venceAt && new Date(c.venceAt).getTime() <= Date.now()) vencidas++;
  }

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Panel administrador
          </p>
          <h1 className="font-semibold text-3xl tracking-tight">Métricas globales</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/admin/usuarios">
              <Users className="h-4 w-4" />
              Usuarios y roles
            </Link>
          </Button>
          {tecnico && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/scraping">
                <Wrench className="h-4 w-4" />
                Bot de scraping
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* Stats principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Usuarios totales"
          value={totalUsers}
          sub={`${completedOnboarding} completaron onboarding`}
          accent="brand"
        />
        <StatCard
          icon={MessageSquare}
          label="Mensajes de chat"
          value={chatRes.count || 0}
          sub="acumulado histórico"
          accent="sky"
        />
        <StatCard
          icon={FilePen}
          label="Documentos generados"
          value={docsRes.count || 0}
          sub="con contenido"
          accent="amber"
        />
        <StatCard
          icon={FileSearch}
          label="Evaluaciones completas"
          value={evalsRes.count || 0}
          sub="acumulado histórico"
          accent="emerald"
        />
      </div>

      {/* Distribución por rol + tier */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Distribución por perfil
          </h2>
          <div className="space-y-3">
            {(['entity', 'provider', 'consultant'] as const).map((r) => {
              const c = byRole[r] || 0;
              const pct = totalUsers > 0 ? Math.round((c / totalUsers) * 100) : 0;
              return (
                <div key={r}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium">{ROLE_LABELS[r]}</span>
                    <span className="text-xs text-muted-foreground">
                      {c} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm font-medium text-muted-foreground">Sin perfil aún</span>
                <span className="text-xs text-muted-foreground">
                  {totalUsers - (byRole.entity + byRole.provider + byRole.consultant)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Distribución por plan
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PLANES.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {p.nombre}
                </p>
                <p className="font-mono text-xl font-semibold tabular-nums mt-0.5">
                  {porPlan[p.id] || 0}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {(porPlan.sin ?? 0) > 0 && <Badge variant="secondary">Sin bolsa aún: {porPlan.sin}</Badge>}
            <Badge variant="warning">Vencidas: {vencidas}</Badge>
            <Badge variant="danger">Suspendidas: {suspendidas}</Badge>
            <Link href="/admin/planes" className="ml-auto text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Gestionar planes →
            </Link>
          </div>
        </Card>
      </div>

      {/* Lista de usuarios */}
      <section>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Usuarios recientes
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Últimos {profiles.length} usuarios registrados.
            </p>
          </div>
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Nombre
                  </th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Perfil
                  </th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Organización
                  </th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Plan
                  </th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Estado
                  </th>
                  <th className="text-left p-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Registrado
                  </th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => {
                  const cuenta = cuentaDe.get(p.id);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-medium flex items-center gap-1.5">
                          {p.full_name || '—'}
                          {p.is_admin && (
                            <Badge variant="default" className="text-[9px] py-0">
                              <ShieldCheck className="h-2.5 w-2.5" />
                              admin
                            </Badge>
                          )}
                        </div>
                        {!p.onboarding_completed && (
                          <p className="text-[10px] text-amber-600 mt-0.5">
                            Onboarding pendiente
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        {p.profile_role ? (
                          <Badge variant="outline" className="text-[10px]">
                            {ROLE_LABELS[p.profile_role]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 text-foreground/90">
                        {p.organization_name || (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {cuenta?.plan ? (
                          <Badge
                            variant={cuenta.plan === 'prueba' ? 'secondary' : 'success'}
                            className="text-[10px]"
                          >
                            {planDelCatalogo(cuenta.plan).nombre}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">sin bolsa</span>
                        )}
                      </td>
                      <td className="p-3">
                        {cuenta?.plan ? (
                          <Badge
                            variant={
                              cuenta.estado === 'suspendido'
                                ? 'danger'
                                : cuenta.venceAt && new Date(cuenta.venceAt).getTime() <= Date.now()
                                  ? 'warning'
                                  : 'default'
                            }
                            className="text-[10px]"
                          >
                            {cuenta.estado === 'suspendido'
                              ? 'suspendido'
                              : cuenta.venceAt && new Date(cuenta.venceAt).getTime() <= Date.now()
                                ? 'vencido'
                                : `${cuenta.disponibles.toLocaleString('es-PE')} créditos`}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(p.created_at).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Tools admin */}
      <section>
        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          Herramientas de mantenimiento
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/admin/soporte"
            className="group rounded-xl border border-border bg-card p-5 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 mb-3">
              <Inbox className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-base mb-1">Bandeja de soporte</h3>
            <p className="text-xs text-muted-foreground">
              Conversaciones del botón «Ayuda»: errores, consultas y sugerencias de los usuarios.
            </p>
            <p
              className={
                (soporteRes.count || 0) > 0
                  ? 'mt-2 text-[11.5px] font-semibold text-amber-700 dark:text-amber-400'
                  : 'mt-2 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-400'
              }
            >
              {(soporteRes.count || 0) > 0
                ? `● ${soporteRes.count} por responder`
                : '● Todo al día'}
            </p>
          </Link>
          <Link
            href="/admin/usuarios"
            className="group rounded-xl border border-border bg-card p-5 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 mb-3">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-base mb-1">Usuarios y roles</h3>
            <p className="text-xs text-muted-foreground">
              Crea cuentas con correo y contraseña, asigna roles y herramientas, suspende o restablece.
            </p>
          </Link>
          <Link
            href="/admin/planes"
            className="group rounded-xl border border-border bg-card p-5 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 mb-3">
              <Coins className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-base mb-1">Planes y créditos</h3>
            <p className="text-xs text-muted-foreground">
              Activa los planes y recargas pedidos por WhatsApp, y suspende cuentas.
            </p>
          </Link>
          <Link
            href="/admin/encuestas"
            className="group rounded-xl border border-border bg-card p-5 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 mb-3">
              <Users className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-base mb-1">Encuestas</h3>
            <p className="text-xs text-muted-foreground">
              Estadísticas por perfil y respuestas agregadas.
            </p>
          </Link>
          {tecnico && (<>
          <Link
            href="/admin/uso-ia"
            className="group rounded-xl border border-border bg-card p-5 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 mb-3">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-base mb-1">Uso de IA</h3>
            <p className="text-xs text-muted-foreground">
              Gasto de tokens por modelo, feature y usuario.
            </p>
          </Link>
          <Link
            href="/admin/scraping"
            className="group rounded-xl border border-border bg-card p-5 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 mb-3">
              <Wrench className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-base mb-1">Bot de scraping</h3>
            <p className="text-xs text-muted-foreground">
              Monitorea las fuentes oficiales y ejecuta corridas manuales.
            </p>
            <p
              className={
                salud.nivel === 'ok'
                  ? 'mt-2 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-400'
                  : salud.nivel === 'atencion'
                    ? 'mt-2 text-[11.5px] font-semibold text-amber-700 dark:text-amber-400'
                    : 'mt-2 text-[11.5px] font-semibold text-red-700 dark:text-red-400'
              }
            >
              {salud.nivel === 'ok' ? '● Funciona correctamente' : `● ${salud.avisos[0] ?? 'Necesita atención'}`}
            </p>
          </Link>
          <Link
            href="/admin/voz"
            className="group rounded-xl border border-border bg-card p-5 hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 mb-3">
              <PhoneCall className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-base mb-1">Llamadas con IA</h3>
            <p className="text-xs text-muted-foreground">
              Costo real, top usuarios, calificaciones y consentimientos de voz.
            </p>
          </Link>
          </>)}
          <Card className="p-5 bg-secondary/40">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground mb-3">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-base mb-1">Analytics avanzados</h3>
            <p className="text-xs text-muted-foreground">
              Próximamente: cohortes, retención, embudo de conversión a paid.
            </p>
          </Card>
        </div>
      </section>

      {/* Info de la sesión actual */}
      <Card className="p-4 bg-secondary/40 text-xs text-muted-foreground">
        Conectado como{' '}
        <span className="font-semibold text-foreground">{user.email}</span> ·{' '}
        Total de encuestas respondidas: {surveysRes.count || 0} · Datos en
        tiempo real desde Supabase con bypass de RLS (service_role).
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub: string;
  accent: 'brand' | 'sky' | 'amber' | 'emerald';
}) {
  const accents = {
    brand: 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400',
    sky: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400',
    amber: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
    emerald:
      'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  } as const;

  return (
    <Card className="p-5">
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${accents[accent]} mb-3`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-2xl font-semibold tabular-nums mt-0.5">
        {value.toLocaleString('es-PE')}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </Card>
  );
}
