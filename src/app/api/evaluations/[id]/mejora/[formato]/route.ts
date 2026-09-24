/**
 * Descargar la versión mejorada del requerimiento.
 *
 * GET mejora/word   — el Word que subieron, con los cambios incluidos
 *                     marcados con control de cambios y un comentario al
 *                     margen por cada uno. Solo si subieron un Word.
 * GET mejora/cuadro — el cuadro «Dice / Debe decir», con lo que decide el
 *                     área usuaria y lo que no procede.
 *
 * Se rehacen desde lo guardado y desde el archivo original en cada
 * descarga: así reflejan lo último que el usuario incluyó o quitó.
 */
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { nombreDeArchivo, cabeceraDescarga } from '@/lib/descargas/nombre-archivo';
import { aplicarControlDeCambios } from '@/lib/evaluacion/mejora/control-de-cambios';
import { cuadroADocx } from '@/lib/evaluacion/mejora/cuadro';
import {
  cambiosParaWord,
  leerRequerimiento,
  nombreDelArchivo,
  origenDe,
} from '@/lib/evaluacion/mejora/fuente';
import type { HallazgoAuditado } from '@/lib/evaluacion/mejora/redactor';
import type { MejoraDelRequerimiento } from '@/lib/evaluacion/mejora/tipos';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function GET(_req: Request, ctx: { params: { id: string; formato: string } }) {
  const formato = ctx.params.formato;
  if (formato !== 'word' && formato !== 'cuadro') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('evaluations')
    .select('user_id, title, bases_file_path, result')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const ev = data as {
    user_id: string;
    title: string | null;
    bases_file_path: string;
    result: { objeto_inferido?: string; hallazgos?: HallazgoAuditado[]; mejora?: MejoraDelRequerimiento } | null;
  };
  if (ev.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const mejora = ev.result?.mejora;
  const hallazgos = ev.result?.hallazgos ?? [];
  if (!mejora) {
    return NextResponse.json(
      { error: 'sin_mejora', detail: 'Primero genera la versión mejorada.' },
      { status: 409 },
    );
  }

  const incluidas = mejora.mejoras.filter((m) => m.incluir && m.veredicto !== 'descartar' && m.textoMejorado);
  const titulo = ev.title || ev.result?.objeto_inferido || 'Requerimiento';

  if (formato === 'word') {
    if (origenDe(ev.bases_file_path) !== 'docx') {
      return NextResponse.json(
        {
          error: 'requiere_word',
          detail:
            'El requerimiento se evaluó desde un PDF: los cambios solo se pueden marcar sobre el Word. Descarga el cuadro de cambios, o evalúa el requerimiento en Word.',
        },
        { status: 409 },
      );
    }
    const fuente = await leerRequerimiento(createAdminClient(), ev.bases_file_path);
    const r = await aplicarControlDeCambios(fuente.buffer!, cambiosParaWord(hallazgos, incluidas));
    const nombre = `${nombreDeArchivo(`Requerimiento con cambios — ${titulo}`, 'Requerimiento con cambios')}.docx`;
    return new NextResponse(new Uint8Array(r.buffer), {
      headers: {
        'Content-Type': DOCX,
        'Content-Disposition': cabeceraDescarga(nombre),
        // Para la pantalla: cuántos quedaron marcados y cuántos no.
        'X-Cambios-Marcados': String(r.aplicados.length),
        'X-Cambios-A-Mano': String(r.noAplicados.length),
      },
    });
  }

  // El cuadro dice qué hay que llevar a mano: se prueba sobre el Word con
  // exactamente lo que está incluido ahora.
  let noMarcados: Array<{ id: string; motivo: string }> | undefined;
  if (mejora.origen === 'docx' && origenDe(ev.bases_file_path) === 'docx') {
    const fuente = await leerRequerimiento(createAdminClient(), ev.bases_file_path);
    noMarcados = (await aplicarControlDeCambios(fuente.buffer!, cambiosParaWord(hallazgos, incluidas))).noAplicados;
  }
  const buffer = await cuadroADocx({
    objeto: ev.result?.objeto_inferido || titulo,
    documento: nombreDelArchivo(ev.bases_file_path),
    fecha: new Date(mejora.generadoEn),
    origen: mejora.origen,
    hallazgos,
    mejoras: mejora.mejoras,
    noMarcados,
  });
  const nombre = `${nombreDeArchivo(`Cuadro de cambios — ${titulo}`, 'Cuadro de cambios')}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': DOCX, 'Content-Disposition': cabeceraDescarga(nombre) },
  });
}
