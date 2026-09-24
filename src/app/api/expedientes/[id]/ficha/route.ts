import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LISTA_CAMPOS, type Ficha } from '@/lib/ejecucion/tipos';
import { estadoDelExpediente, sesion } from '@/lib/ejecucion/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * El usuario corrige un dato de la ficha (sección 10: «permitir al
 * usuario corregirlos solo si detecta un error»). Queda como
 * declaración suya, no como dato acreditado. Un valor vacío deshace la
 * corrección y vuelve a mandar lo leído en los documentos.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  const p = z
    .object({ campo: z.enum(LISTA_CAMPOS as [string, ...string[]]), valor: z.string().max(600) })
    .safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const { data } = await s.supabase.from('expedientes').select('ficha').eq('id', params.id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const ficha = { ...((data as { ficha: Ficha }).ficha ?? {}) } as Record<string, unknown>;
  if (p.data.valor.trim()) ficha[p.data.campo] = { valor: p.data.valor.trim(), delUsuario: true };
  else delete ficha[p.data.campo];
  const { error } = await s.supabase
    .from('expedientes')
    .update({ ficha, updated_at: new Date().toISOString() })
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(await estadoDelExpediente(s.supabase, params.id));
}
