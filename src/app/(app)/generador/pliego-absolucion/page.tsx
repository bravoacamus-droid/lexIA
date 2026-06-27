import { createClient } from '@/lib/supabase/server';
import { GeneratorFormV2 } from '@/components/app/generator/generator-form-v2';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pliego de Absolución' };

export default async function PliegoAbsolucionPage() {
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
        moduleName="El generador de Pliego de Absolución"
        reason="Absolver consultas y observaciones es facultad del comité de selección de la entidad convocante."
      />
    );
  }

  return (
    <GeneratorFormV2
      slug="pliego_absolucion"
      pageTitle="Pliego de Absolución de Consultas y Observaciones"
      pageDescription="Sube las Bases y el consolidado de consultas/observaciones recibidas. LexIA dictamina PROCEDE / NO PROCEDE por cada cuestionamiento con sustento normativo y propone el texto integrado de las Bases Integradas."
      showObjectType
      minDocuments={1}
      maxDocuments={3}
    />
  );
}
