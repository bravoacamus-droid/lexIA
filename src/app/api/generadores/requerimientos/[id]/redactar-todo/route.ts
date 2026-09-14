/**
 * Redacta de una vez todos los apartados encendidos que estén en blanco.
 *
 * La otra mitad de lo que pidió César: la entrevista decide qué
 * apartados van, esto escribe el borrador de cada uno desde el mismo
 * relato.
 *
 * NO GUARDA. Devuelve los textos y la pantalla los coloca en sus cajas,
 * donde se leen en su sitio y se corrigen. Guardar sin que nadie lo vea
 * convertiría la revisión en un trámite que no hace nadie.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { CHAT_MODEL_ID } from '@/lib/ai/gemini';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { obtenerPlantilla } from '@/lib/generadores/plantillas';
import {
  normalizarRespuestas,
  type RespuestasRequerimiento,
} from '@/lib/generadores/ensamblador';
import { apartadosPorRedactar, redactarEnLote } from '@/lib/generadores/redaccion-masiva';

export const runtime = 'nodejs';
export const maxDuration = 300;

const Schema = z.object({
  /** Lo que contó el área usuaria. El mismo de la entrevista. */
  relato: z.string().min(20).max(8000),
  /**
   * Los interruptores que la entrevista acaba de proponer y que aún no
   * están guardados. Sin esto, "redactar todo" trabajaría sobre el
   * estado anterior y dejaría fuera justo los apartados que se acaban
   * de encender.
   */
  condiciones: z.record(z.boolean()).optional(),
  /** Tope de apartados por llamada, para no agotar la función. */
  maximo: z.number().int().min(1).max(60).optional(),
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
      { error: 'peticion_invalida', detail: 'Falta el relato de la necesidad.' },
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

  const respuestas = normalizarRespuestas(fila.respuestas, fila.denominacion, plantilla);
  if (parsed.data.condiciones) {
    respuestas.condiciones = { ...respuestas.condiciones, ...parsed.data.condiciones };
  }

  const pendientes = apartadosPorRedactar(plantilla, respuestas);
  const tope = parsed.data.maximo ?? 45;
  const recortado = pendientes.length > tope;

  if (pendientes.length === 0) {
    return NextResponse.json({ textos: [], fallidos: [], pendientes: 0, recortado: false });
  }

  const inicio = Date.now();
  const { textos, fallidos } = await redactarEnLote(plantilla, pendientes.slice(0, tope), {
    denominacion: fila.denominacion,
    organo: respuestas.campos?.organo,
    aporteUsuario: parsed.data.relato,
  });
  const latencyMs = Date.now() - inicio;

  const entrada = textos.reduce((a, t) => a + t.tokens.entrada, 0);
  const salida = textos.reduce((a, t) => a + t.tokens.salida, 0);
  void recordAiUsage({
    userId: user.id,
    feature: 'requerimiento_plantilla_redactar_todo',
    model: CHAT_MODEL_ID,
    inputTokens: entrada,
    outputTokens: salida,
    latencyMs,
    metadata: {
      requerimiento_id: ctx.params.id,
      plantilla_id: plantilla.id,
      apartados: textos.length,
      fallidos: fallidos.length,
    },
  });

  console.log('[redactar-todo]', {
    plantilla: plantilla.id,
    pendientes: pendientes.length,
    redactados: textos.length,
    fallidos: fallidos.length,
    segundos: Math.round(latencyMs / 1000),
  });

  return NextResponse.json({
    textos,
    fallidos,
    pendientes: pendientes.length,
    recortado,
  });
}
