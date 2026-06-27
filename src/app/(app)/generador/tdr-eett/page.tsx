import { createClient } from '@/lib/supabase/server';
import { GeneratorFormV2 } from '@/components/app/generator/generator-form-v2';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Términos de Referencia / EETT' };

export default async function TdrEettPage() {
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
        moduleName="El generador de TDR / EETT"
        reason="La formulación de Términos de Referencia y Especificaciones Técnicas es facultad del área usuaria de la entidad pública."
      />
    );
  }

  return (
    <GeneratorFormV2
      slug="tdr_eett"
      endpoint="/api/generators/preparatorias"
      pageTitle="Términos de Referencia / Especificaciones Técnicas"
      pageDescription="Si tienes la solicitud del área usuaria, el estudio de mercado u otros documentos del expediente, súbelos como contexto. Si no, descríbele a LexIA en el campo de instrucciones qué necesitas contratar. LexIA arma el TDR (servicios/consultorías) o EETT (bienes/obras) que se incorpora al expediente."
      showObjectType
      minDocuments={0}
      maxDocuments={3}
    />
  );
}
