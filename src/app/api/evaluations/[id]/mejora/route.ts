/**
 * La versión mejorada del requerimiento evaluado.
 *
 * POST  — comprueba cada hallazgo de la auditoría contra la biblioteca y
 *         propone su corrección. Se guarda en `result.mejora`.
 * PATCH — { hallazgoId, incluir }: qué cambios entran en la versión
 *         mejorada. Lo decide el usuario, uno por uno.
 *
 * Las descargas están en `mejora/word` (su Word con control de cambios)
 * y `mejora/cuadro` («Dice / Debe decir»). Ver `src/lib/evaluacion/mejora/`.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { GENERATOR_MODEL_ID } from '@/lib/ai/gemini';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { proponerMejoras, type HallazgoAuditado } from '@/lib/evaluacion/mejora/redactor';
import { buscadorDeSustento } from '@/lib/evaluacion/mejora/sustento';
import { leerRequerimiento, cambiosParaWord } from '@/lib/evaluacion/mejora/fuente';
import { aplicarControlDeCambios } from '@/lib/evaluacion/mejora/control-de-cambios';
import type { MejoraDelRequerimiento } from '@/lib/evaluacion/mejora/tipos';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface ResultadoAuditoria {
  objeto_inferido?: string;
  hallazgos?: HallazgoAuditado[];
  mejora?: MejoraDelRequerimiento;
  [k: string]: unknown;
}

async function cargar(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) } as const;

  const { data } = await supabase
    .from('evaluations')
    .select('id, user_id, mode, status, bases_file_path, result')
    .eq('id', id)
    .maybeSingle();
  if (!data) return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }) } as const;
  const ev = data as {
    id: string;
    user_id: string;
    mode: string | null;
    status: string;
    bases_file_path: string;
    result: ResultadoAuditoria | null;
  };
  if (ev.user_id !== user.id) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) } as const;
  if (ev.mode !== 'tdr_audit' || ev.status !== 'done' || !ev.result?.hallazgos) {
    return {
      error: NextResponse.json(
        { error: 'sin_auditoria', detail: 'La evaluación del requerimiento todavía no tiene hallazgos.' },
        { status: 409 },
      ),
    } as const;
  }
  return { supabase, user, ev, result: ev.result } as const;
}

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const c = await cargar(ctx.params.id);
  if ('error' in c) return c.error;
  const { supabase, user, ev, result } = c;
  const hallazgos = result.hallazgos!;

  if (hallazgos.length === 0) {
    return NextResponse.json({ error: 'sin_hallazgos', detail: 'No hay hallazgos que corregir.' }, { status: 409 });
  }

  let fuente;
  try {
    fuente = await leerRequerimiento(createAdminClient(), ev.bases_file_path);
  } catch (e) {
    return NextResponse.json({ error: 'documento_ilegible', detail: (e as Error).message }, { status: 422 });
  }

  const inicio = Date.now();
  const uso = { entrada: 0, salida: 0 };
  const mejoras = await proponerMejoras({
    documento: fuente.texto,
    hallazgos,
    objeto: result.objeto_inferido,
    buscarSustento: buscadorDeSustento(supabase),
    alUsar: (u) => {
      uso.entrada += u.entrada;
      uso.salida += u.salida;
    },
  });

  // Con el Word, se prueba ya qué cambios se pueden marcar en él, para
  // decirlo en pantalla antes de que alguien descargue y lo descubra.
  if (fuente.origen === 'docx' && fuente.buffer) {
    const candidatos = mejoras.filter((m) => m.veredicto !== 'descartar' && m.anclado && m.textoMejorado);
    const prueba = await aplicarControlDeCambios(fuente.buffer, cambiosParaWord(hallazgos, candidatos));
    const motivos = new Map(prueba.noAplicados.map((n) => [n.id, n.motivo]));
    for (const m of mejoras) {
      if (m.veredicto === 'descartar' || !m.textoMejorado) continue;
      if (!m.anclado) m.enWord = { marcable: false, motivo: 'el pasaje no se encontró tal cual en el documento' };
      else if (motivos.has(m.hallazgoId)) m.enWord = { marcable: false, motivo: motivos.get(m.hallazgoId) };
      else m.enWord = { marcable: true };
    }
  }

  const mejora: MejoraDelRequerimiento = {
    generadoEn: new Date().toISOString(),
    origen: fuente.origen,
    mejoras,
  };

  const { error } = await supabase
    .from('evaluations')
    .update({ result: { ...result, mejora } } as never)
    .eq('id', ev.id);
  if (error) return NextResponse.json({ error: 'no_guardado', detail: error.message }, { status: 500 });

  void recordAiUsage({
    userId: user.id,
    feature: 'evaluation_tdr_mejora',
    model: GENERATOR_MODEL_ID,
    inputTokens: uso.entrada,
    outputTokens: uso.salida,
    latencyMs: Date.now() - inicio,
    metadata: { evaluation_id: ev.id, hallazgos: hallazgos.length, origen: fuente.origen },
  });

  return NextResponse.json({ mejora });
}

const Cambio = z.object({ hallazgoId: z.string().min(1).max(200), incluir: z.boolean() });

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const c = await cargar(ctx.params.id);
  if ('error' in c) return c.error;
  const { supabase, ev, result } = c;

  const pedido = Cambio.safeParse(await req.json().catch(() => null));
  if (!pedido.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const mejora = result.mejora;
  const m = mejora?.mejoras.find((x) => x.hallazgoId === pedido.data.hallazgoId);
  if (!mejora || !m) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  // Lo que no procede, o no trae texto, no puede entrar.
  if (pedido.data.incluir && (m.veredicto === 'descartar' || !m.textoMejorado)) {
    return NextResponse.json({ error: 'no_incluible' }, { status: 409 });
  }
  m.incluir = pedido.data.incluir;

  const { error } = await supabase
    .from('evaluations')
    .update({ result: { ...result, mejora } } as never)
    .eq('id', ev.id);
  if (error) return NextResponse.json({ error: 'no_guardado', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, incluir: m.incluir });
}
