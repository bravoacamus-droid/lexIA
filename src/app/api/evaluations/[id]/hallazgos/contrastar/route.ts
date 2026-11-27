/**
 * POST /api/evaluations/[id]/hallazgos/contrastar
 *
 * Contrasta una observación (añadida a mano o editada) con el
 * requerimiento, la normativa y la biblioteca, y propone su redacción
 * (reunión con César del 27/11/2026). No guarda nada: el usuario decide si
 * aplica la propuesta y guarda con POST /hallazgos o PATCH /hallazgos/[hid].
 *
 * Cuerpo: { observacion: CamposDeObservacion, hallazgoId?: string }
 * Respuesta: { contraste: ContrasteDeObservacion }
 *
 * Cobra 2 créditos de la herramienta del requerimiento (menor o de
 * selección) antes de llamar al modelo y los devuelve si falla.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { respuestaDeRechazo, usarHerramienta } from '@/lib/billing/creditos';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { GENERATOR_MODEL_ID } from '@/lib/ai/gemini';
import { extractPdfText } from '@/lib/ai/pdf';
import { textoDelWord } from '@/lib/evaluacion/mejora/control-de-cambios';
import { origenDe } from '@/lib/evaluacion/mejora/fuente';
import { cargarEvaluacionDeRequerimiento } from '@/lib/evaluacion/requerimiento/cargar';
import { contrastarObservacion } from '@/lib/evaluacion/requerimiento/contrastar-observacion';
import { CamposZ } from '@/lib/evaluacion/requerimiento/esquemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const Cuerpo = z.object({ observacion: CamposZ, hallazgoId: z.string().max(100).optional() });

/** El texto del requerimiento, para comprobar la cita. Si falla, se contrasta sin él. */
async function textoDelRequerimiento(ruta: string): Promise<string | undefined> {
  try {
    const { data, error } = await createAdminClient().storage.from('uploads').download(ruta);
    if (error || !data) return undefined;
    const buffer = await data.arrayBuffer();
    return origenDe(ruta) === 'docx'
      ? await textoDelWord(Buffer.from(buffer))
      : (await extractPdfText(buffer, { detectScanned: false })).text;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const c = await cargarEvaluacionDeRequerimiento(ctx.params.id);
  if ('error' in c) return c.error;
  const p = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return NextResponse.json({ error: 'invalid_payload', message: 'Revisa los datos de la observación.', detail: p.error.flatten() }, { status: 400 });
  }

  const herramienta = c.ev.regimen === 'menor_8uit' ? 'evaluacion_requerimiento_menor' : 'evaluacion_requerimiento_seleccion';
  const uso = await usarHerramienta(c.userId, herramienta, {
    creditos: 2,
    detalle: `Contraste de observación: ${p.data.observacion.titulo.slice(0, 80)}`,
  });
  if (!uso.ok) return respuestaDeRechazo(uso);

  try {
    const texto = c.ev.bases_file_path ? await textoDelRequerimiento(c.ev.bases_file_path) : undefined;
    const inicio = Date.now();
    const contraste = await contrastarObservacion(c.supabase, p.data.observacion, {
      regimen: c.ev.regimen,
      objeto: c.ev.objeto_contratacion,
      textoDelRequerimiento: texto,
      alUsar: (u) =>
        void recordAiUsage({
          userId: c.userId,
          feature: 'evaluation_tdr_audit',
          model: GENERATOR_MODEL_ID,
          inputTokens: u.entrada,
          outputTokens: u.salida,
          latencyMs: Date.now() - inicio,
          metadata: { evaluation_id: c.ev.id, step: 'contraste_observacion', hallazgo: p.data.hallazgoId ?? null },
        }),
    });
    return NextResponse.json({ contraste });
  } catch (e) {
    console.error('[hallazgos/contrastar]', (e as Error).message);
    await uso.reembolsar('el contraste de la observación no se completó');
    return NextResponse.json(
      { error: 'fallo', message: 'No se pudo contrastar la observación. No se cobró. Vuelve a intentarlo.' },
      { status: 502 },
    );
  }
}
