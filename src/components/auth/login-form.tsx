'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowRight, Mail, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

const schema = z.object({
  email: z.string().email('Ingresa un correo válido'),
});

type Values = z.infer<typeof schema>;

export function LoginForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/app';

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: Values) {
    setLoading(true);
    try {
      const supabase = createClient();
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', redirect);

      const { error } = await supabase.auth.signInWithOtp({
        email: values.email,
        options: {
          emailRedirectTo: callbackUrl.toString(),
          shouldCreateUser: true,
        },
      });

      if (error) {
        toast.error('No se pudo enviar el enlace', {
          description: error.message,
        });
        return;
      }

      setSent(true);
      toast.success('Enlace enviado', {
        description: 'Revisa tu correo para iniciar sesión.',
      });
      router.push(
        `/auth/verify?email=${encodeURIComponent(values.email)}&redirect=${encodeURIComponent(redirect)}`,
      );
    } catch (err) {
      toast.error('Algo salió mal. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-md"
    >
      <Card className="p-8 shadow-2xl border-border/60 backdrop-blur-sm bg-card/95">
        <div className="flex flex-col items-center text-center mb-7">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 mb-4">
            <Sparkles className="h-5 w-5" />
          </span>
          <h1 className="font-serif text-3xl tracking-tight">Ingresa a LexIA</h1>
          <p className="mt-1.5 text-sm text-muted-foreground text-balance">
            Te enviaremos un enlace mágico a tu correo. Sin contraseñas.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Correo electrónico
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@empresa.pe"
                className="pl-10 h-11"
                disabled={loading || sent}
                {...form.register('email')}
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            variant="default"
            className="w-full h-11"
            loading={loading}
            disabled={sent}
          >
            {sent ? 'Enlace enviado' : 'Enviar enlace mágico'}
            {!sent && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] text-muted-foreground leading-relaxed">
          Al continuar aceptas nuestros{' '}
          <a href="#" className="underline-offset-2 hover:underline">Términos</a> y{' '}
          <a href="#" className="underline-offset-2 hover:underline">Política de privacidad</a>.
        </p>
      </Card>
    </motion.div>
  );
}
