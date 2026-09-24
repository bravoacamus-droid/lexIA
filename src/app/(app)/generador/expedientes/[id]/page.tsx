import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { estadoDelExpediente } from '@/lib/ejecucion/api';
import { PERFILES_POR_ROL, type RolDeUsuario } from '@/lib/ejecucion/catalogo';
import { VistaDelExpediente } from '@/components/app/ejecucion/expediente';
import { MigaDePan, Pagina } from '@/components/app/seccion/piezas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Expediente contractual' };

export default async function ExpedientePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [estado, { data: profile }] = await Promise.all([
    estadoDelExpediente(supabase, params.id),
    supabase.from('profiles').select('profile_role').eq('id', user.id).maybeSingle(),
  ]);
  // RLS: un expediente ajeno no se lee, y llega como inexistente.
  if (!estado) notFound();
  const rol = ((profile as { profile_role: string | null } | null)?.profile_role || 'consultant') as RolDeUsuario;

  return (
    <Pagina className="max-w-[1320px]">
      <MigaDePan
        trozos={[
          { label: 'Inicio', href: '/app' },
          { label: 'Generar', href: '/generar' },
          { label: 'Documentos de ejecución contractual', href: '/generador' },
          { label: 'Expediente' },
        ]}
      />
      <VistaDelExpediente inicial={estado} permitidos={PERFILES_POR_ROL[rol] ?? PERFILES_POR_ROL.consultant} />
    </Pagina>
  );
}
