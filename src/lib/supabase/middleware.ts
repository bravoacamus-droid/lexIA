import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  const isProtected =
    path.startsWith('/app') ||
    path.startsWith('/chat') ||
    path.startsWith('/biblioteca') ||
    path.startsWith('/evaluador') ||
    path.startsWith('/generador') ||
    path.startsWith('/ajustes');

  if (!user && isProtected) {
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  if (user && (path === '/login' || path === '/auth/verify')) {
    url.pathname = '/app';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
