import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowUpRight,
  Check,
  Clock,
  FileText,
  MessageSquare,
  Scale,
  Sparkles,
  Rocket,
  Sun,
  TrendingUp,
  AlertTriangle,
  Info,
  BookOpen,
  Mic,
} from 'lucide-react';
import { TIERS, getTier, type FeatureKey } from '@/lib/billing/tiers';
import { getMonthlyUsage } from '@/lib/billing/feature-gate';
import type { SubscriptionTier, SubscriptionStatus } from '@/lib/auth/session';
import {
  GiftIllustration,
  TargetIllustration,
  RocketIllustration,
} from '@/components/app/cuenta/illustrations';
import { UsageRing } from '@/components/app/cuenta/usage-ring';
import { formatRelative } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tu plan y consumo' };

interface Sub {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  last_payment_at: string | null;
  created_at: string;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function daysBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function statusBadge(status: SubscriptionStatus) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="success" className="gap-1">
          <Check className="h-3 w-3" /> Activa
        </Badge>
      );
    case 'trialing':
      return (
        <Badge variant="default" className="gap-1">
          <Sparkles className="h-3 w-3" /> En prueba
        </Badge>
      );
    case 'past_due':
      return (
        <Badge variant="warning" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Atrasada
        </Badge>
      );
    case 'canceled':
      return <Badge variant="secondary">Cancelada</Badge>;
  }
}

export default async function SubscriptionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // ─── Datos base ────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  ).toISOString();
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  const [
    subRes,
    usageThisMonth,
    genThisMonth,
    genPrevMonth,
    chatThisMonth,
    chatPrevMonth,
    evalThisMonth,
    evalPrevMonth,
    savedThisMonth,
    savedPrevMonth,
    recentChatRes,
    recentGenRes,
    recentEvalRes,
    recentSavedRes,
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select(
        'id, user_id, tier, status, trial_ends_at, current_period_start, current_period_end, last_payment_at, created_at',
      )
      .eq('user_id', user.id)
      .maybeSingle(),
    getMonthlyUsage(user.id),
    supabase
      .from('generated_documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart),
    supabase
      .from('generated_documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', prevMonthStart)
      .lt('created_at', prevMonthEnd),
    supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('created_at', monthStart),
    supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('created_at', prevMonthStart)
      .lt('created_at', prevMonthEnd),
    supabase
      .from('evaluations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart),
    supabase
      .from('evaluations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', prevMonthStart)
      .lt('created_at', prevMonthEnd),
    supabase
      .from('user_saved_documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart),
    supabase
      .from('user_saved_documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', prevMonthStart)
      .lt('created_at', prevMonthEnd),
    // Actividad reciente — 4 tipos, luego se mezclan
    supabase
      .from('chat_conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(4),
    supabase
      .from('generated_documents')
      .select('id, title, document_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('evaluations')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('user_saved_documents')
      .select('id, document_id, created_at, normative_documents(type, number)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  const sub = (subRes.data as Sub | null) || null;
  const tier: SubscriptionTier = sub?.tier || 'free_trial';
  const tierDef = getTier(tier);

  // ─── Métricas de "valor generado" ──────────────────────────────
  // Aproximación: horas ahorradas = generaciones*2h + evaluaciones*4h + chat*0.05h
  const gen = genThisMonth.count || 0;
  const chat = chatThisMonth.count || 0;
  const evl = evalThisMonth.count || 0;
  const saved = savedThisMonth.count || 0;
  const hoursSaved = Math.round(gen * 2 + evl * 4 + chat * 0.05);

  const genPrev = genPrevMonth.count || 0;
  const chatPrev = chatPrevMonth.count || 0;
  const evlPrev = evalPrevMonth.count || 0;
  const savedPrev = savedPrevMonth.count || 0;
  const hoursSavedPrev = Math.round(genPrev * 2 + evlPrev * 4 + chatPrev * 0.05);

  const trend = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // ─── Consumo por feature ───────────────────────────────────────
  const consumo: Array<{
    key: FeatureKey;
    label: string;
    icon: React.ReactNode;
    used: number;
    limit: number;
    accent: string;
  }> = [
    {
      key: 'chat_message',
      label: 'Chat con LexIA',
      icon: <MessageSquare className="h-4 w-4" />,
      used: usageThisMonth.chat_message,
      limit: tierDef.quotas.chat_message,
      accent: 'from-brand-500 to-brand-600',
    },
    {
      key: 'generator_call',
      label: 'Generaciones de documentos',
      icon: <FileText className="h-4 w-4" />,
      used: usageThisMonth.generator_call,
      limit: tierDef.quotas.generator_call,
      accent: 'from-violet-500 to-purple-600',
    },
    {
      key: 'evaluation_run',
      label: 'Evaluaciones de ofertas',
      icon: <Scale className="h-4 w-4" />,
      used: usageThisMonth.evaluation_run,
      limit: tierDef.quotas.evaluation_run,
      accent: 'from-amber-500 to-orange-600',
    },
    {
      key: 'voice_call_minute',
      label: 'Minutos de voz',
      icon: <Mic className="h-4 w-4" />,
      used: usageThisMonth.voice_call_minute,
      limit: tierDef.quotas.voice_call_minute,
      accent: 'from-emerald-500 to-teal-600',
    },
  ];

  const usoTotal = (() => {
    const rows = consumo.filter((c) => Number.isFinite(c.limit) && c.limit > 0);
    if (rows.length === 0) return 0;
    const avg =
      rows.reduce((acc, c) => acc + Math.min(100, (c.used / c.limit) * 100), 0) /
      rows.length;
    return Math.round(avg);
  })();

  // ─── Días de prueba restantes ──────────────────────────────────
  const trialDaysLeft =
    sub?.status === 'trialing' && sub.trial_ends_at
      ? daysBetween(now.toISOString(), sub.trial_ends_at)
      : 0;

  // ─── Actividad reciente combinada ──────────────────────────────
  type ActivityItem = {
    id: string;
    kind: 'chat' | 'generator' | 'evaluation' | 'library';
    title: string;
    ts: string;
  };
  const activity: ActivityItem[] = [
    ...((recentChatRes.data || []) as Array<{
      id: string;
      title: string | null;
      updated_at: string;
    }>).map(
      (c): ActivityItem => ({
        id: `chat-${c.id}`,
        kind: 'chat',
        title: c.title || 'Conversación con LexIA',
        ts: c.updated_at,
      }),
    ),
    ...((recentGenRes.data || []) as Array<{
      id: string;
      title: string | null;
      created_at: string;
    }>).map(
      (g): ActivityItem => ({
        id: `gen-${g.id}`,
        kind: 'generator',
        title: g.title || 'Documento generado',
        ts: g.created_at,
      }),
    ),
    ...((recentEvalRes.data || []) as Array<{
      id: string;
      title: string | null;
      created_at: string;
    }>).map(
      (e): ActivityItem => ({
        id: `eval-${e.id}`,
        kind: 'evaluation',
        title: e.title || 'Evaluación de oferta',
        ts: e.created_at,
      }),
    ),
    ...((recentSavedRes.data || []) as unknown as Array<{
      id: string;
      created_at: string;
      normative_documents:
        | { type: string; number: string | null }
        | Array<{ type: string; number: string | null }>
        | null;
    }>).map((s): ActivityItem => {
      const nd = Array.isArray(s.normative_documents)
        ? s.normative_documents[0]
        : s.normative_documents;
      return {
        id: `saved-${s.id}`,
        kind: 'library',
        title: nd
          ? `${nd.type.toUpperCase()} ${nd.number || ''}`.trim()
          : 'Documento guardado',
        ts: s.created_at,
      };
    }),
  ]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 5);

  const activityIcon = (kind: ActivityItem['kind']) => {
    switch (kind) {
      case 'chat':
        return { icon: <MessageSquare className="h-3.5 w-3.5" />, bg: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300' };
      case 'generator':
        return { icon: <FileText className="h-3.5 w-3.5" />, bg: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' };
      case 'evaluation':
        return { icon: <Scale className="h-3.5 w-3.5" />, bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' };
      case 'library':
        return { icon: <BookOpen className="h-3.5 w-3.5" />, bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' };
    }
  };

  const recommendedTip = (() => {
    const overCap = consumo.find(
      (c) => Number.isFinite(c.limit) && c.limit > 0 && c.used / c.limit >= 0.9,
    );
    if (overCap) {
      return `Estás alcanzando el límite en ${overCap.label}. Actualiza tu plan para no interrumpir tu flujo de trabajo.`;
    }
    if (tier === 'free_trial' && trialDaysLeft <= 7) {
      return `Tu prueba termina en ${trialDaysLeft} día${trialDaysLeft === 1 ? '' : 's'}. Elige un plan para conservar tu historial y seguir usando LexIA.`;
    }
    if (tier === 'starter' && gen >= 10) {
      return 'Estás usando mucho el generador de documentos. En Pro tienes 80 generaciones al mes + evaluador ampliado.';
    }
    return 'Explora los generadores de Preparatorias — te ahorran horas al armar EETT/TDR con sustento normativo automático.';
  })();

  // ─── Todos los planes disponibles (para el switcher inferior) ───
  const upgradeTier = TIERS.find(
    (t) => t.recommended && t.id !== tier,
  ) || TIERS.find((t) => t.id === 'pro');

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══════════════════════════════════════════════ */}
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
          Mi cuenta
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">Tu plan y consumo</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Administra tu suscripción, revisa tu consumo y descubre el valor que
          generas con LexIA.
        </p>
      </header>

      {/* ═══ Hero: PLAN ACTUAL + VALOR GENERADO ═════════════════════ */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Plan actual con ilustración */}
        <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-brand-50/70 via-violet-50/50 to-white dark:from-brand-950/40 dark:via-violet-950/30 dark:to-background border-brand-100 dark:border-brand-900">
          <div className="flex items-start gap-5">
            <div className="flex-1 min-w-0 relative z-10">
              <Badge variant="outline" className="mb-3 border-brand-300 bg-white/60 text-brand-700 dark:text-brand-300 dark:bg-brand-950/60 dark:border-brand-800">
                Plan actual
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight">{tierDef.label}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2 mb-2">
                {sub && statusBadge(sub.status)}
                {sub?.status === 'trialing' && trialDaysLeft > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {trialDaysLeft} día{trialDaysLeft === 1 ? '' : 's'} restantes
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                {tierDef.tagline}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <MiniDate
                  label="Inició el"
                  value={fmtDate(
                    sub?.status === 'trialing'
                      ? sub.created_at
                      : sub?.current_period_start || sub?.created_at || null,
                  )}
                />
                <MiniDate
                  label={
                    sub?.status === 'trialing' ? 'Termina el' : 'Próximo cobro'
                  }
                  value={fmtDate(
                    sub?.status === 'trialing'
                      ? sub.trial_ends_at
                      : sub?.current_period_end || null,
                  )}
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {tier !== 'enterprise' && (
                  <Button asChild variant="glow" size="lg">
                    <Link href="/pricing">
                      <ArrowUpRight className="h-4 w-4" />
                      Actualizar mi plan
                    </Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="lg">
                  <Link href="/pricing">
                    Ver todos los planes
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="hidden sm:block shrink-0 w-40 lg:w-44">
              <GiftIllustration className="w-full h-full drop-shadow-lg" />
            </div>
          </div>

          {/* Patrón decorativo */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }}
            aria-hidden
          />
        </Card>

        {/* Valor generado */}
        <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-violet-50/70 via-white to-brand-50/40 dark:from-violet-950/40 dark:via-background dark:to-brand-950/30 border-violet-100 dark:border-violet-900">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <h2 className="text-base font-semibold">
                  Valor generado este mes con LexIA
                </h2>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Métricas aproximadas basadas en tu actividad.
              </p>
            </div>
            <div className="hidden sm:block shrink-0 w-24 -mt-4 -mr-2">
              <TargetIllustration className="w-full h-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
            <ValueKpi
              icon={<Clock className="h-4 w-4" />}
              value={hoursSaved > 999 ? `${(hoursSaved / 1000).toFixed(1)}k` : `${hoursSaved}`}
              suffix="h"
              label="Horas ahorradas"
              trendPct={trend(hoursSaved, hoursSavedPrev)}
              iconBg="bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
            />
            <ValueKpi
              icon={<FileText className="h-4 w-4" />}
              value={`${gen}`}
              label="Documentos IA"
              trendPct={trend(gen, genPrev)}
              iconBg="bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
            />
            <ValueKpi
              icon={<MessageSquare className="h-4 w-4" />}
              value={`${chat}`}
              label="Consultas IA"
              trendPct={trend(chat, chatPrev)}
              iconBg="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            />
            <ValueKpi
              icon={<Scale className="h-4 w-4" />}
              value={`${evl}`}
              label="Evaluaciones"
              trendPct={trend(evl, evlPrev)}
              iconBg="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            />
          </div>

          {(saved > 0 || savedPrev > 0) && (
            <div className="mt-4 pt-3 border-t border-violet-200/50 dark:border-violet-800/40">
              <p className="text-[11px] text-muted-foreground">
                Gracias a LexIA has optimizado tu trabajo y tomado mejores
                decisiones basadas en normativa. Guardaste {saved} documento
                {saved === 1 ? '' : 's'} en tu biblioteca este mes.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ═══ Consumo + Actividad reciente ═══════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Consumo del mes */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <div>
              <h2 className="font-semibold text-base">Consumo del mes actual</h2>
              <p className="text-[11px] text-muted-foreground">
                Se reinicia el 1 de cada mes
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Uso total de IA
            </span>
          </div>

          <div className="grid md:grid-cols-[1fr,auto] gap-6">
            <div className="grid sm:grid-cols-2 gap-3">
              {consumo.map((c) => (
                <ConsumoCard
                  key={c.key}
                  label={c.label}
                  icon={c.icon}
                  used={c.used}
                  limit={c.limit}
                  accent={c.accent}
                />
              ))}
            </div>

            <div className="flex flex-col items-center justify-center md:border-l md:pl-6 border-border/60">
              <UsageRing percent={usoTotal} />
              <Link
                href="#detalle"
                className="mt-2 text-xs text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
              >
                Ver análisis detallado
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </Card>

        {/* Actividad reciente */}
        <Card className="p-6">
          <div className="flex items-baseline justify-between gap-2 mb-4">
            <h2 className="font-semibold text-base">Actividad reciente</h2>
            <Link
              href="/app"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5"
            >
              Ver todo
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {activity.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Aún no hay actividad este mes. Empieza con una conversación en
              Chat LexIA.
            </p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => {
                const meta = activityIcon(a.kind);
                return (
                  <li key={a.id} className="flex items-start gap-2.5">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${meta.bg}`}
                    >
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatRelative(a.ts)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* ═══ ¿Qué incluye tu plan? + CTA Upgrade ══════════════════ */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <h2 className="font-semibold text-base mb-4">
            ¿Qué incluye tu plan actual?
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2.5 text-sm">
            {tierDef.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{h}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Upgrade CTA con cohete */}
        {upgradeTier && tier !== 'enterprise' && (
          <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-brand-600 via-violet-600 to-purple-700 text-white border-0">
            <div
              className="absolute inset-0 opacity-[0.08] pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
                backgroundSize: '20px 20px',
              }}
              aria-hidden
            />
            <div className="relative flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="h-4 w-4" />
                  <span className="text-[10px] uppercase tracking-widest font-bold bg-white/20 rounded-full px-2 py-0.5">
                    Recomendado
                  </span>
                </div>
                <h2 className="text-xl font-bold mb-1">
                  Desbloquea todo el poder de LexIA
                </h2>
                <p className="text-sm text-white/85 mb-4">
                  Actualiza tu plan y lleva tu productividad al siguiente nivel.
                </p>
                <ul className="grid sm:grid-cols-2 gap-y-1.5 gap-x-3 text-[12px] mb-5">
                  {upgradeTier.highlights.slice(0, 4).map((h) => (
                    <li key={h} className="flex items-start gap-1.5">
                      <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-300" />
                      <span className="text-white/95">{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button
                    asChild
                    size="lg"
                    className="bg-white text-brand-700 hover:bg-white/95"
                  >
                    <Link href="/pricing">
                      Ver planes y precios
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white/40 text-white bg-transparent hover:bg-white/15 hover:text-white"
                  >
                    <Link href="/pricing">Comparar planes</Link>
                  </Button>
                </div>
              </div>
              <div className="hidden md:block shrink-0 w-28 -mt-2">
                <RocketIllustration className="w-full h-full drop-shadow-2xl" />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ═══ LexIA recomienda ═══════════════════════════════════════ */}
      <Card className="p-5 bg-gradient-to-br from-amber-50 via-white to-brand-50/40 dark:from-amber-950/30 dark:via-background dark:to-brand-950/20 border-amber-200/60 dark:border-amber-900/40">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shrink-0">
            <Sun className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-amber-700 dark:text-amber-300 mb-0.5">
              LexIA recomienda
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {recommendedTip}
            </p>
          </div>
        </div>
      </Card>

      {/* Footer contacto empresarial */}
      <p className="text-xs text-muted-foreground text-center py-2">
        ¿Necesitas facturación empresarial o integración con tus sistemas?
        Escríbenos a{' '}
        <a
          href="mailto:hola@promptive.pe"
          className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
        >
          hola@promptive.pe
        </a>{' '}
        y armamos un plan a medida.
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Sub-componentes
// ══════════════════════════════════════════════════════════════════════

function MiniDate({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

function ValueKpi({
  icon,
  value,
  suffix,
  label,
  trendPct,
  iconBg,
}: {
  icon: React.ReactNode;
  value: string;
  suffix?: string;
  label: string;
  trendPct: number;
  iconBg: string;
}) {
  const positive = trendPct >= 0;
  return (
    <div className="rounded-xl bg-white/70 dark:bg-background/60 backdrop-blur-sm border border-white/50 dark:border-border/40 p-3">
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg mb-2 ${iconBg}`}
      >
        {icon}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums tracking-tight">
          {value}
        </span>
        {suffix && (
          <span className="text-xs font-semibold text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5">
        {label}
      </p>
      {trendPct !== 0 && (
        <div
          className={`inline-flex items-center gap-0.5 mt-1 text-[10px] font-semibold ${
            positive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          <TrendingUp
            className={`h-3 w-3 ${positive ? '' : 'rotate-180'}`}
          />
          {positive ? '↑' : '↓'} {Math.abs(trendPct)}%
        </div>
      )}
    </div>
  );
}

function ConsumoCard({
  label,
  icon,
  used,
  limit,
  accent,
}: {
  label: string;
  icon: React.ReactNode;
  used: number;
  limit: number;
  accent: string;
}) {
  const isInfinite = !Number.isFinite(limit);
  const disabled = limit === 0;
  const pct = isInfinite || disabled ? 0 : Math.min(100, (used / limit) * 100);
  const nearCap = pct >= 90;
  const warn = pct >= 70 && !nearCap;

  return (
    <div
      className={`rounded-xl border p-3.5 ${
        nearCap
          ? 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20'
          : 'border-border/60 bg-card'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/60 text-foreground/70 shrink-0">
            {icon}
          </span>
          <span className="text-[11px] font-medium leading-tight">{label}</span>
        </div>
        {nearCap && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
      </div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-2xl font-bold tabular-nums">{used}</span>
        <span className="text-xs text-muted-foreground">
          {isInfinite ? '/ ∞' : disabled ? '· no incluido' : `/ ${limit}`}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground mb-1.5">
        {label.includes('Minutos')
          ? 'minutos'
          : label.includes('Chat')
            ? 'mensajes'
            : label.includes('Documento') || label.includes('Generaciones')
              ? 'documentos'
              : 'evaluaciones'}
      </p>
      {!isInfinite && !disabled && (
        <>
          <div className="h-1.5 bg-secondary/70 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${accent} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p
            className={`text-[10px] mt-1.5 font-medium ${
              nearCap
                ? 'text-rose-600 dark:text-rose-400'
                : warn
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground'
            }`}
          >
            {nearCap ? 'Límite alcanzado' : `${Math.round(pct)}% utilizado`}
          </p>
        </>
      )}
    </div>
  );
}
