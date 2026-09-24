import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { estadoDelExpediente, sesion } from '@/lib/ejecucion/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Con RLS, un expediente ajeno no se lee: para la sesión, no existe. */
async function esSuyo(supabase: ReturnType<typeof createClient>, id: string) {
  const { data } = await supabase.from('expedientes').select('id').eq('id', id).maybeSingle();
  return !!data;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  const estado = await estadoDelExpediente(s.supabase, params.id);
  if (!estado) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(estado);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  const p = z.object({ titulo: z.string().trim().min(2).max(200) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  // RLS no deja tocar lo ajeno, pero un update sin filas no es un error:
  // hay que decir que no existe.
  if (!(await esSuyo(s.supabase, params.id))) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { error } = await s.supabase
    .from('expedientes')
    .update({ titulo: p.data.titulo, updated_at: new Date().toISOString() })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Borra el expediente, sus documentos y los archivos subidos. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  if (!(await esSuyo(s.supabase, params.id))) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { data: docs } = await s.supabase.from('expediente_documentos').select('ruta').eq('expediente_id', params.id);
  const rutas = ((docs ?? []) as Array<{ ruta: string | null }>).map((d) => d.ruta).filter((r): r is string => !!r && r.startsWith(`${s.user.id}/`));
  const { error } = await s.supabase.from('expedientes').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (rutas.length) await s.supabase.storage.from('uploads').remove(rutas);
  return NextResponse.json({ ok: true });
}
