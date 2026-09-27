import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell, type ResumenDePlan } from '@/components/app/app-shell';
import { SurveyPromptModal } from '@/components/app/surveys/survey-prompt-modal';
import { getMonthlyUsage } from '@/lib/billing/feature-gate';
import { getTier, type FeatureKey } from '@/lib/billing/tiers';
import type { SubscriptionTier } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * El resumen del plan que pinta la barra lateral.
 *
 * Antes mostraba solo la cuota más cerca de agotarse. En un plan con
 * chat, generadores y evaluador ilimitados, esa era siempre la de
 * minutos de voz: la tarjeta decía «0 / 120 minutos de llamada» aunque
 * César hubiera usado A-LexIA todo el mes (27/09/2026). Ahora muestra
 * el consumo de las tres acciones —Consultar, Generar, Evaluar—, con su
 * tope cuando lo hay.
 */
async function resumirElPlan(
  userId: string,
  tier: SubscriptionTier,
  finDePeriodo: string | null,
): Promise<ResumenDePlan> {
  const plan = getTier(tier);
  let medidores: ResumenDePlan['medidores'] = null;
  const tope = (clave: FeatureKey) => {
    const t = plan.quotas[clave];
    return Number.isFinite(t) ? t : null;
  };

  try {
    const consumo = await getMonthlyUsage(userId);
    const topeVoz = tope('voice_call_minute');
    medidores = [
      {
        accion: 'Consultar',
        usado: consumo.chat_message,
        tope: tope('chat_message'),
        unidad: 'consultas',
        detalle:
          topeVoz === 0
            ? undefined
            : `${consumo.voice_call_minute}${topeVoz ? ` de ${topeVoz}` : ''} min de voz`,
      },
      { accion: 'Generar', usado: consumo.generator_call, tope: tope('generator_call'), unidad: 'documentos' },
      { accion: 'Evaluar', usado: consumo.evaluation_run, tope: tope('evaluation_run'), unidad: 'evaluaciones' },
    ];
  } catch {
    // Si el consumo no se puede leer, la tarjeta se queda sin barras
    // antes que mostrar un número inventado.
    medidores = null;
  }

  return {
    etiqueta: plan.label,
    medidores,
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
