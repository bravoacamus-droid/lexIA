import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { chatModel, CHAT_MODEL_ID } from '@/lib/ai/gemini';
import { embedOne } from '@/lib/ai/embeddings';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { obtenerPlantilla } from '@/lib/generadores/plantillas';
import {
  ensamblarRequerimiento,
  normalizarRespuestas,
  type RespuestasRequerimiento,
} from '@/lib/generadores/ensamblador';
import {
  inventarioRevisable,
  consultasRevision,
  promptRevisionSistema,
  promptRevisionUsuario,
  depurarHallazgos,
} from '@/lib/generadores/revisor';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Sustento normativo para la revisión.
 *
 * Varias consultas en vez de una: la revisión toca penalidades,
 * experiencia, plazos y régimen MYPE a la vez, y una sola búsqueda con
 * todo dentro no recupera nada útil —ya está medido en el buscador—.
 * Se ejecutan en paralelo y se juntan sin repetir.
 */
async function sustentoNormativo(consultas: string[]): Promise<string> {
  const supabase = createClient();
  const vistos = new Set<string>();
  const trozos: string[] = [];

  const resultados = await Promise.all(
    consultas.map(async (consulta) => {
      try {
        const embedding = await embedOne(consulta, 'RETRIEVAL_QUERY');
        const { data } = await supabase.rpc('hybrid_search', {
          query_text: consulta,
          query_embedding: embedding as unknown as number[],
          match_count: 4,
          filter_type: null,
        });
        return (data ?? []) as Array<{
          content: string;
          doc_title: string;
          doc_type: string;
          doc_number: string | null;
        }>;
      } catch (e) {
        // Sin sustento se revisa igual: el prompt prohíbe citar norma
        // que no venga respaldada, así que salen hallazgos sin cita en
        // vez de citas inventadas.
        console.error('[revisar] falló una búsqueda de sustento:', (e as Error).message);
        return [];
      }
    }),
  );

  for (const filas of resultados) {
    for (const f of filas) {
      const clave = `${f.doc_title}|${f.content.slice(0, 120)}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      const etiqueta = `${f.doc_type}${f.doc_number ? ' ' + f.doc_number : ''}`;
      trozos.push(`[${trozos.length + 1}] ${etiqueta} — ${f.doc_title}\n${f.content.slice(0, 1200)}`);
      if (trozos.length >= 14) return trozos.join('\n\n---\n\n');
    }
  }
  return trozos.join('\n\n---\n\n');
}

/**
 * POST /api/generadores/requerimientos/[id]/revisar
 *
 * Revisión global del documento terminado: coherencia entre secciones,
 * validación normativa de lo que el usuario escribió a mano y redacción
 * del conjunto.
 *
 * No guarda nada. Devuelve hallazgos; aplicarlos es decisión del
 * usuario, uno por uno. Ver `src/lib/generadores/revisor.ts`.
 */
export async function POST(_req: Request, ctx: { params: { id: string } }) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: 'missing_env' }, { status: 500 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('requerimientos_plantilla')
    .select('user_id, plantilla_id, denominacion, cuantia, respuestas')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const fila = data as {
    user_id: string;
    plantilla_id: string;
    denominacion: string;
    cuantia: number | null;
    respuestas: Partial<RespuestasRequerimiento>;
  };
  if (fila.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const plantilla = obtenerPlantilla(fila.plantilla_id);
  if (!plantilla) {
    return NextResponse.json({ error: 'plantilla_desconocida' }, { status: 500 });
  }

  const respuestas = normalizarRespuestas(fila.respuestas, fila.denominacion);
  const doc = ensamblarRequerimiento(plantilla, respuestas, {
    cuantia: fila.cuantia ?? undefined,
  });
  const inventario = inventarioRevisable(plantilla, respuestas);

  // Revisar un documento vacío gasta una llamada para decir lo que ya
  // sabemos: que no hay nada escrito.
  if (inventario.length === 0) {
    return NextResponse.json({
      vacio: true,
      resumen: 'Todavía no hay nada escrito que revisar.',
      hallazgos: [],
      apartados_revisados: 0,
      con_sustento: false,
    });
  }

  const sustento = await sustentoNormativo(consultasRevision(plantilla, inventario));

  try {
    const inicio = Date.now();
    const resultado = await generateText({
      model: chatModel,
      system: promptRevisionSistema(plantilla),
      prompt: promptRevisionUsuario({
        denominacion: fila.denominacion,
        documento: doc.markdown,
        inventario,
        avisos: doc.avisos,
        faltantes: doc.faltantes,
        sustento,
      }),
      // Una revisión no debe cambiar de opinión entre dos ejecuciones
      // sobre el mismo documento.
      temperature: 0.2,
    });
    const latencyMs = Date.now() - inicio;

    void recordAiUsage({
      userId: user.id,
      feature: 'requerimiento_plantilla_revision_global',
      model: CHAT_MODEL_ID,
      inputTokens: resultado.usage?.promptTokens ?? 0,
      outputTokens: resultado.usage?.completionTokens ?? 0,
      latencyMs,
      metadata: {
        requerimiento_id: ctx.params.id,
        plantilla_id: plantilla.id,
        apartados: inventario.length,
      },
    });

    let crudo: { resumen?: unknown; hallazgos?: unknown };
    try {
      crudo = parseJsonLoose<{ resumen?: unknown; hallazgos?: unknown }>(resultado.text ?? '');
    } catch (e) {
      console.error('[revisar] JSON ilegible:', (e as Error).message);
      return NextResponse.json({ error: 'respuesta_ilegible' }, { status: 502 });
    }

    const hallazgos = depurarHallazgos(crudo.hallazgos, inventario);

    return NextResponse.json({
      resumen: typeof crudo.resumen === 'string' ? crudo.resumen.trim() : '',
      hallazgos,
      // La interfaz necesita saber dónde vive cada apartado para poder
      // rotular el hallazgo y escribir el texto propuesto donde toca.
      apartados: inventario.map((a) => ({
        id: a.id,
        etiqueta: a.etiqueta,
        seccion: a.seccion,
        destino: a.destino,
      })),
      apartados_revisados: inventario.length,
      con_sustento: sustento.length > 0,
      tokens: {
        entrada: resultado.usage?.promptTokens ?? 0,
        salida: resultado.usage?.completionTokens ?? 0,
      },
    });
  } catch (e) {
    const msg = (e as Error).message || 'unknown';
    console.error('[revisar] fallo del modelo:', msg);
    return NextResponse.json({ error: 'revision_failed', detail: msg }, { status: 500 });
  }
}
