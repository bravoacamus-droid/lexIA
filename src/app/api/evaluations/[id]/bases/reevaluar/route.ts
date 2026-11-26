/**
 * POST /api/evaluations/[id]/bases/reevaluar  { estandarId }
 *
 * Vuelve a evaluar las bases contra otra bases estándar. La elección
 * automática casi siempre acierta, pero entre un Concurso Público y un
 * Concurso Público Abreviado del mismo objeto el texto es casi igual
 * —en la prueba con la consultoría de obra, 82 % frente a 81 %—, y quien
 * convocó sabe cuál es.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { GENERATOR_MODEL_ID } from '@/lib/ai/gemini';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { evaluarBases, listaDeEstandares } from '@/lib/evaluacion/bases/evaluar';
import { camposDeLaLectura } from '@/lib/evaluacion/bases/leer';
import { basesDeLaEvaluacion } from '@/lib/archivos/bases-leidas';
import { buscadorDeSustento } from '@/lib/evaluacion/mejora/sustento';
import { cargarEvaluacionDeBases } from '@/lib/evaluacion/bases/cargar';

export const runtime = 'nodejs';
export const maxDuration = 300;

const Pedido = z.object({ estandarId: z.string().regex(/^be-\d{1,2}$/) });

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const c = await cargarEvaluacionDeBases(ctx.params.id);
  if ('error' in c) return c.error;
  const pedido = Pedido.safeParse(await req.json().catch(() => null));
  if (!pedido.success || !listaDeEstandares().some((e) => e.id === pedido.data.estandarId)) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const inicio = Date.now();
  const uso = { entrada: 0, salida: 0 };
  const admin = createAdminClient();
  // Lo leído en la primera evaluación (el PDF ya se borró, César
  // 18/10/2026); en evaluaciones anteriores, el archivo.
  let leidas;
  try {
    leidas = await basesDeLaEvaluacion(admin, c.ev);
  } catch (e) {
    return NextResponse.json({ error: 'bases_no_disponibles', detail: (e as Error).message }, { status: 409 });
  }
  const resultado = await evaluarBases({
    ...camposDeLaLectura(leidas),
    estandarId: pedido.data.estandarId,
    buscarSustento: buscadorDeSustento(c.supabase),
    cliente: c.supabase,
    alUsar: (u) => {
      uso.entrada += u.entrada;
      uso.salida += u.salida;
    },
  });
  const { error } = await admin
    .from('evaluations')
    .update({ result: resultado as never } as never)
    .eq('id', c.ev.id);
  if (error) return NextResponse.json({ error: 'no_guardado', detail: error.message }, { status: 500 });
  void recordAiUsage({
    userId: c.ev.user_id,
    feature: 'evaluation_bases_audit',
    model: GENERATOR_MODEL_ID,
    inputTokens: uso.entrada,
    outputTokens: uso.salida,
    latencyMs: Date.now() - inicio,
    metadata: { evaluation_id: c.ev.id, estandar: resultado.estandar.id, reevaluada: true },
  });
  return NextResponse.json({ resultado });
}
