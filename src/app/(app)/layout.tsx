import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app/app-shell';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email || '',
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
      }}
    >
      {children}
    </AppShell>
  );
}
