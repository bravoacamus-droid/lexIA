import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell, type ResumenDePlan } from '@/components/app/app-shell';
import { SurveyPromptModal } from '@/components/app/surveys/survey-prompt-modal';
import { getMonthlyUsage } from '@/lib/billing/feature-gate';
import { getTier, FEATURE_LABELS, type FeatureKey } from '@/lib/billing/tiers';
import type { SubscriptionTier } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * El resumen del plan que pinta la barra lateral.
 *
 * No hay un saldo único de «créditos»: cada función tiene su cuota
 * mensual. Lo útil es **la que está más cerca de agotarse**, porque es
 * la primera que va a frenar el trabajo; esa es la que se muestra, con
 * su nombre. Las cuotas infinitas y las deshabilitadas no compiten.
 */
async function resumirElPlan(
  userId: string,
  tier: SubscriptionTier,
  finDePeriodo: string | null,
): Promise<ResumenDePlan> {
  const plan = getTier(tier);
  let medidor: ResumenDePlan['medidor'] = null;

  try {
    const consumo = await getMonthlyUsage(userId);
    let peor = -1;
    for (const [clave, tope] of Object.entries(plan.quotas) as Array<[FeatureKey, number]>) {
      if (!Number.isFinite(tope) || tope <= 0) continue;
      const usado = consumo[clave] || 0;
      const proporcion = usado / tope;
      if (proporcion > peor) {
        peor = proporcion;
        medidor = { usado, tope, unidad: FEATURE_LABELS[clave].toLowerCase() };
      }
    }
  } catch {
    // Si el consumo no se puede leer, la tarjeta se queda sin barra
    // antes que mostrar un número inventado.
    medidor = null;
  }

  return {
    etiqueta: plan.label,
    medidor,
    renovacion: finDePeriodo
      ? new Date(finDePeriodo).toLocaleDateString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : null,
  };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: profile }, { data: suscripcion }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('subscriptions')
      .select('tier, status, trial_ends_at, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const tier = (suscripcion?.tier as SubscriptionTier | undefined) || 'free_trial';
  const plan = await resumirElPlan(
    user.id,
    tier,
    (suscripcion?.current_period_end as string | null) ??
      (suscripcion?.trial_ends_at as string | null) ??
      null,
  );

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email || '',
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        profile_role:
          (profile?.profile_role as 'entity' | 'provider' | 'consultant' | null) || null,
        organization_name: profile?.organization_name || null,
        is_admin: Boolean(profile?.is_admin),
      }}
      plan={plan}
    >
      {children}
      <SurveyPromptModal />
    </AppShell>
  );
}
