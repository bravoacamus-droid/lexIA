import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { SubirALaBiblioteca } from '@/components/app/admin/subir-a-la-biblioteca';
import { tienePermiso } from '@/lib/auth/permisos-servidor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · Subir a la biblioteca' };

/** Subida manual a la Biblioteca Normativa (reunión con César, 27/11/2026). */
export default async function AdminBibliotecaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (!(await tienePermiso(supabase, user.id, 'biblioteca'))) {
    return (
      <div className="container max-w-2xl py-16">
        <Card className="p-10 text-center">
          <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">Solo el equipo</h1>
          <p className="text-sm text-muted-foreground">Subir documentos a la biblioteca necesita el rol de bibliotecario o administrador.</p>
        </Card>
      </div>
    );
  }

  return <SubirALaBiblioteca />;
}
