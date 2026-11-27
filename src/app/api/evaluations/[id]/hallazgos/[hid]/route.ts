/**
 * PATCH /api/evaluations/[id]/hallazgos/[hid] — edita un hallazgo.
 *   Cuerpo: { campos: Partial<CamposDeObservacion>, contraste?: ContrasteDeObservacion }
 *   Respuesta: { edicion: EdicionDeHallazgo } (hallazgo de la IA: el
 *   original queda intacto en result.hallazgos) o { hallazgo: ObservacionManual }.
 *
 * DELETE /api/evaluations/[id]/hallazgos/[hid] — borra una observación
 *   manual, o la edición de un hallazgo de la IA (vuelve al original).
 *   Respuesta: { ok: true }.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { cargarEvaluacionDeRequerimiento } from '@/lib/evaluacion/requerimiento/cargar';
import { CamposParcialesZ, ContrasteZ } from '@/lib/evaluacion/requerimiento/esquemas';
import { aplicarBorrado, aplicarCambio, fuentesReales, guardar } from '@/lib/evaluacion/requerimiento/guardar-observaciones';
import type { CamposDeObservacion, ContrasteDeObservacion } from '@/lib/evaluacion/requerimiento/observaciones';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const Hid = z.string().regex(/^[\w-]{1,100}$/);
const Cuerpo = z.object({ campos: CamposParcialesZ, contraste: ContrasteZ.optional() });

export async function PATCH(req: Request, ctx: { params: { id: string; hid: string } }) {
  if (!Hid.safeParse(ctx.params.hid).success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const c = await cargarEvaluacionDeRequerimiento(ctx.params.id);
  if ('error' in c) return c.error;
  const p = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return NextResponse.json({ error: 'invalid_payload', message: 'Revisa los datos de la observación.', detail: p.error.flatten() }, { status: 400 });
  }
  if (Object.keys(p.data.campos).length === 0 && !p.data.contraste) {
    return NextResponse.json({ error: 'sin_cambios', message: 'No hay cambios que guardar.' }, { status: 400 });
  }
  const admin = createAdminClient();
  const contraste = p.data.contraste
    ? ({ ...p.data.contraste, fuentes: await fuentesReales(admin, p.data.contraste.fuentes as never) } as ContrasteDeObservacion)
    : undefined;

  const r = await guardar(admin, c.ev.id, (actual) => {
    const cambio = aplicarCambio(actual, ctx.params.hid, p.data.campos as Partial<CamposDeObservacion>, contraste);
    return cambio ? { resultado: cambio.resultado, salida: cambio.edicion ? { edicion: cambio.edicion } : { hallazgo: cambio.hallazgo } } : null;
  });
  if (!r.ok) {
    return r.motivo === 'no_aplica'
      ? NextResponse.json({ error: 'no_existe', message: 'Ese hallazgo no existe en la evaluación.' }, { status: 404 })
      : NextResponse.json({ error: r.motivo, message: 'No se pudo guardar. Vuelve a intentarlo.' }, { status: 500 });
  }
  return NextResponse.json(r.salida);
}

export async function DELETE(_req: Request, ctx: { params: { id: string; hid: string } }) {
  if (!Hid.safeParse(ctx.params.hid).success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const c = await cargarEvaluacionDeRequerimiento(ctx.params.id);
  if ('error' in c) return c.error;
  const r = await guardar(createAdminClient(), c.ev.id, (actual) => {
    const resultado = aplicarBorrado(actual, ctx.params.hid);
    return resultado ? { resultado, salida: true } : null;
  });
  if (!r.ok) {
    return r.motivo === 'no_aplica'
      ? NextResponse.json({ error: 'no_existe', message: 'No hay nada que borrar con ese id.' }, { status: 404 })
      : NextResponse.json({ error: r.motivo, message: 'No se pudo borrar. Vuelve a intentarlo.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
