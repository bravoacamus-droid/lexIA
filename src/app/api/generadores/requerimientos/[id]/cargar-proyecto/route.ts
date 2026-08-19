import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { chatModel, CHAT_MODEL_ID } from '@/lib/ai/gemini';
import { recordAiUsage } from '@/lib/ai/usage-log';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import {
  extraerTextoDocumento,
  DocumentoIlegibleError,
} from '@/lib/ai/texto-documento';
import { obtenerPlantilla } from '@/lib/generadores/plantillas';
import { normalizarRespuestas, type RespuestasRequerimiento } from '@/lib/generadores/ensamblador';
import {
  destinosDistribucion,
  condicionesDeclaradas,
  promptDistribucionSistema,
  promptDistribucionUsuario,
  depurarDistribucion,
} from '@/lib/generadores/distribuidor';

export const runtime = 'nodejs';
export const maxDuration = 180;

/** 10 MB, el mismo tope que el resto del generador. */
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Tope del texto que se manda al modelo.
 *
 * Un proyecto de requerimiento normal no pasa de 60 000 caracteres. Si
 * llega algo mucho mayor, casi siempre es un expediente entero: se
 * recorta y se avisa, en vez de gastar una llamada enorme o fallar.
 */
const MAX_CARACTERES = 120_000;

/**
 * POST /api/generadores/requerimientos/[id]/cargar-proyecto
 *
 * Recibe el proyecto de requerimiento del área usuaria —Word, PDF, texto
 * o pegado a mano— y devuelve una propuesta de reparto por apartados.
 *
 * NO guarda. La propuesta se aplica desde la interfaz, apartado por
 * apartado, porque puede haber trabajo previo que no se debe pisar.
 * Ver `src/lib/generadores/distribuidor.ts`.
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
  if (!plantilla) {
    return NextResponse.json({ error: 'plantilla_desconocida' }, { status: 500 });
  }

  // ── Entrada: archivo o texto pegado ─────────────────────────────────
  let proyecto = '';
  let fuente = 'texto pegado';
  let paginas: number | undefined;

  const tipoPeticion = req.headers.get('content-type') ?? '';
  try {
    if (tipoPeticion.includes('multipart/form-data')) {
      const form = await req.formData();
      const archivo = form.get('file');
      if (!(archivo instanceof File)) {
        return NextResponse.json({ error: 'no_file' }, { status: 400 });
      }
      if (archivo.size > MAX_BYTES) {
        return NextResponse.json(
          { error: 'file_too_large', detail: 'El archivo supera los 10 MB.' },
          { status: 413 },
        );
      }
      const extraido = await extraerTextoDocumento(archivo);
      proyecto = extraido.texto;
      paginas = extraido.paginas;
      fuente = archivo.name;
    } else {
      const body = (await req.json().catch(() => null)) as { texto?: unknown } | null;
      proyecto = typeof body?.texto === 'string' ? body.texto.trim() : '';
    }
  } catch (e) {
    if (e instanceof DocumentoIlegibleError) {
      return NextResponse.json(
        { error: 'documento_ilegible', detail: e.message, sugerencia: e.sugerencia },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: 'lectura_fallida', detail: (e as Error).message },
      { status: 400 },
    );
  }

  if (proyecto.length < 200) {
    return NextResponse.json(
      {
        error: 'proyecto_corto',
        detail: 'El proyecto tiene muy poco texto para repartirlo por apartados.',
      },
      { status: 422 },
    );
  }

  const recortado = proyecto.length > MAX_CARACTERES;
  if (recortado) proyecto = proyecto.slice(0, MAX_CARACTERES);

  const respuestas = normalizarRespuestas(fila.respuestas);
  const destinos = destinosDistribucion(plantilla, respuestas);
  const condiciones = condicionesDeclaradas(plantilla.secciones);

  try {
    const inicio = Date.now();
    const resultado = await generateText({
      model: chatModel,
      system: promptDistribucionSistema(plantilla),
      prompt: promptDistribucionUsuario({
        denominacion: fila.denominacion,
        destinos,
        condiciones,
        proyecto,
      }),
      // Repartir no es redactar: se busca el mismo reparto ante el mismo
      // proyecto, no variedad.
      temperature: 0.1,
    });
    const latencyMs = Date.now() - inicio;

    void recordAiUsage({
      userId: user.id,
      feature: 'requerimiento_plantilla_cargar_proyecto',
      model: CHAT_MODEL_ID,
      inputTokens: resultado.usage?.promptTokens ?? 0,
      outputTokens: resultado.usage?.completionTokens ?? 0,
      latencyMs,
      metadata: {
        requerimiento_id: ctx.params.id,
        plantilla_id: plantilla.id,
        caracteres: proyecto.length,
      },
    });

    let crudo: unknown;
    try {
      crudo = parseJsonLoose(resultado.text ?? '');
    } catch (e) {
      console.error('[cargar-proyecto] JSON ilegible:', (e as Error).message);
      return NextResponse.json({ error: 'respuesta_ilegible' }, { status: 502 });
    }

    const distribucion = depurarDistribucion(crudo, destinos, condiciones);

    return NextResponse.json({
      ...distribucion,
      // La interfaz necesita rotular cada asignación y saber dónde
      // escribirla al aplicar.
      apartados: destinos
        .filter((d) => distribucion.asignaciones.some((a) => a.apartado_id === d.id))
        .map((d) => ({
          id: d.id,
          etiqueta: d.etiqueta,
          seccion: d.seccion,
          destino: d.destino,
        })),
      fuente,
      paginas,
      caracteres: proyecto.length,
      recortado,
      tokens: {
        entrada: resultado.usage?.promptTokens ?? 0,
        salida: resultado.usage?.completionTokens ?? 0,
      },
    });
  } catch (e) {
    const msg = (e as Error).message || 'unknown';
    console.error('[cargar-proyecto] fallo del modelo:', msg);
    return NextResponse.json({ error: 'reparto_fallido', detail: msg }, { status: 500 });
  }
}
