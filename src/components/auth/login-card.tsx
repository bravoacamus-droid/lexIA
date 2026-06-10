'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Logo } from '@/components/brand';
import { OAuthButtons } from './oauth-buttons';

export function LoginCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-md"
    >
      <Card className="p-8 shadow-2xl border-border/60 backdrop-blur-sm bg-card/95">
        <div className="flex flex-col items-center text-center mb-7">
          <Logo height={64} priority className="mb-5" />
          <h1 className="font-serif text-3xl tracking-tight">Bienvenido a LexIA</h1>
          <p className="mt-1.5 text-sm text-muted-foreground text-balance">
            La IA especializada en Contrataciones del Estado.
            Ingresa con tu cuenta para acceder.
          </p>
        </div>

        <OAuthButtons />

        <div className="mt-6 rounded-lg bg-secondary/60 px-4 py-3 text-center">
          <p className="text-xs font-medium text-foreground">
            Prueba gratuita de 30 días
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Sin tarjeta de crédito · Acceso completo a la plataforma
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground leading-relaxed">
          Al continuar aceptas nuestros{' '}
          <a href="/legal/terminos" className="underline-offset-2 hover:underline">
            Términos
          </a>{' '}
          y{' '}
          <a href="/legal/privacidad" className="underline-offset-2 hover:underline">
            Política de privacidad
          </a>
          .
        </p>
      </Card>
    </motion.div>
  );
}
