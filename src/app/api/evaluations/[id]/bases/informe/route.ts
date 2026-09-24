/**
 * GET /api/evaluations/[id]/bases/informe?para=proveedor|entidad
 *
 * El informe de la evaluación de bases en Word. La última columna dice
 * qué consultar u observar (proveedor) o qué corregir antes de publicar
 * (entidad). Se rehace desde lo guardado en cada descarga.
 */
import { NextResponse } from 'next/server';
import { nombreDeArchivo, cabeceraDescarga } from '@/lib/descargas/nombre-archivo';
import { informeADocx } from '@/lib/evaluacion/bases/informe';
import { cargarEvaluacionDeBases, nombreDeLasBases } from '@/lib/evaluacion/bases/cargar';

export const runtime = 'nodejs';

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const c = await cargarEvaluacionDeBases(ctx.params.id);
  if ('error' in c) return c.error;
  const para = new URL(req.url).searchParams.get('para') === 'entidad' ? 'entidad' : 'proveedor';
  const buffer = await informeADocx({
    titulo: c.ev.title,
    documento: nombreDeLasBases(c.ev.bases_file_path),
    resultado: c.ev.result,
    para,
  });
  const nombre = `${nombreDeArchivo(`Evaluación de bases — ${c.ev.title}`, 'Evaluación de bases')}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': cabeceraDescarga(nombre),
    },
  });
}
