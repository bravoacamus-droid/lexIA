'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Logo } from '@/components/brand';
import { OAuthButtons } from './oauth-buttons';
import { FormularioDeIngreso } from './formulario-de-ingreso';

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
          <Logo height={88} priority className="mb-5" />
          <h1 className="font-semibold text-3xl tracking-tight text-slate-900">
            Bienvenido a A-LexIA
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 text-balance">
            La IA especializada en Contrataciones del Estado.
            Ingresa con tu cuenta para acceder.
          </p>
        </div>

        <FormularioDeIngreso />

        <div className="my-5 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] uppercase tracking-wider text-slate-400">o</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <OAuthButtons />

        <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-center">
          <p className="text-xs font-semibold text-slate-900">
            Prueba A-LexIA gratis
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            20 preguntas o 30 días, lo que ocurra primero · Sin tarjeta · Una sola vez
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
