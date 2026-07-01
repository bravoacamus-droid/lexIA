import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProfileEditForm } from '@/components/app/account/profile-edit-form';
import {
  Bookmark,
  MessageSquare,
  PhoneCall,
  FilePen,
  Sparkles,
  ShieldCheck,
  Building2,
  ArrowUpRight,
  Calendar,
  Star,
} from 'lucide-react';
import { ROLE_LABELS } from '@/lib/navigation/menu-by-role';
import { getTier } from '@/lib/billing/tiers';
import type { ProfileRole, SubscriptionTier, SubscriptionStatus } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Perfil' };

interface Sub {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function tierBadge(tier: SubscriptionTier, status: SubscriptionStatus) {
  if (tier === 'enterprise') {
    return (
      <Badge className="bg-gradient-to-r from-brand-500 to-violet-500 text-white border-transparent hover:from-brand-600 hover:to-violet-600">
        <Star className="h-3 w-3 fill-current" />
        Enterprise
      </Badge>
    );
  }
  if (tier === 'pro' && status === 'active') {
    return (
      <Badge className="bg-brand-600 text-white border-transparent">
        <Sparkles className="h-3 w-3" />
        Pro
      </Badge>
    );
  }
  if (status === 'trialing') {
    return <Badge variant="warning">En prueba</Badge>;
  }
  if (status === 'past_due') return <Badge variant="warning">Atrasada</Badge>;
  return <Badge variant="secondary">{getTier(tier).label}</Badge>;
}

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Cargar en paralelo profile, subscription y los contadores para KPIs
  const [profileRes, subRes, savedCount, chatCount, voiceCount, generatorCount] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(
          'full_name, profile_role, organization_name, ruc, position_title, avatar_url, is_admin, created_at',
        )
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('subscriptions')
        .select('tier, status, trial_ends_at, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('user_saved_documents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('chat_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('voice_calls')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed'),
      supabase
        .from('generated_documents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

  const profile = profileRes.data as {
    full_name: string | null;
    profile_role: ProfileRole | null;
    organization_name: string | null;
    ruc: string | null;
    position_title: string | null;
    avatar_url: string | null;
    is_admin: boolean | null;
    created_at: string;
  } | null;
  const sub = (subRes.data as Sub | null) || null;
  const role = profile?.profile_role || null;
  const tier = sub?.tier || 'free_trial';
  const tierDef = getTier(tier);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('es-PE', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const kpis = [
    {
      label: 'Guardados',
      value: savedCount.count ?? 0,
      icon: Bookmark,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      href: '/biblioteca',
    },
    {
      label: 'Conversaciones',
      value: chatCount.count ?? 0,
      icon: MessageSquare,
      color: 'text-brand-600 dark:text-brand-400',
      bg: 'bg-brand-50 dark:bg-brand-950/40',
      href: '/chat',
    },
    {
      label: 'Llamadas',
      value: voiceCount.count ?? 0,
      icon: PhoneCall,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      href: '/llamadas',
    },
    {
      label: 'Documentos',
      value: generatorCount.count ?? 0,
      icon: FilePen,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      href: '/generador',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header con identidad + rol + badge de plan */}
      <Card className="p-6 bg-gradient-to-br from-card via-card to-brand-50/30 dark:to-brand-950/20 border-brand-500/20">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-500/20">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                (profile?.full_name?.[0] || user.email?.[0] || '·').toUpperCase()
              )}
            </div>
            {profile?.is_admin && (
              <div
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-brand-600 border-2 border-background flex items-center justify-center"
                title="Administrador"
              >
                <ShieldCheck className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {profile?.full_name || user.email}
              </h1>
              {tierBadge(tier, sub?.status || 'trialing')}
              {profile?.is_admin && (
                <Badge variant="outline" className="border-brand-500/40 text-brand-700 dark:text-brand-400">
                  <ShieldCheck className="h-3 w-3" />
                  Admin
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {user.email}
              {role && (
                <>
                  <span className="opacity-50 mx-1.5">·</span>
                  <span className="font-medium">{ROLE_LABELS[role]}</span>
                </>
              )}
            </p>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              {profile?.organization_name && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {profile.organization_name}
                </span>
              )}
              {memberSince && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Miembro desde {memberSince}
                </span>
              )}
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
            <Button asChild variant="outline" size="sm">
              <Link href="/cuenta/suscripcion">
                Ver mi plan
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              href={k.href}
              className="group rounded-xl border border-border bg-card p-4 hover:border-brand-400 hover:shadow-sm hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${k.bg} ${k.color}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{k.value}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">
                {k.label}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Mi plan resumen */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600 mb-0.5">
              Mi plan
            </p>
            <h2 className="text-lg font-semibold">{tierDef.label}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{tierDef.tagline}</p>
          </div>
          {sub && (
            <div className="text-right text-xs text-muted-foreground shrink-0">
              {sub.status === 'trialing' && sub.trial_ends_at && (
                <>
                  <p className="font-medium text-foreground">Prueba activa</p>
                  <p>Vence el {fmtDate(sub.trial_ends_at)}</p>
                </>
              )}
              {sub.status === 'active' && sub.current_period_end && (
                <>
                  <p className="font-medium text-foreground">Renovación</p>
                  <p>{fmtDate(sub.current_period_end)}</p>
                </>
              )}
              {sub.status === 'past_due' && (
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Vencida — regulariza el pago
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1">
          {tierDef.highlights.slice(0, 6).map((h: string) => (
            <p key={h} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span className="text-brand-500 mt-0.5">✓</span>
              <span>{h}</span>
            </p>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            {tier === 'enterprise'
              ? 'Tienes acceso completo. Gracias por confiar en LexIA.'
              : tier === 'pro'
                ? 'Puedes cambiar tu plan cuando quieras.'
                : 'Explora todas las funciones activando tu prueba o pasando a Pro.'}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/cuenta/suscripcion">
                Detalles de mi plan
              </Link>
            </Button>
            {tier !== 'enterprise' && (
              <Button asChild size="sm" variant="glow">
                <Link href="/pricing">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {tier === 'free_trial' ? 'Elegir un plan' : 'Mejorar'}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Formulario de perfil */}
      <Card className="p-6">
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600 mb-0.5">
            Datos personales
          </p>
          <h2 className="text-base font-semibold">Editar tu información</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Estos datos aparecen en tus documentos generados y ayudan a que LexIA
            ajuste el tono de sus respuestas a tu perfil.
          </p>
        </div>
        <ProfileEditForm
          initial={{
            full_name: profile?.full_name || '',
            organization_name: profile?.organization_name || '',
            ruc: profile?.ruc || '',
            position_title: profile?.position_title || '',
            profile_role: role,
          }}
        />
      </Card>
    </div>
  );
}
