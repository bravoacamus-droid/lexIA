import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LISTA_CLASES, type ClaseDocumental, CLASES } from '@/lib/ejecucion/catalogo';
import { estadoDelExpediente, sesion } from '@/lib/ejecucion/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Cambios = z.object({
  clase: z.enum(LISTA_CLASES as [string, ...string[]]).optional(),
  carpeta: z.number().int().min(1).max(12).optional(),
  estado: z.enum(['original', 'generado', 'revisado', 'firmado', 'presentado', 'incorporado']).optional(),
  formalizacion: z
    .object({
      numero: z.string().max(200).optional(),
      fecha: z.string().max(40).optional(),
      fechaPresentacion: z.string().max(40).optional(),
      firmante: z.string().max(200).optional(),
      expediente: z.string().max(200).optional(),
      estadoTramite: z.string().max(200).optional(),
    })
    .optional(),
});

/** El usuario corrige la clase, mueve de carpeta, formaliza. */
export async function PATCH(req: Request, { params }: { params: { id: string; docId: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  const p = Cambios.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const { data: existe } = await s.supabase.from('expediente_documentos').select('id').eq('id', params.docId).eq('expediente_id', params.id).maybeSingle();
  if (!existe) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const cambios: Record<string, unknown> = { ...p.data };
  // Cambiar la clase mueve a su carpeta, salvo que también se diga carpeta.
  if (p.data.clase && p.data.carpeta === undefined) cambios.carpeta = CLASES[p.data.clase as ClaseDocumental].carpeta;
  // Un documento incorporado al expediente va a la carpeta 12.
  if (p.data.estado === 'incorporado') cambios.carpeta = 12;
  const { error } = await s.supabase
    .from('expediente_documentos')
    .update(cambios)
    .eq('id', params.docId)
    .eq('expediente_id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(await estadoDelExpediente(s.supabase, params.id));
}

export async function DELETE(_req: Request, { params }: { params: { id: string; docId: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  const { data } = await s.supabase
    .from('expediente_documentos')
    .select('ruta')
    .eq('id', params.docId)
    .eq('expediente_id', params.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { error } = await s.supabase.from('expediente_documentos').delete().eq('id', params.docId).eq('expediente_id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ruta = (data as { ruta: string | null } | null)?.ruta;
  if (ruta?.startsWith(`${s.user.id}/`)) await s.supabase.storage.from('uploads').remove([ruta]);
  return NextResponse.json(await estadoDelExpediente(s.supabase, params.id));
}
