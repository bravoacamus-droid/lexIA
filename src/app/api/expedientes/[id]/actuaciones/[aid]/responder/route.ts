import { NextResponse } from 'next/server';
import { z } from 'zod';
import { estadoDelExpediente, fallo, sesion } from '@/lib/ejecucion/api';
import { analizar } from '@/lib/ejecucion/servicio';
import { fechaISO } from '@/lib/ejecucion/regimen';
import { LISTA_CAMPOS, type Ficha, type Respuesta } from '@/lib/ejecucion/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * La respuesta a la pregunta decisiva. Se guarda como declaración del
 * usuario y se vuelve a diagnosticar: la respuesta puede cambiar la
 * figura, la procedencia, el documento o la competencia, que es por lo
 * que se preguntó.
 *
 * Si la pregunta resuelve un dato de la ficha (tipo de contratación,
 * fecha de convocatoria), el dato va también a la ficha, marcado como
 * del usuario.
 */
const Cuerpo = z.object({
  preguntaId: z.string().min(1).max(80),
  pregunta: z.string().min(1).max(600),
  respuesta: z.string().trim().min(1).max(2000),
  campo: z.enum(LISTA_CAMPOS as [string, ...string[]]).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string; aid: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  const p = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const { data: act } = await s.supabase
    .from('expediente_actuaciones')
    .select('respuestas')
    .eq('id', params.aid)
    .eq('expediente_id', params.id)
    .maybeSingle();
  if (!act) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const previas = ((act as { respuestas: Respuesta[] }).respuestas ?? []).filter((r) => r.preguntaId !== p.data.preguntaId);
  const respuestas: Respuesta[] = [
    ...previas,
    { preguntaId: p.data.preguntaId, pregunta: p.data.pregunta, respuesta: p.data.respuesta, fecha: new Date().toISOString() },
  ];
  await s.supabase.from('expediente_actuaciones').update({ respuestas }).eq('id', params.aid);

  if (p.data.campo) {
    const { data: exp } = await s.supabase.from('expedientes').select('ficha').eq('id', params.id).maybeSingle();
    const ficha = { ...(((exp as { ficha: Ficha } | null)?.ficha ?? {}) as Record<string, unknown>) };
    const valor = p.data.campo.startsWith('fecha') ? fechaISO(p.data.respuesta) ?? p.data.respuesta : p.data.respuesta;
    ficha[p.data.campo] = { valor, delUsuario: true };
    await s.supabase.from('expedientes').update({ ficha }).eq('id', params.id);
  }

  try {
    await analizar(s.supabase, params.id, params.aid, s.user.id);
    return NextResponse.json(await estadoDelExpediente(s.supabase, params.id));
  } catch (e) {
    return fallo(e);
  }
}
