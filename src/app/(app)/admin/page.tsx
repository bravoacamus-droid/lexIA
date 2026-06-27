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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/lib/navigation/menu-by-role';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Panel administrador' };

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: meProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = (meProfile as { is_admin?: boolean } | null)?.is_admin === true;
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
            plataforma. Pide al administrador que active{' '}
            <code className="text-foreground">is_admin = true</code> en tu
            perfil si necesitas acceso.
          </p>
        </Card>
      </div>
    );
  }

  // Cliente admin que bypasa RLS para leer todo
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Métricas globales (todo en paralelo)
  const [
    profilesRes,
    subsRes,
    chatRes,
    docsRes,
    evalsRes,
    usageRes,
    surveysRes,
    activeUsersRes,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'id, full_name, profile_role, organization_name, onboarding_completed, is_admin, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('subscriptions')
      .select('user_id, tier, status, trial_ends_at'),
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
  type Sub = {
    user_id: string;
    tier: 'free_trial' | 'starter' | 'pro' | 'enterprise';
    status: 'trialing' | 'active' | 'past_due' | 'canceled';
    trial_ends_at: string | null;
  };

  const profiles = (profilesRes.data || []) as Profile[];
  const subs = (subsRes.data || []) as Sub[];
  const subByUser = new Map(subs.map((s) => [s.user_id, s]));

  // Stats agregadas
  const totalUsers = profiles.length;
  const completedOnboarding = profiles.filter((p) => p.onboarding_completed).length;
  const byRole: Record<string, number> = { entity: 0, provider: 0, consultant: 0 };
  for (const p of profiles) {
    if (p.profile_role) byRole[p.profile_role] = (byRole[p.profile_role] || 0) + 1;
  }
  const tierCounts = { free_trial: 0, starter: 0, pro: 0, enterprise: 0 };
  const statusCounts = { trialing: 0, active: 0, past_due: 0, canceled: 0 };
  for (const s of subs) {
    tierCounts[s.tier] = (tierCounts[s.tier] || 0) + 1;
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
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
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/scraping">
            <Wrench className="h-4 w-4" />
            Bot de scraping
          </Link>
        </Button>
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
          <div className="grid grid-cols-2 gap-3">
            {(['free_trial', 'starter', 'pro', 'enterprise'] as const).map((t) => (
              <div
                key={t}
                className="rounded-lg border border-border p-3"
              >
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {t === 'free_trial' ? 'Trial' : t}
                </p>
                <p className="font-mono text-xl font-semibold tabular-nums mt-0.5">
                  {tierCounts[t] || 0}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge variant="default">Trialing: {statusCounts.trialing || 0}</Badge>
            <Badge variant="success">Activas: {statusCounts.active || 0}</Badge>
            <Badge variant="warning">Past due: {statusCounts.past_due || 0}</Badge>
            <Badge variant="secondary">Canceladas: {statusCounts.canceled || 0}</Badge>
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
                  const sub = subByUser.get(p.id);
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
                        {sub ? (
                          <Badge
                            variant={
                              sub.tier === 'pro' || sub.tier === 'enterprise'
                                ? 'success'
                                : sub.tier === 'starter'
                                  ? 'default'
                                  : 'secondary'
                            }
                            className="text-[10px]"
                          >
                            {sub.tier === 'free_trial' ? 'Trial' : sub.tier}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">sin sub</span>
                        )}
                      </td>
                      <td className="p-3">
                        {sub ? (
                          <Badge
                            variant={
                              sub.status === 'active'
                                ? 'success'
                                : sub.status === 'trialing'
                                  ? 'default'
                                  : sub.status === 'past_due'
                                    ? 'warning'
                                    : 'secondary'
                            }
                            className="text-[10px]"
                          >
                            {sub.status}
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
