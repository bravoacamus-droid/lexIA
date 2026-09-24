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
import { leerBases } from '@/lib/evaluacion/bases/leer';
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
  const leidas = await leerBases(createAdminClient(), c.ev.bases_file_path);
  const resultado = await evaluarBases({
    texto: leidas.texto,
    origen: leidas.origen,
    estandarId: pedido.data.estandarId,
    buscarSustento: buscadorDeSustento(c.supabase),
    alUsar: (u) => {
      uso.entrada += u.entrada;
      uso.salida += u.salida;
    },
  });
  const { error } = await c.supabase
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
