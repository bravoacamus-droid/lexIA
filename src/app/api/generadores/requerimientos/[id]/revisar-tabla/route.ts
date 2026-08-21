import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { chatModel, CHAT_MODEL_ID } from '@/lib/ai/gemini';
import { embedOne } from '@/lib/ai/embeddings';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { obtenerPlantilla } from '@/lib/generadores/plantillas';
import { normalizarRespuestas, type RespuestasRequerimiento } from '@/lib/generadores/ensamblador';
import {
  promptTablaSistema,
  promptTablaUsuario,
  depurarRevisionTabla,
} from '@/lib/generadores/revisor-tabla';
import type { BloqueTabla, Seccion } from '@/lib/generadores/plantilla-tipos';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Schema = z.object({
  bloque_id: z.string().min(1).max(80),
  /** Lo que hay en pantalla; puede no estar guardado todavía. */
  filas: z.array(z.array(z.string().max(4000))).max(80),
});

/** Busca la tabla por id, subsecciones incluidas. */
function buscarTabla(secciones: Seccion[], id: string): BloqueTabla | null {
  for (const s of secciones) {
    for (const b of s.bloques) {
      if (b.clase === 'tabla' && b.id === id) return b;
    }
    if (s.subsecciones) {
      const encontrada = buscarTabla(s.subsecciones, id);
      if (encontrada) return encontrada;
    }
  }
  return null;
}

/** Sustento normativo para lo que pide esta tabla. */
async function sustentoNormativo(consulta: string): Promise<string> {
  try {
    const embedding = await embedOne(consulta, 'RETRIEVAL_QUERY');
    const supabase = createClient();
    const { data } = await supabase.rpc('hybrid_search', {
      query_text: consulta,
      query_embedding: embedding as unknown as number[],
      match_count: 4,
      filter_type: null,
    });
    const filas = (data ?? []) as Array<{
      content: string;
      doc_title: string;
      doc_type: string;
      doc_number: string | null;
    }>;
    return filas
      .map(
        (f, i) =>
          `[${i + 1}] ${f.doc_type}${f.doc_number ? ' ' + f.doc_number : ''} — ${f.doc_title}\n${f.content.slice(0, 1000)}`,
      )
      .join('\n\n---\n\n');
  } catch (e) {
    // Sin sustento se revisa igual, pero sin citar norma: el prompt lo
    // prohíbe.
    console.error('[revisar-tabla] falló la búsqueda de sustento:', (e as Error).message);
    return '';
  }
}

/**
 * POST /api/generadores/requerimientos/[id]/revisar-tabla
 * Body: { bloque_id, filas }
 *
 * Revisa una tabla llena a mano: qué falta, qué contradice la norma y
 * cómo queda mejor redactada. No guarda nada y no cambia los datos; ver
 * `src/lib/generadores/revisor-tabla.ts`.
 */
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
      { error: 'invalid_payload', detail: parsed.error.flatten() },
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
    respuestas: Partial<RespuestasRequerimiento>;
  };
  if (fila.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const plantilla = obtenerPlantilla(fila.plantilla_id);
  if (!plantilla) return NextResponse.json({ error: 'plantilla_desconocida' }, { status: 500 });

  const bloque = buscarTabla(plantilla.secciones, parsed.data.bloque_id);
  if (!bloque) {
    return NextResponse.json(
      { error: 'tabla_desconocida', detail: parsed.data.bloque_id },
      { status: 400 },
    );
  }

  // Se revisa lo que hay en pantalla; si viene vacío, lo guardado.
  const guardadas = normalizarRespuestas(fila.respuestas, fila.denominacion).tablas[bloque.id] ?? [];
  const filas = (parsed.data.filas.length > 0 ? parsed.data.filas : guardadas).filter((f) =>
    f.some((c) => c.trim()),
  );
  if (filas.length === 0) {
    return NextResponse.json({
      vacio: true,
      observaciones: [],
      filas: null,
      con_sustento: false,
    });
  }

  const sustento = await sustentoNormativo(
    `${bloque.etiqueta} ${plantilla.subtitulo} ${fila.denominacion}`.slice(0, 200),
  );

  try {
    const inicio = Date.now();
    const resultado = await generateText({
      model: chatModel,
      system: promptTablaSistema(plantilla, bloque),
      prompt: promptTablaUsuario({
        denominacion: fila.denominacion,
        bloque,
        filas,
        sustento,
      }),
      temperature: 0.2,
    });

    void recordAiUsage({
      userId: user.id,
      feature: `requerimiento_plantilla_tabla_${bloque.id}`,
      model: CHAT_MODEL_ID,
      inputTokens: resultado.usage?.promptTokens ?? 0,
      outputTokens: resultado.usage?.completionTokens ?? 0,
      latencyMs: Date.now() - inicio,
      metadata: { requerimiento_id: ctx.params.id, plantilla_id: plantilla.id, filas: filas.length },
    });

    let crudo: unknown;
    try {
      crudo = parseJsonLoose(resultado.text ?? '');
    } catch (e) {
      console.error('[revisar-tabla] JSON ilegible:', (e as Error).message);
      return NextResponse.json({ error: 'respuesta_ilegible' }, { status: 502 });
    }

    return NextResponse.json({
      ...depurarRevisionTabla(crudo, filas),
      con_sustento: sustento.length > 0,
    });
  } catch (e) {
    const msg = (e as Error).message || 'unknown';
    console.error('[revisar-tabla] fallo del modelo:', msg);
    return NextResponse.json({ error: 'revision_failed', detail: msg }, { status: 500 });
  }
}
