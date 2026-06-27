import { createClient } from '@/lib/supabase/server';
import { GeneratorFormV2 } from '@/components/app/generator/generator-form-v2';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bases Estándar OECE' };

export default async function BasesEstandarPage() {
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
        moduleName="El generador de Bases Estándar"
        reason="La elaboración de las Bases de un procedimiento es facultad de la dependencia encargada de las contrataciones (logística) de la entidad convocante."
      />
    );
  }

  return (
    <GeneratorFormV2
      slug="bases_estandar"
      pageTitle="Bases Estándar OECE 2025"
      pageDescription="Sube los Términos de Referencia o EETT y la Estrategia de Contratación si los tienes. LexIA parte de la plantilla oficial OECE correspondiente al tipo de procedimiento y objeto, y rellena la Sección Específica con los datos del proceso."
      showObjectType
      minDocuments={0}
      maxDocuments={3}
    />
  );
}
