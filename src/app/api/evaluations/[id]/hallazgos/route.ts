/**
 * POST /api/evaluations/[id]/hallazgos — añade una observación manual.
 *
 * Cuerpo: { observacion: CamposDeObservacion, contraste?: ContrasteDeObservacion }
 * Respuesta: { hallazgo: ObservacionManual }
 *
 * Se guarda en `result.manuales` con service role, después de comprobar el
 * dueño. Del contraste que manda el navegador solo se conservan las
 * fuentes que existen en la biblioteca, con su número real.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { cargarEvaluacionDeRequerimiento } from '@/lib/evaluacion/requerimiento/cargar';
import { CamposZ, ContrasteZ } from '@/lib/evaluacion/requerimiento/esquemas';
import { aplicarManualNueva, crearManual, fuentesReales, guardar } from '@/lib/evaluacion/requerimiento/guardar-observaciones';
import type { CamposDeObservacion, ContrasteDeObservacion } from '@/lib/evaluacion/requerimiento/observaciones';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const TOPE_MANUALES = 200;
const Cuerpo = z.object({ observacion: CamposZ, contraste: ContrasteZ.optional() });

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const c = await cargarEvaluacionDeRequerimiento(ctx.params.id);
  if ('error' in c) return c.error;
  const p = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return NextResponse.json({ error: 'invalid_payload', message: 'Revisa los datos de la observación.', detail: p.error.flatten() }, { status: 400 });
  }
  const admin = createAdminClient();
  const contraste = p.data.contraste
    ? ({ ...p.data.contraste, fuentes: await fuentesReales(admin, p.data.contraste.fuentes as never) } as ContrasteDeObservacion)
    : undefined;
  const manual = crearManual(p.data.observacion as CamposDeObservacion, contraste);

  const r = await guardar(admin, c.ev.id, (actual) =>
    (actual.manuales?.length ?? 0) >= TOPE_MANUALES ? null : { resultado: aplicarManualNueva(actual, manual), salida: manual },
  );
  if (!r.ok) {
    return NextResponse.json(
      {
        error: r.motivo,
        message:
          r.motivo === 'no_aplica'
            ? `Llegaste al máximo de ${TOPE_MANUALES} observaciones manuales en esta evaluación.`
            : 'No se pudo guardar la observación. Vuelve a intentarlo.',
      },
      { status: r.motivo === 'no_aplica' ? 409 : 500 },
    );
  }
  return NextResponse.json({ hallazgo: r.salida });
}
