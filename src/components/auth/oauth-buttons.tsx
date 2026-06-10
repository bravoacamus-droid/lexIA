'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

type Provider = 'google' | 'facebook';

/**
 * Botones de inicio de sesión con proveedores OAuth.
 * Reemplaza al magic link de la v1. Funciona para signup y login indistintamente
 * (Supabase Auth crea la cuenta automáticamente en el primer OAuth).
 */
export function OAuthButtons() {
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/app';
  const [loading, setLoading] = useState<Provider | null>(null);

  async function signIn(provider: Provider) {
    setLoading(provider);
    try {
      const supabase = createClient();
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', redirect);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        toast.error(`No se pudo iniciar sesión con ${labelOf(provider)}`, {
          description: error.message,
        });
        setLoading(null);
      }
      // si no hay error, el navegador se redirige al proveedor automáticamente
    } catch (e) {
      toast.error('Algo salió mal. Intenta de nuevo.');
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2.5">
      <OAuthButton
        provider="google"
        loading={loading === 'google'}
        disabled={loading !== null}
        onClick={() => signIn('google')}
      />
      <OAuthButton
        provider="facebook"
        loading={loading === 'facebook'}
        disabled={loading !== null}
        onClick={() => signIn('facebook')}
      />
    </div>
  );
}

function OAuthButton({
  provider,
  loading,
  disabled,
  onClick,
}: {
  provider: Provider;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 h-11 text-sm font-medium transition-all',
        'hover:bg-secondary hover:border-brand-200 dark:hover:border-brand-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ProviderIcon provider={provider} />
      )}
      <span>Continuar con {labelOf(provider)}</span>
    </button>
  );
}

function labelOf(p: Provider) {
  return p === 'google' ? 'Google' : 'Facebook';
}

function ProviderIcon({ provider }: { provider: Provider }) {
  if (provider === 'google') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        />
      </svg>
    );
  }
  // Facebook
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.93-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12Z"
      />
    </svg>
  );
}
