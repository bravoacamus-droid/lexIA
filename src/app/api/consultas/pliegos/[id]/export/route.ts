import { NextResponse } from 'next/server';
import { leerPliego } from '@/lib/consultas/repositorio';
import { pliegoADocx } from '@/lib/consultas/documento';
import { cabeceraDescarga, nombreDeArchivo } from '@/lib/descargas/nombre-archivo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET — el documento en Word, con la tabla del modelo. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const pliego = await leerPliego(params.id);
  if (!pliego) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const buffer = await pliegoADocx(pliego, pliego.cara);
  const titulo =
    pliego.cara === 'absolucion'
      ? 'Absolución de consultas y observaciones'
      : 'Formulación de consultas y observaciones';
  const nombre = `${nombreDeArchivo(
    `${titulo} — ${pliego.encabezado.numeroProcedimiento || pliego.encabezado.procedimiento || 'sin número'}`,
  )}.docx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': cabeceraDescarga(nombre),
    },
  });
}
