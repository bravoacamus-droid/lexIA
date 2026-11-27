import { redirect } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { rutaInterna } from '@/lib/auth/redireccion';
import { FormularioDeClave } from '@/components/auth/formulario-de-clave';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tu contraseña' };

/**
 * Adonde el middleware manda a quien entró con una contraseña temporal
 * (cuenta creada o restablecida por el equipo). También sirve para fijar
 * o cambiar la contraseña cuando uno quiera.
 */
export default async function ClavePage({ searchParams }: { searchParams: { next?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const forzado = user.app_metadata?.debe_cambiar_clave === true;
  const tieneClave = (user.identities ?? []).some((i) => i.provider === 'email');
  const siguiente = rutaInterna(searchParams.next ?? null, '/app');

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">{forzado ? 'Crea tu contraseña' : 'Tu contraseña'}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {forzado
            ? 'Entraste con una contraseña temporal. Elige una propia para seguir; la temporal deja de funcionar.'
            : tieneClave
              ? 'Cambia la contraseña con la que entras con tu correo.'
              : 'Hoy entras con Google. Si quieres, crea una contraseña para entrar también con tu correo.'}
        </p>
      </header>
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400">
            <KeyRound className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold">{user.email}</p>
        </div>
        <FormularioDeClave pideActual={!forzado && tieneClave} siguiente={forzado ? siguiente : undefined} />
      </Card>
    </div>
  );
}
