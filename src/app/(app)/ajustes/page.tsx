import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from '@/components/app/settings/settings-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ajustes' };

export default async function AjustesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="container max-w-3xl py-8 sm:py-10 space-y-8">
      <header>
        <h1 className="font-serif text-3xl tracking-tight">Ajustes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personaliza tu perfil y preferencias de LexIA.
        </p>
      </header>

      <SettingsForm
        email={user.email || ''}
        initialFullName={profile?.full_name || ''}
        initialOrganization={profile?.organization || ''}
      />
    </div>
  );
}
