import { createClient } from '@/lib/supabase/server';
import { GeneratorFormV2 } from '@/components/app/generator/generator-form-v2';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Consultas y Observaciones' };

export default async function ConsultasObservacionesPage() {
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

  if (!isRoleAllowed(userRole, ['provider', 'consultant'])) {
    return (
      <RoleGateBlocked
        allow={['provider', 'consultant']}
        userRole={userRole}
        moduleName="El generador de Consultas y Observaciones"
        reason="Las consultas y observaciones a las Bases son una facultad de los participantes en el procedimiento de selección, no de la entidad convocante."
      />
    );
  }

  return (
    <GeneratorFormV2
      slug="consultas_observaciones"
      pageTitle="Consultas y observaciones a las Bases"
      pageDescription="Sube las Bases del procedimiento (PDF de SEACE). LexIA detecta vicios automáticamente y arma el escrito formal con sustento normativo, listo para presentar al Comité de Selección."
      minDocuments={1}
      maxDocuments={3}
    />
  );
}
