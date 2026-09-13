/**
 * Descargar la carta de subsanación dirigida a un postor.
 *
 * Hermana de la ruta del acta y con el mismo criterio: se rehace desde
 * el resultado guardado en vez de almacenar el .docx, para que un cambio
 * en el modelo alcance también a las evaluaciones viejas.
 *
 * El postor se pide por su nombre —`?postor=...`—, que es como aparece
 * en el acta y en la pantalla. Sin él, si solo hay uno observado, se
 * toma ese; si hay varios, se responde con la lista para que quien
 * llama elija: generar la carta del postor equivocado sería peor que
 * no generarla.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { markdownToDocxBuffer } from '@/lib/docx-from-markdown';
import { construirCartaSubsanacion, tieneQueSubsanar } from '@/lib/evaluacion/carta';
import { nombreDeArchivo, cabeceraDescarga } from '@/lib/descargas/nombre-archivo';
import type { LecturaBases } from '@/lib/evaluacion/motor';
import type { ResultadoPostor } from '@/lib/evaluacion/etapas';

export const runtime = 'nodejs';

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('evaluations')
    .select('user_id, title, result')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const fila = data as {
    user_id: string;
    title: string | null;
    result: { bases?: LecturaBases; postores?: ResultadoPostor[] } | null;
  };
  if (fila.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const guardado = fila.result;
  if (!guardado?.bases || !guardado.postores) {
    return NextResponse.json(
      { error: 'sin_resultado', detail: 'Esta evaluación todavía no tiene resultado por etapas.' },
      { status: 409 },
    );
  }

  const observados = guardado.postores.filter(tieneQueSubsanar);
  if (observados.length === 0) {
    return NextResponse.json(
      { error: 'sin_observaciones', detail: 'Ningún postor tiene observaciones subsanables.' },
      { status: 409 },
    );
  }

  const pedido = new URL(req.url).searchParams.get('postor')?.trim();
  const postor = pedido
    ? observados.find((p) => p.postor.toLowerCase() === pedido.toLowerCase())
    : observados.length === 1
      ? observados[0]
      : undefined;

  if (!postor) {
    return NextResponse.json(
      {
        error: pedido ? 'postor_desconocido' : 'falta_postor',
        detail: pedido
          ? `No hay un postor observado que se llame "${pedido}".`
          : 'Hay más de un postor con observaciones: indica cuál con ?postor=',
        observados: observados.map((p) => p.postor),
      },
      { status: 400 },
    );
  }

  const carta = construirCartaSubsanacion({ bases: guardado.bases, postor });
  const denominacion = guardado.bases.procedimiento?.denominacion ?? fila.title ?? 'Procedimiento';
  const buffer = await markdownToDocxBuffer(carta, {
    title: 'Carta de subsanación',
    subtitle: `${postor.postor} — ${denominacion}`,
  });

  const nombre = `${nombreDeArchivo(`Carta de subsanación — ${postor.postor}`, 'Carta de subsanación')}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': cabeceraDescarga(nombre),
    },
  });
}
