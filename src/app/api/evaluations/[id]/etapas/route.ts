/**
 * Evaluar un procedimiento en las tres etapas: una vuelta de trabajo.
 *
 * POR QUÉ ES UNA RUTA APARTE
 *
 * `/process` hace lo de antes: una sola pasada de requisitos de
 * calificación, la auto-revisión del postor y la auditoría de TDR. Esta
 * ruta es la evaluación por etapas que pidió César —admisión,
 * calificación y evaluación con puntaje—.
 *
 * POR VUELTAS
 *
 * Una oferta escaneada de 140 páginas son diez tramos de transcripción, y
 * con dos ofertas así la evaluación pasaba de los trece minutos que puede
 * durar una función: Vercel la cortaba y la fila se quedaba en
 * «processing» para siempre (César, 30/09/2026). Ahora cada llamada es
 * una vuelta (`src/lib/evaluacion/ejecucion.ts`): trabaja hasta un plazo,
 * guarda lo hecho y, si falta, se vuelve a llamar a sí misma. La pantalla
 * de la evaluación también la llama mientras esté abierta, así que una
 * vuelta que muera sin encadenar la siguiente se retoma igual.
 *
 * Solo trabaja quien tiene el turno (`tomar_turno_evaluacion`): dos
 * pestañas, o una pestaña y la vuelta encadenada, no evalúan a la vez.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { TURNO_SEGUNDOS, avanzarEvaluacion } from '@/lib/evaluacion/ejecucion';

export const runtime = 'nodejs';
export const maxDuration = 800;

/** Hasta cuándo se empiezan unidades nuevas, y hasta cuándo se espera a las que corren. */
const PLAZO_MS = 540_000;
const CIERRE_MS = 720_000;

const CABECERA_INTERNA = 'x-lexia-vuelta';

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const secreto = process.env.CRON_SECRET?.trim();
  const interna = !!secreto && req.headers.get(CABECERA_INTERNA) === secreto;
  const cliente = admin();

  const { data: fila } = await cliente
    .from('evaluations')
    .select('id, user_id, bases_file_path, offer_files, status')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!fila) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const ev = fila as {
    user_id: string;
    bases_file_path: string | null;
    offer_files: unknown[] | null;
    status: string;
  };

  if (!interna) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (ev.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (ev.status === 'done' || ev.status === 'failed') {
    return NextResponse.json({ estado: ev.status });
  }
  if (!ev.bases_file_path || !ev.offer_files?.length) {
    return NextResponse.json(
      { error: 'faltan_documentos', detail: 'Hacen falta las Bases Integradas y al menos una oferta.' },
      { status: 400 },
    );
  }

  const { data: tomado, error: errTurno } = await cliente.rpc('tomar_turno_evaluacion', {
    p_id: ctx.params.id,
    p_segundos: TURNO_SEGUNDOS,
  });
  if (errTurno) return NextResponse.json({ error: errTurno.message }, { status: 500 });
  if (!tomado) return NextResponse.json({ estado: 'ocupada' }, { status: 409 });

  let desenlace: Awaited<ReturnType<typeof avanzarEvaluacion>> | { estado: 'error'; detalle: string };
  try {
    desenlace = await avanzarEvaluacion(cliente, ctx.params.id, { plazoMs: PLAZO_MS, cierreMs: CIERRE_MS });
  } catch (e) {
    // Un error que no es de la evaluación (la base de datos, por
    // ejemplo) no encadena otra vuelta: podría repetirse sin fin. La
    // pantalla, si está abierta, la vuelve a pedir más tarde.
    console.error('[evaluacion-etapas] vuelta fallida', e);
    desenlace = { estado: 'error', detalle: (e as Error).message };
  } finally {
    await cliente.from('evaluations').update({ corriendo_hasta: null }).eq('id', ctx.params.id);
  }

  // Falta trabajo: la vuelta siguiente se pide sola, para que la
  // evaluación termine aunque se haya cerrado la pestaña. No se espera su
  // respuesta: basta con que la petición salga.
  if (desenlace.estado === 'continuar' && secreto) {
    const url = new URL(`/api/evaluations/${ctx.params.id}/etapas`, req.url);
    await fetch(url, {
      method: 'POST',
      headers: { [CABECERA_INTERNA]: secreto },
      signal: AbortSignal.timeout(2500),
    }).catch(() => null);
  }

  return NextResponse.json(desenlace);
}
