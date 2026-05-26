'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Logo } from '@/components/logo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MailCheck, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function VerifyContent() {
  const params = useSearchParams();
  const email = params.get('email') || '';
  const redirect = params.get('redirect') || '/app';
  const [sending, setSending] = useState(false);

  async function resend() {
    if (!email) return;
    setSending(true);
    try {
      const supabase = createClient();
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', redirect);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl.toString(), shouldCreateUser: true },
      });
      if (error) {
        toast.error('No se pudo reenviar', { description: error.message });
      } else {
        toast.success('Enlace reenviado', { description: 'Revisa tu correo.' });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <Card className="p-8 text-center shadow-2xl">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 mx-auto mb-5">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="font-serif text-3xl tracking-tight">Revisa tu correo</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-balance">
          Te enviamos un enlace mágico a{' '}
          <span className="font-medium text-foreground">{email || 'tu correo'}</span>.
          Ábrelo desde el mismo dispositivo para iniciar sesión.
        </p>

        <div className="mt-7 space-y-2.5">
          <Button
            variant="outline"
            className="w-full"
            onClick={resend}
            loading={sending}
            disabled={!email}
          >
            <RefreshCw className="h-4 w-4" />
            Reenviar enlace
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/login">
              <ArrowLeft className="h-3.5 w-3.5" />
              Usar otro correo
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          ¿No encuentras el correo? Revisa la carpeta de Spam o Promociones.
        </p>
      </Card>
    </motion.div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10 mesh-gradient opacity-50" />
      <header className="container py-6 flex items-center justify-between">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Suspense fallback={null}>
          <VerifyContent />
        </Suspense>
      </main>
    </div>
  );
}
