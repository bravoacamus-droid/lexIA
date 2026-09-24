import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ORDEN_ACTUACIONES } from '@/lib/ejecucion/catalogo';
import { perfilPermitido, sesion } from '@/lib/ejecucion/api';
import type { Respuesta } from '@/lib/ejecucion/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Una actuación nueva en el mismo expediente: otro perfil, u otra
 * actuación. Es el «Continuar con otro perfil» de la sección 18: se
 * reutilizan las fuentes, lo declarado y la actuación identificada; lo
 * que no se reutiliza es el borrador del perfil anterior como si fuera
 * oficial.
 */
const Cuerpo = z.object({
  perfil: z.string(),
  actuacion: z.enum(ORDEN_ACTUACIONES as [string, ...string[]]).nullable().optional(),
  pedido: z.string().max(4000).optional(),
  continuaDe: z.string().uuid().optional(),
});

/** Lo declarado que depende de quién emite no pasa al siguiente perfil. */
const PROPIAS_DEL_PERFIL = new Set(['delegacion']);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  const p = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  if (!perfilPermitido(s.permitidos, p.data.perfil)) return NextResponse.json({ error: 'perfil_no_permitido' }, { status: 403 });

  let actuacion = p.data.actuacion ?? null;
  let pedido = p.data.pedido?.trim() ?? '';
  let respuestas: Respuesta[] = [];
  if (p.data.continuaDe) {
    const { data: previa } = await s.supabase
      .from('expediente_actuaciones')
      .select('actuacion, pedido, respuestas, analizada:analisis->>actuacion')
      .eq('id', p.data.continuaDe)
      .eq('expediente_id', params.id)
      .maybeSingle();
    if (!previa) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const v = previa as { actuacion: string | null; pedido: string; respuestas: Respuesta[]; analizada: string | null };
    actuacion = actuacion ?? v.actuacion ?? v.analizada;
    pedido = pedido || v.pedido;
    respuestas = (v.respuestas ?? []).filter((r) => !PROPIAS_DEL_PERFIL.has(r.preguntaId) && !r.preguntaId.startsWith('modelo_'));
  }
  const { data, error } = await s.supabase
    .from('expediente_actuaciones')
    .insert({
      expediente_id: params.id,
      user_id: s.user.id,
      perfil: p.data.perfil,
      actuacion,
      pedido,
      respuestas,
      continua_de: p.data.continuaDe ?? null,
    })
    .select('id')
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'no se pudo crear' }, { status: 500 });
  return NextResponse.json({ actuacionId: (data as { id: string }).id });
}
