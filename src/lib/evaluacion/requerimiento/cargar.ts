/**
 * Cargar la evaluación de un requerimiento del usuario, para las rutas de
 * observaciones (editar, añadir, contrastar, Word).
 *
 * Se lee con la sesión del usuario (la RLS deja ver solo las suyas) y se
 * comprueba igual el dueño, el modo y que haya resultado. Las escrituras
 * van después con service role: el navegador ya no escribe en
 * `evaluations` (migración 0089).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rutasAjenas } from '@/lib/archivos/borrar-subidas';
import type { ResultadoConObservaciones } from './guardar-observaciones';

export interface EvaluacionDeRequerimiento {
  id: string;
  user_id: string;
  title: string;
  bases_file_path: string;
  regimen: 'menor_8uit' | 'seleccion' | null;
  objeto_contratacion: 'bienes' | 'servicios' | 'consultoria_obras' | 'obras' | null;
  result: ResultadoConObservaciones & { denominacion?: string };
}

export async function cargarEvaluacionDeRequerimiento(
  id: string,
): Promise<{ error: NextResponse } | { supabase: ReturnType<typeof createClient>; userId: string; ev: EvaluacionDeRequerimiento }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: NextResponse.json({ error: 'bad_request' }, { status: 400 }) };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  const { data } = await supabase
    .from('evaluations')
    .select('id, user_id, title, mode, status, bases_file_path, regimen, objeto_contratacion, result')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }) };
  const ev = data as EvaluacionDeRequerimiento & { mode: string; status: string };
  if (ev.user_id !== user.id) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  if (ev.bases_file_path && rutasAjenas(ev.user_id, [ev.bases_file_path]).length > 0) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  if (ev.mode !== 'tdr_audit' || ev.status !== 'done' || !Array.isArray(ev.result?.hallazgos)) {
    return {
      error: NextResponse.json(
        { error: 'sin_resultado', detail: 'La evaluación del requerimiento todavía no tiene resultado.' },
        { status: 409 },
      ),
    };
  }
  return { supabase, userId: user.id, ev };
}
