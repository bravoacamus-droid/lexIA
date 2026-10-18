import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Los archivos estáticos no pasan por la sesión. Los mp4 de la página
// pública se piden por tramos (Range): sin excluirlos, cada tramo
// consultaría a Supabase por el usuario.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4)$).*)',
  ],
};
