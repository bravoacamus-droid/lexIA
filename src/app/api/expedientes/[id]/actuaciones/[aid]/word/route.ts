import { NextResponse } from 'next/server';
import { sesion } from '@/lib/ejecucion/api';
import { MENSAJE_BLOQUEO } from '@/lib/ejecucion/auditoria';
import { documentoADocx, fichaADocx } from '@/lib/ejecucion/documento';
import { reconstruirFicha } from '@/lib/ejecucion/ficha';
import { hoyISO } from '@/lib/ejecucion/regimen';
import { cargarExpediente } from '@/lib/ejecucion/servicio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function nombreDeArchivo(t: string): string {
  return (
    t
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'documento'
  );
}

/**
 * GET ?que=documento | ficha
 *
 * El documento para revisión final no sale si la auditoría encontró una
 * inconsistencia (sección 16). Se puede bajar igual como borrador
 * condicionado (`como=borrador`), que lleva su nota de que no es oficial.
 */
export async function GET(req: Request, { params }: { params: { id: string; aid: string } }) {
  const s = await sesion();
  if ('error' in s) return s.error;
  const url = new URL(req.url);
  const que = url.searchParams.get('que') === 'ficha' ? 'ficha' : 'documento';
  const c = await cargarExpediente(s.supabase, params.id);
  const act = c?.actuaciones.find((a) => a.id === params.aid);
  if (!c || !act?.analisis) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { ficha } = reconstruirFicha(c.documentos, c.expediente.ficha ?? {});

  let buffer: Buffer;
  let nombre: string;
  if (que === 'ficha') {
    buffer = await fichaADocx({
      titulo: act.borrador?.titulo ?? act.analisis.documento.titulo,
      perfil: act.perfil,
      analisis: act.analisis,
      documentos: c.documentos,
      borrador: act.borrador,
      auditoria: act.auditoria,
      ficha,
    });
    nombre = `Ficha-de-control-${nombreDeArchivo(act.borrador?.titulo ?? act.analisis.documento.titulo)}.docx`;
  } else {
    if (!act.borrador) return NextResponse.json({ error: 'sin_documento' }, { status: 404 });
    let borrador = act.borrador;
    if (borrador.nivel === 'revision_final' && act.auditoria?.bloquea) {
      if (url.searchParams.get('como') !== 'borrador')
        return NextResponse.json({ error: 'inconsistencia', detail: MENSAJE_BLOQUEO }, { status: 409 });
      borrador = { ...borrador, nivel: 'borrador_condicionado' };
    }
    buffer = await documentoADocx({ borrador, perfil: act.perfil, ficha, anio: Number(hoyISO().slice(0, 4)) });
    nombre = `${nombreDeArchivo(borrador.titulo)}-v${borrador.version}.docx`;
  }
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': DOCX,
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'no-store',
    },
  });
}
