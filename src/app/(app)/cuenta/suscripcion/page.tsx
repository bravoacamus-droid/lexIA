import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowUpRight, Check } from 'lucide-react';
import { TIERS, getTier, FEATURE_LABELS, type FeatureKey } from '@/lib/billing/tiers';
import { getMonthlyUsage } from '@/lib/billing/feature-gate';
import type { SubscriptionTier, SubscriptionStatus } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Suscripción' };

interface Sub {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  last_payment_at: string | null;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function statusBadge(status: SubscriptionStatus) {
  switch (status) {
    case 'active':
      return <Badge variant="success">Activa</Badge>;
    case 'trialing':
      return <Badge variant="default">En prueba</Badge>;
    case 'past_due':
      return <Badge variant="warning">Atrasada</Badge>;
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

  const { data: subRow } = await supabase
    .from('subscriptions')
    .select(
      'id, user_id, tier, status, trial_ends_at, current_period_end, last_payment_at',
    )
    .eq('user_id', user.id)
    .maybeSingle();

  const sub = (subRow as Sub | null) || null;
  const tier = sub?.tier || 'free_trial';
  const tierDef = getTier(tier);
  const usage = await getMonthlyUsage(user.id);

  const features: FeatureKey[] = [
    'chat_message',
    'generator_call',
    'evaluation_run',
  ];

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
          Cuenta · Suscripción
        </p>
        <h1 className="font-serif text-3xl tracking-tight">Tu plan y consumo</h1>
      </header>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold">{tierDef.label}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{tierDef.tagline}</p>
          </div>
          {sub && statusBadge(sub.status)}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          <DataRow label="Estado" value={sub?.status || 'sin suscripción'} />
          {sub?.status === 'trialing' && (
            <DataRow label="Termina la prueba" value={fmtDate(sub.trial_ends_at)} />
          )}
          {sub?.status === 'active' && (
            <>
              <DataRow label="Próximo cobro" value={fmtDate(sub.current_period_end)} />
              <DataRow label="Último pago" value={fmtDate(sub.last_payment_at)} />
            </>
          )}
          {sub?.status === 'past_due' && (
            <DataRow label="Vencimiento" value={fmtDate(sub.current_period_end)} />
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tier !== 'enterprise' && (
            <Button asChild>
              <Link href="/pricing">
                <ArrowUpRight className="h-4 w-4" />
                {tier === 'free_trial' ? 'Elegir un plan' : 'Cambiar de plan'}
              </Link>
            </Button>
          )}
          {sub?.status === 'active' && (
            <Button asChild variant="outline">
              <a href="mailto:hola@promptive.pe?subject=Cancelar suscripción LexIA">
                <ExternalLink className="h-4 w-4" />
                Cancelar (escríbenos)
              </a>
            </Button>
          )}
        </div>
      </Card>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Consumo del mes actual
        </h2>
        <Card className="p-6 space-y-4">
          {features.map((f) => {
            const limit = tierDef.quotas[f];
            const used = usage[f];
            const pct = !Number.isFinite(limit)
              ? 0
              : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
            return (
              <div key={f}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-medium capitalize">
                    {FEATURE_LABELS[f]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {used} / {Number.isFinite(limit) ? limit : '∞'}
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  {Number.isFinite(limit) && (
                    <div
                      className={`h-full transition-all ${
                        pct >= 90
                          ? 'bg-red-500'
                          : pct >= 70
                            ? 'bg-amber-500'
                            : 'bg-brand-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          ¿Qué incluye tu plan?
        </h2>
        <Card className="p-6">
          <ul className="space-y-2 text-sm">
            {tierDef.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <Card className="p-5 bg-secondary/40">
        <p className="text-xs text-muted-foreground leading-relaxed">
          ¿Necesitas otra cantidad de uso, integración con tus sistemas o facturación
          empresarial? Escríbenos a{' '}
          <a
            href="mailto:hola@promptive.pe"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            hola@promptive.pe
          </a>{' '}
          y armamos un plan a medida.
        </p>
      </Card>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="text-sm mt-0.5 capitalize">{value}</p>
    </div>
  );
}
