import { createClient } from '@/lib/supabase/server';

export type ProfileRole = 'entity' | 'provider' | 'consultant';

export type SubscriptionTier = 'free_trial' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface ProfileWithRole {
  id: string;
  full_name: string | null;
  profile_role: ProfileRole | null;
  onboarding_completed: boolean;
  organization_name: string | null;
  ruc: string | null;
  position_title: string | null;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: ProfileWithRole | null;
  subscription: SubscriptionRow | null;
}

/**
 * Devuelve el contexto completo de sesión del usuario actual (server-side):
 * - su id y email
 * - su profile con rol y estado de onboarding
 * - su suscripción activa (única, 1:1 con user)
 *
 * Retorna null si no hay sesión.
 *
 * Patrón de uso:
 *   const ctx = await getCurrentUserWithRole();
 *   if (!ctx) redirect('/login');
 *   if (!ctx.profile?.onboarding_completed) redirect('/onboarding');
 */
export async function getCurrentUserWithRole(): Promise<SessionContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'id, full_name, profile_role, onboarding_completed, organization_name, ruc, position_title',
      )
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select(
        'id, user_id, tier, status, trial_ends_at, current_period_end',
      )
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as ProfileWithRole | null) ?? null,
    subscription: (subscription as SubscriptionRow | null) ?? null,
  };
}

/**
 * Estado consolidado de acceso a la app — útil para decidir qué pantalla mostrar.
 */
export type AccessState =
  | 'unauthenticated'
  | 'needs_onboarding'
  | 'trial_active'
  | 'paid_active'
  | 'expired';

export function deriveAccessState(ctx: SessionContext | null): AccessState {
  if (!ctx) return 'unauthenticated';
  if (!ctx.profile?.onboarding_completed) return 'needs_onboarding';

  const sub = ctx.subscription;
  if (!sub) return 'expired';

  if (sub.status === 'trialing') {
    if (sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date()) {
      return 'trial_active';
    }
    return 'expired';
  }
  if (sub.status === 'active') return 'paid_active';
  return 'expired';
}
