/**
 * Cargar una evaluación de bases del usuario, para las rutas.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ResultadoBases } from './tipos';

export interface EvaluacionDeBases {
  id: string;
  user_id: string;
  title: string;
  bases_file_path: string;
  result: ResultadoBases;
}

export async function cargarEvaluacionDeBases(
  id: string,
): Promise<{ error: NextResponse } | { supabase: ReturnType<typeof createClient>; ev: EvaluacionDeBases }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  const { data } = await supabase
    .from('evaluations')
    .select('id, user_id, title, mode, status, bases_file_path, result')
    .eq('id', id)
    .maybeSingle();
  if (!data) return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }) };
  const ev = data as EvaluacionDeBases & { mode: string; status: string };
  if (ev.user_id !== user.id) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  if (ev.mode !== 'bases_audit' || ev.status !== 'done' || !ev.result?.hallazgos) {
    return {
      error: NextResponse.json(
        { error: 'sin_resultado', detail: 'La evaluación de bases todavía no tiene resultado.' },
        { status: 409 },
      ),
    };
  }
  return { supabase, ev };
}

/** «1781574844920-BASES_INTEGRADAS.pdf» → «BASES INTEGRADAS.pdf». */
export function nombreDeLasBases(ruta: string): string {
  return (ruta.split('/').pop() ?? ruta).replace(/^\d{10,}-/, '').replace(/_/g, ' ');
}
