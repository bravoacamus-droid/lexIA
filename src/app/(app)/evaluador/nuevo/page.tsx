import { createClient } from '@/lib/supabase/server';
import { EvaluatorWizard } from '@/components/app/evaluator/evaluator-wizard';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nueva evaluación' };

export default async function NuevaEvaluacionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();
  const userRole = (profile?.profile_role as ProfileRole | null) || null;

  if (!isRoleAllowed(userRole, ['entity'])) {
    return (
      <RoleGateBlocked
        allow={['entity']}
        userRole={userRole}
        moduleName="El Evaluador de ofertas"
        reason="Evaluar ofertas es una facultad del comité de selección de la entidad pública."
      />
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <EvaluatorWizard />
    </div>
  );
}
