import { createClient } from '@/lib/supabase/server';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';
import { NuevoRequerimientoForm } from './nuevo-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nuevo requerimiento' };

export default async function NuevoRequerimientoPage() {
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

  if (!isRoleAllowed(userRole, ['entity', 'consultant'])) {
    return (
      <RoleGateBlocked
        allow={['entity', 'consultant']}
        userRole={userRole}
        moduleName="Crear requerimiento"
        reason="Solo el Área Usuaria de una Entidad puede formular requerimientos."
      />
    );
  }

  return <NuevoRequerimientoForm />;
}
