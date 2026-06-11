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
      <Card className="p-8 shadow-2xl shadow-brand-900/10 border-slate-200 bg-white">
        <div className="flex flex-col items-center text-center mb-7">
          <Logo height={64} priority className="mb-5" />
          <h1 className="font-semibold text-3xl tracking-tight text-slate-900">
            Bienvenido a LexIA
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 text-balance">
            La IA especializada en Contrataciones del Estado.
            Ingresa con tu cuenta para acceder.
          </p>
        </div>

        <OAuthButtons />

        <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-center">
          <p className="text-xs font-semibold text-slate-900">
            Prueba gratuita de 30 días
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Sin tarjeta de crédito · Acceso completo a la plataforma
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-500 leading-relaxed">
          Al continuar aceptas nuestros{' '}
          <a href="/legal/terminos" className="underline-offset-2 hover:underline text-slate-700">
            Términos
          </a>{' '}
          y{' '}
          <a href="/legal/privacidad" className="underline-offset-2 hover:underline text-slate-700">
            Política de privacidad
          </a>
          .
        </p>
      </Card>
    </motion.div>
  );
}
