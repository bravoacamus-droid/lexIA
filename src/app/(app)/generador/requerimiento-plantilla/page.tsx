import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import { ListadoRequerimientos } from '@/components/app/requerimiento-plantilla/listado';
import { catalogoPlantillas } from '@/lib/generadores/plantillas';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function RequerimientosPlantillaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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
        moduleName="Requerimiento desde plantilla oficial"
        reason="Esta herramienta es para el Área Usuaria de la Entidad."
      />
    );
  }

  const { data } = await supabase
    .from('requerimientos_plantilla')
    .select('id, plantilla_id, denominacion, status, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(200);

  return (
    <ListadoRequerimientos
      requerimientos={(data ?? []) as never}
      plantillas={catalogoPlantillas()}
    />
  );
}
