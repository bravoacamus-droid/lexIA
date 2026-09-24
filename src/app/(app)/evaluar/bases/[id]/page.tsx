import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BasesResultView } from '@/components/app/evaluator/bases-result-view';
import { EvaluationPendingView } from '@/components/app/evaluator/pending-view';
import { Pagina, MigaDePan } from '@/components/app/seccion/piezas';
import { listaDeEstandares } from '@/lib/evaluacion/bases/evaluar';
import { nombreDeLasBases } from '@/lib/evaluacion/bases/cargar';
import type { ResultadoBases } from '@/lib/evaluacion/bases/tipos';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Evaluación de bases' };

export default async function EvaluacionDeBasesDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('evaluations')
    .select('id, title, status, result, mode, completed_at, user_id, bases_file_path')
    .eq('id', params.id)
    .maybeSingle();
  if (!data) notFound();
  const ev = data as {
    id: string;
    title: string;
    status: 'pending' | 'processing' | 'done' | 'failed';
    result: ResultadoBases | null;
    mode: string;
    completed_at: string | null;
    user_id: string;
    bases_file_path: string;
  };
  if (ev.user_id !== user.id || ev.mode !== 'bases_audit') notFound();

  if (ev.status !== 'done' || !ev.result?.hallazgos) {
    return (
      <EvaluationPendingView
        id={ev.id}
        title={ev.title}
        status={ev.status === 'done' ? 'failed' : (ev.status as 'pending' | 'processing' | 'failed')}
        offers={[]}
        backHref="/evaluar/bases"
      />
    );
  }

  const { data: profile } = await supabase.from('profiles').select('profile_role').eq('id', user.id).maybeSingle();
  const rol = (profile?.profile_role as ProfileRole | null) || null;

  return (
    <Pagina className="max-w-5xl">
      <MigaDePan
        trozos={[
          { label: 'Inicio', href: '/app' },
          { label: 'Evaluar', href: '/evaluar' },
          { label: 'Evaluación de bases', href: '/evaluar/bases' },
          { label: ev.title },
        ]}
      />
      <BasesResultView
        id={ev.id}
        titulo={ev.title}
        documento={nombreDeLasBases(ev.bases_file_path)}
        resultado={ev.result}
        completada={ev.completed_at}
        lecturaInicial={rol === 'entity' ? 'entidad' : 'proveedor'}
        // Formular consultas es cosa del participante: la Entidad las absuelve.
        puedeFormular={rol !== 'entity'}
        estandares={listaDeEstandares()}
      />
    </Pagina>
  );
}
