import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import {
  getQuota,
  type FeatureKey,
  FEATURE_LABELS,
} from '@/lib/billing/tiers';
import {
  deriveAccessState,
  type SessionContext,
  type SubscriptionTier,
} from '@/lib/auth/session';

/**
 * Lógica central de gating de features. Combina:
 *   1. Estado de la suscripción (trial activo, plan pago, expirado).
 *   2. Cuota mensual del feature según el tier vigente.
 *   3. Consumo acumulado del usuario en el mes calendario actual.
 *
 * Patrón de uso desde un endpoint:
 *
 *   const gate = await checkFeatureGate(userId, 'generator_call');
 *   if (!gate.allowed) return NextResponse.json(gate.error, { status: 402 });
 *   ... corre la operación ...
 *   await recordUsage(userId, 'generator_call');
 */

export interface GateAllowed {
  allowed: true;
  remaining: number;
  limit: number;
  consumed: number;
}

export interface GateDenied {
  allowed: false;
  reason: 'expired' | 'quota_exceeded' | 'unauthenticated';
  error: {
    error: string;
    message: string;
    limit?: number;
    consumed?: number;
    upgrade_url?: string;
  };
}

export type GateResult = GateAllowed | GateDenied;

function currentPeriodStart(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

/**
 * Server-side admin client (bypass RLS) — usado por el feature-gate porque
 * necesita leer/escribir feature_usage incluso si el user no tiene policy
 * de INSERT/UPDATE (la tabla solo permite SELECT al owner).
 */
function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function checkFeatureGate(
  userId: string | null,
  feature: FeatureKey,
): Promise<GateResult> {
  if (!userId) {
    return {
      allowed: false,
      reason: 'unauthenticated',
      error: { error: 'unauthorized', message: 'No has iniciado sesión.' },
    };
  }

  const admin = adminClient();

  // Cargar suscripción
  const { data: sub } = await admin
    .from('subscriptions')
    .select('tier, status, trial_ends_at')
    .eq('user_id', userId)
    .maybeSingle();

  const tier = (sub as { tier?: SubscriptionTier } | null)?.tier ?? 'free_trial';
  const status = (sub as { status?: string } | null)?.status ?? 'trialing';
  const trialEndsAt = (sub as { trial_ends_at?: string } | null)?.trial_ends_at ?? null;

  // Reusamos el helper para derivar el estado de acceso
  const ctxLike: SessionContext = {
    userId,
    email: null,
    profile: { id: userId, full_name: null, profile_role: null, onboarding_completed: true, organization_name: null, ruc: null, position_title: null },
    subscription: sub
      ? {
          id: '',
          user_id: userId,
          tier,
          status: status as SubscriptionTier extends string ? 'trialing' | 'active' | 'past_due' | 'canceled' : never,
          trial_ends_at: trialEndsAt,
          current_period_end: null,
        }
      : null,
  };
  const access = deriveAccessState(ctxLike);
  if (access === 'expired') {
    return {
      allowed: false,
      reason: 'expired',
      error: {
        error: 'subscription_expired',
        message:
          'Tu prueba o suscripción ha vencido. Elige un plan para seguir generando documentos.',
        upgrade_url: '/pricing',
      },
    };
  }

  // Cuota del tier
  const limit = getQuota(tier, feature);
  if (limit <= 0) {
    return {
      allowed: false,
      reason: 'quota_exceeded',
      error: {
        error: 'feature_not_in_plan',
        message: `Tu plan actual no incluye ${FEATURE_LABELS[feature]}. Actualiza para acceder.`,
        upgrade_url: '/pricing',
      },
    };
  }
  if (!Number.isFinite(limit)) {
    // Ilimitado
    return { allowed: true, remaining: Number.POSITIVE_INFINITY, limit, consumed: 0 };
  }

  // Consumo del mes
  const period = currentPeriodStart();
  const { data: usage } = await admin
    .from('feature_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('period_start', period)
    .maybeSingle();
  const consumed = (usage as { count?: number } | null)?.count ?? 0;

  if (consumed >= limit) {
    return {
      allowed: false,
      reason: 'quota_exceeded',
      error: {
        error: 'quota_exceeded',
        message: `Has consumido tus ${limit} ${FEATURE_LABELS[feature]} de este mes. Mejora tu plan o espera al próximo periodo.`,
        limit,
        consumed,
        upgrade_url: '/pricing',
      },
    };
  }

  return {
    allowed: true,
    limit,
    consumed,
    remaining: limit - consumed,
  };
}

/**
 * Incrementa el contador del feature para el mes actual.
 * Idempotente solo por convención del caller — quien llama debe garantizar
 * que el incremento corresponde a una operación efectivamente consumida.
 */
export async function recordUsage(
  userId: string,
  feature: FeatureKey,
  delta: number = 1,
): Promise<void> {
  const admin = adminClient();
  const period = currentPeriodStart();
  // UPSERT manual (no hay rpc declarado).
  const { data: existing } = await admin
    .from('feature_usage')
    .select('id, count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('period_start', period)
    .maybeSingle();

  if (existing) {
    const cur = (existing as { count: number }).count;
    await admin
      .from('feature_usage')
      .update({ count: cur + delta } as never)
      .eq('id', (existing as { id: string }).id);
  } else {
    await admin
      .from('feature_usage')
      .insert({
        user_id: userId,
        feature,
        period_start: period,
        count: delta,
      } as never);
  }
}

/**
 * Helper en un solo paso para endpoints API:
 *
 *   const supabase = createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   const guard = await ensureCanUse(user?.id, 'generator_call');
 *   if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
 *   ... operación ...
 *   await recordUsage(user!.id, 'generator_call');
 */
export async function ensureCanUse(
  userId: string | null | undefined,
  feature: FeatureKey,
): Promise<
  | { ok: true; gate: GateAllowed }
  | { ok: false; status: number; body: GateDenied['error'] }
> {
  const result = await checkFeatureGate(userId ?? null, feature);
  if (result.allowed) return { ok: true, gate: result };
  const status =
    result.reason === 'unauthenticated' ? 401 : 402; // 402 Payment Required
  return { ok: false, status, body: result.error };
}

/** Resume el consumo del usuario en el mes actual (para mostrar en /cuenta). */
export async function getMonthlyUsage(
  userId: string,
): Promise<Record<FeatureKey, number>> {
  const supabase = createClient();
  const period = currentPeriodStart();
  const { data } = await supabase
    .from('feature_usage')
    .select('feature, count')
    .eq('user_id', userId)
    .eq('period_start', period);

  const init: Record<FeatureKey, number> = {
    chat_message: 0,
    generator_call: 0,
    evaluation_run: 0,
    scraping_admin: 0,
  };
  for (const row of (data || []) as Array<{ feature: FeatureKey; count: number }>) {
    init[row.feature] = row.count;
  }
  return init;
}
