import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { chatModel, CHAT_MODEL_ID } from '@/lib/ai/gemini';
import { embedOne } from '@/lib/ai/embeddings';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { obtenerPlantilla } from '@/lib/generadores/plantillas';
import {
  promptSistema,
  promptUsuario,
  consultaNormativa,
  limpiarRedaccion,
  redaccionUtil,
} from '@/lib/generadores/redactor';
import type { BloqueRedactado, Seccion } from '@/lib/generadores/plantilla-tipos';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Schema = z.object({
  bloque_id: z.string().min(1).max(80),
  aporte: z.string().max(8000).optional(),
  /**
   * Lo que el usuario ya tiene escrito en el apartado. Si viene, el
   * modelo mejora ese texto en vez de escribir uno nuevo; sin esto el
   * boton descartaba en silencio el trabajo del area usuaria.
   */
  texto_actual: z.string().max(20000).optional(),
});

/**
 * Un campo de texto largo se trata como un apartado redactable más.
 *
 * Cuando el campo es el hueco de un párrafo hay que decírselo al modelo
 * con la frase entera: si no, devuelve "Se consideran servicios
 * similares aquellos que…" para un párrafo que ya empieza con "Se
 * consideran servicios similares a los siguientes", y el documento sale
 * repitiendo la frase.
 */
function adaptar(
  c: { id: string; etiqueta: string; ayuda: string },
  parrafo?: string,
): BloqueRedactado {
  const instruccion = parrafo
    ? `${c.ayuda}.

Tu texto se inserta en el hueco de esta frase del documento:
"${parrafo.replace(/\{\{[^}]+\}\}/g, '______')}"
Escribe SOLO lo que va en el hueco, sin repetir el resto de la frase y sin volver a introducir el tema.`
    : c.ayuda;
  return {
    clase: 'redactado',
    id: c.id,
    etiqueta: c.etiqueta,
    instruccion,
    extension: 'parrafo',
  };
}

/** Busca el bloque redactable por id, recorriendo también las subsecciones. */
function buscarBloque(secciones: Seccion[], id: string): BloqueRedactado | null {
  for (const s of secciones) {
    for (const b of s.bloques) {
      if (b.clase === 'redactado' && b.id === id) return b;
      // Los campos de texto largo tambien son clausulas que escribe el
      // area usuaria a mano —"bienes similares", "actividades"— y son
      // justo las que nadie revisa. Se adaptan a la misma forma para que
      // el boton de mejorar valga en los dos sitios y no haya que
      // mantener dos caminos.
      if (b.clase === 'campo' && b.tipo === 'texto_largo' && b.id === id) {
        return adaptar(b);
      }
      // Y los que viven dentro de un párrafo, como "servicios similares":
      // el hueco es del usuario aunque el párrafo sea invariable.
      if (b.clase === 'parrafo') {
        const campo = b.campos.find((c) => c.id === id && c.tipo === 'texto_largo');
        if (campo) return adaptar(campo, b.texto);
      }
    }
    if (s.subsecciones) {
      const encontrado = buscarBloque(s.subsecciones, id);
      if (encontrado) return encontrado;
    }
  }
  return null;
}

/** Sustento normativo de la biblioteca para este apartado. */
async function sustentoNormativo(consulta: string): Promise<string> {
  try {
    const embedding = await embedOne(consulta, 'RETRIEVAL_QUERY');
    const supabase = createClient();
    const { data } = await supabase.rpc('hybrid_search', {
      query_text: consulta,
      query_embedding: embedding as unknown as number[],
      match_count: 5,
      filter_type: null,
    });
    const filas = (data ?? []) as Array<{
      content: string;
      doc_title: string;
      doc_type: string;
      doc_number: string | null;
    }>;
    if (filas.length === 0) return '';
    return filas
      .map((f, i) => {
        const etiqueta = `${f.doc_type}${f.doc_number ? ' ' + f.doc_number : ''}`;
        return `[${i + 1}] ${etiqueta} — ${f.doc_title}\n${f.content.slice(0, 1200)}`;
      })
      .join('\n\n---\n\n');
  } catch (e) {
    // Sin sustento se redacta igual: el prompt ya prohíbe citar norma que
    // no venga respaldada, así que la salida sale sin citas en vez de con
    // citas inventadas.
    console.error('[redactar] falló la búsqueda de sustento:', (e as Error).message);
    return '';
  }
}

/**
 * POST /api/generadores/requerimientos/[id]/redactar
 * Body: { bloque_id, aporte? }
 *
 * Redacta UN apartado de la plantilla. No guarda: devuelve el texto para
 * que el usuario lo revise y decida. Guardar automáticamente lo que
 * escribió el modelo convertiría la revisión en un trámite que nadie
 * hace.
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
    respuestas: { campos?: Record<string, string> } | null;
  };
  if (fila.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const plantilla = obtenerPlantilla(fila.plantilla_id);
  if (!plantilla) {
    return NextResponse.json({ error: 'plantilla_desconocida' }, { status: 500 });
  }

  const bloque = buscarBloque(plantilla.secciones, parsed.data.bloque_id);
  if (!bloque) {
    return NextResponse.json(
      { error: 'bloque_desconocido', detail: parsed.data.bloque_id },
      { status: 400 },
    );
  }

  const contexto = {
    denominacion: fila.denominacion,
    organo: fila.respuestas?.campos?.organo,
    aporteUsuario: parsed.data.aporte,
    textoActual: parsed.data.texto_actual,
  };

  const sustento = await sustentoNormativo(consultaNormativa(plantilla, bloque, contexto));

  try {
    const inicio = Date.now();
    const resultado = await generateText({
      model: chatModel,
      system: promptSistema(plantilla),
      prompt: promptUsuario(bloque, { ...contexto, contextoNormativo: sustento }),
      temperature: 0.3,
    });
    const latencyMs = Date.now() - inicio;

    void recordAiUsage({
      userId: user.id,
      feature: `requerimiento_plantilla_${bloque.id}`,
      model: CHAT_MODEL_ID,
      inputTokens: resultado.usage?.promptTokens ?? 0,
      outputTokens: resultado.usage?.completionTokens ?? 0,
      latencyMs,
      metadata: {
        requerimiento_id: ctx.params.id,
        plantilla_id: plantilla.id,
        bloque_id: bloque.id,
        modo: contexto.textoActual?.trim() ? 'mejorar' : 'redactar',
      },
    });

    const texto = limpiarRedaccion(resultado.text ?? '', bloque);
    if (!redaccionUtil(texto)) {
      return NextResponse.json({ error: 'respuesta_vacia' }, { status: 502 });
    }

    return NextResponse.json({
      bloque_id: bloque.id,
      modo: contexto.textoActual?.trim() ? 'mejorado' : 'redactado',
      texto,
      con_sustento: sustento.length > 0,
      tokens: {
        entrada: resultado.usage?.promptTokens ?? 0,
        salida: resultado.usage?.completionTokens ?? 0,
      },
    });
  } catch (e) {
    const msg = (e as Error).message || 'unknown';
    console.error('[redactar] fallo del modelo:', msg);
    return NextResponse.json({ error: 'generation_failed', detail: msg }, { status: 500 });
  }
}
