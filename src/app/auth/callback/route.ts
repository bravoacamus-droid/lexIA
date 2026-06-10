import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Callback de OAuth para Google y Facebook (Supabase Auth con PKCE).
 *
 * Flujo:
 *   1. El proveedor redirige aquí con ?code=...
 *   2. Intercambiamos el code por una sesión.
 *   3. Si el profile aún no completó onboarding → redirige a /onboarding.
 *   4. Si completó → redirige al `next` (default /app).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/app';
  const oauthError = searchParams.get('error');
  const oauthErrorDescription = searchParams.get('error_description');

  // El proveedor puede devolver un error directamente (usuario canceló, etc).
  if (oauthError) {
    const errorUrl = new URL('/auth/error', origin);
    errorUrl.searchParams.set(
      'message',
      oauthErrorDescription || oauthError,
    );
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    const errorUrl = new URL('/auth/error', origin);
    errorUrl.searchParams.set('message', 'missing_code');
    return NextResponse.redirect(errorUrl);
  }

  const supabase = createClient();
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = new URL('/auth/error', origin);
    errorUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(errorUrl);
  }

  // Verificamos el estado del onboarding del usuario recién autenticado.
  // Si todavía no eligió perfil ni completó datos de organización,
  // lo enviamos directo al wizard de onboarding.
  const userId = sessionData.user?.id;
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle();

    if (profile && !profile.onboarding_completed) {
      const onboardingUrl = new URL('/onboarding', origin);
      onboardingUrl.searchParams.set('next', next);
      return NextResponse.redirect(onboardingUrl);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
