import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Acepta DOS flujos de auth (más resiliente que el original):
 *
 * 1. token_hash flow (preferido para magic link)
 *    URL: /auth/callback?token_hash=xxx&type=magiclink
 *    NO requiere PKCE code verifier — funciona desde cualquier navegador.
 *
 * 2. PKCE code flow (fallback para OAuth providers)
 *    URL: /auth/callback?code=xxx
 *    Requiere code verifier en cookies del navegador que solicitó.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/app';

  const supabase = createClient();

  // Flujo 1 — token_hash (magic link sin PKCE)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    const errorUrl = new URL('/auth/error', origin);
    errorUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(errorUrl);
  }

  // Flujo 2 — code flow (PKCE)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    const errorUrl = new URL('/auth/error', origin);
    errorUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(`${origin}/auth/error?message=missing_code`);
}
