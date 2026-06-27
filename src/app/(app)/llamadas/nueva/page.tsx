import { createClient } from '@/lib/supabase/server';
import { CallStarter } from '@/components/app/voice/call-starter';
import { DISCLAIMER_VERSION } from '@/lib/ai/voice-config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Iniciar llamada con el Abogado Virtual' };

export default async function NuevaLlamadaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // ¿Ya aceptó el disclaimer vigente?
  const { data: consent } = await supabase
    .from('voice_consents')
    .select('id, accepted_at')
    .eq('user_id', user.id)
    .eq('disclaimer_version', DISCLAIMER_VERSION)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <CallStarter
      hasConsent={!!consent}
      disclaimerVersion={DISCLAIMER_VERSION}
    />
  );
}
