import { createClient } from '@/lib/supabase/server';
import { GeneratorWizard } from '@/components/app/generator/generator-wizard';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nuevo documento' };

export default async function NuevoDocumentoPage() {
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

  return (
    <div className="container max-w-3xl py-8">
      <GeneratorWizard userRole={userRole} />
    </div>
  );
}
