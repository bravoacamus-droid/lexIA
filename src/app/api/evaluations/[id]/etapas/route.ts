/**
 * Evaluar un procedimiento en las tres etapas y guardar el resultado.
 *
 * POR QUÉ ES UNA RUTA APARTE
 *
 * `/process` hace lo de antes: una sola pasada de requisitos de
 * calificación, la auto-revisión del postor y la auditoría de TDR. Está
 * en uso y no se toca. Esta ruta es la evaluación por etapas que pidió
 * César —admisión, calificación y evaluación con puntaje—, que necesita
 * otra entrada, otro recorrido y otra salida.
 *
 * QUÉ HACE
 *
 *   1. Descarga las Bases y las ofertas de Storage, donde las dejó el
 *      navegador (subida directa, sin pasar por aquí: una oferta son
 *      treinta megas y no cabrían en una petición).
 *   2. Las lee. Si una oferta viene escaneada —lo normal— se transcribe
 *      con el modelo en vez de rechazarla.
 *   3. Evalúa las tres etapas de cada postor, cortando a quien no pasa.
 *   4. Guarda el resultado y el acta en `evaluations.result`.
 *
 * Tarda minutos, no segundos: una oferta escaneada de sesenta páginas
 * son noventa segundos solo de transcripción, y luego van tres llamadas
 * por postor. Por eso el estado se marca en la fila desde el principio,
 * para que la pantalla pueda seguirlo.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { extraerTextoDocumento, DocumentoIlegibleError } from '@/lib/ai/texto-documento';
import { construirActa } from '@/lib/evaluacion/acta';
import { evaluarProcedimiento } from '@/lib/evaluacion/motor';

export const runtime = 'nodejs';
export const maxDuration = 800;

interface Archivo {
  name: string;
  path: string;
}

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Descarga de Storage y saca el texto, transcribiendo si hace falta. */
async function leerDocumento(
  cliente: ReturnType<typeof admin>,
  archivo: Archivo,
): Promise<{ texto: string; transcrito: boolean }> {
  const { data, error } = await cliente.storage.from('uploads').download(archivo.path);
  if (error || !data) throw new Error(`No se pudo descargar ${archivo.name}: ${error?.message}`);

  const buffer = Buffer.from(await data.arrayBuffer());
  const file = new File([new Uint8Array(buffer)], archivo.name, {
    type: data.type || 'application/pdf',
  });
  // `ocr: true` porque aquí es donde llegan los escaneos: una oferta
  // firmada y sellada nunca trae texto.
  const leido = await extraerTextoDocumento(file, { ocr: true, nombre: archivo.name });
  return { texto: leido.texto, transcrito: !!leido.transcrito };
}

/** El nombre del postor, a partir del archivo, hasta que la oferta diga el suyo. */
function nombreDesdeArchivo(nombre: string): string {
  return (
    nombre
      .replace(/\.(pdf|docx?|txt)$/i, '')
      .replace(/^oferta[_\s-]+/i, '')
      .replace(/^[A-Z0-9]{1,2}[_\s-]+/i, '')
      .replace(/_/g, ' ')
      .trim()
      .slice(0, 80) || nombre
  );
}

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

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
    offer_files: Archivo[] | null;
    status: string;
  };
  if (ev.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const ofertas = ev.offer_files ?? [];
  if (!ev.bases_file_path || ofertas.length === 0) {
    return NextResponse.json(
      {
        error: 'faltan_documentos',
        detail: 'Hacen falta las Bases Integradas y al menos una oferta.',
      },
      { status: 400 },
    );
  }

  await cliente.from('evaluations').update({ status: 'processing' }).eq('id', ctx.params.id);

  try {
    const bases = await leerDocumento(cliente, {
      name: 'Bases Integradas',
      path: ev.bases_file_path,
    });

    // Las ofertas ilegibles no tumban el procedimiento: se anotan y el
    // acta dirá que esa oferta no pudo leerse.
    const leidas: Array<{ postor: string; texto: string; transcrito: boolean }> = [];
    const ilegibles: Array<{ nombre: string; motivo: string }> = [];
    for (const archivo of ofertas) {
      try {
        const { texto, transcrito } = await leerDocumento(cliente, archivo);
        leidas.push({ postor: nombreDesdeArchivo(archivo.name), texto, transcrito });
      } catch (e) {
        ilegibles.push({
          nombre: archivo.name,
          motivo:
            e instanceof DocumentoIlegibleError
              ? `${e.message} ${e.sugerencia}`
              : (e as Error).message,
        });
      }
    }

    if (leidas.length === 0) {
      await cliente.from('evaluations').update({ status: 'failed' }).eq('id', ctx.params.id);
      return NextResponse.json(
        { error: 'ofertas_ilegibles', detail: ilegibles.map((x) => x.motivo).join(' · ') },
        { status: 422 },
      );
    }

    const { bases: lectura, postores } = await evaluarProcedimiento({
      textoBases: bases.texto,
      ofertas: leidas.map((o) => ({ postor: o.postor, texto: o.texto })),
    });

    const acta = construirActa({ bases: lectura, postores });

    const resultado = {
      version: 'etapas-1',
      generado: new Date().toISOString(),
      bases: lectura,
      postores,
      acta,
      transcritas: leidas.filter((o) => o.transcrito).map((o) => o.postor),
      ilegibles,
    };

    await cliente
      .from('evaluations')
      .update({ status: 'done', result: resultado, completed_at: new Date().toISOString() })
      .eq('id', ctx.params.id);

    return NextResponse.json(resultado);
  } catch (e) {
    console.error('[evaluacion-etapas] falló', e);
    await cliente.from('evaluations').update({ status: 'failed' }).eq('id', ctx.params.id);
    return NextResponse.json(
      { error: 'evaluacion_fallida', detail: (e as Error).message },
      { status: 500 },
    );
  }
}
