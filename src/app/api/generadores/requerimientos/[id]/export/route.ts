import { NextResponse } from 'next/server';
import { nombreDeArchivo, cabeceraDescarga } from '@/lib/descargas/nombre-archivo';
import { createClient } from '@/lib/supabase/server';
import { obtenerPlantilla } from '@/lib/generadores/plantillas';
import {
  ensamblarRequerimiento,
  normalizarRespuestas,
  type RespuestasRequerimiento,
} from '@/lib/generadores/ensamblador';
import { markdownToDocxBuffer } from '@/lib/docx-from-markdown';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/generadores/requerimientos/[id]/export?format=docx|md
 *
 * Arma el documento en el momento, desde la plantilla vigente. No hay un
 * documento guardado que exportar: si César corrige una plantilla, los
 * requerimientos ya creados salen con el texto corregido.
 *
 * Un documento con datos pendientes SÍ se exporta, con las marcas
 * [PENDIENTE: …] a la vista y la cuenta en la cabecera X-Faltantes. El
 * área usuaria suele necesitar el borrador para circularlo internamente;
 * bloquear la descarga la empujaría a rellenar cualquier cosa con tal de
 * poder bajarlo.
 */
export async function GET(req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formato = new URL(req.url).searchParams.get('format') ?? 'docx';
  if (formato !== 'docx' && formato !== 'md') {
    return NextResponse.json(
      { error: 'unsupported_format', message: 'Formatos admitidos: docx, md.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('requerimientos_plantilla')
    .select('user_id, plantilla_id, denominacion, cuantia, respuestas')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json(
      { error: 'plantilla_desconocida', detail: fila.plantilla_id },
      { status: 500 },
    );
  }

  const doc = ensamblarRequerimiento(plantilla, normalizarRespuestas(fila.respuestas, fila.denominacion), {
    cuantia: fila.cuantia ?? undefined,
  });

  const nombre = nombreDeArchivo(`Requerimiento — ${fila.denominacion}`, 'Requerimiento', 70);

  const cabeceras: Record<string, string> = {
    'X-Faltantes': String(doc.faltantes.length),
    'X-Avisos': String(doc.avisos.filter((a) => a.nivel === 'error').length),
  };

  if (formato === 'md') {
    return new NextResponse(doc.markdown, {
      status: 200,
      headers: {
        ...cabeceras,
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': cabeceraDescarga(`${nombre}.md`),
      },
    });
  }

  const buf = await markdownToDocxBuffer(doc.markdown, {
    title: plantilla.encabezado,
    subtitle: plantilla.subtitulo,
  });

  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      ...cabeceras,
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': cabeceraDescarga(`${nombre}.docx`),
      'Content-Length': String(buf.length),
    },
  });
}
