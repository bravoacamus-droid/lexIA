/**
 * Otorgamiento de créditos bonus (por encuestas, promos, etc.).
 *
 * Los bonus se suman a la cuota normal del tier en el mes vigente
 * (ver feature-gate.checkFeatureGate).
 */
import { createClient as createAdmin } from '@supabase/supabase-js';
import type { FeatureKey } from '@/lib/billing/tiers';

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function currentPeriodStart(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

export interface GrantBonusInput {
  userId: string;
  feature: FeatureKey;
  amount: number;
  source: string;
  reason?: string;
}

/** Inserta una fila de bonus en el mes calendario actual. */
export async function grantBonus(input: GrantBonusInput): Promise<void> {
  const admin = adminClient();
  await admin.from('user_credit_bonuses').insert({
    user_id: input.userId,
    feature: input.feature,
    amount: input.amount,
    period_start: currentPeriodStart(),
    source: input.source,
    reason: input.reason ?? null,
  } as never);
}
