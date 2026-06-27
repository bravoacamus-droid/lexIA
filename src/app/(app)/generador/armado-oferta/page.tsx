import { createClient } from '@/lib/supabase/server';
import { GeneratorFormV2 } from '@/components/app/generator/generator-form-v2';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Armado de oferta' };

export default async function ArmadoOfertaPage() {
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
        moduleName="El generador de Armado de Oferta"
        reason="Esta herramienta es para que el postor arme su oferta completa antes de presentarla. Si tú evalúas como entidad, usa el módulo Evaluador."
      />
    );
  }

  return (
    <GeneratorFormV2
      slug="armado_oferta"
      pageTitle="Armado de oferta — Postor"
      pageDescription="Sube las Bases Integradas del procedimiento (PDF del SEACE) y, si quieres, las hojas de vida del personal clave y las constancias de experiencia de tu empresa. LexIA arma todos los formatos y anexos oficiales de la oferta, listos para foliar y presentar al SEACE."
      showObjectType
      minDocuments={1}
      maxDocuments={5}
    />
  );
}
