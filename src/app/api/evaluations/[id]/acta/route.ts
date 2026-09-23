/**
 * Descargar el acta de evaluación en Word.
 *
 * Se rehace desde los datos guardados en vez de guardar el .docx: si
 * mañana cambia una tabla del modelo, las actas viejas salen con el
 * modelo nuevo sin migrar nada. Y se compone desde sus piezas, con el
 * formato del modelo de César (`documentos/word.ts`), no desde el
 * Markdown guardado: con él se perdían las celdas combinadas, los anexos
 * apaisados y el cuadro de firmas.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { actaADocx } from '@/lib/evaluacion/acta';
import { nombreDeArchivo, cabeceraDescarga } from '@/lib/descargas/nombre-archivo';
import type { LecturaBases } from '@/lib/evaluacion/motor';
import type { ResultadoPostor } from '@/lib/evaluacion/etapas';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
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

  const denominacion = guardado.bases.procedimiento?.denominacion ?? fila.title ?? 'Procedimiento';
  const buffer = await actaADocx({ bases: guardado.bases, postores: guardado.postores });

  const nombre = `${nombreDeArchivo(`Acta de evaluación — ${denominacion}`, 'Acta de evaluación')}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': cabeceraDescarga(nombre),
    },
  });
}
