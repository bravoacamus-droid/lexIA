import { NextResponse } from 'next/server';
import { ErrorDeSubida } from '@/lib/biblioteca/subir';

/** Lo que comparten las rutas de /api/admin/biblioteca. */

/** El archivo tiene que estar en la carpeta de quien sube: se lee con service role. */
export function rutaPropia(ruta: string, userId: string): boolean {
  return ruta.startsWith(`${userId}/`) && !ruta.includes('..') && /\.(pdf|docx)$/i.test(ruta);
}

export function respuestaDeError(e: unknown) {
  if (e instanceof ErrorDeSubida) {
    const status = e.codigo === 'no_existe' ? 404 : e.codigo === 'duplicado' ? 409 : e.codigo === 'fallo' ? 502 : 400;
    return NextResponse.json({ error: e.codigo, message: e.message, ...e.extra }, { status });
  }
  console.error('[admin/biblioteca]', e);
  return NextResponse.json({ error: 'fallo', message: 'No se pudo completar. Vuelve a intentarlo.' }, { status: 500 });
}
