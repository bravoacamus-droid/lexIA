import { createClient } from '@/lib/supabase/server';
import { GeneratorFormV2 } from '@/components/app/generator/generator-form-v2';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recurso de Apelación' };

export default async function ApelacionesPage() {
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
        moduleName="El generador de Apelaciones"
        reason="Interponer recurso de apelación es facultad del proveedor afectado por el acto que se impugna."
      />
    );
  }

  return (
    <GeneratorFormV2
      slug="apelaciones"
      pageTitle="Recurso de Apelación"
      pageDescription="Sube el acto que vas a impugnar (acta de Buena Pro, resolución de descalificación, etc.) y, si lo tienes, las Bases del procedimiento. LexIA arma el escrito de apelación dirigido a la autoridad competente (Entidad o Tribunal del OECE) según la cuantía y el acto impugnado."
      minDocuments={1}
      maxDocuments={3}
    />
  );
}
