import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = [
  '/app',
  '/chat',
  '/biblioteca',
  '/evaluador',
  '/revision-oferta',
  '/revisor-tdr',
  '/generador',
  '/rnp',
  '/admin',
  '/ajustes',
  '/cuenta',
  '/onboarding',
  // El enlace de invitación a un equipo: pide sesión y vuelve con su token.
  '/equipo',
];

const AUTH_ONLY_PREFIXES = ['/login'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthOnly = AUTH_ONLY_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));

  // No autenticado intentando entrar a ruta protegida → /login
  // El destino lleva su consulta: el enlace /equipo/unirse?token=… sin
  // el token no sirve. Antes se guardaba solo la ruta y el token quedaba
  // suelto en la URL de /login, sin volver nunca a la invitación.
  const destino = path + request.nextUrl.search;
  if (!user && isProtected) {
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('redirect', destino);
    return NextResponse.redirect(url);
  }

  // Autenticado entrando a /login → al dashboard
  if (user && isAuthOnly) {
    url.pathname = '/app';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Autenticado entrando a ruta protegida → verificar onboarding
  // (excepto la propia /onboarding, que es el destino del gate).
  if (user && isProtected && !path.startsWith('/onboarding')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && !profile.onboarding_completed) {
      url.pathname = '/onboarding';
      url.search = '';
      url.searchParams.set('next', destino);
      return NextResponse.redirect(url);
    }
  }

  return response;
}
