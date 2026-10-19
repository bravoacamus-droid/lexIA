import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { borrarSubidas, rutasDeEvaluacion } from '@/lib/archivos/borrar-subidas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('evaluations')
    .select(
      // El progreso completo lleva los textos leídos; a la pantalla solo
      // le hace falta su resumen.
      'id, title, status, bases_file_path, offer_files, result, created_at, completed_at, user_id, resumen:progreso->resumen',
    )
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const evalRow = data as { user_id: string };
  if (evalRow.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({ evaluation: data });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Los archivos que aún queden (el requerimiento de una evaluación de
  // requerimiento, o los de una evaluación que no terminó) se van con ella.
  const { data: fila } = await supabase
    .from('evaluations')
    .select('bases_file_path, bases_partes, offer_files')
    .eq('id', ctx.params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const { error } = await supabase
    .from('evaluations')
    .delete()
    .eq('id', ctx.params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (fila) {
    await borrarSubidas(
      createAdminClient(),
      user.id,
      rutasDeEvaluacion(fila as Parameters<typeof rutasDeEvaluacion>[0]),
      `evaluación eliminada ${ctx.params.id}`,
    );
  }
  return NextResponse.json({ ok: true });
}
