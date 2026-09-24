/**
 * Genera el requerimiento de una vez desde el relato del área usuaria.
 *
 * Sustituye a los dos botones de antes —«Proponer apartados» y
 * «Redactar lo que esté en blanco»— y al paso de «Aplicar» que había
 * entre ellos. Ver `generadores/generacion.ts`.
 *
 * NO GUARDA. Devuelve los interruptores y los textos y la pantalla los
 * coloca en su sitio, como cualquier otro botón del formulario.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { CHAT_MODEL_ID } from '@/lib/ai/gemini';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { obtenerPlantilla } from '@/lib/generadores/plantillas';
import { normalizarRespuestas, type RespuestasRequerimiento } from '@/lib/generadores/ensamblador';
import { generarRequerimiento } from '@/lib/generadores/generacion';

export const runtime = 'nodejs';
export const maxDuration = 300;

const Schema = z.object({
  relato: z.string().min(20).max(8000),
  /**
   * Lo que el formulario tiene y aún no ha guardado. Sin esto se
   * generaría sobre el estado anterior y se podría escribir encima de lo
   * que el usuario acaba de teclear.
   */
  respuestas: z.record(z.unknown()).optional(),
  /** Los «¿corresponde? Sí» que el usuario contestó en el resumen. */
  confirmados: z.array(z.string().max(80)).max(80).optional(),
  descartados: z.array(z.string().max(80)).max(80).optional(),
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: 'missing_env' }, { status: 500 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'relato_invalido', detail: 'Cuenta en unas líneas qué necesita la Entidad.' },
      { status: 400 },
    );
  }

  const { data } = await supabase
    .from('requerimientos_plantilla')
    .select('user_id, plantilla_id, denominacion, respuestas')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const fila = data as {
    user_id: string;
    plantilla_id: string;
    denominacion: string;
    respuestas: Partial<RespuestasRequerimiento> | null;
  };
  if (fila.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const plantilla = obtenerPlantilla(fila.plantilla_id);
  if (!plantilla) {
    return NextResponse.json({ error: 'plantilla_desconocida', detail: fila.plantilla_id }, { status: 409 });
  }

  const respuestas = normalizarRespuestas(
    (parsed.data.respuestas as Partial<RespuestasRequerimiento> | undefined) ?? fila.respuestas,
    fila.denominacion,
    plantilla,
  );

  try {
    const inicio = Date.now();
    const resultado = await generarRequerimiento(plantilla, respuestas, {
      relato: parsed.data.relato,
      denominacion: fila.denominacion,
      confirmados: parsed.data.confirmados,
      descartados: parsed.data.descartados,
    });
    const latencyMs = Date.now() - inicio;
    void recordAiUsage({
      userId: user.id,
      feature: 'requerimiento_plantilla_generar',
      model: CHAT_MODEL_ID,
      inputTokens: resultado.tokens.entrada,
      outputTokens: resultado.tokens.salida,
      latencyMs,
      metadata: {
        requerimiento_id: ctx.params.id,
        plantilla_id: plantilla.id,
        apagados: resultado.resumen.apagados.length,
        datos: resultado.resumen.datos,
        redactados: resultado.resumen.redactados,
      },
    });
    console.log('[generar]', {
      plantilla: plantilla.id,
      segundos: Math.round(latencyMs / 1000),
      apagados: resultado.resumen.apagados.length,
      porDecidir: resultado.resumen.porDecidir.length,
      datos: resultado.resumen.datos,
      redactados: resultado.resumen.redactados,
      fallidos: resultado.resumen.fallidos,
    });
    return NextResponse.json(resultado);
  } catch (e) {
    console.error('[generar] fallo:', (e as Error).message);
    return NextResponse.json({ error: 'generacion_fallida', detail: (e as Error).message.slice(0, 200) }, { status: 500 });
  }
}
