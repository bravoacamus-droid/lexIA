import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { BandejaDeSoporte } from '@/components/app/admin/bandeja-de-soporte';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · Soporte' };

/**
 * La bandeja de soporte del equipo: las conversaciones que los usuarios
 * abren desde el botón «Ayuda», con quién escribe, desde qué página y
 * con qué navegador; y la lista de usuarios para escribirles primero.
 */
export default async function AdminSoportePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: yo } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if ((yo as { is_admin?: boolean } | null)?.is_admin !== true) {
    return (
      <div className="container max-w-2xl py-16">
        <Card className="p-10 text-center">
          <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">Solo administradores</h1>
        </Card>
      </div>
    );
  }

  return <BandejaDeSoporte />;
}
