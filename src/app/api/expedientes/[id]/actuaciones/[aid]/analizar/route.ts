import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ORDEN_ACTUACIONES, type Actuacion } from '@/lib/ejecucion/catalogo';
import { estadoDelExpediente, fallo, sesion } from '@/lib/ejecucion/api';
import { analizar } from '@/lib/ejecucion/servicio';
import { tituloDelExpediente } from '@/lib/ejecucion/titulo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Lee los documentos que falten y diagnostica la actuación. Con
 * `actuacion`, la analiza como otra figura: la que LexIA sugirió cuando
 * la pedida no correspondía.
 */
export async function POST(req: Request, { params }: { params: { id: string; aid: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  const p = z
    .object({ actuacion: z.enum(ORDEN_ACTUACIONES as [string, ...string[]]).optional() })
    .safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  try {
    await analizar(s.supabase, params.id, params.aid, s.user.id, (p.data.actuacion as Actuacion | undefined) ?? null);
    const estado = await estadoDelExpediente(s.supabase, params.id);
    if (estado) {
      const titulo = tituloDelExpediente(estado.expediente.titulo, estado.ficha);
      if (titulo) {
        await s.supabase.from('expedientes').update({ titulo }).eq('id', params.id);
        estado.expediente.titulo = titulo;
      }
    }
    return NextResponse.json(estado);
  } catch (e) {
    return fallo(e);
  }
}
